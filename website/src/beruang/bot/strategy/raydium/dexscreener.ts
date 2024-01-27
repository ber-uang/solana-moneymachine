/* eslint-disable react-hooks/rules-of-hooks */
import { SplToken } from '../../../raydium/app/token/type';
import { lte } from '../../../raydium/functions/numberish/compare';
import { QuantumSOLVersionSOL } from '../../../raydium/app/token/quantumSOL';
import { BaseRaydiumStrategy } from './base';


export class RadiumDexScreenNewPairStrategyV0 extends BaseRaydiumStrategy {
  // static readonly holdDuration = 10;
  readonly holdDuration = 1 / 60 * 10; // 10sec
  readonly inputAmountUSD = 0.01;

  constructor(
    public readonly id: string,
    public readonly inputToken: SplToken,
    public readonly outputCoin: SplToken
  ) {
    super(id)

    if (inputToken !== QuantumSOLVersionSOL) throw new Error('Only support SOL as input for now to reduce complexity');
  }

  protected async init() {
    await super.init();
  }

  async executeStrategy() {
    await this.init();

    const inputAmount = this.solFromUSD(this.inputAmountUSD);
    if (!inputAmount || lte(inputAmount, 0)) throw new Error(this.errorMsg('InsufficientFunds', `Input amount is insufficient: ${inputAmount}`));

    await this.swap(this.inputToken, this.outputCoin, inputAmount);

    await this.sleep(this.holdDuration * 60 * 1000);

    // TODO: do we need to resync the wallet for this? Or can we get from buy tx out amount?
    await this.syncWalletBalances();
    const outputAmount = await this.wallet.getBalance(this.outputCoin);
    if (!outputAmount || lte(outputAmount, 0)) throw new Error(this.errorMsg('InsufficientFunds', `Output amount is insufficient: ${outputAmount}`));

    await this.swap(this.outputCoin, this.inputToken, outputAmount);
    console.log(this.constructor.name, '(executeStrategy)', 'COMPLETE', this);
  }
}
