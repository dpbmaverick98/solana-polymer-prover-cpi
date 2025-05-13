import * as anchor from "@coral-xyz/anchor";
import fs from 'fs';
import path from 'path';

// Set up the network and wallet
const NETWORK = "https://api.devnet.solana.com";
const PROGRAM_ID = new anchor.web3.PublicKey("J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa");
const POLYMER_PROVER_ID = new anchor.web3.PublicKey("CdvSq48QUukYuMczgZAVNZrwcHNshBdtqrjW26sQiGPs");

// Helper function to load a keypair from a file
function loadKeypair(keypairPath: string): anchor.web3.Keypair {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Split a buffer into equal chunks (or close to equal)
function splitBufferIntoChunks(buffer: Buffer, numChunks: number): Buffer[] {
  const chunkSize = Math.ceil(buffer.length / numChunks);
  const chunks: Buffer[] = [];
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, Math.min(i + chunkSize, buffer.length)));
  }
  
  return chunks;
}

async function main() {
  // Base64 encoded proof
  const base64Proof = process.argv[2] || "e8zp63R05hpqR0wexQhw5Hj12UaQz9xXqyPBRbsn3pk8qLOgz8LuvledmWTHTRf36gtZMrfJ7cIIxtCglAWlRiuSImjY1Ojy+XRpakgoBnldGqgM4CTeCkcZk0uY8/87GwAAGP4AAAAAABT6ugAAAAAACl3jAAEAAQDvABcvZ9tg5fo0blmc3mdfDKITtHvSZ1LW7+EXc7SoXN+gs/6e+pcHvVACTHvq7WWaFB94WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJ5AAAAAAAAAAAAAAAAl4Uk0FQQxJXqZvARzIGMU765NZkVCQAC9OqnASoqKgIE9OqnASB9GhxwWJMtB9qe9BaoBd9t8fZikUEWA25mxZDfekkWvyAqKgQI9OqnASCYmrKX3ztPo7gkpQ7ZzbdVCo1semsRpM6DctCaMVmvKCAqKgYM9OqnASBJqVFZmyU3B1Jvy2XoGEm6sLWd7gesiJrUmvCwUnBF0SAqKggc9OqnASCUqZZ5zam+4X5kYyS6xW2wOXyJ/vpNk4B4MqBprcLwSiAqKgo89OqnASA6v6VXAYvHpm2HRzOkLZ6vUyGwgSofsPFveD1XkdL6iCAqKgx89OqnASC0OCduSv/M1m6Ku3AI1NLrQ55idVmmtXgoyA1S7aakBiArKw78AfTqpwEgcBzNK5iVeja5qmziOx5wAltA1HK5rsMX7cwaFXBYcNsgKysQ/AP06qcBIOLR6lSn/uXy5ofP4csh6T80wKxsyBBahGd54xpCopZrICsrEvwF9OqnASDrY5Bz8gU9B8R6Y4R9bZdOEJyOfPPA++XMN7r7hlX4myAKKxT+C/TqpwEgIDYL93pDqlFswt3HytcGfT9HRjCLyhx+fdIwrqXr0p06KysWghP06qcBIIHdil/1A3OSJCtAScLbU5xju5sJ+Nr9Qs5SNCwu7GxBIAorGIQc9OqnASAgdJp7kFdq6FvivXVA/e7JwRoHkcsvEyi9o23U38YqTz0rKxq8LfTqpwEgD9bZf9NwUoEmThxTWK/prlF+kF1viqBVVvwDLJ4/atEgKyscqlz06qcBIMe1vnx4GWFSq5MAyKM+fEUXNMXlm6RJnz1/b1g3T1IbIAorHqZ89OqnASAgSDtrYv6365tyimL2cmrhtE+plXXXbIwaNOGJCFefLREsLCDWngL06qcBINNIalFY00Hasx7QfG5+ouXbktOdA7OmZCrt4urVqt0mICwsIpT7A/TqpwEg3pDuEMKWo5k/0f/glNPIOF3P+wbxQFRUdyN6hm7BXY8gLCwkxrAJ9OqnASAKMgnD8VZ9P7cJ/UOIyMKBjItYp0xJIpBaw5Tq64uKjCALLCiE/x706qcBICDLX6cGlh4I9JTf9Q+jQwAvii/E1U2bwHh/BXFsxHizmwssKqr9MPTqpwEgIIIAzA46y7KnYFySncL48d1uSwh6ntmsZvFoKi84YwEgCywslMNY9OqnASAgClZm73VnhhAo5qoP3Jb3fKwh6Tj0YZNM//7jvVDQpjc=";
  
  console.log(`Using proof of length: ${base64Proof.length}`);
  
  // Decode base64 to binary buffer
  const proofBuffer = Buffer.from(base64Proof, 'base64');
  console.log(`Decoded proof length: ${proofBuffer.length} bytes`);
  
  // Split the proof into exactly 4 parts
  const proofChunks = splitBufferIntoChunks(proofBuffer, 4);
  console.log(`Split proof into ${proofChunks.length} chunks:`);
  proofChunks.forEach((chunk, i) => console.log(`  Chunk ${i+1}: ${chunk.length} bytes`));
  
  // Set up connection to Solana devnet
  const connection = new anchor.web3.Connection(NETWORK, "confirmed");
  
  // Load the wallet from the devnet.json file
  const keypairPath = process.env.HOME ? path.join(process.env.HOME, ".config/solana/devnet.json") : "";
  const wallet = new anchor.Wallet(loadKeypair(keypairPath));
  
  console.log(`Connected with wallet: ${wallet.publicKey.toString()}`);
  
  // Create a cache account (PDA) to store the proof - derived from the wallet's public key
  // The PDA is expected to be derived by the Polymer Prover program
  const [cachePDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [wallet.publicKey.toBuffer()],
    POLYMER_PROVER_ID
  );
  console.log(`Using cache PDA: ${cachePDA.toString()}`);
  
  // Send each chunk in sequence
  const loadProofDiscriminator = Buffer.from([34, 145, 85, 9, 72, 98, 17, 92]); // discriminator for load_proof
  
  try {
    // Process each chunk sequentially
    for (let i = 0; i < proofChunks.length; i++) {
      const chunk = proofChunks[i];
      console.log(`Processing chunk ${i+1}/${proofChunks.length} (${chunk.length} bytes)`);
      
      // Create instruction data for this chunk
      const loadProofData = Buffer.concat([
        loadProofDiscriminator,
        Buffer.from(new Uint8Array([chunk.length & 0xff, (chunk.length >> 8) & 0xff, 
                                    (chunk.length >> 16) & 0xff, (chunk.length >> 24) & 0xff])),
        chunk
      ]);
      
      const chunkTx = new anchor.web3.Transaction();
      chunkTx.add(
        new anchor.web3.TransactionInstruction({
          keys: [
            { pubkey: POLYMER_PROVER_ID, isSigner: false, isWritable: false },
            { pubkey: cachePDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }
          ],
          programId: PROGRAM_ID,
          data: loadProofData
        })
      );
      
      const chunkTxId = await anchor.web3.sendAndConfirmTransaction(
        connection,
        chunkTx,
        [wallet.payer]
      );
      
      console.log(`Chunk ${i+1} loaded with transaction: ${chunkTxId}`);
      
      // Wait between transactions to ensure they're processed in order
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch transaction logs for each chunk
      const txDetails = await connection.getTransaction(chunkTxId, {
        commitment: "confirmed",
      });
      
      if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
        console.log(`Chunk ${i+1} transaction logs:`);
        for (const log of txDetails.meta.logMessages) {
          console.log(`  ${log}`);
        }
      }
    }
    
    console.log("All proof chunks have been loaded successfully!");
    console.log("The proof has been loaded into the cache account and can now be validated.");
    
  } catch (error) {
    console.error("Error while processing proof chunks:", error);
    
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