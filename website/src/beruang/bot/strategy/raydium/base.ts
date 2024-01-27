/* eslint-disable react-hooks/rules-of-hooks */
import { SplToken } from '../../../raydium/app/token/type';
import { Numberish } from '../../../raydium/types/constants';
import { eq, isMeaningfulNumber, lte } from '../../../raydium/functions/numberish/compare';
import { toTokenAmount } from '../../../raydium/functions/format/toTokenAmount';
import { resolveBestSwapRoute, performRaydiumSwap, useSolAmountFromUSDAmount, IResolvedSwapRoute } from './utils';
import { BaseBotStrategy } from '../base';
import useTokenListsLoader from '../../../raydium/app/token/useTokenListsLoader';
import usePoolsInfoLoader from '../../../raydium/app/pools/usePoolsInfoLoader';
import useLiquidityInfoLoader from '../../../raydium/app/liquidity/useLiquidityInfoLoader';
import usePoolSummeryInfoLoader from '../../../raydium/app/pools/usePoolSummeryInfoLoader';


export abstract class BaseRaydiumStrategy extends BaseBotStrategy<{ route: IResolvedSwapRoute }> {
  slippageTolerance = 0.1;

  solFromUSD(amountUSD: number) {
    return useSolAmountFromUSDAmount(amountUSD);
  }

  protected async syncRaydiumApiData() {
    await useTokenListsLoader()
    await useLiquidityInfoLoader()
    await usePoolsInfoLoader(); // must be after tokens and liquidity
    await usePoolSummeryInfoLoader(); // TODO: not sure we need this one yet
  }

  protected async init() {
    await super.init();

    await this.syncRaydiumApiData();
  }

  protected async swap(input: SplToken, output: SplToken, inputAmount: Numberish) {
    const route = await resolveBestSwapRoute({
      input,
      output,
      inputAmount,
      slippageTolerance: this.slippageTolerance,
      // connection: // TODO: USE DIRECT WALLET CONNECTION TO BYPASS CONFIRMATION
    });

    if (route == null) throw new Error(this.errorMsg('NoRouteFound', 'Could not find route for swap'))

    // Validation
    if (!this.wallet.connected) throw new Error(this.errorMsg('SwapValidation', 'Wallet is not connected'));
    if (!route.coin1) throw new Error(this.errorMsg('SwapValidation', 'Missing coin1'));
    if (!route.coin2) throw new Error(this.errorMsg('SwapValidation', 'Missing coin2'));
    if (route.isInsufficientLiquidity) throw new Error(this.errorMsg('SwapValidation', 'Insufficient funds. The route for this swap includes a CLMM pool with insufficient in -range liquidity for your swap. Try swapping for a smaller amount or try again later.'));
    if (!route.canFindPools) throw new Error(this.errorMsg('SwapValidation', 'Pool Not Found'));
    if (!(route.coin1Amount && isMeaningfulNumber(route.coin1Amount))) throw new Error(this.errorMsg('SwapValidation', 'Input amount is not meaningful'));
    if (eq(route.coin2Amount, 0)) throw new Error(this.errorMsg('SwapValidation', 'Swap Amount Too Small'));
    if (!this.wallet.checkWalletHasEnoughBalance(toTokenAmount(route.coin1, route.coin1Amount, { alreadyDecimaled: true }))) throw new Error(this.errorMsg('SwapValidation', `Insufficient ${route.coin1?.symbol ?? ''} balance`));
    if (!(route.priceImpact && lte(route.priceImpact, 0.05))) throw new Error(this.errorMsg('SwapValidation', `Price impact too high - ${route.priceImpact}`));

    const swapResponse = await performRaydiumSwap({
      directionReversed: false,
      coin1: route.coin1!,
      coin2: route.coin2!,
      coin1Amount: route.coin1Amount!,
      coin2Amount: route.coin2Amount!,
      maxSpent: route.maxSpent,
      minReceived: route.minReceived,
      routeType: route.routeType,
      selectedCalcResult: route.selectedCalcResult,
    })

    const tx = {
      ...swapResponse,
      extra: {
        route
      },
    };

    this.logTransaction(tx);

    return tx;
  }
}
