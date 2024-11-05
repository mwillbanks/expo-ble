export type Data = BufferSource | string

export type CharacteristicProperty = 'read' | 'notify' | 'write'

export type Characteristic = {
  uuid: string
  properties: Set<CharacteristicProperty>
  value: Uint8Array
}

export type Service = {
  uuid: string
  primary: boolean
  characteristics: Characteristic[]
}

export type DiscoverEvent = {
  device: string
  name: string
  rssi: number
  services: string[]
}

export type ConnectEvent = {
  device: string
}

export type DisconnectEvent = {
  device: string
}

export type ChangeEvent = {
  device: string
  characteristic: string
  value: Uint8Array
}

export type WriteEvent = {
  device: string
  characteristic: string
  value: Uint8Array
}

export type ErrorEvent = {
  code: number
  reason: string
  device: string
}
