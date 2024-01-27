import { Connection } from '@solana/web3.js'
import assert from '../../functions/assert'
import useNotification from '../notification/useNotification'
import { Endpoint } from './type'
import { useConnection } from './useConnection'
import useWallet from '../wallet/useWallet'

export async function switchRpc(endpoint: Endpoint) {
  if (!endpoint.url.replace(/.*:\/\//, '')) {
    throw new Error(`Invalid endpoint ${endpoint}`)
  }
  const response = await fetch(endpoint.url, {
    headers: {
      'content-type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo' })
  })
  assert(response.ok)
  const { connected, adapter, select } = useWallet.getState()
  if (connected && adapter) {
    adapter.off('disconnect')
    const fn = () => {
      window.setTimeout(() => {
        select(adapter.name)
      }, 0)

      adapter.off('disconnect', fn)
    }
    adapter.once('disconnect', fn)
  }
  const connection = new Connection(endpoint.url, 'confirmed')
  useConnection.setState({
    connection,
    endpoint: endpoint,
  })
  const { logSuccess } = useNotification.getState()
  logSuccess('RPC Switch Success ', `new rpc: ${endpoint.name}`)
}
