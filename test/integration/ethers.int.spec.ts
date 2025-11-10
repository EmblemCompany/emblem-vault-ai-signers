import { describe, it, expect } from "vitest";
import { createEmblemClient } from "../../src/index.ts";
import { verifyMessage, verifyTypedData, Transaction } from "ethers";

const API_KEY = process.env.EMBLEM_API_KEY;
const BASE_URL = process.env.EMBLEM_BASE_URL || "https://api.emblemvault.ai";

const run = API_KEY ? it : it.skip;

describe("integration: ethers adapter", () => {
  run("signs and verifies message", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();
    const vaultId = wallet.getVaultId();
    expect(typeof vaultId).toBe("string");
    expect(vaultId.length).toBeGreaterThan(0);
    const message = `hello-from-integration-${Date.now()}`;
    const sig = await wallet.signMessage(message);
    const rec = verifyMessage(message, sig);
    expect(rec.toLowerCase()).toBe(addr.toLowerCase());
  });

  run("signs and verifies typed data", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();
    const domain = { name: "Emblem", version: "1", chainId: 1 } as const;
    const types = { Test: [{ name: "x", type: "uint256" }] } as const;
    const value = { x: 42 } as const;
    const sig = await wallet.signTypedData(domain as any, types as any, value as any);
    const rec = verifyTypedData(domain as any, types as any, value as any, sig);
    expect(rec.toLowerCase()).toBe(addr.toLowerCase());
  });

  run("signs and verifies transaction", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();
    const raw = await wallet.signTransaction({
      to: addr,
      value: 0n,
      chainId: 1,
      nonce: 0,
      gasLimit: 21000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    } as any);
    const parsed = Transaction.from(raw);
    expect(parsed.from?.toLowerCase()).toBe(addr.toLowerCase());
  });

  run("handles large bigint values in transaction", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();

    // Test with large bigint values that would fail with standard JSON.stringify
    const largeValue = 1000000000000000000n; // 1 ETH in wei
    const largeGasLimit = 500000n;
    const largeMaxFeePerGas = 100000000000n; // 100 gwei
    const largePriorityFee = 2000000000n; // 2 gwei

    const raw = await wallet.signTransaction({
      to: addr,
      value: largeValue,
      chainId: 1,
      nonce: 0,
      gasLimit: largeGasLimit,
      maxFeePerGas: largeMaxFeePerGas,
      maxPriorityFeePerGas: largePriorityFee,
    } as any);

    const parsed = Transaction.from(raw);
    expect(parsed.from?.toLowerCase()).toBe(addr.toLowerCase());
    expect(parsed.value).toBe(largeValue);
    expect(parsed.gasLimit).toBe(largeGasLimit);
  });
});
