import CoreBluetooth
import ExpoModulesCore

let ERROR_NOT_IMPLEMENTED = 0
let ERROR_BLUETOOTH_UNAVAILABLE = 1
let ERROR_INVALID_SERVICES = 2

struct Device {
    let uuid: String
    let name: String
    let rssi: Int8
}

struct CharacteristicDefinition: Decodable, Equatable, Hashable {
    let uuid: String
    let properties: [String]
    let value: [UInt8]
}

struct ServiceDefinition: Decodable, Equatable, Hashable {
    let uuid: String
    let primary: Bool
    let characteristics: [CharacteristicDefinition]
}

struct ServicesDefinition: Decodable, Equatable, Hashable {
    let services: [ServiceDefinition]
}

class DeviceManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate, CBPeripheralManagerDelegate {
    var onReady: (() -> Void)?
    var onDiscover: ((String, String, Int8) -> Void)?
    var onConnect: ((String) -> Void)?
    var onDisconnect: ((String) -> Void)?
    var onChange: ((String, String, Data) -> Void)?
    var onWrite: ((String, String, Data) -> Void)?
    var onError: ((UInt8, String?, String?) -> Void)?

    var centralManager: CBCentralManager?
    var peripheralManager: CBPeripheralManager?

    var bluetoothAvailable: Promise?

    var mutableCharacteristics: [CBUUID: CBMutableCharacteristic] = [:]

    var peripherals: [CBPeripheral: Device] = [:]
    var characteristics: [CBPeripheral: [CBCharacteristic]] = [:]

    var servicesFilter: [CBUUID] = []
    var reconnect: Bool = false

    private func deviceError(_ code: Int, _ reason: String, _ device: Device?) {
        let errorCode = UInt8(code)
        if let device = device {
            onError?(errorCode, reason, device.uuid)
        } else {
            onError?(errorCode, reason, "")
        }
    }

    private func managerError(_ code: Int, _ reason: String) {
        deviceError(code, reason, nil)
    }

    private func notImplemented(_ fn: String) {
        managerError(ERROR_NOT_IMPLEMENTED, "\(fn) is not implemented yet")
    }

    private func bluetoothUnavailable() {
        managerError(ERROR_BLUETOOTH_UNAVAILABLE, "Bluetooth unavailable")
    }

    private func invalidServices() {
        managerError(ERROR_INVALID_SERVICES, "Failed to parse service definition")
    }

    private func getPeripheral(_ uuid: String) -> CBPeripheral? {
        peripherals.first(where: { $0.value.uuid == uuid })?.key
    }

    private func getCharacteristic(_ device: String, _ uuid: String) -> (CBPeripheral, CBCharacteristic)? {
        guard let peripheral = getPeripheral(device) else { return nil }
        guard let characteristics = characteristics[peripheral] else { return nil }
        guard let characteristic = characteristics.first(where: { $0.uuid.uuidString == uuid }) else { return nil }
        return (peripheral, characteristic)
    }

    private func getMutableCharacteristic(_ uuidString: String) -> CBMutableCharacteristic? {
        let uuid = CBUUID(string: uuidString)
        return mutableCharacteristics[uuid]
    }

    private func createCharacteristic(_ def: CharacteristicDefinition) -> CBMutableCharacteristic {
        var permissions: CBAttributePermissions = []
        var properties: CBCharacteristicProperties = []
        for property in def.properties {
            switch property {
            case "read":
                permissions.insert(.readable)
                properties.insert(.read)
            case "notify":
                properties.insert(.notify)
            case "write":
                permissions.insert(.writeable)
                properties.insert(.write)
            default:
                continue
            }
        }
        return CBMutableCharacteristic(type: CBUUID(string: def.uuid), properties: properties, value: nil, permissions: permissions)
    }

    private func createService(_ def: ServiceDefinition) -> CBMutableService {
        let service = CBMutableService(type: CBUUID(string: def.uuid), primary: def.primary)
        var characteristics: [CBMutableCharacteristic] = []
        for characteristicDef in def.characteristics {
            let characteristic = createCharacteristic(characteristicDef)
            mutableCharacteristics[characteristic.uuid] = characteristic
            characteristics.append(characteristic)
        }
        service.characteristics = characteristics
        return service
    }

    private func createServices(_ def: ServicesDefinition) -> [CBMutableService] {
        return def.services.map { serviceDef -> CBMutableService in
            createService(serviceDef)
        }
    }

