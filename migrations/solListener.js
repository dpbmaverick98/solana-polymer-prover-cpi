const { Connection, PublicKey } = require("@solana/web3.js");

// Program ID from your deployed contract
const PROGRAM_ID = new PublicKey("GErKGy2MUyTZgXLxAhpmdThpH39YhJGRbbEkfezL9zNL");

// Function to process transaction logs
function processLogs(signature, logs, slot) {
  // Find indices of specific log messages
  let instructionIndex = -1;
  let keyValueIndex = -1;
  
  // Regular expression to match key-value log pattern regardless of actual values
  const keyValuePattern = /^Program log: Key: (.+), Value: (.+), Nonce: (\d+)$/;
  
  // Find the indices
  logs.forEach((log, index) => {
    if (log === "Program log: Instruction: LogKeyValue") {
      instructionIndex = index;
    } else if (keyValuePattern.test(log)) {
      keyValueIndex = index;
      
      console.log({
        signature,
        slot,
        instructionIndex,
        keyValueIndex
      });
    }
  });
}

// Main relayer function
async function startRelayer() {
  // Connect to Solana devnet using HTTP endpoint
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  
  console.log("Starting relayer for program:", PROGRAM_ID.toString());
  
  // Store the last signature we've seen
  let lastSignature = null;
  
  // Poll for new transactions
  async function pollTransactions() {
    try {
      // Get signatures for transactions involving our program
      const signatures = await connection.getSignaturesForAddress(
        PROGRAM_ID,
        { limit: 10 },
        "confirmed"
      );
      
      // Process new transactions (those we haven't seen before)
      for (const signatureInfo of signatures) {
        // Skip if we've already processed this signature
        if (lastSignature === signatureInfo.signature) break;
        
        // Get transaction details
        const tx = await connection.getTransaction(signatureInfo.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (tx && tx.meta && tx.meta.logMessages) {
          processLogs(signatureInfo.signature, tx.meta.logMessages, tx.slot);
        }
      }
      
      // Update the last signature we've seen
      if (signatures.length > 0) {
        lastSignature = signatures[0].signature;
      }
    } catch (error) {
      console.error("Error polling transactions:", error);
    }
    
    // Poll again after a delay
    setTimeout(pollTransactions, 5000); // Poll every 5 seconds
  }
  
  // Start polling
  pollTransactions();
  
  console.log("Relayer started. Polling for transactions every 5 seconds...");
  console.log("Press Ctrl+C to stop");
  
  // Keep the process running
  process.stdin.resume();
}

// Start the relayer
startRelayer().catch(err => {
  console.error("Error in relayer:", err);
});