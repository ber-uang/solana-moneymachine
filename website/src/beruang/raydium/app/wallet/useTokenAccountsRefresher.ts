
import { Connection, PublicKey } from '@solana/web3.js'

import useConnection from '../connection/useConnection'

import { getWalletTokenAccounts } from './getWalletTokenAccounts'
import useWallet from './useWallet'

import { shakeFalsyItem } from '../../functions/arrayMethods'
import { listToJSMap } from '../../functions/format/listToMap'
import toPubString from '../../functions/format/toMintString'
import { eq } from '../../functions/numberish/compare'

// TODO: Improve to handle multiple executions from strategies, check if already in flight and return same promise... and stale time?
export async function refreshTokenAccounts() {
  const connection = useConnection.getState().connection
  const owner = useWallet.getState().owner
  return loadTokenAccounts(connection, owner)
}

/** if all tokenAccount amount is not changed (which may happen in 'confirmed'), auto fetch second time in 'finalized'*/
const loadTokenAccounts = async (
  connection?: Connection,
  owner?: PublicKey,
  canContinue: () => boolean = () => true,
  options?: { noSecondTry?: boolean }
) => {
  if (!owner || !connection) {
    useWallet.setState({
      tokenAccountsOwner: owner,
      tokenAccountRawInfos: [],
      nativeTokenAccount: undefined,
      tokenAccounts: [],
      allTokenAccounts: []
    })
    return
  }
  const { allTokenAccounts, tokenAccountRawInfos, tokenAccounts, nativeTokenAccount } =
    await getRichWalletTokenAccounts({ connection, owner })

  if (!canContinue()) return
  //#region ------------------- diff -------------------
  const pastTokenAccounts = listToJSMap(
    useWallet.getState().allTokenAccounts,
    (a) => toPubString(a.publicKey) ?? 'native'
  )
  const newTokenAccounts = listToJSMap(allTokenAccounts, (a) => toPubString(a.publicKey) ?? 'native')
  const diffAccounts = shakeFalsyItem(
    [...newTokenAccounts].filter(([accountPub, { amount: newAmount }]) => {
      const pastAmount = pastTokenAccounts.get(accountPub)?.amount
      return !eq(newAmount, pastAmount)
    })
  )
  const diffCount = diffAccounts.length
  const hasWalletTokenAccountChanged = diffCount >= 2
  //#endregion

  if (options?.noSecondTry || hasWalletTokenAccountChanged || diffCount === 0) {
    useWallet.setState({
      tokenAccountsOwner: owner,
      tokenAccountRawInfos,
      nativeTokenAccount,
      tokenAccounts,
      allTokenAccounts
    })
  } else {
    return { clear: () => {} }
  }
}

/**  rich info of {@link getWalletTokenAccounts}'s return  */
export async function getRichWalletTokenAccounts(...params: Parameters<typeof getWalletTokenAccounts>) {
  const { accounts: allTokenAccounts, rawInfos } = await getWalletTokenAccounts(...params)
  return {
    tokenAccountRawInfos: rawInfos,
    nativeTokenAccount: allTokenAccounts.find((ta) => ta.isNative),
    tokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated),
    allTokenAccounts: allTokenAccounts
  }
}
