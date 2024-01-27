import { createStore } from 'zustand/vanilla'
import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { LogLevel, Logger } from '@raydium-io/raydium-sdk'

export interface NotificationItemInfo {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: string
  subtitle?: string
  description?: string
}

const logger = new Logger('nft-ui')

//! params base on <NotificationItem>
export interface NotificationStore {
  log(info: NotificationItemInfo): void
  logTxid(txInfo: TxNotificationItemInfo): Partial<TxNotificationController>
  logError(title: unknown, description?: string): void
  logWarning(title: string, description?: string): void
  logSuccess(title: string, description?: string): void
  logInfo(title: string, description?: string): void
}

type TxNotificationSingleItemInfo = {
  transaction: Transaction | VersionedTransaction
  historyInfo: TxHistoryInfo
  /** @default 'queuing' */
  state?: 'success' | 'error' | 'aborted' | 'queuing' | 'processing'
  /** not txid when not send */
  txid?: string
  /** only for error */
  error?: unknown
}

export interface TxNotificationItemInfo {
  txInfos: TxNotificationSingleItemInfo[]
}

export type TxNotificationController = {
  changeItemInfo(
    info: Omit<Partial<TxNotificationSingleItemInfo>, 'transaction'>,
    options: { transaction: Transaction | VersionedTransaction }
  ): void
}

/** zustand store hooks */
const useNotification = createStore<NotificationStore>(() => ({
  logTxid: (txInfo: TxNotificationItemInfo) => {
    logger.info('⏺️ transaction', txInfo);
    return {
      changeItemInfo(info, options) {
        logger.info('⏺️ transaction[change]', info, options);
      },
    }
  },
  log: (info: NotificationItemInfo) => logger._log(String(info.type || LogLevel.DEBUG).toUpperCase() as LogLevel, [info.title, info.subtitle, info.description]),
  logError: (title: string, description?: string) => logger.warn(`⛔️ ${title}`, description),
  logWarning: (title: string, description?: string) => logger.warn(`⚠️ ${title}`, description),
  logSuccess: (title: string, description?: string) => logger.info(`✅ ${title}`, description),
  logInfo: (title: string, description?: string) => logger.info(title, description),
}))

export default useNotification
