import { createStore } from 'zustand/vanilla'
import { ApiPoolInfoItem, ApiPoolInfo } from '@raydium-io/raydium-sdk'

import { HydratedLiquidityInfo, SDKParsedLiquidityInfo } from './type'

export interface LiquidityStore {

  /********************** caches (at least includes exhibition's data) **********************/
  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  jsonInfos: ApiPoolInfoItem[]
  officialIds: Set<ApiPoolInfoItem['id']>
  unOfficialIds: Set<ApiPoolInfoItem['id']>
  apiCacheInfo?: {
    fetchTime: number
    data: ApiPoolInfo
  }

  extraPoolLoading: boolean
  extraPooInfos: ApiPoolInfoItem[]

  /**
   *  additionally add 'SDK parsed data' (BN, PublicKey, etc.)
   */
  sdkParsedInfos: SDKParsedLiquidityInfo[] // auto parse info in {@link useLiquidityAuto}

  /**
   * additionally add 'hydrated data' (shorcuts data or customized data)
   * !important: only if pool is in userExhibitionLiquidityIds
   */
  hydratedInfos: HydratedLiquidityInfo[] // auto parse info in {@link useLiquidityAuto}
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useLiquidity.setState()` is enough
export const useLiquidity = createStore<LiquidityStore>((set, get) => ({
  /********************** caches (at least includes exhibition's data) **********************/

  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  jsonInfos: [],
  officialIds: new Set(),
  unOfficialIds: new Set(),
  apiCacheInfo: undefined,

  extraPoolLoading: false,
  extraPooInfos: [],
  /**
   *  additionally add 'SDK parsed data' (BN, PublicKey, etc.)
   */
  sdkParsedInfos: [], // auto parse info in {@link useLiquidityAuto}
  /**
   * additionally add 'hydrated data' (shorcuts data or customized data)
   */
  hydratedInfos: [], // auto parse info in {@link useLiquidityAuto}
}));

export default useLiquidity;
