import { PublicKeyish, TokenAmount } from '@raydium-io/raydium-sdk'

import useConnection from '../connection/useConnection'
import { QuantumSOL, toQuantumSolAmount, WSOL, WSOLMint } from '../token/quantumSOL'
import { SplToken } from '../token/type'
import listToMap from '../../functions/format/listToMap'
import toPubString from '../../functions/format/toMintString'
import { toTokenAmount } from '../../functions/format/toTokenAmount'
import { isMintEqual } from '../../functions/judgers/areEqual'
import { add } from '../../functions/numberish/operations'
import toBN from '../../functions/numberish/toBN'
import { objectMap, objectShakeNil } from '../../functions/objectMethods'
import { Numberish } from '../../types/constants'

import useToken from '../token/useToken'

import { ITokenAccount } from './type'
import useWallet from './useWallet'

/** ! refresh when tokenAccounts refresh */
export default async function useInitBalanceRefresher() {
  const tokenAccounts = useWallet.getState().tokenAccounts
  const allTokenAccounts = useWallet.getState().allTokenAccounts // to get wsol balance
  const nativeTokenAccount = useWallet.getState().nativeTokenAccount
  const getToken = useToken.getState().getToken
  const connection = useConnection.getState().connection
  const owner = useWallet.getState().owner

  if (!connection || !owner) {
    useWallet.setState({
      solBalance: undefined,
      balances: {},
      rawBalances: {},
      pureBalances: {},
      pureRawBalances: {}
    })
    return
  }

  // from tokenAccount to tokenAmount
  const { wsolBalance, solBalance, allWsolBalance, balances, rawBalances, pureBalances, pureRawBalances } =
    parseBalanceFromTokenAccount({
      getPureToken: (mint) => getToken(mint, { exact: true }),
      allTokenAccounts
    })

  useWallet.setState({
    wsolBalance,
    solBalance,
    allWsolBalance,
    balances,
    rawBalances,
    pureBalances,
    pureRawBalances
  })
}

export function parseBalanceFromTokenAccount({
  getPureToken,
  allTokenAccounts
}: {
  getPureToken: (mint: PublicKeyish | undefined) => SplToken | undefined
  allTokenAccounts: ITokenAccount[]
}) {
  const tokenAccounts = allTokenAccounts.filter((ta) => ta.isAssociated || ta.isNative)

  function toPureBalance(tokenAccount: ITokenAccount) {
    const tokenInfo = getPureToken(tokenAccount.mint)
    if (!tokenInfo) return undefined
    return new TokenAmount(tokenInfo, tokenAccount.amount)
  }

  // currently WSOL show all balance(it a spectial hatch)
  // !it is in BN
  const allWsolBalance = allTokenAccounts.some((t) => isMintEqual(t.mint, WSOLMint))
    ? toBN(
        allTokenAccounts.reduce((acc, t) => (isMintEqual(t.mint, WSOLMint) ? add(acc, t.amount) : acc), 0 as Numberish)
      )
    : undefined

  // use TokenAmount (no QuantumSOL)
  const pureBalances = objectShakeNil({
    ...listToMap(
      tokenAccounts,
      (tokenAccount) => toPubString(tokenAccount.mint),
      (tokenAccount) => toPureBalance(tokenAccount)
    ),
    [toPubString(WSOLMint)]: allWsolBalance && toTokenAmount(WSOL, allWsolBalance)
  })

  // use BN (no QuantumSOL)
  const pureRawBalances = objectShakeNil({
    ...listToMap(
      tokenAccounts,
      (tokenAccount) => toPubString(tokenAccount.mint),
      (tokenAccount) => tokenAccount.amount
    ),
    [toPubString(WSOLMint)]: allWsolBalance
  })

  // native sol balance (for QuantumSOL)
  const nativeTokenAccount = allTokenAccounts.find((ta) => ta.isNative)
  const solBalance = nativeTokenAccount?.amount

  // wsol balance (for QuantumSOL)
  const wsolBalance = tokenAccounts.find(
    (ta) => String(ta.mint) === String(WSOLMint) && ta.isAssociated === true
  )?.amount

  // QuantumSOL balance
  const quantumSOLBalance = toQuantumSolAmount({ solRawAmount: solBalance, wsolRawAmount: wsolBalance })

  // use TokenAmount (QuantumSOL)
  const balances = { ...pureBalances, [String(QuantumSOL.mint)]: quantumSOLBalance }

  // use BN (QuantumSOL)
  const rawBalances = objectMap(balances, (balance) => balance.raw)
  return {
    wsolBalance,
    solBalance,
    allWsolBalance,
    balances,
    rawBalances,
    pureBalances,
    pureRawBalances,
    nativeTokenAccount
  }
}
