import type { EmblemRemoteConfig, Hex, VaultInfo } from "./types";
import { emblemPost } from "./http";
import { bytesToHex, isHexString, normalizeTxForEmblem } from "./utils";
import { fetchVaultInfo } from "./vault";
import {
  AbstractSigner,
} from "ethers";
import type {
  Provider,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
} from "ethers";

export class EmblemEthersWallet extends AbstractSigner {
  readonly address: `0x${string}`;
  readonly #config: EmblemRemoteConfig;
  readonly #vaultId: string;

  constructor(address: `0x${string}`, vaultId: string, config: EmblemRemoteConfig, provider?: Provider | null) {
    super(provider ?? null);
    this.address = address;
    this.#vaultId = vaultId;
    this.#config = config;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  connect(provider: Provider): EmblemEthersWallet {
    return new EmblemEthersWallet(this.address, this.#vaultId, this.#config, provider);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const vaultId = this.#vaultId;
    const payload =
      typeof message === "string" ? message : bytesToHex(message);

    const data = await emblemPost<{
      signerAddress: string;
      signature: Hex;
    }>("/sign-eth-message", { vaultId, message: payload }, this.#config);

    return data.signature;
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const vaultId = this.#vaultId;
    const data = await emblemPost<{
      signerAddress: string;
      signature: Hex;
    }>("/sign-typed-message", { vaultId, domain, types, message: value }, this.#config);
    return data.signature;
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    // Ensure `from` (if present) matches this signer
    const from = (tx as any).from as string | undefined;
    if (from && from.toLowerCase() !== this.address.toLowerCase()) {
      throw new Error("transaction from does not match signer address");
    }

    // Let provider fill fields if available
    const toSign = this.provider ? await this.populateTransaction(tx) : { ...tx };

    // Ethers serializers do not include `from`
    delete (toSign as any).from;

    const normalized = normalizeTxForEmblem(toSign);

    const vaultId = this.#vaultId;
    const resp = await emblemPost<{
      signedTransaction: Hex;
    }>("/sign-eth-tx", { vaultId, transaction: normalized }, this.#config);

    return resp.signedTransaction;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider) {
      throw new Error("EmblemEthersWallet requires a provider to send transactions");
    }
    const populated = await this.populateTransaction(tx);
    const signed = await this.signTransaction(populated);
    return await this.provider.broadcastTransaction(signed);
  }
}

export async function toEthersWallet(config: EmblemRemoteConfig, provider?: Provider | null, infoOverride?: VaultInfo) {
  const info = infoOverride ?? await fetchVaultInfo(config);
  return new EmblemEthersWallet(info.evmAddress, info.vaultId, config, provider ?? null);
}
