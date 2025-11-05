import type { EmblemRemoteConfig, Hex, VaultInfo } from "./types";
import { emblemPost } from "./http";
import { bytesToHex, isHexString, normalizeTxForEmblem } from "./utils";
import { fetchVaultInfo } from "./vault";

export class EmblemWeb3Adapter {
  readonly address: `0x${string}`;
  readonly #vaultId: string;
  readonly #config: EmblemRemoteConfig;

  constructor(address: `0x${string}`, vaultId: string, config: EmblemRemoteConfig) {
    this.address = address;
    this.#vaultId = vaultId;
    this.#config = config;
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    const payload = typeof message === "string" ? message : bytesToHex(message);
    const data = await emblemPost<{ signerAddress: string; signature: Hex }>(
      "/sign-eth-message",
      { vaultId: this.#vaultId, message: payload },
      this.#config
    );
    return data.signature;
  }

  async signTypedData(domain: any, types: any, message: any): Promise<Hex> {
    const data = await emblemPost<{ signerAddress: string; signature: Hex }>(
      "/sign-typed-message",
      { vaultId: this.#vaultId, domain, types, message },
      this.#config
    );
    return data.signature;
  }

  async signTransaction(tx: any): Promise<{ rawTransaction: Hex }> {
    const normalized = normalizeTxForEmblem(tx);
    const resp = await emblemPost<{ signedTransaction: Hex }>(
      "/sign-eth-tx",
      { vaultId: this.#vaultId, transaction: normalized },
      this.#config
    );
    return { rawTransaction: resp.signedTransaction };
  }
}

export async function toWeb3Adapter(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemWeb3Adapter(info.evmAddress, info.vaultId, config);
}

