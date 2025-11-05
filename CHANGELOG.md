# Changelog

All notable changes to this project will be documented in this file.

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

[0.1.2]: https://github.com/EmblemCompany/emblem-vault-ai-signers/releases/tag/v0.1.2
[0.1.1]: https://www.npmjs.com/package/emblem-vault-ai-signers/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/emblem-vault-ai-signers/v/0.1.0

