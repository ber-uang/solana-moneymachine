import toPubString from '../../../raydium/functions/format/toMintString'
import { usePools } from '../../../raydium/app/pools/usePools'
import { SplToken } from '../../../raydium/app/token/type'
import useToken from '../../../raydium/app/token/useToken'
import toTotalPrice from '../../../raydium/functions/format/toTotalPrice'
import { QuantumSOLVersionSOL } from '../../../raydium/app/token/quantumSOL'
import { getAllSwapableRouteInfos } from '../../../raydium/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { minus } from '../../../raydium/functions/numberish/operations'
import { InnerSimpleTransaction, InstructionType, ReturnTypeGetAllRouteComputeAmountOut, TradeV2, forecastTransactionSize } from '@raydium-io/raydium-sdk'
import txHandler, { lookupTableCache, TransactionQueue } from '../../../raydium/app/txTools/handleTx'
import { TxHistoryInfo } from '../../../raydium/app/txHistory/useTxHistory'
import { ComputeBudgetProgram, SignatureResult, TransactionInstruction } from '@solana/web3.js'
import { getComputeBudgetConfig } from '../../../raydium/app/txTools/getComputeBudgetConfig'
import assert from '../../../raydium/functions/assert'
import { isMintEqual } from '../../../raydium/functions/judgers/areEqual'
import { toTokenAmount } from '../../../raydium/functions/format/toTokenAmount'
import { gt } from '../../../raydium/functions/numberish/compare'
import { Numberish } from '../../../raydium/types/constants'
import useAppConfig from '../../../raydium/app/common/useAppConfig'
import useWallet from '../../../raydium/app/wallet/useWallet'
import { toString } from '../../../raydium/functions/numberish/toString'

export const useTokenPrice = (token?: SplToken, amount = 1) => {
  const { lpPrices } = usePools.getState()
  const tokenPrices = useToken.getState().tokenPrices

  const variousPrices = { ...lpPrices, ...tokenPrices }

  const price = variousPrices[toPubString(token?.mint)] ?? null

  if (!price || !amount) return undefined
  return toTotalPrice(amount, price)
}

export const useSolPriceUSD = () => {
  return useTokenPrice(QuantumSOLVersionSOL, 1)
}

export const useSolAmountFromUSDAmount = (usdAmount: number) => {
  const solPrice = useSolPriceUSD();

  if (solPrice) {
    return usdAmount / parseFloat(solPrice.toFixed(2));
  }
}

export type IResolvedSwapRoute = Awaited<ReturnType<typeof resolveBestSwapRoute>>;

export async function resolveBestSwapRoute(swap: Parameters<typeof getAllSwapableRouteInfos>[0]) {
  const result = await getAllSwapableRouteInfos(swap);
  if (!result) return;
  const { routeList: calcResult, bestResult, bestResultStartTimes, isInsufficientLiquidity } = result;

  const swapable = bestResult?.poolReady
  const canFindPools = Boolean(calcResult?.length)
  const { priceImpact, executionPrice, currentPrice, routeType, fee, amountOut, minAmountOut, poolKey } =
    bestResult ?? {}

  return {
    fee,
    calcResult,
    preflightCalcResult: calcResult,
    selectedCalcResult: bestResult,
    selectedCalcResultPoolStartTimes: bestResultStartTimes,

    priceImpact,
    executionPrice,
    currentPrice,
    minReceived: minAmountOut && minus(minAmountOut.amount, minAmountOut.fee ?? 0),
    maxSpent: undefined,
    swapable,
    routeType,
    canFindPools,
    isInsufficientLiquidity,
    coin1: swap.input,
    coin2: swap.output,
    coin1Amount: swap.inputAmount,
    coin2Amount: amountOut && minus(amountOut.amount, amountOut.fee ?? 0),
  }
}

export interface IPerformRaydiumSwapDetails {
  directionReversed: boolean // determine pairSide  swap make this to be true

  coin1: SplToken
  coin2: SplToken
  coin1Amount: Numberish // may with fee and slippage
  coin2Amount: Numberish // may with fee and slippage

  /** only exist when maxSpent is undefined */
  minReceived?: Numberish // min received amount
  /** only exist when minReceived is undefined */
  maxSpent?: Numberish // max received amount
  /** from SDK,  */
  selectedCalcResult?: ReturnTypeGetAllRouteComputeAmountOut[number]

