import ExpoModulesCore

let ERROR_NOT_IMPLEMENTED = 0

struct Device {
    let uuid: String
    let name: String
    let rssi: Int8
}

class DeviceManager {
    var onConnect: ((String, String, Int8) -> Void)?
    var onDisconnect: ((String) -> Void)?
    var onChange: ((String, String, Data) -> Void)?
    var onWrite: ((String, String, Data) -> Void)?
    var onError: ((UInt8, String?, String?) -> Void)?

    private func deviceError(_ code: Int, _ reason: String, _ device: Device?) {
        onError?(UInt8(code), reason, device ? device.id : "")
    }

    private func managerError(_ code: Int, _ reason: String) {
        deviceError(code, reason, nil)
    }

    private func notImplemented(_ fn: String) {
        managerError(ERROR_NOT_IMPLEMENTED, "\(fn) is not implemented yet")
    }

    func startAdvertising(_: String, _: String) {
        notImplemented("startAdvertising")
    }

    func stopAdvertising() {
        notImplemented("stopAdvertising")
    }

    func startScanning(_: [String], _: Bool) {
        notImplemented("startScanning")
    }

    func stopScanning() {
        notImplemented("stopScanning")
    }

    func connect(_: String, _: Bool) {
        notImplemented("connect")
    }

    func disconnect(_: String) {
        notImplemented("disconnect")
    }

    func read(_: String, _: String) {
        notImplemented("read")
    }

    func subscribe(_: String, _: String) {
        notImplemented("subscribe")
    }

    func unsubscribe(_: String, _: String) {
        notImplemented("unsubscribe")
    }

    func write(_: String, _: String, _: Data, _: Bool) {
        notImplemented("write")
    }

    func set(_: String, _: String, _: Data) {
        notImplemented("set")
    }

    func notify(_: String, _: String, _: Data) {
        notImplemented("notify")
    }
}

public class BluetoothModule: Module {
    lazy var deviceManager: DeviceManager = .init()

    public func definition() -> ModuleDefinition {
        Name("ExpoBluetooth")

        Events("onConnect", "onDisconnect", "onChange", "onWrite", "onError")

        OnCreate {
            _ = self.deviceManager
            self.deviceManager.onConnect = { (device: String, name: String, rssi: Int8) in
                self.sendEvent("onConnect", [
                    "device": device,
                    "name": name,
                    "rssi": rssi,
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

        Function("startAdvertising") { (name: String, servicesJSON: String) in
            self.deviceManager.startAdvertising(name, servicesJSON)
        }

        Function("stopAdvertising") {
            self.deviceManager.stopAdvertising()
        }

        Function("startScanning") { (services: [String], reconnect: Bool) in
            self.deviceManager.startScanning(services, reconnect)
        }

        Function("stopScanning") {
            self.deviceManager.stopScanning()
        }

        Function("connect") { (device: String, reconnect: Bool) in
            self.deviceManager.connect(device, reconnect)
        }

        Function("disconnect") { (device: String) in
            self.deviceManager.disconnect(device)
        }

        Function("read") { (device: String, characteristic: String) in
            self.deviceManager.read(device, characteristic)
        }

        Function("subscribe") { (device: String, characteristic: String) in
            self.deviceManager.subscribe(device, characteristic)
        }

        Function("unsubscribe") { (device: String, characteristic: String) in
            self.deviceManager.unsubscribe(device, characteristic)
        }

        Function("write") { (device: String, characteristic: String, value: Data, withResponse: Bool) in
            self.deviceManager.write(device, characteristic, value, withResponse)
        }

        Function("set") { (device: String, characteristic: String, value: Data) in
            self.deviceManager.set(device, characteristic, value)
        }

        Function("notify") { (device: String, characteristic: String, value: Data) in
            self.deviceManager.notify(device, characteristic, value)
        }
    }
}
