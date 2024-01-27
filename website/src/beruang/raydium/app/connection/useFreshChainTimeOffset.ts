import { Connection } from '@solana/web3.js'

import jFetch from '../../functions/jFetch'

import useConnection from './useConnection'
import useAppConfig from '../common/useAppConfig'

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useFreshChainTimeOffset() {
  const connection = useConnection.getState().connection
  updateChainTimeOffset(connection)

  const timeId = setInterval(() => {
    updateChainTimeOffset(connection)
  }, 1000 * 60 * 5)

  return () => clearInterval(timeId)
}

async function updateChainTimeOffset(connection: Connection | undefined) {
  if (!connection) return
  const offset = await getChainTimeOffset()
  if (!offset) return
  useConnection.setState({
    chainTimeOffset: offset * 1000,
    getChainDate: () => new Date(Date.now() + (offset ?? 0))
  })
}

function getChainTimeOffset(): Promise<number | undefined> {
  const timeUrl = useAppConfig.getState().apiUrls.time
  // const time = await connection.getSlot().then((slot) => connection.getBlockTime(slot)) // old method
  return jFetch<{ offset: number }>(timeUrl).then((res) => res?.offset)
}
