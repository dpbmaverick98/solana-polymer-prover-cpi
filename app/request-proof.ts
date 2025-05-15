import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables if .env file exists
dotenv.config();

// Define interface for proof request parameters
interface SolanaProofRequestParams {
  srcChainId: number;
  txSignature: string;
  programID: string;
}

// Define interfaces for API responses
interface ProofResponse {
  proof: string;
  status: 'pending' | 'complete' | 'error';
  error?: string;
}

// Hardcoded Polymer API credentials
const POLYMER_API_KEY = 'b82f2d2c-dc29-46a3-883e-ffb1af2a4ae9';
const POLYMER_API_URL = 'https://proof.testnet.polymer.zone';

class SolanaProofAPI {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Request a proof for a Solana transaction using Polymer API
   */
  public async requestProof(params: SolanaProofRequestParams): Promise<string> {
    try {
      const { srcChainId, txSignature, programID } = params;
      
      console.log(
        `Requesting proof for Solana chain ${srcChainId}, transaction ${txSignature}, program ${programID}`
      );

      // Request proof from Polymer API
      const proofRequestResponse = await axios.post(
        this.apiUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "polymer_requestProof",
          params: [{
            srcChainId,
            txSignature,
            programID
          }]
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const jobId = proofRequestResponse.data.result;
      console.log(`Proof request submitted. Job ID: ${jobId}`);

      // Poll for proof
      const proof = await this.pollForProof(jobId);
      return proof;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error requesting proof: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Poll for a proof until it's ready
   */
  private async pollForProof(jobId: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 20;
    const initialDelay = 2000; // 2 seconds
    let delay = initialDelay;

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling for proof, attempt ${attempts + 1}/${maxAttempts}`);
        
        const result = await this.queryProof(jobId);
        
        if (result && result.status === 'complete') {
          console.log(`Proof generated successfully`);
          
          // Save proof to file
          const proofFileName = `proof-${jobId}.json`;
          fs.writeFileSync(proofFileName, result.proof);
          console.log(`Proof saved to ${proofFileName}`);
          
          return result.proof;
        } else if (result && result.status === 'error') {
          throw new Error(`Proof generation failed: ${result.error || 'Unknown error'}`);
        }
        
        // Exponential backoff with a cap
        delay = Math.min(delay * 1.5, 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // If it's a network error, retry
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
          console.warn(`Network error: ${errorMessage}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }
        
        throw error;
      }
    }

    throw new Error(`Proof generation timed out after ${maxAttempts} attempts`);
  }

  /**
   * Query the status of a proof job
   */
  private async queryProof(jobId: string): Promise<ProofResponse | null> {
    try {
      const proofResponse = await axios.post(
        this.apiUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "polymer_queryProof",
          params: [jobId]
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const result = proofResponse.data.result;

      if (result.status === 'complete' && result.proof) {
        return {
          proof: result.proof,
          status: 'complete'
        };
      } else if (result.status === 'error') {
        return {
          proof: '',
          status: 'error',
          error: result.error || 'Unknown error'
        };
      } else {
        return {
          proof: '',
          status: 'pending'
        };
      }
    } catch (error) {
      // For network errors, return null to continue polling
      if (error instanceof Error && 
          (error.message.includes('ECONNREFUSED') || error.message.includes('ECONNRESET'))) {
        return null;
      }
      throw error;
    }
  }
}

async function main() {
  // Use the hardcoded API key (or override with env var or command line arg if needed)
  const apiKey = process.env.POLYMER_API_KEY || process.argv[4] || POLYMER_API_KEY;
  const apiUrl = process.env.POLYMER_API_URL || POLYMER_API_URL;
  
  // Set up the proof API
  const proofAPI = new SolanaProofAPI(apiUrl, apiKey);
  
  // The transaction signature for which we want to get a proof
  const txSignature = process.argv[2] || '5r4AtXVBkcDmxtBay7RCpNnGCMv4RzX4Z5yqP2axMTzYY85Q3Tt3PKGtdk3m4Sqsfy7rCAb2Qp1F9rGs3xAdbo8C';
  
  // The program ID that emitted the log
  const programID = process.argv[3] || 'J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa';
  
  if (!txSignature) {
    console.error('Please provide a transaction signature as the first argument');
    process.exit(1);
  }
  
  if (!programID) {
    console.error('Please provide a program ID as the second argument');
    process.exit(1);
  }
  
  console.log(`Requesting proof for transaction: ${txSignature}`);
  console.log(`Program ID: ${programID}`);
  console.log(`Using API key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Request a proof
    const proof = await proofAPI.requestProof({
      srcChainId: 2, // Solana chain ID in Polymer
      txSignature,
      programID
    });
    
    console.log('Proof received successfully!');
    
    // Use the proof with your validate function
    console.log('You can now use this proof to validate on EVM chains');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * USAGE:
 * 
 * Run the script with:
 * ts-node app/request-proof.ts [TX_SIGNATURE] [PROGRAM_ID]
 * 
 * The API key is hardcoded but can be overridden using:
 * - Environment variable: POLYMER_API_KEY
 * - Command line argument: ts-node app/request-proof.ts TX_SIG PROGRAM_ID API_KEY
 * 
 * If successful, the proof will be saved to a file named proof-{jobId}.json
 */

// Run the script
if (require.main === module) {
  main().catch(console.error);
} 