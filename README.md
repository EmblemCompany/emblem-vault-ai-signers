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

See the Changelog for release details: CHANGELOG.md

## Install

```
npm install emblem-vault-ai-signers
# and bring your own peers
npm install ethers viem

# Optional: for SDK integration
npm install emblem-auth-sdk
```

## Usage

```ts
import { createEmblemClient } from "emblem-vault-ai-signers";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { JsonRpcProvider } from "ethers";

const client = createEmblemClient({
  apiKey: "your-x-api-key", // traditional API key auth
  // OR use JWT authentication (see Authentication section below)
  // jwt: "your-jwt-token",
  // OR use SDK integration
  // sdk: yourAuthSDK,
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

## Authentication

The library supports multiple authentication methods. You only need to provide **one** of the following:

### API Key Authentication (Traditional)

```ts
const client = createEmblemClient({
  apiKey: "pk_your_api_key_here"
});
```

### JWT Authentication

#### Static JWT Token
```ts
const client = createEmblemClient({
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
});
```

#### Dynamic JWT Provider
For tokens that need refreshing or are fetched asynchronously:
```ts
const client = createEmblemClient({
  getJwt: async () => {
    // Fetch from your auth service, refresh if needed
    return await authService.getAccessToken();
  }
});

// Or synchronous
const client = createEmblemClient({
  getJwt: () => localStorage.getItem('authToken')
});
```

### SDK Integration

If you're using an authentication SDK that manages sessions:
```ts
const client = createEmblemClient({
  sdk: myAuthSDK  // Must have getSession() method that returns { authToken }
});

// Example with EmblemAuthSDK:
import { EmblemAuthSDK } from 'emblem-auth-sdk';

const authSDK = new EmblemAuthSDK({
  appId: 'your-app-id',
  apiUrl: 'https://api.emblemvault.ai'
});

const client = createEmblemClient({
  sdk: authSDK  // EmblemAuthSDK has getSession() that returns { authToken, user, ... }
});

// Example with custom auth SDK:
const client = createEmblemClient({
  sdk: {
    getSession: () => ({
      authToken: auth0.getIdToken(),
      user: { id: '123' }
    })
  }
});
```

### Custom Auth Headers

For advanced authentication schemes:
```ts
const client = createEmblemClient({
  getAuthHeaders: async () => ({
    'Authorization': 'Custom my-custom-token',
    'X-API-Version': '2.0',
    'X-Client-ID': 'my-app'
  })
});
```

### Authentication Priority

When multiple auth methods are provided, they're used in this order:
1. `getAuthHeaders()` (highest priority)
2. `apiKey`
3. `jwt` / `getJwt()` / `sdk` (lowest priority)

### Browser vs Server Usage

- **Browser**: JWT/SDK authentication is recommended for client-side apps where users authenticate themselves
- **Server**: API key authentication is recommended for server-side applications with stored credentials

### Complete SDK Integration Example

Here's a complete example using the EmblemAuthSDK with the signers library:

```ts
import { EmblemAuthSDK } from 'emblem-auth-sdk';
import { createEmblemClient } from 'emblem-vault-ai-signers';
import { JsonRpcProvider, parseEther } from 'ethers';

// 1. Initialize the auth SDK
const authSDK = new EmblemAuthSDK({
  appId: 'your-app-id',
  apiUrl: 'https://api.emblemvault.ai',
  onSuccess: (session) => {
    console.log('User authenticated:', session.user);
  }
});

// 2. Create the signer client using the SDK
const client = createEmblemClient({
  sdk: authSDK  // Pass the SDK instance directly
});

// 3. Authenticate the user (opens auth modal)
await authSDK.openAuthModal();

// 4. Once authenticated, create wallets/accounts
const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = await client.toEthersWallet(provider);

