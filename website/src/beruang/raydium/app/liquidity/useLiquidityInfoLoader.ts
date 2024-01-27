
import { ApiPoolInfo, ApiPoolInfoItem } from '@raydium-io/raydium-sdk'

// import useConnection from '@/application/connection/useConnection'
// import useToken from '@/application/token/useToken'
// import useWallet from '@/application/wallet/useWallet'
// import { shakeUndifindedItem } from '@/functions/arrayMethods'
import jFetch from '../../functions/jFetch'
// import toPubString from '@/functions/format/toMintString'
// import { areShallowEqual } from '@/functions/judgers/areEqual'
// import { gt } from '@/functions/numberish/compare'
// import { useRecordedEffect } from '@/hooks/useRecordedEffect'
// import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'

// import { getUserTokenEvenNotExist } from '../token/getUserTokenEvenNotExist'

// import hydrateLiquidityInfo from './hydrateLiquidityInfo'
// import sdkParseJsonLiquidityInfo from './sdkParseJsonLiquidityInfo'
import useLiquidity from './useLiquidity'
import useAppConfig from '../common/useAppConfig'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'
import useConnection from '../connection/useConnection'
import toPubString from 'beruang/raydium/functions/format/toMintString'
import hydrateLiquidityInfo from './hydrateLiquidityInfo'

export const parseAndSetPoolList = (response?: ApiPoolInfo, fetchTime?: number) => {
  // const blacklist = await jFetch<HexAddress[]>('/amm-blacklist.json')
  const liquidityInfoList = [...(response?.official ?? []), ...(response?.unOfficial ?? [])]
  // no raydium blacklist amm
  // .filter((info) => !(blacklist ?? []).includes(info.id))
  const officialIds = new Set(response?.official?.map((i) => i.id))
  const unOfficialIds = new Set(response?.unOfficial?.map((i) => i.id))

  const extraPoolInfos = useLiquidity.getState().extraPooInfos
  const readyMergePools = extraPoolInfos.filter((p) => !officialIds.has(p.id) && !unOfficialIds.has(p.id))
  liquidityInfoList.push(...readyMergePools)
  readyMergePools.forEach((p) => unOfficialIds.add(p.id))

  if (liquidityInfoList)
    useLiquidity.setState({
      ...(response ? { apiCacheInfo: { fetchTime: fetchTime || Date.now(), data: response } } : {}),
      jsonInfos: liquidityInfoList,
      officialIds,
      unOfficialIds
    })
}

export const fetchUpdatePoolInfo = async () => {
  const now = new Date()
  const checkPrefix = (val: number) => (val < 10 ? `0${val}` : val.toString())
  const [year, month, day] = [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()]
  const dailyPoolInfo = useAppConfig.getState().apiUrls.dailyPoolInfo
  const response = await jFetch<ApiPoolInfo>(dailyPoolInfo + `/${year}-${checkPrefix(month)}-${checkPrefix(day)}`)
  const data: Map<string, ApiPoolInfoItem> = new Map()
  response?.official.forEach((pool) => {
    data.set(pool.id, pool)
  })
  response?.unOfficial.forEach((pool) => {
    data.set(pool.id, pool)
  })
  return data
}

/**
 * will load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default async function useLiquidityInfoLoader() {
  const {
    jsonInfos,
    sdkParsedInfos,
    hydratedInfos
  } = useLiquidity.getState()
  const getToken = useToken.getState().getToken
  const getLpToken = useToken.getState().getLpToken
  const isLpToken = useToken.getState().isLpToken
  const connection = useConnection.getState().connection
  const pureRawBalances = useWallet.getState().pureRawBalances
  const poolInfoUrl = useAppConfig.getState().apiUrls.uiPoolInfo

  /** fetch json info list  */
  const response = await jFetch<ApiPoolInfo>(poolInfoUrl, {
    cacheFreshTime: 1000 * 30
  })
  parseAndSetPoolList(response)

  /** get userExhibitionLiquidityIds */
  // useTransitionedEffect(async () => {
  //   // when refresh, it will refresh twice. one for rawBalance, one for liquidityRefreshCount
  //   if (disabled) return
  //   if (!isLiquidityPage) return
  //   if (!jsonInfos) return
  //   const liquidityLpMints = new Set(jsonInfos.map((jsonInfo) => jsonInfo.lpMint))
  //   const allLpBalance = Object.entries(pureRawBalances).filter(
  //     ([mint, tokenAmount]) => liquidityLpMints.has(mint) && gt(tokenAmount, 0)
  //   )
  //   const allLpBalanceMint = allLpBalance.map(([mint]) => mint)
  //   const userExhibitionLiquidityIds = jsonInfos
  //     .filter((jsonInfo) => allLpBalanceMint.includes(jsonInfo.lpMint))
  //     .map((jsonInfo) => jsonInfo.id)

  //   useLiquidity.setState({ userExhibitionLiquidityIds })
  // }, [disabled, isLiquidityPage, jsonInfos, pureRawBalances, isLpToken, refreshCount])

  /** json infos ➡ sdkParsed infos (only wallet's LP)  */
  // useRecordedEffect(
  //   async ([, , , prevUserExhibitionLiquidityIds, prevRefreshCount]) => {
  //     if (disabled) return
  //     if (!connection || !jsonInfos.length || !userExhibitionLiquidityIds.length) return
  //     if (
  //       prevRefreshCount == refreshCount &&
  //       areShallowEqual(prevUserExhibitionLiquidityIds, userExhibitionLiquidityIds)
  //     )
  //       return

  //     const sdkParsedInfos = await sdkParseJsonLiquidityInfo(
  //       jsonInfos.filter((i) => userExhibitionLiquidityIds.includes(i.id)),
  //       connection
  //     )
  //     useLiquidity.setState({ sdkParsedInfos: shakeUndifindedItem(sdkParsedInfos) })
  //   },
  //   [disabled, connection, jsonInfos, userExhibitionLiquidityIds, refreshCount] as const
  // )

  /** sdkParsed infos (only wallet's LP) ➡  hydrated infos (only wallet's LP)*/
  const _hydratedInfos = sdkParsedInfos.map((liquidityInfo) =>
    hydrateLiquidityInfo(liquidityInfo, {
      getToken,
      getLpToken,
      lpBalance: pureRawBalances[toPubString(liquidityInfo.lpMint)]
    })
  )
  useLiquidity.setState({ hydratedInfos: _hydratedInfos })

  // record id to userAddedTokens
  // useRecordedEffect(
  //   ([prevHydratedInfos]) => {
  //     const areHydratedIdsNotChanged =
  //       prevHydratedInfos &&
  //       areShallowEqual(
  //         prevHydratedInfos?.map((i) => toPubString(i.id)),
  //         hydratedInfos.map((i) => toPubString(i.id))
  //       )
  //     if (areHydratedIdsNotChanged) return
  //     const recordedHydratedInfos = hydratedInfos.map((i) => {
  //       getUserTokenEvenNotExist(i.baseMint)
  //       getUserTokenEvenNotExist(i.quoteMint)
  //       return hydrateLiquidityInfo(i.sdkInfo, {
  //         getToken,
  //         getLpToken,
  //         lpBalance: pureRawBalances[toPubString(i.lpMint)]
  //       })
  //     })
  //     useLiquidity.setState({ hydratedInfos: recordedHydratedInfos })
  //   },
  //   [hydratedInfos]
  // )
}
