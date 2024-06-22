package expo.modules.bluetooth

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ERROR_NOT_IMPLEMENTED = 0

data class Device(val uuid: String, val name: String, val rssi: Int)

class DeviceManager {
    var onConnect: ((String, String, Int) -> Unit)? = null
    var onDisconnect: ((String) -> Unit)? = null
    var onChange: ((String, String, ByteArray) -> Unit)? = null
    var onWrite: ((String, String, ByteArray) -> Unit)? = null
    var onError: ((Byte, String?, String?) -> Unit)? = null

    private fun deviceError(code: Int, reason: String, device: Device?) {
        onError?.invoke(code.toByte(), reason, device?.uuid ?: "")
    }

    private fun managerError(code: Int, reason: String) {
        deviceError(code, reason, null)
    }

    private fun notImplemented(fn: String) {
        managerError(ERROR_NOT_IMPLEMENTED, "$fn is not implemented yet")
    }

    fun startAdvertising(name: String, servicesJSON: String) {
        notImplemented("startAdvertising")
    }

    fun stopAdvertising() {
        notImplemented("stopAdvertising")
    }

    fun startScanning(services: List<String>, reconnect: Boolean) {
        notImplemented("startScanning")
    }

    fun stopScanning() {
        notImplemented("stopScanning")
    }

    fun connect(device: String, reconnect: Boolean) {
        notImplemented("connect")
    }

    fun disconnect(device: String) {
        notImplemented("disconnect")
    }

    fun read(device: String, characteristic: String) {
        notImplemented("read")
    }

    fun subscribe(device: String, characteristic: String) {
        notImplemented("subscribe")
    }

    fun unsubscribe(device: String, characteristic: String) {
        notImplemented("unsubscribe")
    }

    fun write(device: String, characteristic: String, value: ByteArray, withResponse: Boolean) {
        notImplemented("write")
    }

    fun set(device: String, characteristic: String, value: ByteArray) {
        notImplemented("set")
    }

    fun notify(device: String, characteristic: String, value: ByteArray) {
        notImplemented("notify")
    }
}

class BluetoothModule : Module() {
    private val deviceManager: DeviceManager = DeviceManager()

    override fun definition() = ModuleDefinition {
        Name("ExpoBluetooth")

        Events("onConnect", "onDisconnect", "onChange", "onWrite", "onError")

        OnCreate {
            deviceManager.apply {
                onConnect = { device, name, rssi ->
                    sendEvent("onConnect", mapOf("device" to device, "name" to name, "rssi" to rssi))
                }
                onDisconnect = { device ->
                    sendEvent("onDisconnect", mapOf("device" to device))
                }
                onChange = { device, characteristic, value ->
                    sendEvent("onChange", mapOf("device" to device, "characteristic" to characteristic, "value" to value))
                }
                onWrite = { device, characteristic, value ->
                    sendEvent("onWrite", mapOf("device" to device, "characteristic" to characteristic, "value" to value))
                }
                onError = { code, reason, device ->
                    sendEvent("onError", mapOf("code" to code, "reason" to (reason ?: ""), "device" to (device ?: "")))
                }
            }
        }

        Function("startAdvertising") { name: String, servicesJSON: String ->
            deviceManager.startAdvertising(name, servicesJSON)
        }

        Function("stopAdvertising") {
            deviceManager.stopAdvertising()
        }

        Function("startScanning") { services: List<String>, reconnect: Boolean ->
            deviceManager.startScanning(services, reconnect)
        }

        Function("stopScanning") {
            deviceManager.stopScanning()
        }

        Function("connect") { device: String, reconnect: Boolean ->
            deviceManager.connect(device, reconnect)
        }

        Function("disconnect") { device: String ->
            deviceManager.disconnect(device)
        }

        Function("read") { device: String, characteristic: String ->
            deviceManager.read(device, characteristic)
        }

        Function("subscribe") { device: String, characteristic: String ->
            deviceManager.subscribe(device, characteristic)
        }

        Function("unsubscribe") { device: String, characteristic: String ->
            deviceManager.unsubscribe(device, characteristic)
        }

        Function("write") { device: String, characteristic: String, value: ByteArray, withResponse: Boolean ->
            deviceManager.write(device, characteristic, value, withResponse)
        }

        Function("set") { device: String, characteristic: String, value: ByteArray ->
            deviceManager.set(device, characteristic, value)
        }

        Function("notify") { device: String, characteristic: String, value: ByteArray ->
            deviceManager.notify(device, characteristic, value)
        }
    }
}