    public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        guard let available = bluetoothAvailable else { return }
        if peripheral.state == .poweredOn {
            available.resolve(true)
        } else {
            available.resolve(false)
        }
        bluetoothAvailable = nil
    }

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard let available = bluetoothAvailable else { return }
        if central.state == .poweredOn {
            available.resolve(true)
        } else {
            available.resolve(false)
        }
        bluetoothAvailable = nil
    }

    public func centralManager(_: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
        if !peripherals.keys.contains(peripheral) {
            let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unknown"
            let device = Device(uuid: peripheral.identifier.uuidString, name: name, rssi: Int8(truncating: rssi))
            peripherals[peripheral] = device
            characteristics[peripheral] = []
            peripheral.delegate = self
            onDiscover?(device.uuid, device.name, device.rssi)
        }
    }

    public func centralManager(_: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices(servicesFilter)
    }

    public func centralManager(_: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error _: Error?) {
        guard let device = peripherals[peripheral] else { return }
        onDisconnect?(device.uuid)
        if !reconnect {
            peripherals.removeValue(forKey: peripheral)
            characteristics.removeValue(forKey: peripheral)
        } else {
            centralManager?.connect(peripheral, options: nil)
        }
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices _: Error?) {
        for service in peripheral.services ?? [] {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error _: Error?) {
        guard let device = peripherals[peripheral] else { return }
        characteristics[peripheral]?.append(contentsOf: service.characteristics ?? [])
        onConnect?(device.uuid)
    }

    public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error _: Error?) {
        guard let device = peripherals[peripheral] else { return }
        guard let value = characteristic.value else { return }
        onChange?(device.uuid, characteristic.uuid.uuidString, value)
    }

    public func peripheralManager(_: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        guard let firstRequest = requests.first else {
            return
        }
        for request in requests {
            if let characteristic = getMutableCharacteristic(request.characteristic.uuid.uuidString) {
                if !characteristic.properties.contains(.write) {
                    peripheralManager?.respond(to: firstRequest, withResult: .writeNotPermitted)
                    return
                }
                let central = request.central.identifier.uuidString
                let uuid = characteristic.uuid.uuidString
                let value = request.value ?? Data()
                characteristic.value = value
                onChange?(central, uuid, value)
                onWrite?(central, uuid, value)
            } else {
                peripheralManager?.respond(to: firstRequest, withResult: .attributeNotFound)
                return
            }
        }
        peripheralManager?.respond(to: firstRequest, withResult: .success)
    }

    public func peripheralManager(_: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        if let characteristic = getMutableCharacteristic(request.characteristic.uuid.uuidString) {
            request.value = characteristic.value
            peripheralManager?.respond(to: request, withResult: .success)
        } else {
            peripheralManager?.respond(to: request, withResult: .attributeNotFound)
        }
    }

    func start(_ promise: Promise) {
        bluetoothAvailable = promise
        centralManager = CBCentralManager(delegate: self, queue: nil)
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    func startAdvertising(_ name: String, _ servicesJSON: String) {
        do {
            let servicesData = servicesJSON.data(using: .utf8) ?? Data()
            let def = try JSONDecoder().decode(ServicesDefinition.self, from: servicesData)
            var serviceUUIDs: [CBUUID] = []
            for service in createServices(def) {
                serviceUUIDs.append(service.uuid)
                peripheralManager?.add(service)
            }
            let advertisementData: [String: Any] = [
                CBAdvertisementDataLocalNameKey: name,
                CBAdvertisementDataServiceUUIDsKey: serviceUUIDs,
            ]
            peripheralManager?.startAdvertising(advertisementData)
        } catch {
            invalidServices()
        }
    }

    func stopAdvertising() {
        peripheralManager?.stopAdvertising()
    }

    func startScanning(_ services: [String]) {
        servicesFilter = []
        for service in services {
            servicesFilter.append(CBUUID(string: service))
        }
        centralManager?.scanForPeripherals(withServices: servicesFilter, options: nil)
    }

    func stopScanning() {
        centralManager?.stopScan()
    }

    func connect(_ device: String, _ reconnect: Bool) {
        if let peripheral = getPeripheral(device) {
            self.reconnect = reconnect
            centralManager?.connect(peripheral, options: nil)
        }
    }

    func disconnect(_ device: String) {
        if let peripheral = getPeripheral(device) {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
    }

    func read(_ device: String, _ characteristic: String) {
        if let (peripheral, characteristic) = getCharacteristic(device, characteristic) {
            peripheral.readValue(for: characteristic)
        }
    }

    func subscribe(_ device: String, _ characteristic: String) {
        if let (peripheral, characteristic) = getCharacteristic(device, characteristic) {
            peripheral.setNotifyValue(true, for: characteristic)
        }
    }

    func unsubscribe(_ device: String, _ characteristic: String) {
        if let (peripheral, characteristic) = getCharacteristic(device, characteristic) {
            peripheral.setNotifyValue(false, for: characteristic)
        }
    }

    func write(_ device: String, _ characteristic: String, _ value: Data, _ withResponse: Bool) {
        if let (peripheral, characteristic) = getCharacteristic(device, characteristic) {
            peripheral.writeValue(value, for: characteristic, type: withResponse ? .withResponse : .withoutResponse)
        }
    }

    func set(_ characteristic: String, _ value: Data) {
        if let characteristic = getMutableCharacteristic(characteristic) {
            if let success = peripheralManager?.updateValue(value, for: characteristic, onSubscribedCentrals: nil) {
                if success {
                    characteristic.value = value
                    onChange?("", characteristic.uuid.uuidString, value)
                }
            }
        }
    }
}

public class ExpoBluetoothModule: Module {
    lazy var deviceManager: DeviceManager = .init()

    public func definition() -> ModuleDefinition {
        Name("ExpoBluetooth")

        Events("onReady", "onDiscover", "onConnect", "onDisconnect", "onChange", "onWrite", "onError")

        OnCreate {
            _ = self.deviceManager
            self.deviceManager.onDiscover = { (device: String, name: String, rssi: Int8) in
                self.sendEvent("onDiscover", [
                    "device": device,
                    "name": name,
                    "rssi": rssi,
                ])
            }
            self.deviceManager.onConnect = { (device: String) in
                self.sendEvent("onConnect", [
                    "device": device,
                ])
            }
            self.deviceManager.onDisconnect = { (device: String) in
                self.sendEvent("onDisconnect", [
                    "device": device,
                ])
            }
            self.deviceManager.onChange = { (device: String, characteristic: String, value: Data) in
                self.sendEvent("onChange", [
                    "device": device,
                    "characteristic": characteristic,
                    "value": value,
                ])
            }
            self.deviceManager.onWrite = { (device: String, characteristic: String, value: Data) in
                self.sendEvent("onWrite", [
                    "device": device,
                    "characteristic": characteristic,
                    "value": value,
                ])
            }
            self.deviceManager.onError = { (code: UInt8, reason: String?, device: String?) in
                self.sendEvent("onError", [
                    "code": code,
                    "reason": reason ?? "",
                    "device": device ?? "",
                ])
            }
        }

        AsyncFunction("start") { (promise: Promise) in
            self.deviceManager.start(promise)
        }

        AsyncFunction("startAdvertising") { (name: String, servicesJSON: String) in
            self.deviceManager.startAdvertising(name, servicesJSON)
        }

        AsyncFunction("stopAdvertising") {
            self.deviceManager.stopAdvertising()
        }

        AsyncFunction("startScanning") { (services: [String]) in
            self.deviceManager.startScanning(services)
        }

        AsyncFunction("stopScanning") {
            self.deviceManager.stopScanning()
        }

        AsyncFunction("connect") { (device: String, reconnect: Bool) in
            self.deviceManager.connect(device, reconnect)
        }

        AsyncFunction("disconnect") { (device: String) in
            self.deviceManager.disconnect(device)
        }

        AsyncFunction("read") { (device: String, characteristic: String) in
            self.deviceManager.read(device, characteristic)
        }

        AsyncFunction("subscribe") { (device: String, characteristic: String) in
            self.deviceManager.subscribe(device, characteristic)
        }

        AsyncFunction("unsubscribe") { (device: String, characteristic: String) in
            self.deviceManager.unsubscribe(device, characteristic)
        }

        AsyncFunction("write") { (device: String, characteristic: String, value: Data, withResponse: Bool) in
            self.deviceManager.write(device, characteristic, value, withResponse)
        }

        AsyncFunction("set") { (characteristic: String, value: Data) in
            self.deviceManager.set(characteristic, value)
        }
    }
}
