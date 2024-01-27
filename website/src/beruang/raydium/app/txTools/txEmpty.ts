import txHandler, { SingleTxOption, HandleFnOptions } from './handleTx'
import { createTransactionCollector } from './createTransaction'

export default async function txEmpty(options: SingleTxOption & HandleFnOptions) {
  return txHandler(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      const piecesCollection = createTransactionCollector()
      transactionCollector.add(await piecesCollection.spawnTransaction(), {
        ...options,
        // @ts-ignore
        txHistoryInfo: {
          title: 'Debug'
        }
      })
    },
    { forceKeyPairs: options.forceKeyPairs }
  )
}
