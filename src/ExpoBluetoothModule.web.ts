/// <reference types="web-bluetooth" />

import { LegacyEventEmitter as EventEmitter } from 'expo-modules-core'
import { createFrom } from 'stedy'

const ERROR_NOT_IMPLEMENTED = 0
const ERROR_CONNECTION_FAILED = 6

type Device = {
  uuid: string
  name: string
  rssi: number
}

type DiscoverHandler = (device: string, name: string, rssi: number) => void

type ConnectHandler = (device: string) => void

type DisconnectHandler = (device: string) => void

type ChangeHandler = (
  device: string,
  characteristic: string,
  value: Uint8Array
) => void

type WriteHandler = (
  device: string,
  characteristic: string,
  value: Uint8Array
) => void

type ErrorHandler = (code: number, reason: string, device: string) => void

class DeviceManager {
  private onDiscover: DiscoverHandler
  private onConnect: ConnectHandler
  private onDisconnect: DisconnectHandler
  private onChange: ChangeHandler
  private onWrite: WriteHandler
  private onError: ErrorHandler

  private isScanning: boolean
  private reconnect: boolean
  private gattServer?: BluetoothRemoteGATTServer
  private bluetoothDevice?: BluetoothDevice
  private device?: Device
  private services?: string[]
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic>

  constructor({
    onDiscover,
    onConnect,
    onDisconnect,
    onChange,
    onWrite,
    onError
  }: {
    onDiscover: DiscoverHandler
    onConnect: ConnectHandler
    onDisconnect: DisconnectHandler
    onChange: ChangeHandler
    onWrite: WriteHandler
    onError: ErrorHandler
  }) {
    this.onDiscover = onDiscover
    this.onConnect = onConnect
    this.onDisconnect = onDisconnect
    this.onChange = onChange
    this.onWrite = onWrite
    this.onError = onError
    this.isScanning = false
    this.reconnect = false
    this.characteristics = new Map([])
  }

  private deviceError(code: number, reason: string, device?: Device) {
    this.onError(code, reason, device ? device.uuid : '')
  }

  private managerError(code: number, reason: string) {
    this.deviceError(code, reason, undefined)
  }

  private notImplemented(fn: string) {
    this.managerError(ERROR_NOT_IMPLEMENTED, `${fn} is not implemented yet`)
  }

  private valueChanged(characteristic: string, value: BufferSource) {
    if (this.device) {
      this.onChange(
        this.device.uuid,
        characteristic,
        new Uint8Array(createFrom(value))
      )
    }
  }

  private valueWritten(characteristic: string, value: Uint8Array) {
    if (this.device) {
      this.onWrite(this.device.uuid, characteristic, value)
    }
  }

  private async discoverCharacteristics(serviceUUID: string) {
    const service = await this.gattServer?.getPrimaryService(serviceUUID)
    const characteristics = (await service?.getCharacteristics()) || []
    characteristics.forEach((characteristic) => {
      this.characteristics.set(characteristic.uuid, characteristic)
    })
  }

  private async requestDevice() {
    this.isScanning = true
    try {
      this.bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: this.services || [] }]
      })
      this.device = {
        uuid: this.bluetoothDevice.id,
        name: this.bluetoothDevice.name || '',
        rssi: -42
      }
      this.onDiscover(this.device.uuid, this.device.name, this.device.rssi)
    } finally {
      this.isScanning = false
    }
  }

  start() {
    return 'bluetooth' in navigator
  }

  startAdvertising(name: string, servicesJSON: string) {
    this.notImplemented('startAdvertising')
  }

  stopAdvertising() {
    this.notImplemented('stopAdvertising')
  }

  startScanning(services: string[]) {
    if (!this.isScanning) {
      this.characteristics.clear()
      this.isScanning = true
      this.services = services
      this.requestDevice()
    }
  }

  stopScanning() {
    this.isScanning = false
  }

  async connect(device: string, reconnect: boolean) {
    try {
      this.gattServer = await this.bluetoothDevice?.gatt?.connect()
      await Promise.all(
        (this.services || []).map((service) =>
          this.discoverCharacteristics(service)
        )
      )
      if (this.device) {
        this.onConnect(this.device.uuid)
      }
    } catch (e) {
      this.managerError(
        ERROR_CONNECTION_FAILED,
        e.message || 'Connection failed'
      )
    }
  }

  disconnect() {
    this.characteristics.clear()
    this.isScanning = false
    if (this.gattServer?.connected) {
      this.gattServer.disconnect()
    }
    if (this.device) {
      this.onDisconnect(this.device.uuid)
    }
  }

  read(device: string, characteristic: string) {
    this.characteristics
      .get(characteristic)
      ?.readValue()
      .then((value) => {
        this.valueChanged(characteristic, value)
      })
  }

  subscribe(device: string, characteristic: string) {
    const c = this.characteristics.get(characteristic)
    if (c) {
      c.addEventListener('characteristicvaluechanged', (event) => {
        // @ts-ignore
        this.valueChanged(characteristic, event.target.value)
      })
      c.startNotifications()
    }
  }

  unsubscribe(device: string, characteristic: string) {
    return this.characteristics.get(characteristic)?.stopNotifications()
  }

  write(
    device: string,
    characteristic: string,
    value: Uint8Array,
    withResponse: boolean
  ) {
    if (withResponse) {
      this.characteristics
        .get(characteristic)
        ?.writeValueWithResponse(value)
    } else {
      this.characteristics
        .get(characteristic)
        ?.writeValueWithoutResponse(value)
    }
    this.valueWritten(characteristic, value)
  }

  set(characteristic: string, value: Uint8Array) {
    this.notImplemented('set')
  }
}

const emitter = new EventEmitter({} as any)

const deviceManager = new DeviceManager({
  onDiscover: (device: string, name: string, rssi: number) => {
    emitter.emit('onDiscover', { device, name, rssi })
  },
  onConnect: (device: string) => {
    emitter.emit('onConnect', { device })
  },
  onDisconnect: (device: string) => {
    emitter.emit('onDisconnect', { device })
  },
  onChange: (device: string, characteristic: string, value: Uint8Array) => {
    emitter.emit('onChange', { device, characteristic, value })
  },
  onWrite: (device: string, characteristic: string, value: Uint8Array) => {
    emitter.emit('onWrite', { device, characteristic, value })
  },
  onError: (code: number, reason: string, device: string) => {
    emitter.emit('onError', { code, reason, device })
  }
})

export default {
  start() {
    return deviceManager.start()
  },
  startAdvertising(name: string, servicesJSON: string) {
    deviceManager.startAdvertising(name, servicesJSON)
  },
  stopAdvertising() {
    deviceManager.stopAdvertising()
  },
  startScanning(services: string[], reconnect: boolean) {
    deviceManager.startScanning(services)
  },
  stopScanning() {
    deviceManager.stopScanning()
  },
  connect(device: string, reconnect: boolean) {
    deviceManager.connect(device, reconnect)
  },
  disconnect(device: string) {
    deviceManager.disconnect()
  },
  read(device: string, characteristic: string) {
    deviceManager.read(device, characteristic)
  },
  subscribe(device: string, characteristic: string) {
    deviceManager.subscribe(device, characteristic)
  },
  unsubscribe(device: string, characteristic: string) {
    deviceManager.unsubscribe(device, characteristic)
  },
  write(
    device: string,
    characteristic: string,
    value: Uint8Array,
    withResponse: boolean
  ) {
    deviceManager.write(device, characteristic, value, withResponse)
  },
  set(characteristic: string, value: Uint8Array) {
    deviceManager.set(characteristic, value)
  }
}
