use anchor_lang::prelude::*;
use anchor_lang::solana_program::log::sol_log_data;

declare_id!("GErKGy2MUyTZgXLxAhpmdThpH39YhJGRbbEkfezL9zNL");

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

        // Method 1: Simple text logging with `msg!`
        msg!("Key: {}, Value: {}, Nonce: {}", key, value, logger_account.nonce);

        // Method 2: Structured binary logging with `sol_log_data`
        let log_data = KeyValueLog {
            key: key.clone(),
            value: value.clone(),
            nonce: logger_account.nonce,
        };
        let serialized_data = borsh::to_vec(&log_data).unwrap();
        sol_log_data(&[&serialized_data]);

        // Method 3: Anchor event emission
        emit!(KeyValueEvent {
            key: key.clone(),
            value: value.clone(),
            nonce: logger_account.nonce,
        });

        // Call the swap function with the same context
        swap_and_log(ctx, key, value)?;

        Ok(())
    }

    // Change from private to public function
    pub fn swap_and_log(ctx: Context<LogKeyValue>, key: String, value: String) -> Result<()> {
        let logger_account = &mut ctx.accounts.logger_account;
        
        // Increment the nonce again for the swapped values
        logger_account.nonce += 1;
        
        // Log the swapped values
        msg!("Swapped - Key: {}, Value: {}, Nonce: {}", value, key, logger_account.nonce);
        
        // Update to use the new event type
        emit!(KeyValueSwappedEvent {
            key: value,
            value: key,
            nonce: logger_account.nonce,
        });
        
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

// Context for the log_key_value instruction
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

// Structured data for `sol_log_data`
#[derive(borsh::BorshSerialize, borsh::BorshDeserialize)]
pub struct KeyValueLog {
    pub key: String,
    pub value: String,
    pub nonce: u64,
}

// Structured event for Anchor
#[event]
pub struct KeyValueEvent {
    pub key: String,
    pub value: String,
    pub nonce: u64,
}

// Add this event definition after KeyValueEvent
#[event]
pub struct KeyValueSwappedEvent {
    pub key: String,
    pub value: String,
    pub nonce: u64,
}
