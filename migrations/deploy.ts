// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.
  const program = anchor.workspace.MyAnchorProject;
  
  // Calculate the PDA for the logger account
  const [loggerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("logger")],
    program.programId
  );
  
  try {
    // Initialize the logger account
    const tx = await program.methods
      .initialize()
      .accounts({
        loggerAccount: loggerPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("Logger account initialized with transaction:", tx);
  } catch (error) {
    console.log("Error initializing logger account:", error);
  }
};
