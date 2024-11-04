import { LegacyEventEmitter as EventEmitter, type EventSubscription as Subscription, NativeModulesProxy } from 'expo-modules-core';
import { ENCODING_UTF8, createFrom } from 'stedy'

import {
  Data,
  CharacteristicProperty,
  Characteristic,
  Service,
  ConnectEvent,
  DisconnectEvent,
  ChangeEvent,
  WriteEvent,
  ErrorEvent,
  DiscoverEvent
} from './ExpoBluetooth.types'
import ExpoBluetoothModule from './ExpoBluetoothModule'

const emitter = new EventEmitter(
  ExpoBluetoothModule ?? NativeModulesProxy.ExpoBluetooth
)

export function addDiscoverListener(
  listener: (event: DiscoverEvent) => void
): Subscription {
  return emitter.addListener<DiscoverEvent>('onDiscover', listener)
}

export function addConnectListener(
  listener: (event: ConnectEvent) => void
): Subscription {
  return emitter.addListener<ConnectEvent>('onConnect', listener)
}

export function addDisconnectListener(
  listener: (event: DisconnectEvent) => void
): Subscription {
  return emitter.addListener<DisconnectEvent>('onDisconnect', listener)
}

export function addChangeListener(
  listener: (event: ChangeEvent) => void
): Subscription {
  return emitter.addListener<ChangeEvent>('onChange', listener)
}

export function addWriteListener(
  listener: (event: WriteEvent) => void
): Subscription {
  return emitter.addListener<WriteEvent>('onWrite', listener)
}

export function addErrorListener(
  listener: (event: ErrorEvent) => void
): Subscription {
  return emitter.addListener<ErrorEvent>('onError', listener)
}

function dataAsBytes(data?: Data): Uint8Array {
  return new Uint8Array(createFrom(data, ENCODING_UTF8))
}

export function createCharacteristic(
  uuid: string,
  properties: CharacteristicProperty[],
  value?: Data
): Characteristic {
  return {
    uuid,
    properties: new Set(properties),
    value: dataAsBytes(value)
  }
}

export function createService(
  uuid: string,
  primary: boolean,
  ...characteristics: Characteristic[]
): Service {
  return {
    uuid,
    primary,
    characteristics
  }
}

function servicesToJSON(services: Service[]): string {
  return JSON.stringify({
    services: services.map((s) => ({
      uuid: s.uuid,
      primary: s.primary,
      characteristics: s.characteristics.map((c) => ({
        uuid: c.uuid,
        properties: [...c.properties],
        value: [...c.value]
      }))
    }))
  })
}

export async function start(): Promise<boolean> {
  try {
    const enabled = await ExpoBluetoothModule.start()
    return enabled
  } catch {
    return false
  }
}

export function startAdvertising(name: string, ...services: Service[]) {
  return ExpoBluetoothModule.startAdvertising(name, servicesToJSON(services))
}

export function stopAdvertising() {
  return ExpoBluetoothModule.stopAdvertising()
}

export function startScanning(...services: string[]) {
  return ExpoBluetoothModule.startScanning(services)
}

export function stopScanning() {
  return ExpoBluetoothModule.stopScanning()
}

export function connect(device: string, reconnect: boolean = false) {
  return ExpoBluetoothModule.connect(device, reconnect)
}

export function disconnect(device: string) {
  return ExpoBluetoothModule.disconnect(device)
}

export function read(device: string, characteristic: string) {
  return ExpoBluetoothModule.read(device, characteristic)
}

export function subscribe(device: string, characteristic: string) {
  return ExpoBluetoothModule.subscribe(device, characteristic)
}

export function unsubscribe(device: string, characteristic: string) {
  return ExpoBluetoothModule.unsubscribe(device, characteristic)
}

export function write(
  device: string,
  characteristic: string,
  value: Data,
  withResponse: boolean = true
) {
  return ExpoBluetoothModule.write(
    device,
    characteristic,
    dataAsBytes(value),
    withResponse
  )
}

export function set(characteristic: string, value: Data) {
  return ExpoBluetoothModule.set(characteristic, dataAsBytes(value))
}

export {
  Data,
  CharacteristicProperty,
  Characteristic,
  Service,
  DiscoverEvent,
  ConnectEvent,
  DisconnectEvent,
  ChangeEvent,
  WriteEvent,
  ErrorEvent
}
