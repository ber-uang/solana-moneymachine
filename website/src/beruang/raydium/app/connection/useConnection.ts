import { Connection, EpochInfo } from '@solana/web3.js'

import { createStore } from 'zustand/vanilla'

import { Endpoint } from './type'
import { switchRpc } from './switchRpc'

export const CONNECT_ERROR_VERSION_TOO_OLD = 'CONNECT_ERROR_VERSION_TOO_OLD'
export const CONNECT_ERROR_NETWORK_ERROR = 'CONNECT_ERROR_NETWORK_ERROR'

export interface ConnectionError {
  type: typeof CONNECT_ERROR_VERSION_TOO_OLD | typeof CONNECT_ERROR_NETWORK_ERROR
  err?: Error | string
  timestamp: number
  details?: Record<string, any>
}

export type ConnectionStore = {
  connection: Connection | undefined
  version?: string | number

  // for online chain time is later than UTC
  chainTimeOffset?: number // UTCTime + onlineChainTimeOffset = onLineTime

  endpoint: Endpoint | undefined

  /**
   * true: success to switch
   * false: fail to switch (connect error)
   * undefined: get result but not target endpoint (maybe user have another choice)
   */
  connectRpc: (endPoint: Endpoint) => Promise<void>
  getChainDate: () => Date
}
// export const LOCALSTORAGE_KEY_USER_RPC = 'USER_RPC'
// export const SESSION_STORAGE_USER_SELECTED_RPC = 'user-selected-rpc'
/** zustand store hooks */
export const useConnection = createStore<ConnectionStore>((set, get) => ({
  connection: undefined,

  endpoint: undefined,

  connectRpc: switchRpc,
  getChainDate() {
    return new Date(Date.now() + (get().chainTimeOffset ?? 0))
  }
}))

export default useConnection
