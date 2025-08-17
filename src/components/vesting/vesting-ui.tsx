'use client'

import { useState } from 'react'
import { Keypair, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVestingProgram, useVestingProgramAccount } from './vesting-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useWallet } from '@solana/wallet-adapter-react'

export function VestingCreate() {
  const { createVestingAccount } = useVestingProgram()

  const [company, setCompany] = useState('')
  const [mint, setMint] = useState('')
  const { publicKey } = useWallet()

  const isFormValid = company.length > 0 && mint.length > 0

  const handbleSubmit = () => {
    if (publicKey && isFormValid) {
      createVestingAccount.mutateAsync({ companyName: company, mint: mint })
    }
  }

  if (!publicKey) {
    return <p>Connect your waallet</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="text"
        placeholder="Company Name"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="input input-bordered w-full max-w-xs"
        style={{ backgroundColor: 'green' }}
      />
      <input
        type="text"
        placeholder="Mint Address"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
        className="input input-bordered w-full max-w-xs mt-2"
      />

      <button
        className="btn btn-xs lg:btn-md btn-primary"
        onClick={handbleSubmit}
        disabled={createVestingAccount.isPending || !isFormValid}
      >
        Create New Vesting Account {createVestingAccount.isPending && '...'}
      </button>
      {/* <Button onClick={handbleSubmit}>Create New Vesting Account {initialize.isPending && '...'}</Button> */}
    </div>
  )
}

export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <VestingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function VestingCard({ account }: { account: PublicKey }) {
  const { accountQuery, createEmployeeVesting } = useVestingProgramAccount({
    account,
  })

  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [cliffTime, setCliffTime] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [beneficiary, setBeneficiary] = useState('')

  const companyName = useMemo(() => accountQuery.data?.companyName ?? '', [accountQuery.data?.companyName])

  // const count = useMemo(() => accountQuery.data?.count ?? 0, [accountQuery.data?.count])

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Company: {companyName}</CardTitle>
        <CardDescription>
          Account: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Start Time"
            value={startTime || ''}
            onChange={(e) => setStartTime(parseInt(e.target.value))}
            className="input input-bordered w-full max-w-xs"
          />

          <input
            type="text"
            placeholder="End Time"
            value={endTime || ''}
            onChange={(e) => setEndTime(parseInt(e.target.value))}
            className="input input-bordered w-full max-w-xs"
          />

          <input
            type="text"
            placeholder="Total Allocation"
            value={totalAmount || ''}
            onChange={(e) => setTotalAmount(parseInt(e.target.value))}
            className="input input-bordered w-full max-w-xs"
          />

          <input
            type="text"
            placeholder="Cliff Time"
            value={cliffTime || ''}
            onChange={(e) => setCliffTime(parseInt(e.target.value))}
            className="input input-bordered w-full max-w-xs"
          />

          <input
            type="text"
            placeholder="beneficiary wallet address"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            className="input input-bordered w-full max-w-xs"
          />

          <Button
            variant="outline"
            onClick={() =>
              createEmployeeVesting.mutateAsync({ startTime, endTime, totalAmount, cliffTime, beneficiary })
            }
            disabled={createEmployeeVesting.isPending}
          >
            Create Employee Vesting Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
