import { describe, it, expect } from "vitest";
import { createEmblemClient } from "../../src/index.ts";
import { verifyMessage, verifyTypedData } from "viem";
import { Transaction } from "ethers";

const API_KEY = process.env.EMBLEM_API_KEY;
const BASE_URL = process.env.EMBLEM_BASE_URL || "https://api.emblemvault.ai";

const run = API_KEY ? it : it.skip;

describe("integration: web3 adapter (minimal)", () => {
  run("signs and verifies message", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const web3 = await client.toWeb3Adapter();
    const message = `hello-from-integration-${Date.now()}`;
    const sig = await web3.signMessage(message);
    const ok = await verifyMessage({ address: web3.address, message, signature: sig });
    expect(ok).toBe(true);
  });

  run("signs and verifies typed data", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const web3 = await client.toWeb3Adapter();
    const domain = { name: "Emblem", version: "1", chainId: 1 } as const;
    const types = { Test: [{ name: "x", type: "uint256" }] } as const;
    const value = { x: 42 } as const;
    const sig = await web3.signTypedData(domain as any, types as any, value as any);
    const ok = await verifyTypedData({ address: web3.address, domain, types, primaryType: "Test", message: value, signature: sig } as any);
    expect(ok).toBe(true);
  });

  run("signs and verifies transaction", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const web3 = await client.toWeb3Adapter();
    const raw = await web3.signTransaction({
      to: web3.address,
      value: 0n,
      chainId: 1,
      nonce: 0,
      gas: 21000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    } as any);
    const parsed = Transaction.from(raw.rawTransaction);
    expect(parsed.from?.toLowerCase()).toBe(web3.address.toLowerCase());
  });
});
