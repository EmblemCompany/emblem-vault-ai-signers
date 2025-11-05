import type { Provider } from "ethers";
import type { EmblemRemoteConfig } from "./types";
export type { EmblemRemoteConfig, Hex, VaultInfo } from "./types";

import { toViemAccount } from "./viem";
import { toEthersWallet, EmblemEthersWallet } from "./ethers";
import { toSolanaKitSigner, toSolanaWeb3Signer, EmblemSolanaSigner } from "./solana";
import { toWeb3Adapter, EmblemWeb3Adapter } from "./web3";
import { fetchVaultInfo } from "./vault";

export class EmblemVaultClient {
  private readonly config: EmblemRemoteConfig;
  private _infoPromise?: Promise<import("./types").VaultInfo>;

  constructor(config: EmblemRemoteConfig) {
    this.config = config;
  }

  /** Lazily fetch and cache vault info */
  private getInfo(): Promise<import("./types").VaultInfo> {
    if (!this._infoPromise) this._infoPromise = fetchVaultInfo(this.config);
    return this._infoPromise;
  }

  async toViemAccount() {
    const info = await this.getInfo();
    return toViemAccount(this.config, info);
  }

  async toEthersWallet(provider?: Provider | null): Promise<EmblemEthersWallet> {
    const info = await this.getInfo();
    return toEthersWallet(this.config, provider ?? null, info);
  }

  async toSolanaWeb3Signer(): Promise<EmblemSolanaSigner> {
    const info = await this.getInfo();
    return toSolanaWeb3Signer(this.config, info);
  }

  async toSolanaKitSigner(): Promise<EmblemSolanaSigner> {
    const info = await this.getInfo();
    return toSolanaKitSigner(this.config, info);
  }

  async toWeb3Adapter(): Promise<EmblemWeb3Adapter> {
    const info = await this.getInfo();
    return toWeb3Adapter(this.config, info);
  }
}

export function createEmblemClient(config: EmblemRemoteConfig) {
  return new EmblemVaultClient(config);
}
