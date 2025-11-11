# Changelog

All notable changes to this project will be documented in this file.

## [0.1.6] - 2025-11-10

Added
- Viem signMessage now includes `raw` parameter to distinguish between raw hex and UTF-8 messages
  - Set `raw: true` when message has `.raw` property (viem's raw hex format)
  - Set `raw: false` for regular strings, Uint8Array, and direct hex strings
  - Allows server to properly handle encoding based on message type
- Transaction normalization now removes additional viem-specific fields:
  - `account` (viem account object)
  - `chain` (viem chain object)
  - `from` (from address, determined by signer)

Tests
- Add 5 unit tests for raw message flag validation
- Add integration test for raw hex message signing and verification
- Add 3 unit tests for transaction field removal (type, accessList, account, chain, from)
- Total: 70 unit tests, 23 integration tests

## [0.1.5] - 2025-11-10

Added
- Comprehensive security layer with runtime validation (Next.js-style)
- Error sanitization to prevent information disclosure
  - Sanitize 500/401/403/404/405 errors
  - Limit 4xx error details to 200 characters
- Vault response validation (required fields, evmAddress format)
- Integer overflow protection for nonce and chainId values
- Strict message type validation in viem adapter (prevent object-to-string coercion)
- Race condition protection in ethers wallet initialization
- Promise error recovery in client initialization

Changed
- Optimize vault info fetching: POST-only (no wasteful GET attempt)
- Add security warnings for:
  - Short API keys (< 16 chars)
  - Empty/whitespace-only API keys
  - Invalid baseUrl format
  - Insecure HTTP URLs (except localhost)
  - Browser environment detection

Tests
- Add 28 new unit tests for security features
- Add 12 new integration tests with real API calls
- 100% coverage of all security fixes
- Total: 62 unit tests, 22 integration tests (84 total)

Documentation
- Add comprehensive security audit (.traces/0.1.4-audit.md)
- Add fixes implementation doc (.traces/0.1.4-fixes-implemented.md)
- Add security protections guide (.traces/security-protections.md)
- Add security considerations to README

## [0.1.4] - 2025-11-10

Fixed
- Improved bigint serialization for transaction values sent to remote signer
  - JSON.stringify now converts bigint to string to prevent serialization errors
  - Add comprehensive unit tests for bigint handling
  - Add integration test for large bigint values in real transactions

## [0.1.3] - 2025-11-05

Fixed
- Add .js extensions to internal ESM imports for plain Node.js compatibility
- Resolves module resolution issues in strict ESM environments

## [0.1.2] - 2025-11-05

Added
- Ethers wallet parity with standalone implementation:
  - initialize(), getVaultId(), setChainId(), getChainId()
  - Robust populateTransaction (resolve from/to, chainId, nonce; estimate gas; gasPrice/EIP-1559)
  - _signTypedData alias
  - signAndBroadcast(tx, waitForReceipt?) helper
- VaultInfo tokenId alias (equal to vaultId) for compatibility.

Changed
- Tests: added ethers-extended and vault-info alias tests; updated integration suites.
- Docs: expanded ethers examples; clarified defaults and env usage for tests.

## [0.1.1] - 2025-11-05

Fixed
- Exports map now includes default entry, fixing ESM import error (ERR_PACKAGE_PATH_NOT_EXPORTED).

Published
- First public distribution with adapters for viem, ethers v6, minimal web3 adapter, and Solana stubs.

## [0.1.0] - 2025-11-05

Initial
- Scaffolded library with EmblemVaultClient and adapters:
  - toViemAccount(): viem Account
  - toEthersWallet(): ethers v6 Signer
  - toWeb3Adapter(): minimal web3-style adapter
  - toSolanaWeb3Signer()/toSolanaKitSigner(): stubs exposing Solana address
- HTTP helpers and /vault/info lookup
- Transaction normalization for backend serializers
- Unit tests and integration tests using .env

[0.1.6]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.6
[0.1.5]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.5
[0.1.4]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.4
[0.1.3]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.3
[0.1.2]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.2
[0.1.1]: https://www.npmjs.com/package/emblem-vault-ai-signers/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/emblem-vault-ai-signers/v/0.1.0

