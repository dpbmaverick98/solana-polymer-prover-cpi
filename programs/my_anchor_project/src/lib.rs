use anchor_lang::prelude::*;
use polymer_prover::cpi::accounts::{LoadProof as PolymerLoadProof, ValidateEvent as PolymerValidateEvent};
use polymer_prover::instructions::validate_event::ValidateEventResult;
use anchor_lang::solana_program::program::get_return_data;

declare_id!("J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa");

// Polymer Prover Program ID - hardcoded value for the published program
pub const POLYMER_PROVER_ID: Pubkey = anchor_lang::solana_program::pubkey!("CdvSq48QUukYuMczgZAVNZrwcHNshBdtqrjW26sQiGPs");

#[program]
pub mod my_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let logger_account = &mut ctx.accounts.logger_account;
        logger_account.nonce = 0;
        
        Ok(())
    }

    pub fn log_key_value(ctx: Context<LogKeyValue>, key: String, value: String) -> Result<()> {
        let logger_account = &mut ctx.accounts.logger_account;

        // Increment the nonce
        logger_account.nonce += 1;

        // Get the actual runtime program ID
        let program_id = ctx.program_id;

        // Emit properly formatted log with "Prove:" prefix and program ID
        msg!("Prove: program: {}, EVENT_NAME: {}, Key: {}, Value: {}, Nonce: {}", 
             program_id, "KEY_VALUE_LOG", key, value, logger_account.nonce);

        Ok(())
    }

    pub fn load_proof(ctx: Context<LoadProof>, proof: Vec<u8>) -> Result<()> {
        msg!("Loading proof into polymer prover");
        
        // Call the polymer-prover program to load the proof
        polymer_prover::cpi::load_proof(
            CpiContext::new(
                ctx.accounts.polymer_prover.to_account_info(),
                PolymerLoadProof {
                    cache_account: ctx.accounts.cache_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            proof,
        )
    }

    pub fn validate_proof(ctx: Context<ValidateProof>) -> Result<()> {
        msg!("Validating proof with polymer prover");

        // Call the polymer-prover program to validate the event
        polymer_prover::cpi::validate_event(
            CpiContext::new(
                ctx.accounts.polymer_prover.to_account_info(),
                PolymerValidateEvent {
                    cache_account: ctx.accounts.cache_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                    internal: ctx.accounts.internal.to_account_info(),
                    instructions: ctx.accounts.instructions.to_account_info(),
                },
            ),
        )?;

        // Get the return data from the CPI call
        let (pid, data) = get_return_data().ok_or(ErrorCode::MissingReturn)?;
        require_keys_eq!(pid, POLYMER_PROVER_ID, ErrorCode::WrongProgram);

        // Parse the return data as a ValidateEventResult
        let result = ValidateEventResult::try_from_slice(&data)?;
        
        // Process the result based on its type
        match result {
            ValidateEventResult::Valid(chain_id, event) => {
                msg!(
                    "Proof validated: chain_id: {}, emitting_contract: {}, topics: {:?}, unindexed_data: {:?}",
                    chain_id,
                    event.emitting_contract.to_hex(),
                    event.topics,
                    event.unindexed_data
                );
            }
            _ => {
                msg!("Prover returned error: {}", result);
            }
        }

        Ok(())
    }
}

// Define the account structure to store the nonce
#[account]
pub struct LoggerAccount {
    pub nonce: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 8, // Discriminator + u64 for nonce
        seeds = [b"logger"],
        bump
    )]
    pub logger_account: Account<'info, LoggerAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LogKeyValue<'info> {
    #[account(
        mut,
        seeds = [b"logger"],
        bump
    )]
    pub logger_account: Account<'info, LoggerAccount>,
    pub signer: Signer<'info>,
}
#[derive(Accounts)]
pub struct LoadProof<'info> {
    /// CHECK: This is the polymer prover program
    #[account(address = POLYMER_PROVER_ID)]
    pub polymer_prover: AccountInfo<'info>,
    /// CHECK: This is the cache account for the proof
    #[account(mut)]
    pub cache_account: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateProof<'info> {
    /// CHECK: This is the polymer prover program
    #[account(address = POLYMER_PROVER_ID)]
    pub polymer_prover: AccountInfo<'info>,
    /// CHECK: This is the cache account for the proof
    #[account(mut)]
    pub cache_account: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is the internal account for the prover
    #[account(mut)]
    pub internal: UncheckedAccount<'info>,
    /// CHECK: This is the instructions account for the prover
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Missing return data")]
    MissingReturn,
    #[msg("Wrong program returned data")]
    WrongProgram,
    #[msg("Program ID mismatch")]
    ProgramIdMismatch,
}

