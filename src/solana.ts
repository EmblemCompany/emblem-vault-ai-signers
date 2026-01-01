import type { EmblemRemoteConfig, VaultInfo } from "./types.js";
import { emblemPost } from "./http.js";
import { fetchVaultInfo } from "./vault.js";

// @solana/web3.js compatible interfaces
export interface SolanaSignerInterface {
  publicKey: string;
  signMessage(message: Uint8Array | string): Promise<Uint8Array>;
  signTransaction(transaction: any): Promise<any>;
}

// For Solana Kit compatibility
export interface SolanaKitSignerInterface {
  publicKey: string;
  signMessage(message: Uint8Array | string): Promise<Uint8Array>;
  signTransaction(transaction: any): Promise<any>;
}

export class EmblemSolanaSigner implements SolanaSignerInterface, SolanaKitSignerInterface {
  readonly publicKey: string; // base58 address
  private readonly config: EmblemRemoteConfig;
  private readonly vaultId: string;

  constructor(config: EmblemRemoteConfig, vaultInfo: VaultInfo) {
    this.publicKey = vaultInfo.address;
    this.config = config;
    this.vaultId = vaultInfo.vaultId;
  }

  async signMessage(message: Uint8Array | string): Promise<Uint8Array> {
    // Convert message to bytes if it's a string
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

    // Convert to base64 for API transmission
    const messageBase64 = btoa(String.fromCharCode(...messageBytes));

    const response = await emblemPost<{ signature: string }>(
      "/sign-solana-message",
      { vaultId: this.vaultId, message: messageBase64 },
      this.config
    );

    // The server returns a signature - could be base64, base58, or hex
    // Let's check what format we're getting and handle accordingly

    // Try to decode as base58 first (Solana standard)
    try {
      // Use @solana/web3.js bs58 decoder if available, otherwise fallback
      if (typeof window !== 'undefined' && (window as any).bs58) {
        return (window as any).bs58.decode(response.signature);
      }
      // For Node.js environments or if bs58 is not globally available
      // The signature might be base64 encoded
      const signatureBytes = Uint8Array.from(atob(response.signature), c => c.charCodeAt(0));
      return signatureBytes;
    } catch (e) {
      // If base64 decode fails, try treating as hex
      if (response.signature.startsWith('0x')) {
        const hex = response.signature.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      }
      throw new Error(`Unable to decode signature format: ${e}`);
    }
  }

  async signTransaction(transaction: any): Promise<any> {
    // Serialize transaction for API transmission
    const serializedTransaction = this.serializeTransaction(transaction);

    const response = await emblemPost<{ serializedSignedTransaction?: string; signedTransaction?: string }>(
      "/sign-solana-transaction",
      {
        vaultId: this.vaultId,
        transactionToSign: serializedTransaction,  // Pass the base64 string directly
        broadcast: false,  // Don't broadcast, just sign
        versionedTransaction: true  // Match API test format
      },
      this.config
    );

    // Parse the signed transaction response - handle both response formats
    const signedTxData = response.serializedSignedTransaction || response.signedTransaction;
    if (!signedTxData) {
      throw new Error('No signed transaction data received from server');
    }

    return this.deserializeTransaction(signedTxData);
  }

  private serializeTransaction(tx: any): string {
    // Handle different transaction formats from @solana/web3.js
    if (tx && typeof tx === 'object') {
      // For VersionedTransaction or Transaction objects
      if (tx.serialize) {
        // Server expects just the base64 string, not an object
        const serialized = tx.serialize();
        const base64 = btoa(String.fromCharCode(...serialized));
        return base64;
      }
      // For transaction objects with instructions
      if (tx.instructions || tx.recentBlockhash) {
        throw new Error('Cannot serialize unsigned transaction objects. Please use VersionedTransaction.');
      }
    }

    // Fallback: assume it's already a string
    return tx;
  }

  private deserializeTransaction(signedTxData: any): any {
    // If it's already an object (shouldn't happen based on type), handle it
    if (typeof signedTxData === 'object' && signedTxData.serializedSignedTransaction) {
      signedTxData = signedTxData.serializedSignedTransaction;
    }

    // If it's a string, decode from base64
    if (typeof signedTxData === 'string') {
      try {
        // The server returns base64, so decode it
        const decoded = atob(signedTxData);
        return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
      } catch (e) {
        console.error('Failed to decode transaction:', e);
        throw new Error(`Unable to deserialize transaction response: ${e}`);
      }
    }

    // If it's already a Uint8Array or other type, return as-is
    return signedTxData;
  }

  // Additional utility methods for @solana/web3.js compatibility

  /** Get the vault ID for this signer */
  getVaultId(): string {
    return this.vaultId;
  }

  /** Sign multiple transactions in batch */
  async signAllTransactions(transactions: any[]): Promise<any[]> {
    // Sign each transaction individually for now
    // Could be optimized with a batch API endpoint in the future
    const results = [];
    for (const tx of transactions) {
      results.push(await this.signTransaction(tx));
    }
    return results;
  }

  /** Check if this signer can sign for a given public key */
  canSign(publicKey: string): boolean {
    return publicKey === this.publicKey;
  }

  /** Sign and optionally broadcast a transaction */
  async signAndBroadcast(transaction: any, broadcast: boolean = true): Promise<string> {
    // Serialize transaction for API transmission
    const serializedTransaction = this.serializeTransaction(transaction);

    const response = await emblemPost<{ transactionSignature?: string; serializedSignedTransaction?: string }>(
      "/sign-solana-transaction",
      {
        vaultId: this.vaultId,
        transactionToSign: serializedTransaction,  // Pass the base64 string directly
        broadcast: broadcast,
        versionedTransaction: true  // Match API test format
      },
      this.config
    );

    if (broadcast) {
      // Return the transaction signature
      if (!response.transactionSignature) {
        throw new Error('No transaction signature received from broadcast');
      }
      return response.transactionSignature;
    } else {
      // Return the signed transaction data
      if (!response.serializedSignedTransaction) {
        throw new Error('No signed transaction data received from server');
      }
      return response.serializedSignedTransaction;
    }
  }
}

export async function toSolanaWeb3Signer(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemSolanaSigner(config, info);
}

export async function toSolanaKitSigner(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemSolanaSigner(config, info);
}
