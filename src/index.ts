import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoBluetooth.web.ts
// and on native platforms to ExpoBluetooth.ts
import ExpoBluetoothModule from './ExpoBluetoothModule';
import ExpoBluetoothView from './ExpoBluetoothView';
import { ChangeEventPayload, ExpoBluetoothViewProps } from './ExpoBluetooth.types';

// Get the native constant value.
export const PI = ExpoBluetoothModule.PI;

export function hello(): string {
  return ExpoBluetoothModule.hello();
}

export async function setValueAsync(value: string) {
  return await ExpoBluetoothModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExpoBluetoothModule ?? NativeModulesProxy.ExpoBluetooth);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ExpoBluetoothView, ExpoBluetoothViewProps, ChangeEventPayload };
