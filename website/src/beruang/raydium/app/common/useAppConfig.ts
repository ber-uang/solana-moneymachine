import { MAINNET_PROGRAM_ID, RAYDIUM_MAINNET } from '@raydium-io/raydium-sdk'
import { createStore } from 'zustand/vanilla'
import { ApiConfig } from './apiUrl.config'

export const DEFAULT_URL_ENDPOINT = 'https://uapi.raydium.io'
export type AppConfigStore = {
  mode: 'mainnet' | 'devnet'
  programIds: typeof MAINNET_PROGRAM_ID
  readonly apiUrls: {
    [K in keyof ApiConfig]: `https://uapi.raydium.io/${K}`
  }
  apiUrlOrigin: string
  apiUrlPathnames: typeof RAYDIUM_MAINNET

  slippageTolerance: number,
  transactionPriority?: number | 'auto'
}

export const useAppConfig = createStore<AppConfigStore>((set, get) => ({
  mode: 'mainnet',
  programIds: MAINNET_PROGRAM_ID,
  get apiUrls() {
    return new Proxy({} as any, {
      get(target, p, receiver) {
        return `${get().apiUrlOrigin}${get().apiUrlPathnames[p]}`
      }
    })
  },
  apiUrlOrigin: DEFAULT_URL_ENDPOINT,
  apiUrlPathnames: RAYDIUM_MAINNET,

  slippageTolerance: 0.1,
  transactionPriority: 'auto',
}))

export default useAppConfig
