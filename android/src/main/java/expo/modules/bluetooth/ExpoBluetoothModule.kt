package expo.modules.bluetooth

import android.Manifest.permission.ACCESS_FINE_LOCATION
import android.Manifest.permission.BLUETOOTH_ADVERTISE
import android.Manifest.permission.BLUETOOTH_CONNECT
import android.Manifest.permission.BLUETOOTH_SCAN
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import androidx.annotation.RequiresApi
import expo.modules.interfaces.permissions.Permissions.askForPermissionsWithPermissionsManager
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

private const val ERROR_NOT_IMPLEMENTED = 0

data class Device(val uuid: String, val name: String, val rssi: Int)

class DeviceManager(private val appContext: AppContext) {
    private var discoveredDevices = mutableMapOf<String, BluetoothDevice>()
    private var bluetoothGatt: BluetoothGatt? = null

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val bluetoothManager =
            appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothManager?.adapter
    }

    var onDiscover: ((String, String, Int) -> Unit)? = null
    var onConnect: ((String) -> Unit)? = null
    var onDisconnect: ((String) -> Unit)? = null
    var onChange: ((String, String, ByteArray) -> Unit)? = null
    var onWrite: ((String, String, ByteArray) -> Unit)? = null
    var onError: ((Byte, String?, String?) -> Unit)? = null

    private fun getDevice(address: String): BluetoothDevice? {
        val key = address.uppercase()
        if (discoveredDevices.containsKey(key)) {
            return discoveredDevices[key]
        }
        return null
    }

    private fun getCharacteristic(uuid: String): BluetoothGattCharacteristic? {
        val services = bluetoothGatt?.services ?: listOf()
        for (service in services) {
            val characteristic =
                service.characteristics.find {
                    it.uuid == UUID.fromString(uuid)
                }
            if (characteristic != null) {
                return characteristic
            }
        }
        return null
    }

    @SuppressLint("MissingPermission")
    private fun setNotificationsEnabled(
        characteristic: String,
        isEnabled: Boolean,
    ) {
        getCharacteristic(characteristic)?.let {
            bluetoothGatt?.setCharacteristicNotification(it, isEnabled)
            val descriptor = it.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
            descriptor.value =
                if (isEnabled) {
                    BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                } else {
                    BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                }
            bluetoothGatt?.writeDescriptor(descriptor)
        }
    }

    private val gattCallback =
        object : BluetoothGattCallback() {
            @SuppressLint("MissingPermission")
            override fun onConnectionStateChange(
                gatt: BluetoothGatt,
                status: Int,
                newState: Int,
            ) {
                bluetoothGatt = gatt
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    gatt.requestMtu(512)
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    discoveredDevices.remove(gatt.device.address)
                    onDisconnect?.let { it(gatt.device.address) }
                    gatt.close()
                }
            }

            @SuppressLint("MissingPermission")
            override fun onMtuChanged(
                gatt: BluetoothGatt,
                mtu: Int,
                status: Int,
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    gatt.discoverServices()
                }
            }

            @SuppressLint("MissingPermission")
            override fun onServicesDiscovered(
                gatt: BluetoothGatt,
                status: Int,
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    onConnect?.let { it(gatt.device.address) }
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onCharacteristicRead(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int,
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    onChange?.let { it(gatt.device.address, characteristic.uuid.toString(), characteristic.value) }
                }
            }

            override fun onCharacteristicWrite(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int,
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    onWrite?.let { it(gatt.device.address, characteristic.uuid.toString(), characteristic.value) }
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
            ) {
                onChange?.let { it(gatt.device.address, characteristic.uuid.toString(), characteristic.value) }
            }
        }

    private val scanCallback =
        object : ScanCallback() {
            @SuppressLint("MissingPermission")
            override fun onScanResult(
                callbackType: Int,
                result: ScanResult,
            ) {
                discoveredDevices[result.device.address] = result.device
                onDiscover?.let { it(result.device.address, result.device?.name ?: "Unknown", result.rssi) }
            }
        }

    private fun deviceError(
        code: Int,
        reason: String,
        device: BluetoothDevice?,
    ) {
        onError?.invoke(code.toByte(), reason, device?.address ?: "")
    }

    private fun managerError(
        code: Int,
        reason: String,
    ) {
        deviceError(code, reason, null)
    }

    private fun notImplemented(fn: String) {
        managerError(ERROR_NOT_IMPLEMENTED, "$fn is not implemented yet")
    }

    @RequiresApi(Build.VERSION_CODES.S)
    fun start(promise: Promise) {
        askForPermissionsWithPermissionsManager(
            appContext.permissions,
            promise,
            ACCESS_FINE_LOCATION,
            BLUETOOTH_CONNECT,
            BLUETOOTH_SCAN,
            BLUETOOTH_ADVERTISE,
        )
    }

    fun startAdvertising(
        name: String,
        servicesJSON: String,
    ) {
        notImplemented("startAdvertising")
    }

    fun stopAdvertising() {
        notImplemented("stopAdvertising")
    }

    @SuppressLint("MissingPermission")
    fun startScanning(services: List<String>) {
        val scanFilters =
            services.map { uuid ->
                ScanFilter.Builder()
                    .setServiceUuid(ParcelUuid(UUID.fromString(uuid)))
                    .build()
            }
        val scanSettings =
            ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()
        bluetoothAdapter?.bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)
    }

    @SuppressLint("MissingPermission")
    fun stopScanning() {
        bluetoothAdapter?.bluetoothLeScanner?.stopScan(scanCallback)
    }

    @SuppressLint("MissingPermission")
    fun connect(
        device: String,
        reconnect: Boolean,
    ) {
        getDevice(device)?.connectGatt(appContext.reactContext, reconnect, gattCallback)
    }

    @SuppressLint("MissingPermission")
    fun disconnect(device: String) {
        bluetoothGatt?.disconnect()
    }

    @SuppressLint("MissingPermission")
    fun read(
        device: String,
        characteristic: String,
    ) {
        getCharacteristic(characteristic)?.let { bluetoothGatt?.readCharacteristic(it) }
    }

    fun subscribe(
        device: String,
        characteristic: String,
    ) {
        setNotificationsEnabled(characteristic, true)
    }

    fun unsubscribe(
        device: String,
        characteristic: String,
    ) {
        setNotificationsEnabled(characteristic, false)
    }

    @SuppressLint("MissingPermission")
    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    fun write(
        device: String,
        characteristic: String,
        value: ByteArray,
        withResponse: Boolean,
    ) {
        getCharacteristic(characteristic)?.let {
            bluetoothGatt?.writeCharacteristic(
                it,
                value,
                if (withResponse) {
                    BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                } else {
                    BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                },
            )
        }
    }

    fun set(
        characteristic: String,
        value: ByteArray,
    ) {
        notImplemented("set")
    }
}

