'use client'

import { getVestingProgram, getVestingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'

interface CreateVestingArgs {
  companyName: string
  mint: string //since the mint is not derive anywhere, we will pass it from the front end
}

interface CreatEmpoyeeArgs {
  startTime: number
  endTime: number
  totalAmount: number
  cliffTime: number
  beneficiary: string
}

export function useVestingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getVestingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVestingProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['counter', 'all', { cluster }],
    queryFn: () => program.account.vestingAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  // const initialize = useMutation({
  //   mutationKey: ['counter', 'initialize', { cluster }],
  //   mutationFn: (keypair: Keypair) =>
  //     program.methods.initialize().accounts({ counter: keypair.publicKey }).signers([keypair]).rpc(),
  //   onSuccess: async (signature) => {
  //     transactionToast(signature)
  //     await accounts.refetch()
  //   },
  //   onError: () => {
  //     toast.error('Failed to initialize account')
  //   },
  // })

  const createVestingAccount = useMutation<string, Error, CreateVestingArgs>({
    mutationKey: ['vestingAccount', 'create', { cluster }],
    mutationFn: ({ companyName, mint }) =>
      program.methods
        .createVestingAccount(companyName)
        .accounts({ mint: new PublicKey(mint), tokenProgram: TOKEN_PROGRAM_ID })
        .rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to create vesting account')
    },
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    // initialize,
    createVestingAccount,
  }
}

//now lets use vestingProgramAccount to add employee/s employee
export function useVestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useVestingProgram()

  const accountQuery = useQuery({
    queryKey: ['counter', 'fetch', { cluster, account }],
    queryFn: () => program.account.vestingAccount.fetch(account),
  })

  const createEmployeeVesting = useMutation<string, Error, CreatEmpoyeeArgs>({
    mutationKey: ['employeeAaccount', 'create', { cluster }],
    mutationFn: ({ startTime, endTime, cliffTime, totalAmount, beneficiary }) =>
      program.methods
        .createEmployeeAccount(new BN(startTime), new BN(endTime), new BN(totalAmount), new BN(cliffTime))
        .accounts({ beneficiary: new PublicKey(beneficiary), vestingAccount: account })
        .rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to create vesting account')
    },
  })

  // const closeMutation = useMutation({
  //   mutationKey: ['counter', 'close', { cluster, account }],
  //   mutationFn: () => program.methods.close().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accounts.refetch()
  //   },
  // })

  // const decrementMutation = useMutation({
  //   mutationKey: ['counter', 'decrement', { cluster, account }],
  //   mutationFn: () => program.methods.decrement().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  // const incrementMutation = useMutation({
  //   mutationKey: ['counter', 'increment', { cluster, account }],
  //   mutationFn: () => program.methods.increment().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  // const setMutation = useMutation({
  //   mutationKey: ['counter', 'set', { cluster, account }],
  //   mutationFn: (value: number) => program.methods.set(value).accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  return {
    accountQuery,
    createEmployeeVesting,
  }
}
