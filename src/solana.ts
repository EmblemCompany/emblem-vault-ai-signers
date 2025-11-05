import type { EmblemRemoteConfig, VaultInfo } from "./types";
import { fetchVaultInfo } from "./vault";

export class EmblemSolanaSigner {
  readonly publicKey: string; // base58 address
  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  async signMessage(_message: Uint8Array | string): Promise<string> {
    throw new Error("Solana signing via Emblem is not implemented yet");
  }

  async signTransaction(_tx: unknown): Promise<string> {
    throw new Error("Solana transaction signing via Emblem is not implemented yet");
  }
}

export async function toSolanaWeb3Signer(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemSolanaSigner(info.address);
}

export async function toSolanaKitSigner(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemSolanaSigner(info.address);
}