class ExpoBluetoothModule : Module() {
    private var deviceManager: DeviceManager? = null

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun definition() =
        ModuleDefinition {
            Name("ExpoBluetooth")

            Events("onDiscover", "onConnect", "onDisconnect", "onChange", "onWrite", "onError")

            OnStartObserving {
                deviceManager = DeviceManager(appContext)
                deviceManager?.apply {
                    onDiscover = { device, name, rssi ->
                        sendEvent("onDiscover", mapOf("device" to device.lowercase(), "name" to name, "rssi" to rssi))
                    }
                    onConnect = { device ->
                        sendEvent("onConnect", mapOf("device" to device.lowercase()))
                    }
                    onDisconnect = { device ->
                        sendEvent("onDisconnect", mapOf("device" to device.lowercase()))
                    }
                    onChange = { device, characteristic, value ->
                        sendEvent("onChange", mapOf("device" to device.lowercase(), "characteristic" to characteristic.lowercase(), "value" to value))
                    }
                    onWrite = { device, characteristic, value ->
                        sendEvent("onWrite", mapOf("device" to device.lowercase(), "characteristic" to characteristic.lowercase(), "value" to value))
                    }
                    onError = { code, reason, device ->
                        sendEvent("onError", mapOf("code" to code, "reason" to (reason ?: ""), "device" to (device?.lowercase() ?: "")))
                    }
                }
            }

            AsyncFunction("start") { promise: Promise ->
                deviceManager?.start(promise)
            }

            Function("startAdvertising") { name: String, servicesJSON: String ->
                deviceManager?.startAdvertising(name, servicesJSON)
            }

            Function("stopAdvertising") {
                deviceManager?.stopAdvertising()
            }

            Function("startScanning") { services: List<String> ->
                deviceManager?.startScanning(services)
            }

            Function("stopScanning") {
                deviceManager?.stopScanning()
            }

            Function("connect") { device: String, reconnect: Boolean ->
                deviceManager?.connect(device, reconnect)
            }

            Function("disconnect") { device: String ->
                deviceManager?.disconnect(device)
            }

            Function("read") { device: String, characteristic: String ->
                deviceManager?.read(device, characteristic)
            }

            Function("subscribe") { device: String, characteristic: String ->
                deviceManager?.subscribe(device, characteristic)
            }

            Function("unsubscribe") { device: String, characteristic: String ->
                deviceManager?.unsubscribe(device, characteristic)
            }

            Function("write") { device: String, characteristic: String, value: ByteArray, withResponse: Boolean ->
                deviceManager?.write(device, characteristic, value, withResponse)
            }

            Function("set") { characteristic: String, value: ByteArray ->
                deviceManager?.set(characteristic, value)
            }
        }
}
