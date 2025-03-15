const { Connection } = require("@solana/web3.js");

async function getTransactionDetails(signature) {
  const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/Jtbf7OFzzUjJb8RTdJ9tfHJ_F90hiGew");
  
  // Get transaction details with all data
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0
  });
  
  console.log(JSON.stringify(tx, null, 2));
}

// Replace with your transaction signature
getTransactionDetails("5MrJjyLYebTU6Fv6bUpSctPnasjnvBji25vQVkhAUD2mEGvdw8zauT2d8oDN4g1uwvKnAmXyCMv1sRwahtW2vyTD");