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
import { NodeWallet } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
describe('Vesting Program Tests', async () => {
  const companyName = 'companyName'
  //   let provider: BankrunProvider
  let beneficiary: Keypair
  let context: ProgramTestContext
  let provider: BankrunProvider
  let program: Program<Vesting>
  let program2: Program<Vesting>
  let banksClient: BanksClient
  let employer: Keypair
  let mint: PublicKey
  let beneficiaryProvider: BankrunProvider
  let vestingAccountKey: PublicKey
  let treauryTokenAaccount: PublicKey
  let employeeAccount: PublicKey

  before(async () => {
    beneficiary = new anchor.web3.Keypair()

    //Note: We will run the bank server and the banks client in the same process
    //This is done to avoid the need for a separate bankrun server process
    //This is useful for testing purposes and allows us to run tests in a single process
    //You can also run the bankrun server in a separate process and connect to it using
    //the BankrunProvider constructor with the server URL

    //we will start the anchor program with the vesting program idl and fund the beneficiary account with 1 SOL
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

    //deriving the pda for the vesting program(we have 3 pda)
    ;[vestingAccountKey] = PublicKey.findProgramAddressSync([Buffer.from(companyName)], program.programId)
    ;[treauryTokenAaccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('vesting_treasury'), Buffer.from(companyName)],
      program.programId,
    )
    ;[employeeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('employee_vesting'), beneficiary.publicKey.toBuffer(), vestingAccountKey.toBuffer()],
      program.programId,
    )
  })

  //write your tests here
  it('should create a vesting account', async () => {
    const tx = await program.methods
      .createVestingAccount(companyName)
      .accounts({
        signer: employer.publicKey,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' })

    //lets fetch our Vesting account to see if it was created
    const vestingAccount = await program.account.vestingAccount.fetch(vestingAccountKey, 'confirmed')
    console.log('Vesting Account:', vestingAccount)
    console.log('Create Vesting Account:', tx)
  })
})
