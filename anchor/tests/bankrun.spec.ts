import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair } from '@solana/web3.js'
// import { BankrunProvider } from 'anchor-bankrun'
import { describe, before, it } from 'node:test' // Node.js native test runner
// import assert from 'node:assert'
import { startAnchor, ProgramTestContext, BanksClient } from 'solana-bankrun'
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'
import { BankrunProvider } from 'anchor-bankrun'
import { Program } from '@coral-xyz/anchor'
import { Vesting } from '../target/types/vesting'
import IDL from '../target/idl/vesting.json'
import { createMint } from 'spl-token-bankrun'
// import {NodeWallet} from '@coral-xyz/anchor/dist/cjs/provider'

describe('Vesting Program Tests', async () => {
  //   let provider: BankrunProvider
  let beneficiary: Keypair
  let context: ProgramTestContext
  let provider: BankrunProvider
  let program: Program<Vesting>
  let banksClient: BanksClient
  let employer: Keypair
  let mint: PublicKey
  let beneficiaryProvider: BankrunProvider

  before(async () => {
    beneficiary = new anchor.web3.Keypair()

    context = await startAnchor(
      '',
      [{ name: 'vesting', programId: new PublicKey(IDL.address) }],
      [
        {
          address: beneficiary.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ],
    )

    provider = new BankrunProvider(context)

    anchor.setProvider(provider)
    program = new Program<Vesting>(IDL as Vesting, provider)

    banksClient = context.banksClient

    employer = provider.wallet.payer

    // @ts-expect-error - Type error in spl-token-bankrun
    mint = await createMint(beneficiary, employer.publicKey, null, 2)

    //setting up provider for beneficiary for the employer to use
    beneficiaryProvider = new BankrunProvider(context)
    beneficiaryProvider.wallet = new NodeWallet(beneficiary)

    program2 = new Program<Vesting>(IDL as Vesting, beneficiaryProvider)
  })
})
