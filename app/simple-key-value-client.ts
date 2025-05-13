import * as anchor from "@coral-xyz/anchor";
import fs from 'fs';
import path from 'path';

// Set up the network and wallet
const NETWORK = "https://api.devnet.solana.com";
const PROGRAM_ID = new anchor.web3.PublicKey("J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa");

// Helper function to load a keypair from a file
function loadKeypair(keypairPath: string): anchor.web3.Keypair {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function main() {
  // Get key and value from command line arguments
  const key = process.argv[2];
  const value = process.argv[3];
  
  if (!key || !value) {
    console.error("Please provide a key and value: ts-node simple-key-value-client.ts <key> <value>");
    process.exit(1);
  }

  console.log(`Using key: ${key}, value: ${value}`);

  // Set up connection to Solana devnet
  const connection = new anchor.web3.Connection(NETWORK, "confirmed");
  
  // Load the wallet from the devnet.json file
  const keypairPath = process.env.HOME ? path.join(process.env.HOME, ".config/solana/devnet.json") : "";
  const wallet = new anchor.Wallet(loadKeypair(keypairPath));
  
  console.log(`Connected with wallet: ${wallet.publicKey.toString()}`);
  
  // Calculate PDA for logger account
  const [loggerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("logger")],
    PROGRAM_ID
  );
  
  console.log(`Logger PDA: ${loggerPda.toString()}`);
  
  try {
    // Create instruction data for initialize
    const initializeDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // discriminator for initialize
    
    // Create the initialize transaction
    const initTx = new anchor.web3.Transaction();
    
    // Add initialize instruction
    initTx.add(
      new anchor.web3.TransactionInstruction({
        keys: [
          { pubkey: loggerPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: initializeDiscriminator
      })
    );
    
    // Try to initialize - this might fail if already initialized
    try {
      console.log("Attempting to initialize logger account...");
      const initTxId = await anchor.web3.sendAndConfirmTransaction(
        connection,
        initTx,
        [wallet.payer]
      );
      console.log(`Initialization successful! Signature: ${initTxId}`);
    } catch (error) {
      console.log("Logger account may already be initialized, continuing...");
    }
    
    // Create instruction data for log_key_value
    const logKeyValueDiscriminator = Buffer.from([116, 104, 228, 211, 192, 136, 103, 163]); // discriminator for log_key_value
    
    // Encode the string arguments
    const keyBytes = Buffer.from(key);
    const valueBytes = Buffer.from(value);
    
    // Create buffer for key length (4 bytes), key, value length (4 bytes), value
    const keyValueData = Buffer.alloc(8 + keyBytes.length + 4 + valueBytes.length);
    keyValueData.writeUInt32LE(keyBytes.length, 0);
    keyBytes.copy(keyValueData, 4);
    keyValueData.writeUInt32LE(valueBytes.length, 4 + keyBytes.length);
    valueBytes.copy(keyValueData, 8 + keyBytes.length);
    
    // Combine discriminator and data
    const logKeyValueData = Buffer.concat([logKeyValueDiscriminator, keyValueData]);
    
    console.log("Sending log_key_value instruction...");
    
    // Create the transaction
    const tx = new anchor.web3.Transaction();
    
    // Add log_key_value instruction
    tx.add(
      new anchor.web3.TransactionInstruction({
        keys: [
          { pubkey: loggerPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: logKeyValueData
      })
    );
    
    // Sign and send the transaction
    const txId = await anchor.web3.sendAndConfirmTransaction(
      connection,
      tx,
      [wallet.payer]
    );
    
    console.log(`Transaction successful! Signature: ${txId}`);
    console.log(`Key: ${key}, Value: ${value}`);
    
    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch transaction details to see logs
    const txDetails = await connection.getTransaction(txId, {
      commitment: "confirmed",
    });
    
    if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
      console.log("Transaction logs:");
      for (const log of txDetails.meta.logMessages) {
        console.log(log);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
} 