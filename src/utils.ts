import type { Hex } from "./types.js";

export function toHexIfBigInt(v: any): any {
  return typeof v === "bigint" ? ("0x" + v.toString(16)) : v;
}

/**
 * viem txs sometimes have bigint / hex / optional fields. Ethers serializers
 * accept hex strings for numeric fields. Normalize where helpful.
 */
export function normalizeTxForEmblem(tx: any): any {
  const out: any = { ...tx };

  if (out.value !== undefined) out.value = toHexIfBigInt(out.value);
  if (out.gas !== undefined) {
    out.gasLimit = toHexIfBigInt(out.gas);
    delete out.gas;
  }
  if (out.gasLimit !== undefined) out.gasLimit = toHexIfBigInt(out.gasLimit);
  if (out.gasPrice !== undefined) out.gasPrice = toHexIfBigInt(out.gasPrice);
  if (out.maxFeePerGas !== undefined) out.maxFeePerGas = toHexIfBigInt(out.maxFeePerGas);
  if (out.maxPriorityFeePerGas !== undefined) out.maxPriorityFeePerGas = toHexIfBigInt(out.maxPriorityFeePerGas);
  if (out.nonce !== undefined) out.nonce = Number(out.nonce);
  if (out.chainId !== undefined) out.chainId = Number(out.chainId);

  // Some backends only accept legacy fields; fold EIP-1559 into gasPrice and drop unsupported keys
  if (out.maxFeePerGas !== undefined || out.maxPriorityFeePerGas !== undefined) {
    if (out.gasPrice === undefined && out.maxFeePerGas !== undefined) {
      out.gasPrice = out.maxFeePerGas;
    }
    delete out.maxFeePerGas;
    delete out.maxPriorityFeePerGas;
  }

  // Remove fields commonly unsupported by legacy serializers
  delete out.type;
  delete out.accessList;

  return out;
}

export function isHexString(value: any): value is Hex {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
}

export function bytesToHex(bytes: ArrayLike<number>): Hex {
  let out = "0x";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return out as Hex;
}
