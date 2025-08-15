import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair } from '@solana/web3.js'
import { BankrunProvider } from 'anchor-bankrun'
import { startAnchor, ProgramTestContext, BanksClient } from 'solana-bankrun'
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'
import { Program, BN } from '@coral-xyz/anchor'
import { Vesting } from '../target/types/vesting'
import IDL from '../target/idl/vesting.json'
import { createMint, mintTo } from 'spl-token-bankrun'
// import { NodeWallet } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'

// Remove the async from describe - Jest doesn't support async describe functions
describe('Vesting Program Tests', () => {
  const companyName = 'companyName'
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

  beforeAll(async () => {
    beneficiary = new anchor.web3.Keypair()

    // Start the anchor program with the vesting program idl and fund the beneficiary account with 1 SOL
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

    // Create mint with proper error handling
    try {
      mint = await createMint(banksClient, employer, employer.publicKey, null, 2)
    } catch (error) {
      console.error('Error creating mint:', error)
      throw error
    }

    // Setting up provider for beneficiary
    beneficiaryProvider = new BankrunProvider(context)
    // beneficiaryProvider.wallet = new NodeWallet(beneficiary)
    beneficiaryProvider.wallet = new anchor.Wallet(beneficiary)
    program2 = new Program<Vesting>(IDL as Vesting, beneficiaryProvider)

    // Deriving the PDAs for the vesting program
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

  it('should create a vesting account', async () => {
    try {
      const tx = await program.methods
        .createVestingAccount(companyName)
        .accounts({
          signer: employer.publicKey,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ commitment: 'confirmed' })

      console.log('Create Vesting Account TX:', tx)

      // Fetch the vesting account to verify it was created
      const vestingAccount = await program.account.vestingAccount.fetch(vestingAccountKey, 'confirmed')

      console.log('Vesting Account stringify:', JSON.stringify(vestingAccount, null, 2))
      console.log('Vesting Account:', vestingAccount, null, 2)
      console.log('create vesting account tx', tx)

      // Add assertions to verify the account was created correctly
      expect(vestingAccount).toBeDefined()
      expect(vestingAccount.companyName).toBe(companyName)
    } catch (error) {
      console.error('Test failed with error:', error)
      throw error
    }
  }, 30000) // 30 second timeout for this test

  it('should fund the treasury token aaccount', async () => {
    const amount = 10_000 * 10 ** 9

    const mintTx = await mintTo(banksClient, employer, mint, treauryTokenAaccount, employer, amount)

    console.log('treasury token account', treauryTokenAaccount)

    console.log('Mint Treasury Token Aaccount TX:', mintTx)
  })

  it('should create an employee vesting account', async () => {
    const tx = await program.methods.createEmployeeAccount(new BN(0), new BN(100), new BN(100), new BN(0))
  })
})
