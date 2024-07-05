import {
  ConfigPlugin,
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  IOSConfig
} from 'expo/config-plugins'

const pkg = require('../../package.json')

const hasAndroidPermission = (
  manifest: AndroidConfig.Manifest.AndroidManifest,
  permission: string
): boolean =>
  manifest.manifest['uses-permission']?.some(
    (item) => item.$['android:name'] === permission
  ) === true

const hasAndroidFeature = (
  manifest: AndroidConfig.Manifest.AndroidManifest,
  feature: string
): boolean =>
  manifest.manifest['uses-feature']?.some(
    (item) => item.$['android:name'] === feature
  ) === true

const addAndroidPermissions = (
  manifest: AndroidConfig.Manifest.AndroidManifest,
  permissions: string[],
  features: string[]
) => {
  if (!Array.isArray(manifest.manifest['uses-permission'])) {
    manifest.manifest['uses-permission'] = []
  }
  if (!Array.isArray(manifest.manifest['uses-feature'])) {
    manifest.manifest['uses-feature'] = []
  }
  permissions.forEach((permission) => {
    if (!hasAndroidPermission(manifest, permission)) {
      manifest.manifest['uses-permission']?.push({
        $: {
          'android:name': permission
        }
      })
    }
  })
  features.forEach((feature) => {
    if (!hasAndroidFeature(manifest, feature)) {
      manifest.manifest['uses-feature']?.push({
        $: {
          'android:name': feature,
          'android:required': 'true'
        }
      })
    }
  })
  return manifest
}

const withBluetoothAndroidPermissions: ConfigPlugin = (config) => {
  const permissions = [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.BLUETOOTH_CONNECT',
    'android.permission.BLUETOOTH_SCAN',
    'android.permission.BLUETOOTH_ADVERTISE'
  ]
  const features = ['android.hardware.bluetooth_le']
  config = AndroidConfig.Permissions.withPermissions(config, permissions)
  return withAndroidManifest(config, (manifest) => {
    manifest.modResults = AndroidConfig.Manifest.ensureToolsAvailable(
      manifest.modResults
    )
    manifest.modResults = addAndroidPermissions(
      manifest.modResults,
      permissions,
      features
    )
    return manifest
  })
}

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
  return withBluetoothAndroidPermissions(config)
}

export default createRunOncePlugin(withBluetooth, pkg.name, pkg.version)
