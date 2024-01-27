import { Price } from '@raydium-io/raydium-sdk'

import { unifyItem } from '../../functions/arrayMethods'
import jFetch from '../../functions/jFetch'
import listToMap from '../../functions/format/listToMap'
import toPubString from '../../functions/format/toMintString'
import toTokenPrice from '../../functions/format/toTokenPrice'
import { isPubEqual } from '../../functions/judgers/areEqual'
import { lazyMap } from '../../functions/lazyMap'
import { HexAddress } from '../../types/constants'

import useAppConfig from '../common/useAppConfig'
import useLiquidity from '../liquidity/useLiquidity'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'

import { hydratedPairInfo } from './hydratedPairInfo'
import { JsonPairItemInfo } from './type'
import { usePools } from './usePools'

export default async function usePoolsInfoLoader() {
  const jsonInfos = usePools.getState().jsonInfos
  const rawJsonInfos = usePools.getState().rawJsonInfos
  const liquidityJsonInfos = useLiquidity.getState().jsonInfos
  const stableLiquidityJsonInfoLpMints = unifyItem(liquidityJsonInfos.filter((j) => j.version === 5).map((j) => j.lpMint))

  // const userAddedTokens = useToken.getState().userAddedTokens
  const getLpToken = useToken.getState().getLpToken
  const getToken = useToken.getState().getToken
  const lpTokens = useToken.getState().lpTokens
  const balances = useWallet.getState().balances
  // const refreshCount = usePools.getState().refreshCount
  const programIds = useAppConfig.getState().programIds
  // const apiUrls = useAppConfig.getState().apiUrls
  const pairsUrl = useAppConfig.getState().apiUrls.pairs

  const pairJsonInfo = await jFetch<JsonPairItemInfo[]>(pairsUrl, {
    cacheFreshTime: 5 * 60 * 1000
  })

  if (!pairJsonInfo) return
  usePools.setState({
    jsonInfos: pairJsonInfo,
    rawJsonInfos: pairJsonInfo
  })

  const lpPrices: Record<HexAddress, Price> = Object.fromEntries(rawJsonInfos
      .map((value) => {
        const token = lpTokens[value.lpMint]
        const price = token && value.lpPrice ? toTokenPrice(token, value.lpPrice, { alreadyDecimaled: true }) : null
        return [value.lpMint, price]
      })
      .filter(([lpMint, price]) => lpMint != null && price != null)
  )

  usePools.setState({ lpPrices })

  const liquidityJsonInfosMap = listToMap(liquidityJsonInfos, (i) => i.id)
  const isPairInfoOpenBook = (ammId: string) => {
    const itemMarketProgramId = liquidityJsonInfosMap[ammId]?.marketProgramId as string | undefined
    return isPubEqual(itemMarketProgramId, programIds.OPENBOOK_MARKET)
  }

  const hydratedInfos = await lazyMap({
    source: jsonInfos,
    loopTaskName: 'pair jsonInfo',
    loopFn: (pair) =>
      hydratedPairInfo(pair, {
        getToken,
        lpToken: getLpToken(pair.lpMint),
        lpBalance: balances[toPubString(pair.lpMint)],
        isStable: stableLiquidityJsonInfoLpMints.includes(pair.lpMint),
        isOpenBook: isPairInfoOpenBook(pair.ammId)
      }),
    options: { priority: 0 }
  })
  usePools.setState({ hydratedInfos })
}
