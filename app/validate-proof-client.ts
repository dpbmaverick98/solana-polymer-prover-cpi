import * as anchor from "@coral-xyz/anchor";
import fs from 'fs';
import path from 'path';

// Set up the network and wallet
const NETWORK = "https://api.devnet.solana.com";
const PROGRAM_ID = new anchor.web3.PublicKey("J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa");
const POLYMER_PROVER_ID = new anchor.web3.PublicKey("CdvSq48QUukYuMczgZAVNZrwcHNshBdtqrjW26sQiGPs");
const SYSVAR_INSTRUCTIONS_PUBKEY = new anchor.web3.PublicKey("Sysvar1nstructions1111111111111111111111111");

// Helper function to load a keypair from a file
function loadKeypair(keypairPath: string): anchor.web3.Keypair {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function main() {
  try {
    // Set up connection to Solana devnet
    const connection = new anchor.web3.Connection(NETWORK, "confirmed");
    
    // Load the wallet from the devnet.json file
    const keypairPath = process.env.HOME ? path.join(process.env.HOME, ".config/solana/devnet.json") : "";
    const wallet = new anchor.Wallet(loadKeypair(keypairPath));
    
    console.log(`Connected with wallet: ${wallet.publicKey.toString()}`);
    
    // Get the cache account PDA - created by load-proof-client.ts
    const [cachePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer()],
      POLYMER_PROVER_ID
    );
    console.log(`Using cache PDA: ${cachePDA.toString()}`);
    
    // Calculate PDA for the internal account of the Polymer prover
    const [internalPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("internal")],
      POLYMER_PROVER_ID
    );
    console.log(`Using internal PDA: ${internalPDA.toString()}`);
    
    console.log("Validating the proof...");
    
    // Create instruction with 8-byte discriminator for validate_proof
    const validateProofDiscriminator = Buffer.from([164, 39, 169, 90, 192, 26, 173, 8]);
    
    // Create the validate_proof instruction
    const validateInstruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: POLYMER_PROVER_ID, isSigner: false, isWritable: false },
        { pubkey: cachePDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: internalPDA, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: PROGRAM_ID,
      data: validateProofDiscriminator
    });
    
    // Add a compute budget instruction to increase the CU limit
    const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ 
      units: 1_400_000 // Increase the compute unit limit to 1.4M units
    });
    
    // Add a compute budget instruction to set a higher compute unit price
    const addPriorityFee = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ 
      microLamports: 10_000 // Set a higher priority fee
    });
    
    // Create and send transaction with the compute budget instructions
    const transaction = new anchor.web3.Transaction()
      .add(modifyComputeUnits)
      .add(addPriorityFee)
      .add(validateInstruction);
    
    const tx = await anchor.web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.payer],
      { commitment: "confirmed" }
    );
    
    console.log(`Proof validation transaction sent! Signature: ${tx}`);
    
    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch transaction details to see logs
    const txDetails = await connection.getTransaction(tx, {
      commitment: "confirmed",
    });
    
    if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
      console.log("Transaction logs:");
      for (const log of txDetails.meta.logMessages) {
        console.log(log);
      }
    }
    
    console.log("The proof has been validated!");
    
  } catch (error) {
    console.error("Error validating proof:", error);
    
    // Display detailed error logs if available
    if (error instanceof Error && 'logs' in error) {
      console.log("\nTransaction logs:");
      // @ts-ignore
      for (const log of error.logs) {
        console.log(log);
      }
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
} 