import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// EVM Chain Configuration
const EVM_RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/Jtbf7OFzzUjJb8RTdJ9tfHJ_F90hiGew';
const PROVER_ADDRESS = '0xabC91c12Bda41BCd21fFAbB95A9e22eE18C4B513';

// ABI for the validateSolLogs function
const PROVER_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "validateSolLogs",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "chainId",
        "type": "uint32"
      },
      {
        "internalType": "bytes32",
        "name": "programID",
        "type": "bytes32"
      },
      {
        "internalType": "string[]",
        "name": "logMessages",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Convert base64 to hex string
 * @param base64 - Base64 encoded string
 * @returns Hex string with 0x prefix
 */
function base64ToHex(base64: string): string {
  // Remove any non-base64 characters (like newlines)
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Convert base64 to a buffer
  const buffer = Buffer.from(base64, 'base64');
  
  // Convert buffer to hex string with 0x prefix
  return '0x' + buffer.toString('hex');
}

/**
 * Validates a Solana proof on an EVM chain
 */
async function validateProofOnEVM(proofFilePath: string) {
  console.log(`Reading proof from: ${proofFilePath}`);
  
  if (!fs.existsSync(proofFilePath)) {
    throw new Error(`Proof file not found: ${proofFilePath}`);
  }
  
  // Read proof from file
  const proofData = fs.readFileSync(proofFilePath, 'utf8').trim();
  
  // Connect to the EVM chain
  console.log(`Connecting to EVM chain: ${EVM_RPC_URL}`);
  const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
  
  // Connect to the prover contract
  console.log(`Using prover contract at: ${PROVER_ADDRESS}`);
  const proverContract = new ethers.Contract(PROVER_ADDRESS, PROVER_ABI, provider);
  
  // Prepare proof data in correct format for EVM
  let proofHex: string;
  
  // Check if the proof is base64 encoded
  if (proofData.match(/^[A-Za-z0-9+/=]+$/)) {
    console.log('Detected base64 encoded proof, converting to hex...');
    proofHex = base64ToHex(proofData);
    console.log(`Converted proof (first 64 chars): ${proofHex.substring(0, 64)}...`);
  } else {
    try {
      // Try to parse as JSON
      const proofJson = JSON.parse(proofData);
      
      // If it's an array of numbers, convert to Buffer then to hex
      if (Array.isArray(proofJson)) {
        const buffer = Buffer.from(proofJson);
        proofHex = '0x' + buffer.toString('hex');
      } else {
        // If it's already a hex string
        if (typeof proofJson === 'string' && proofJson.startsWith('0x')) {
          proofHex = proofJson;
        } else {
          // Otherwise, stringify the JSON and convert to bytes
          proofHex = '0x' + Buffer.from(JSON.stringify(proofJson)).toString('hex');
        }
      }
    } catch (e) {
      // If not JSON, check if it's a hex string
      if (proofData.startsWith('0x')) {
        proofHex = proofData;
      } else {
        // Last resort: convert the string to hex
        proofHex = '0x' + Buffer.from(proofData).toString('hex');
      }
    }
  }
  
  console.log('Validating proof on EVM chain...');
  
  try {
    // Call the validateSolLogs function with the hex proof
    const [chainId, programID, logMessages] = await proverContract.validateSolLogs(proofHex);
    
    console.log('\nProof validation successful! 🎉');
    console.log('=================================');
    console.log(`Source Chain ID: ${chainId}`);
    console.log(`Program ID: 0x${programID.substring(2)}`);
    console.log('\nLog Messages:');
    
    logMessages.forEach((log: string, index: number) => {
      console.log(`[${index + 1}] ${log}`);
      
      // Highlight the key-value log with color
      if (log.includes('Key:') && log.includes('Value:') && log.includes('Nonce:')) {
        const matches = log.match(/Key: (.+), Value: (.+), Nonce: (\d+)/);
        if (matches) {
          console.log('\nExtracted Key-Value:');
          console.log(`  Key   : \x1b[32m${matches[1]}\x1b[0m`);
          console.log(`  Value : \x1b[32m${matches[2]}\x1b[0m`);
          console.log(`  Nonce : \x1b[32m${matches[3]}\x1b[0m`);
        }
      }
    });
    
    return { chainId, programID, logMessages };
    
  } catch (error) {
    console.error('Error validating proof:');
    if (error instanceof Error) {
      console.error(`- ${error.message}`);
      
      // Check for common errors
      if (error.message.includes('invalid proof')) {
        console.error('\nThis could be due to:');
        console.error('- Incorrect proof format');
        console.error('- Proof has expired or is not yet valid');
        console.error('- The proof was generated for a different program ID');
      } else if (error.message.includes('call revert exception')) {
        console.error('\nThe contract reverted. This could be due to:');
        console.error('- Proof verification failed');
        console.error('- Contract is not properly set up or has been upgraded');
      }
    } else {
      console.error(error);
    }
    throw error;
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide a proof file path');
    console.error('Usage: ts-node app/validate-evm-proof.ts <proof-file-path>');
    process.exit(1);
  }
  
  const proofFilePath = process.argv[2];
  
  try {
    await validateProofOnEVM(proofFilePath);
  } catch (error) {
    console.error('Failed to validate proof');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
} 