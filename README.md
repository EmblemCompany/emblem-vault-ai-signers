# Emblem Vault AI Signers

Remote signer adapters for Emblem Vault that plug into popular Ethereum libraries:

- `toViemAccount()` – creates a viem `Account` that signs via Emblem
- `toEthersWallet()` – creates an ethers v6 `Signer` that signs via Emblem
  - Implements `initialize()`, `getVaultId()`, `setChainId()`, `getChainId()`
  - Adds `signAndBroadcast(tx, waitForReceipt?)` helper (optional)
- `toWeb3Adapter()` – returns a minimal Web3-style signer adapter (EVM)
- `toSolanaWeb3Signer()` – returns a stub Solana signer with `publicKey`
- `toSolanaKitSigner()` – returns a stub Solana signer with `publicKey`

> Note: The ethers adapter targets ethers v6.

## Install

```
npm install emblem-vault-ai-signers
# and bring your own peers
npm install ethers viem
```

## Usage

```ts
import { createEmblemClient } from "emblem-vault-ai-signers";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { JsonRpcProvider } from "ethers";

const client = createEmblemClient({
  apiKey: "your-x-api-key",
  // baseUrl: "https://api.emblemvault.ai" // optional (tests use https://dev-api.emblemvault.ai)
});

// viem
const account = await client.toViemAccount();
const viemClient = createPublicClient({ chain: mainnet, transport: http() });
// e.g. viemClient.signMessage({ account, message: "hello" })

// ethers v6
const provider = new JsonRpcProvider(process.env.RPC_URL!);
const wallet = await client.toEthersWallet(provider);

// Read metadata
const addr = await wallet.getAddress();
const vaultId = wallet.getVaultId();

// Sign & send via ethers Provider
await wallet.signMessage("hello");
await wallet.sendTransaction({ to: "0x...", value: 1n });

// Or sign and broadcast, returning tx hash
const txHash = await wallet.signAndBroadcast({ to: "0x...", value: 1n }, true);

// web3.js-like adapter (minimal)
const web3Adapter = await client.toWeb3Adapter();
await web3Adapter.signMessage("hello");

// Solana stubs (address only; signing not yet implemented)
const solWeb3 = await client.toSolanaWeb3Signer();
console.log(solWeb3.publicKey);
const solKit = await client.toSolanaKitSigner();
console.log(solKit.publicKey);
```

## Replace Private Keys (Examples)

Below are quick swaps showing how to remove local private keys and route signing through Emblem.

### viem

Old (local private key):
```ts
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.PK as `0x${string}`);
const wallet = createWalletClient({ chain: sepolia, transport: http(process.env.RPC_URL!), account });
await wallet.sendTransaction({ to: "0x...", value: 1n });
```

New (Emblem remote signer):
```ts
import { createEmblemClient } from "emblem-vault-ai-signers";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const client = createEmblemClient({ apiKey: process.env.EMBLEM_API_KEY!, baseUrl: process.env.EMBLEM_BASE_URL });
const account = await client.toViemAccount();
const wallet = createWalletClient({ chain: sepolia, transport: http(process.env.RPC_URL!), account });

// Message & typed data
await wallet.signMessage({ account, message: "hello" });
await wallet.signTypedData({
  account,
  domain: { name: "App", version: "1", chainId: 11155111 },
  types: { Test: [{ name: "x", type: "uint256" }] },
  primaryType: "Test",
  message: { x: 42 },
});

// Transactions
await wallet.sendTransaction({ account, to: "0x...", value: 1n });
```

### ethers v6

Old (local private key):
```ts
import { Wallet, JsonRpcProvider } from "ethers";
const provider = new JsonRpcProvider(process.env.RPC_URL!);
const wallet = new Wallet(process.env.PK!, provider);
await wallet.sendTransaction({ to: "0x...", value: 1n });
```

New (Emblem remote signer):
```ts
import { createEmblemClient } from "emblem-vault-ai-signers";
import { JsonRpcProvider } from "ethers";

const client = createEmblemClient({ apiKey: process.env.EMBLEM_API_KEY!, baseUrl: process.env.EMBLEM_BASE_URL });
const provider = new JsonRpcProvider(process.env.RPC_URL!);
const wallet = await client.toEthersWallet(provider);

await wallet.signMessage("hello");
await wallet.sendTransaction({ to: "0x...", value: 1n });
```

### web3.js (minimal adapter)

Emblem includes a small adapter that returns signatures and raw transactions you can broadcast.

```ts
import { createEmblemClient } from "emblem-vault-ai-signers";
import { JsonRpcProvider } from "ethers"; // for broadcasting raw tx

const client = createEmblemClient({ apiKey: process.env.EMBLEM_API_KEY!, baseUrl: process.env.EMBLEM_BASE_URL });
const adapter = await client.toWeb3Adapter();

// Sign message / typed data
const sig1 = await adapter.signMessage("hello");
const sig2 = await adapter.signTypedData(
  { name: "App", version: "1", chainId: 11155111 },
  { Test: [{ name: "x", type: "uint256" }] },
  { x: 42 }
);

// Sign transaction, then broadcast using ethers provider
const { rawTransaction } = await adapter.signTransaction({
  to: "0x...",
  value: 1n,
  chainId: 11155111,
  gas: 21000n,
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
});
const provider = new JsonRpcProvider(process.env.RPC_URL!);
await provider.broadcastTransaction(rawTransaction);
```

### Solana (stubs)

These expose the Solana address derived from the vault. Signing is not implemented yet.

```ts
const solWeb3 = await client.toSolanaWeb3Signer();
console.log(solWeb3.publicKey);
```

## API

```ts
type EmblemRemoteConfig = {
  apiKey: string;
  baseUrl?: string; // default https://api.emblemvault.ai
};

createEmblemClient(config): EmblemVaultClient
EmblemVaultClient#toViemAccount(): Promise<Account>
EmblemVaultClient#toEthersWallet(provider?): Promise<Signer>
EmblemVaultClient#toWeb3Adapter(): Promise<{ address, signMessage, signTypedData, signTransaction }>
EmblemVaultClient#toSolanaWeb3Signer(): Promise<{ publicKey }>
EmblemVaultClient#toSolanaKitSigner(): Promise<{ publicKey }>

Ethers wallet (v6) adds:
- initialize(): Promise<void>
- getVaultId(): string
- setChainId(n: number): void
- getChainId(): number
- signAndBroadcast(tx: TransactionRequest, waitForReceipt?: boolean): Promise<string>
```

Adapters POST to the Emblem API endpoints:

- `POST /sign-eth-message` – `{ vaultId, message }`
- `POST /sign-typed-message` – `{ vaultId, domain, types, message }`
- `POST /sign-eth-tx` – `{ vaultId, transaction }` (expects ethers-serializable fields)

On first use, both adapters query `GET /vault/info` with header `x-api-key` to obtain:

- Vault ID
- Solana Address
- EVM Address

Transactions are normalized to hex/number-like fields before submission.

## Testing

- Copy `.env.example` to `.env` and set:
  - `EMBLEM_API_KEY` – your dev API key
  - `EMBLEM_BASE_URL` – usually `https://dev-api.emblemvault.ai`
- Run `npm test`

Notes:
- Tests mock `fetch` and do not hit the network.
- Node 18+ (or a fetch polyfill) is required at runtime.

### Integration tests

Integration tests hit the real API using your `.env` values and verify signatures with viem/ethers.

- Ensure `.env` contains working credentials (typically dev base URL)
- Run: `npm run test:integration`

These tests:
- Sign and verify messages and typed data
- Sign transactions and verify the recovered `from` address
