Here's the well-structured README.md file:

```markdown
# Key-Value Logger Solana Program

A Solana program built with Anchor that demonstrates different logging methods through key-value pair operations. Includes a TypeScript client for interaction and event monitoring.

![Solana Logo](https://solana.com/favicon.ico) ![Anchor Logo](https://anchorlang.com/_next/image?url=%2Flogo.png&w=128&q=75)

## Overview

This program showcases three logging methodologies on Solana:
1. Simple text logging with `msg!`
2. Structured binary logging with `sol_log_data`
3. Anchor's structured events with `emit!`

Features:
- Stores operation count in a Program Derived Address (PDA)
- Swaps key/value pairs in subsequent operations
- Provides comprehensive TypeScript client integration
- Supports real-time event monitoring

## Project Structure

```text
my_anchor_project/
├── programs/
│   └── my_anchor_project/
│       └── src/
│           └── lib.rs         # Program logic
├── app/
│   └── key-value-client.ts    # TS client implementation
├── migrations/
│   ├── deploy.ts              # Deployment scripts
│   ├── fetchTxData.js         # Transaction inspector
│   └── solListener.js         # Event listener
├── target/
│   └── idl/
│       └── my_anchor_project.json  # Generated IDL
├── Anchor.toml                # Config
├── Cargo.toml                 # Rust dependencies
└── README.md                  # Documentation
```

## Prerequisites

- [Rust](https://rustup.rs/) (v1.65.0+)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18.4+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- Node.js (v18.x+)
- npm/yarn

## 🚀 Quick Start

1. Clone repository & install dependencies:
```bash
git clone https://github.com/your-username/my_anchor_project.git
cd my_anchor_project
npm install
```

2. Set up Solana devnet environment:
```bash
solana config set --url devnet
solana-keygen new
```

3. Build and deploy:
```bash
anchor build
anchor deploy
```

4. Run client with test data:
```bash
node app/key-value-client.js "temperature" "23.5°C"
```

## Program Instructions

### `initialize`
- Creates PDA with seed "logger"
- Sets initial nonce to 0

### `log_key_value`
1. Accepts key/value pair (max 32 bytes each)
2. Increments nonce
3. Logs data using all three methods
4. Triggers `swap_and_log` with swapped values

## 📊 Logging Comparison

| Method              | Format         | Size Limit | Decoding                   | Use Case                |
|---------------------|----------------|------------|----------------------------|-------------------------|
| `msg!`              | Plain text     | 512 bytes  | Direct read                | Simple debugging        |
| `sol_log_data`      | Binary         | 10KB       | Manual deserialization     | Structured large data   |
| Anchor Events       | JSON (IDL)    | 10KB       | Automatic via client       | Production applications |

## Event Types

```rust
// Original submission
struct KeyValueEvent {
    key: String,
    value: String,
    nonce: u64,
}

// After swap operation
struct KeyValueSwappedEvent {
    swapped_key: String,
    swapped_value: String,
    nonce: u64,
}
```

## Client API

```typescript
interface KeyValueClient {
  initialize(): Promise<TransactionSignature>;
  logKeyValue(key: string, value: string): Promise<TransactionSignature>;
  subscribeToLogs(callback: (log: any) => void): void;
  decodeBinaryLog(data: string): { key: string; value: string; nonce: number };
}
```

## Monitoring Tools

### Real-time Listener
```bash
node migrations/solListener.js
```

### Transaction Inspector
```bash
node migrations/fetchTxData.js 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9ChKDcpq3Mxcs3poaH9g4KdYL4iPEgfQ25238huKGnMHCUnmN4VbSv7nD9
```

## EVM Developer Notes

1. **Account Model**: Unlike EVM's contract storage, Solana requires explicit account passing
2. **PDAs**: Program-controlled addresses (no private keys) for deterministic account access
3. **Log Limits**: Maximum 10KB per log entry across all methods
4. **Gas Costs**: Logging impacts compute units - binary logs are most efficient

## License

MIT License - See [LICENSE](LICENSE) for details

