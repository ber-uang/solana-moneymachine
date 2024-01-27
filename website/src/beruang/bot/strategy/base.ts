
import { TxResponseInfos } from 'beruang/raydium/app/txTools/handleTx';
import useWallet from '../../raydium/app/wallet/useWallet';
import useConnection from '../../raydium/app/connection/useConnection';
import { sleep } from '../../utils/async';
import { refreshTokenAccounts } from 'beruang/raydium/app/wallet/useTokenAccountsRefresher';

export interface IBotTxResponse<TxExtra = any> extends TxResponseInfos {
  readonly extra?: TxExtra;
}

export abstract class BaseBotStrategy<TxExtra = any> {

  readonly wallet = useWallet.getState();
  readonly connection = useConnection.getState();

  readonly transactions: IBotTxResponse<TxExtra>[] = [];

  protected _isRunning = false;

  constructor(
    public readonly id: string
  ) {}

  get isRunning() {
    return this._isRunning;
  }

  protected async syncWalletBalances() {
    await refreshTokenAccounts()
  }

  protected async init() {
    console.log(this.constructor.name, '(INIT)', 'Initializing strategy', this);

    if (this._isRunning) throw new Error(this.errorMsg('InitCheck', 'strategy is already running'));
    this._isRunning = true;

    if (!this.connection.connection) {
      // await this.wallet.
      throw new Error(this.errorMsg('InitCheck', 'No connection'));
    }

    if (!this.wallet.connected) {
      // await this.wallet.
      throw new Error(this.errorMsg('InitCheck', 'Wallet is not connected'));
    }

    await this.syncWalletBalances();
  }

  abstract executeStrategy(): Promise<void>;

  protected async sleep(mills: number) {
    await sleep(mills);
  }

  protected logTransaction(transaction: IBotTxResponse<TxExtra>) {
    this.transactions.push(transaction);
  }

  protected errorMsg(type: string, message: string): string {
    return `${this.constructor.name}(${this.id}):${type}: ${message}`;
  }
}
