# Solana Polymer Prover CPI Demo

This repository demonstrates how to generate cross-chain proofs of Solana program logs using Polymer Prover and verify them on EVM chains.

## Overview

This project showcases:

1. A Solana program that emits logs with a specific "Prove:" prefix
2. A client application to request state proofs from Polymer's API
3. A verification tool to validate these proofs on EVM chains (Base Sepolia)

## Project Structure

- `/programs/my_anchor_project/src/lib.rs`: The Solana program that emits provable logs
- `/app/simple-key-value-client.ts`: Client for emitting key-value logs on Solana
- `/app/request-proof.ts`: Client for requesting proofs from Polymer API
- `/app/validate-evm-proof.ts`: Client for validating proofs on EVM chains
- `/app/validate-proof-client.ts`: Client for validating proofs on Solana (alternative approach)

## Prerequisites

- Solana CLI and Rust toolchain
- Node.js and npm/yarn
- Access to Solana Devnet
- Access to Base Sepolia testnet (for EVM verification)
- Polymer API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the Solana program:
```bash
anchor build
```

3. Deploy to devnet:
```bash
anchor deploy --provider.cluster devnet
```

## Usage

### 1. Emit a key-value log on Solana

```bash
ts-node app/simple-key-value-client.ts "solana" "hello"
```

This will:
- Initialize a logger account if needed
- Emit a log in the format: `Prove: Key: solana, Value: hello, Nonce: X`
- Return a transaction signature/ID

### 2. Request a proof from Polymer API

```bash
ts-node app/request-proof.ts YOUR_TX_SIGNATURE PROGRAM_ID
```

For example:
```bash
ts-node app/request-proof.ts 5r4AtXVBkcDmxtBay7RCpNnGCMv4RzX4Z5yqP2axMTzYY85Q3Tt3PKGtdk3m4Sqsfy7rCAb2Qp1F9rGs3xAdbo8C J8T7Dg51zWifVfd4H4G61AaVtmW7GqegHx3h7a59hKSa
```

This will:
- Request a proof from Polymer's API
- Poll until the proof is ready
- Save the proof to a file (e.g., `proof-167462.json`)

### 3. Verify the proof on an EVM chain

```bash
ts-node app/validate-evm-proof.ts proof-167462.json
```

This will:
- Connect to the Base Sepolia testnet
- Convert the base64 proof to hex format
- Verify the proof using Polymer's validator contract
- Display the validated log messages

## Key Components

### 1. Emitting Provable Logs

In your Solana program, use the format:
```rust
msg!("Prove: Key: {}, Value: {}, Nonce: {}", key, value, nonce);
```

The "Prove:" prefix is required for logs to be provable.

### 2. Polymer API Configuration

The proof request API uses:
- URL: `https://proof.testnet.polymer.zone`
- API Key: Set in the `request-proof.ts` file or passed as an argument

### 3. EVM Validator Contract

The validator contract on Base Sepolia:
- Address: `0xabC91c12Bda41BCd21fFAbB95A9e22eE18C4B513`
- Function: `validateSolLogs(bytes calldata proof)`

## Security Considerations

- Only finalized Solana transactions can be proved
- Proofs are valid for a limited time period
- The program ID emitting the logs must match the one used in the proof request

## License

MIT