  routeType?: RouteType
}

export type RouteType = 'amm' | 'route' | undefined // SDK haven't export this type, and can't find by extract existing type. so have to write manually in UI code.


export async function performRaydiumSwap(swapDetails: IPerformRaydiumSwapDetails) {
  const { programIds } = useAppConfig.getState()
  const { checkWalletHasEnoughBalance, tokenAccountRawInfos, txVersion } = useWallet.getState()
  const {
    coin1: upCoin,
    coin2: downCoin,
    coin1Amount: upCoinAmount,
    coin2Amount: downCoinAmount,
    selectedCalcResult,

    routeType,
    minReceived,
    maxSpent
  } = swapDetails

  assert(upCoinAmount && gt(upCoinAmount, 0), 'should input upCoin amount larger than 0')
  assert(downCoinAmount && gt(downCoinAmount, 0), 'should input downCoin amount larger than 0')
  assert(upCoin, 'select a coin in upper box')
  assert(downCoin, 'select a coin in lower box')
  assert(!isMintEqual(upCoin.mint, downCoin.mint), 'should not select same mint ')
  assert(selectedCalcResult, "can't find correct route")

  const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
  // const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

  assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)
  assert(routeType, 'accidently routeType is undefined')

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const addComputeUnitLimitIns = ComputeBudgetProgram.setComputeUnitLimit({ units: 400001 })
    const { innerTransactions } = await TradeV2.makeSwapInstructionSimple({
      connection,
      swapInfo: selectedCalcResult,
      ownerInfo: {
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        associatedOnly: true,
        checkCreateATAOwner: true
      },
      routeProgram: programIds.Router,
      lookupTableCache,
      makeTxVersion: txVersion,
      computeBudgetConfig: await getComputeBudgetConfig()
    })

    // temp fix
    for (let i = 0; i < innerTransactions.length; i++) {
      if (
        innerTransactions[i].instructions[0].programId.toString() !== addComputeUnitLimitIns.programId.toString() &&
        forecastTransactionSize([addComputeUnitLimitIns, ...innerTransactions[i].instructions], [owner])
      ) {
        innerTransactions[i].instructions = [addComputeUnitLimitIns, ...innerTransactions[i].instructions].map(
          (i) =>
            new TransactionInstruction({
              programId: i.programId,
              data: i.data,
              keys: i.keys.map((ii) =>
                ii.pubkey.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ? { ...ii, pubkey: owner } : ii
              )
            })
        )
      }
    }

    const queue = innerTransactions.map((tx, idx, allTxs) => [
      tx,
      {
        onTxError({ signatureResult, changeHistoryInfo }) {
          if (checkSwapSlippageError(signatureResult)) {
            changeHistoryInfo?.({
              forceErrorTitle: 'Swap failed due to slippage error!',
              description: 'Slippage has exceeded user settings.\nTry again or adjust your slippage tolerance.'
            })
          }
        },
        txHistoryInfo: {
          title: 'Swap',
          description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${downCoin.symbol
            }`,
          subtransactionDescription: translationSwapTxDescription(tx, idx, allTxs)
        } as TxHistoryInfo
      }
    ]) as TransactionQueue
    transactionCollector.add(queue, { sendMode: 'queue(all-settle)' })
  })
}

function translationSwapTxDescription(tx: InnerSimpleTransaction, idx: number, allTxs: InnerSimpleTransaction[]) {
  const swapFirstIdx = allTxs.findIndex((tx) => isSwapTransaction(tx))
  const swapLastIdx = allTxs.length - 1 - [...allTxs].reverse().findIndex((tx) => isSwapTransaction(tx))
  return idx < swapFirstIdx ? 'Setup' : idx > swapLastIdx ? 'Cleanup' : 'Swap'
}

function isSwapTransaction(tx: InnerSimpleTransaction): boolean {
  return (
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV4Swap) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.routeSwap1) ||
    tx.instructionTypes.includes(InstructionType.routeSwap2) ||
    tx.instructionTypes.includes(InstructionType.routeSwap)
  )
}

/**
 * @author RUDY
 */
function checkSwapSlippageError(err: SignatureResult): boolean {
  try {
    // @ts-expect-error force
    const coustom = err.err?.InstructionError[1].Custom
    if ([38, 6022].includes(coustom)) {
      return true
    } else {
      return false
    }
  } catch {
    return false
  }
}
