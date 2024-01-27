import jFetch from '../../functions/jFetch'

import useAppConfig from '../common/useAppConfig'

import { usePools } from './usePools'

type InfoResponse = {
  tvl: string | number
  totalvolume: string | number
  volume24h: string | number
}

/** load tvl and volumn24h */
export default async function usePoolSummeryInfoLoader() {
  // const tvl = usePools.getState().tvl
  // const volume24h = usePools.getState().volume24h
  const infoUrl = useAppConfig.getState().apiUrls.info

  const summaryInfo = await jFetch<InfoResponse>(infoUrl)
  if (!summaryInfo) return
  usePools.setState({ tvl: summaryInfo.tvl, volume24h: summaryInfo.volume24h })
  return summaryInfo;
}
