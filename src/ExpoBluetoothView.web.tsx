import * as React from 'react';

import { ExpoBluetoothViewProps } from './ExpoBluetooth.types';

export default function ExpoBluetoothView(props: ExpoBluetoothViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
