import {
  ConfigPlugin,
  AndroidConfig,
  createRunOncePlugin,
  IOSConfig
} from 'expo/config-plugins'

const pkg = require('../../package.json')

const withBluetooth: ConfigPlugin<
  {
    permission?: string | false
  } | void
> = (config, { permission } = {}) => {
  config = IOSConfig.Permissions.createPermissionsPlugin({
    NSBluetoothAlwaysUsageDescription: 'Allow $(PRODUCT_NAME) to use Bluetooth'
  })(config, {
    NSBluetoothAlwaysUsageDescription: permission
  })

  config = AndroidConfig.Permissions.withPermissions(
    config,
    [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_ADVERTISE'
    ].filter(Boolean) as string[]
  )

  return config
}

export default createRunOncePlugin(withBluetooth, pkg.name, pkg.version)
