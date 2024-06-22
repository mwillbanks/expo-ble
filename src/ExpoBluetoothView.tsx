import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoBluetoothViewProps } from './ExpoBluetooth.types';

const NativeView: React.ComponentType<ExpoBluetoothViewProps> =
  requireNativeViewManager('ExpoBluetooth');

export default function ExpoBluetoothView(props: ExpoBluetoothViewProps) {
  return <NativeView {...props} />;
}
