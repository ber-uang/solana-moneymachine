
import { parseDurationAbsolute } from '../../functions/date/parseDuration'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { useTxHistory } from './useTxHistory'
import fetchTransitionStatus from './fetchTransitionStatus'

export default async function useRefreshTransactionStatus() {
  const connection = useConnection.getState().connection
  const log = useNotification.getState().log
  const transactionHistory = useTxHistory.getState().txHistory
  const updateExistingHistoryItem = useTxHistory.getState().updateExistingHistoryItem

  if (!connection) return
  const pendingTx = transactionHistory.filter((i) => i.status === 'pending')
  const results = await fetchTransitionStatus(
    pendingTx.map((i) => i.txid),
    connection
  )
  results.forEach((result, idx) => {
    const tx = pendingTx[idx]
    if (!result && parseDurationAbsolute(Date.now() - Number(tx.time)).minutes > 5) {
      updateExistingHistoryItem(tx.txid, { status: 'droped', block: 0 })
    } else if (result && !result.err) {
      updateExistingHistoryItem(tx.txid, { status: 'success', block: result.slot })
    } else if (result && result.err) {
      updateExistingHistoryItem(tx.txid, { status: 'fail', block: result.slot })
    }
  })
}