// 5. Sign and send transactions
const txHash = await wallet.signAndBroadcast({
  to: "0x...",
  value: parseEther("0.01")
});
```

The SDK integration automatically handles:
- JWT token management and refresh
- Session persistence across page reloads
- Authentication state management
- Seamless integration with the signers library

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
  // Authentication (pick one method):
  apiKey?: string;                    // traditional x-api-key header
  jwt?: string;                       // static JWT for Authorization: Bearer
  getJwt?: () => Promise<string> | string; // dynamic JWT provider
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>; // custom auth headers
  sdk?: { getSession: () => { authToken?: string } | null }; // SDK integration (e.g., EmblemAuthSDK)

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

On first use, both adapters query `POST /vault/info` with authentication headers to obtain:

- Vault ID
- Solana Address
- EVM Address

Transactions are normalized to hex/number-like fields before submission.

## Security Considerations

### Client-Side Usage

This library is designed for environments where **users provide their own API keys**. When used client-side (browser/dApp):

#### Trust Model
- **Users must trust the dApp code** - Any JavaScript running in the browser has full access to API keys
- **No technical enforcement possible** - Browser dev tools, breakpoints, and code injection can modify any behavior
- **baseUrl is configurable** - Required for development/staging/production environments
- **Transparent by design** - This is a feature, not a bug

#### What This Means
```javascript
// Users provide their OWN credentials to YOUR dApp
const client = createEmblemClient({
  // Traditional API key
  apiKey: userApiKey, // User's key, not yours
  // OR JWT token from user's authentication
  jwt: userJwtToken, // User's JWT, not yours
  // OR SDK integration
  sdk: userAuthSDK, // User's auth SDK
  baseUrl: "https://api.emblemvault.ai"
});
```

If a user runs your dApp code, they are trusting it with their authentication credentials and signing authority. There is no way to prevent malicious dApp code from:
- Logging API keys or JWT tokens
- Intercepting `fetch()` calls
- Changing the `baseUrl`
- Making unauthorized signing requests

**This is the same trust model as MetaMask and other browser wallets.**

### Best Practices for Users

1. **Only use trusted dApps** - Verify the source and reputation
2. **Review open source code** when possible
3. **Use separate credentials** for different dApps (API keys, JWT tokens)
4. **Monitor signing activity** in your Emblem dashboard
5. **Test with staging credentials first** before using production
6. **Understand token expiration** - JWT tokens expire and may need refresh

### Best Practices for Implementers

1. **Open source your dApp** - Allow security audits
2. **Document your security model** - Be transparent about API key handling
3. **Minimize dependencies** - Reduce supply chain attack surface
4. **Use Content Security Policy** - Add CSP headers to protect against XSS
5. **Never log or store user credentials** - Only use API keys/JWTs in-memory for signing
6. **Implement proper error handling** - Don't expose credentials in error messages
7. **Handle JWT expiration gracefully** - Implement token refresh when using dynamic JWTs
8. **Prefer JWT auth for client-side apps** - More secure than exposing long-lived API keys

### Server-Side Usage

When used server-side (Node.js):
- Store API keys in environment variables
- Never expose credentials to client-side code
- Use proper access controls and authentication
- Implement rate limiting if exposing signing endpoints
- Consider API key auth for server-to-server communication
- Use JWT auth when proxying user authentication

### Development vs Production

This library supports multiple environments via `baseUrl`:

```javascript
// Development
const devClient = createEmblemClient({
  apiKey: process.env.DEV_API_KEY,
  baseUrl: "https://dev-api.emblemvault.ai"
});

// Production with API key
const prodClient = createEmblemClient({
  apiKey: process.env.PROD_API_KEY,
  baseUrl: "https://api.emblemvault.ai"
});

// Production with JWT (client-side)
const jwtClient = createEmblemClient({
  getJwt: async () => await auth.getAccessToken(),
  baseUrl: "https://api.emblemvault.ai"
});
```

Credentials from one environment do not work in another, providing natural isolation.

---

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
