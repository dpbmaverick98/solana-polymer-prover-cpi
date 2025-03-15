import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, web3, BN, Wallet } from "@project-serum/anchor";
import fs from 'fs';
import path from 'path';
import * as borsh from 'borsh';

// Load the IDL from the target directory
const idlPath = path.join(__dirname, '../target/idl/my_anchor_project.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Program ID from your Anchor.toml or from the deployed program
const PROGRAM_ID = new PublicKey("GErKGy2MUyTZgXLxAhpmdThpH39YhJGRbbEkfezL9zNL");

// Helper function to load a keypair from a file
function loadKeypair(keypairPath: string): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Main client class
export class KeyValueClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;
  private loggerPda: PublicKey;

  constructor(
    keypairPath: string,
    rpcUrl: string = "https://api.devnet.solana.com"
  ) {
    // Set up connection and wallet
    const keypair = loadKeypair(keypairPath);
    this.connection = new Connection(rpcUrl, "confirmed");
    this.provider = new AnchorProvider(
      this.connection,
      new Wallet(keypair),
      { commitment: "confirmed" }
    );

    // Initialize the program
    this.program = new Program(idl, PROGRAM_ID, this.provider);

    // Calculate the PDA for the logger account
    const [loggerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("logger")],
      PROGRAM_ID
    );
    this.loggerPda = loggerPda;
  }

  // Initialize the logger account
  async initialize(): Promise<string> {
    try {
      const tx = await this.program.methods
        .initialize()
        .accounts({
          loggerAccount: this.loggerPda,
          signer: this.provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Initialization transaction signature:", tx);
      return tx;
    } catch (error) {
      console.error("Error initializing logger account:", error);
      throw error;
    }
  }

  // Log a key-value pair
  async logKeyValue(key: string, value: string): Promise<string> {
    try {
      const tx = await this.program.methods
        .logKeyValue(key, value)
        .accounts({
          loggerAccount: this.loggerPda,
          signer: this.provider.wallet.publicKey,
        })
        .rpc();

      console.log("Log key-value transaction signature:", tx);
      
      // Fetch transaction details to get logs
      const txDetails = await this.connection.getTransaction(tx, {
        commitment: "confirmed",
      });
      
      if (txDetails && txDetails.meta) {
        console.log("Transaction logs:", txDetails.meta.logMessages);
      }
      
      return tx;
    } catch (error) {
      console.error("Error logging key-value pair:", error);
      throw error;
    }
  }

  // Subscribe to program logs in real-time
  subscribeToLogs(callback: (logs: any) => void): number {
    return this.connection.onLogs(PROGRAM_ID, (logs) => {
      callback(logs);
    });
  }

  // Unsubscribe from logs
  unsubscribeFromLogs(subscriptionId: number): void {
    this.connection.removeOnLogsListener(subscriptionId);
  }

  // Helper to decode binary logs (for sol_log_data)
  decodeBinaryLog(base64Data: string): { key: string; value: string; nonce: number } {
    const schema = {
      struct: { key: "string", value: "string", nonce: "u64" },
    };
    
    const decoded = borsh.deserialize(
      schema,
      Buffer.from(base64Data, "base64")
    ) as { key: string; value: string; nonce: number };
    
    return decoded;
  }
}

// Example usage
async function main() {
  const keypairPath = path.join(process.env.HOME || "", ".config/solana/devnet.json");
  const client = new KeyValueClient(keypairPath);
  
  const key = process.argv[2];
  const value = process.argv[3];
  
  if (!key || !value) {
    console.error("Please provide a key and value: node key-value-client.js <key> <value>");
    process.exit(1);
  }
  
  try {
    // Initialize if needed
    try {
      await client.initialize();
      console.log("Logger account initialized");
    } catch (error) {
      console.log("Logger account may already be initialized, continuing...");
    }
    
    // Log the key-value pair from input
    await client.logKeyValue(key, value);
    console.log(`Logged key: ${key}, value: ${value}`);
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