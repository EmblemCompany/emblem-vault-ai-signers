import type { Hex, EmblemRemoteConfig, VaultInfo } from "./types";
import { emblemPost } from "./http";
import { bytesToHex, isHexString, normalizeTxForEmblem } from "./utils";
import type { TypedDataDefinition } from "viem";
import { toAccount } from "viem/accounts";
import { fetchVaultInfo } from "./vault";

export async function toViemAccount(config: EmblemRemoteConfig, infoOverride?: VaultInfo) {
  const info = infoOverride ?? await fetchVaultInfo(config);
  const { evmAddress, vaultId } = info;

  return toAccount({
    address: evmAddress,

    async signMessage({ message }: { message: any }) {
      let payload: string;
      if (typeof message === "string") {
        payload = message;
      } else if (message && typeof (message as any).raw !== "undefined") {
        const raw = (message as any).raw;
        payload = typeof raw === "string" ? raw : bytesToHex(raw);
      } else if (message instanceof Uint8Array) {
        payload = bytesToHex(message);
      } else if (isHexString(message)) {
        payload = message as string;
      } else {
        payload = String(message);
      }

      const data = await emblemPost<{
        signerAddress: string;
        signature: Hex;
      }>("/sign-eth-message", { vaultId, message: payload }, config);

      return data.signature;
    },

    async signTypedData(typedData: any) {
      const { domain, types, message } = typedData as any;
      const data = await emblemPost<{
        signerAddress: string;
        signature: Hex;
      }>("/sign-typed-message", { vaultId, domain, types, message }, config);

      return data.signature;
    },

    async signTransaction(tx: any, _opts?: any) {
      const normalizedTx = normalizeTxForEmblem(tx);

      const data = await emblemPost<{
        signedTransaction: Hex;
      }>("/sign-eth-tx", { vaultId, transaction: normalizedTx }, config);

      return data.signedTransaction;
    },
  });
}
