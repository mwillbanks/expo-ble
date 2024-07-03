import * as Bluetooth from 'expo-ble'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native'
import { createFrom } from 'stedy'

const SERVICE_UUID = 'ee8347d0-f2b5-4433-ab41-3f57e65d5054'
const VALUE_CHARACTERISTIC = '131273c4-c55a-4377-8c8c-d5a2d39fb2a0'

export default function App() {
  const [role, setRole] = useState<string>(
    Platform.OS === 'web' ? 'central' : ''
  )
  const [isReady, setReady] = useState(false)
  const [isConnected, setConnected] = useState(false)
  const [isAdvertising, setAdvertising] = useState(false)
  const [isScanning, setScanning] = useState(false)
  const [device, setDevice] = useState<string>()
  const [name, setName] = useState<string>()
  const [value, setValue] = useState<string>()

  useEffect(() => {
    const readySubscription = Bluetooth.addReadyListener(() => {
      setReady(true)
    })
    const discoverSubscription = Bluetooth.addDiscoverListener(
      (event: Bluetooth.DiscoverEvent) => {
        setDevice(event.device)
        setName(event.name)
      }
    )
    const connectSubscription = Bluetooth.addConnectListener(() => {
      setScanning(false)
      setConnected(true)
    })
    const disconnectSubscription = Bluetooth.addDisconnectListener(() => {
      setConnected(false)
    })
    const changeSubscription = Bluetooth.addChangeListener(
      (event: Bluetooth.ChangeEvent) => {
        setValue(createFrom(event.value).toString())
      }
    )
    Bluetooth.start()
    return () => {
      readySubscription.remove()
      discoverSubscription.remove()
      connectSubscription.remove()
      disconnectSubscription.remove()
      changeSubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (isAdvertising) {
      Bluetooth.startAdvertising(
        'Expo Peripheral',
        Bluetooth.createService(
          SERVICE_UUID,
          true,
          Bluetooth.createCharacteristic(VALUE_CHARACTERISTIC, [
            'read',
            'write',
            'notify'
          ])
        )
      )
    } else {
      Bluetooth.stopAdvertising()
    }
  }, [isReady, isAdvertising])

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (isScanning) {
      Bluetooth.startScanning(SERVICE_UUID)
    } else {
      Bluetooth.stopScanning()
    }
  }, [isReady, isScanning])

  useEffect(() => {
    if (isReady && isConnected && device) {
      Bluetooth.subscribe(device, VALUE_CHARACTERISTIC)
    }
  }, [isReady, isConnected, device])

  useEffect(() => {
    if (!(isReady && isConnected && device && value)) {
      return
    }
    if (role === 'central') {
      Bluetooth.write(device, VALUE_CHARACTERISTIC, createFrom(value))
    }
    if (role === 'peripheral') {
      Bluetooth.set(VALUE_CHARACTERISTIC, createFrom(value))
    }
  }, [isReady, isConnected, device, role, value])

  return (
    <View style={styles.container}>
      {role.length === 0 && (
        <View>
          <Text style={styles.text}>Choose device role</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setRole('peripheral')
            }}>
            <Text style={styles.buttonText}>Peripheral</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              setRole('central')
            }}>
            <Text style={styles.buttonText}>Central</Text>
          </Pressable>
        </View>
      )}
      {role === 'central' && (
        <View>
          <Text style={styles.text}>Status</Text>
          {isConnected && <Text style={styles.connected}>Connected</Text>}
          {isConnected || <Text style={styles.disconnected}>Disconnected</Text>}
        </View>
      )}
      {role.length > 0 && (
        <View>
          <Text style={styles.text}>Device</Text>
          <Text style={styles.heading}>{name}</Text>
          <Text style={styles.text}>Current value</Text>
          <Text style={styles.heading}>{value}</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setValue('Hello World 👋')
            }}>
            <Text style={styles.buttonText}>Say Hello</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              setValue('Bye 🫡')
            }}>
            <Text style={styles.buttonText}>Say Goodbye</Text>
          </Pressable>
        </View>
      )}
      {role === 'central' && (
        <View>
          {isScanning || (
            <Pressable
              style={styles.button}
              onPress={() => {
                setScanning(true)
              }}>
              <Text style={styles.buttonText}>Start scanning</Text>
            </Pressable>
          )}
          {isScanning && (
            <Pressable
              style={styles.button}
              onPress={() => {
                setScanning(false)
              }}>
              <Text style={styles.buttonText}>Stop scanning</Text>
            </Pressable>
          )}
        </View>
      )}
      {role === 'peripheral' && (
        <View>
          {isAdvertising || (
            <Pressable
              style={styles.button}
              onPress={() => {
                setAdvertising(true)
              }}>
              <Text style={styles.buttonText}>Start advertising</Text>
            </Pressable>
          )}
          {isAdvertising && (
            <Pressable
              style={styles.button}
              onPress={() => {
                setAdvertising(false)
              }}>
              <Text style={styles.buttonText}>Stop advertising</Text>
            </Pressable>
          )}
        </View>
      )}
      {Platform.OS !== 'web' && role.length > 0 && (
        <View>
          <Pressable
            style={styles.button}
            onPress={() => {
              setRole('')
            }}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    height: 42,
    width: 200,
    borderWidth: 1,
    marginTop: 24,
    padding: 12,
    borderRadius: 21,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3c3c3c'
  },
  text: {
    color: '#3c3c3c',
    fontWeight: '100',
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  heading: {
    color: '#3c3c3c',
    fontWeight: '100',
    fontSize: 24,
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center'
  },
  disconnected: {
    color: 'red',
    fontWeight: '100',
    fontSize: 24,
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 24
  },
  connected: {
    color: 'green',
    fontWeight: '100',
    fontSize: 24,
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 24
  },
  buttonText: {
    color: 'white',
    fontWeight: '100',
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0.5
  }
})
