import type { EmblemRemoteConfig, Hex, VaultInfo } from "./types.js";
import { emblemPost } from "./http.js";
import { bytesToHex, normalizeTxForEmblem } from "./utils.js";
import { fetchVaultInfo } from "./vault.js";
import { AbstractSigner, resolveAddress } from "ethers";
import type {
  Provider,
  TransactionLike,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
} from "ethers";

export class EmblemEthersWallet extends AbstractSigner {
  private readonly _config: EmblemRemoteConfig;
  private _address: `0x${string}` | null = null;
  private _vaultId: string | null = null;
  private _chainId = 1;
  private _initPromise?: Promise<void>;

  constructor(config: EmblemRemoteConfig, provider?: Provider | null, seed?: { address?: `0x${string}`; vaultId?: string; chainId?: number }) {
    super(provider ?? null);
    this._config = config;
    if (seed?.address) this._address = seed.address;
    if (seed?.vaultId) this._vaultId = seed.vaultId;
    if (seed?.chainId) this._chainId = seed.chainId;
  }

  async initialize(): Promise<void> {
    // Prevent race condition: cache the promise
    if (this._initPromise) return this._initPromise;

    this._initPromise = fetchVaultInfo(this._config).then(info => {
      this._address = info.evmAddress;
      this._vaultId = info.vaultId;
    }).catch(err => {
      // Clear promise on error to allow retry
      this._initPromise = undefined;
      throw err;
    });

    return this._initPromise;
  }

  async getAddress(): Promise<string> {
    if (!this._address) await this.initialize();
    return this._address!;
  }

  getVaultId(): string {
    if (!this._vaultId) throw new Error("Wallet not initialized. Call initialize() first.");
    return this._vaultId;
  }

  setChainId(chainId: number): void {
    this._chainId = chainId;
  }

  getChainId(): number {
    return this._chainId;
  }

  connect(provider: Provider): EmblemEthersWallet {
    if (!provider) throw new Error("Provider cannot be null");
    return new EmblemEthersWallet(this._config, provider, { address: this._address ?? undefined, vaultId: this._vaultId ?? undefined, chainId: this._chainId });
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this._vaultId) await this.initialize();
    const payload = typeof message === "string" ? message : bytesToHex(message);
    const data = await emblemPost<{ signerAddress: string; signature: Hex }>(
      "/sign-eth-message",
      { vaultId: this._vaultId!, message: payload },
      this._config
    );
    return data.signature;
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    if (!this._vaultId) await this.initialize();
    const cleanTypes = { ...types };
    if (cleanTypes && (cleanTypes as any).EIP712Domain) {
      delete (cleanTypes as any).EIP712Domain;
    }
    const data = await emblemPost<{ signerAddress: string; signature: Hex }>(
      "/sign-typed-message",
      { vaultId: this._vaultId!, domain, types: cleanTypes, message: value },
      this._config
    );
    return data.signature;
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    return this.signTypedData(domain, types, value);
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if (!this._vaultId) await this.initialize();
    const from = (tx as any).from as string | undefined;
    const addr = await this.getAddress();

    // Validate from address if present, ensure it matches signer
    if (from && from.toLowerCase() !== addr.toLowerCase()) {
      throw new Error("transaction from does not match signer address");
    }

    const toSign = this.provider ? await this.populateTransaction(tx) : { ...tx };
    if ((toSign as any).from) delete (toSign as any).from;
    if (!('to' in (toSign as any)) || !(toSign as any).to) {
      throw new Error("Transaction must have a 'to' address");
    }
    if ((toSign as any).nonce === undefined || (toSign as any).nonce === null) {
      throw new Error("Transaction must have a nonce");
    }
    const normalized = normalizeTxForEmblem(toSign);
    const resp = await emblemPost<{ signedTransaction: Hex }>(
      "/sign-eth-tx",
      { vaultId: this._vaultId!, transaction: normalized, options: { chainId: this._chainId } },
      this._config
    );
    return resp.signedTransaction;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider) throw new Error("Provider required to send transaction");
    const signed = await this.signTransaction(tx);
    return await this.provider.broadcastTransaction(signed);
  }

  async populateTransaction(transaction: TransactionRequest): Promise<TransactionLike<string>> {
    const tx = { ...transaction } as TransactionRequest;
    if (!this.provider) throw new Error("Provider required to populate transaction");
    const fromAddress = tx.from ? await resolveAddress(tx.from, this.provider) : await this.getAddress();

    let chainId: bigint;
    if (!tx.chainId) {
      const network = await this.provider.getNetwork();
      chainId = network.chainId;
      this._chainId = Number(network.chainId);
    } else {
      chainId = BigInt(tx.chainId);
      this._chainId = Number(tx.chainId);
    }

    const nonce = tx.nonce != null ? Number(tx.nonce) : await this.provider.getTransactionCount(fromAddress, "pending");
    const toAddress = tx.to ? await resolveAddress(tx.to, this.provider) : null;
    const value = tx.value ? BigInt(tx.value.toString()) : 0n;

    let gasLimit: bigint;
    if (!tx.gasLimit) {
      try {
        gasLimit = await this.provider.estimateGas({ ...tx, from: fromAddress });
      } catch {
        gasLimit = 21000n;
      }
    } else {
      gasLimit = BigInt(tx.gasLimit.toString());
    }

    let gasPrice: bigint | null = null;
    if (!tx.gasPrice && tx.type !== 2) {
      const feeData = await this.provider.getFeeData();
      gasPrice = feeData.gasPrice ?? null;
    } else if (tx.gasPrice) {
      gasPrice = BigInt(tx.gasPrice.toString());
    }

    const populated: TransactionLike<string> = {
      from: fromAddress,
      to: toAddress,
      value,
      nonce,
      gasLimit,
      data: tx.data as string | undefined,
      chainId,
      type: tx.type || undefined,
    };
    if (gasPrice !== null) populated.gasPrice = gasPrice;
    if (tx.maxFeePerGas) populated.maxFeePerGas = BigInt(tx.maxFeePerGas.toString());
    if (tx.maxPriorityFeePerGas) populated.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas.toString());
    return populated;
  }

  async signAndBroadcast(transaction: TransactionRequest, waitForReceipt: boolean = false): Promise<string> {
    if (!this.provider) throw new Error("Provider required to send transaction");
    const signed = await this.signTransaction(transaction);
    const resp = await this.provider.broadcastTransaction(signed);
    const hash = resp.hash as string;
    if (waitForReceipt) {
      await this.provider.waitForTransaction(hash);
    }
    return hash;
  }
}

export async function toEthersWallet(config: EmblemRemoteConfig, provider?: Provider | null, infoOverride?: VaultInfo) {
  const info = infoOverride ?? (await fetchVaultInfo(config));
  return new EmblemEthersWallet(config, provider ?? null, { address: info.evmAddress, vaultId: info.vaultId });
}
