import { describe, it, expect } from "vitest";
import { createEmblemClient } from "../../src/index.ts";
import { Transaction } from "ethers";

const API_KEY = process.env.EMBLEM_API_KEY;
const BASE_URL = process.env.EMBLEM_BASE_URL || "https://api.emblemvault.ai";

const run = API_KEY ? it : it.skip;

describe("integration: security features", () => {
  run("handles large bigint values in real transaction", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();

    // Test with large bigint values that require proper serialization
    const tx = {
      to: addr,
      value: 1000000000000000000n, // 1 ETH in wei
      gasLimit: 21000n,
      nonce: 0,
      chainId: 1,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    };

    const signed = await wallet.signTransaction(tx as any);
    const parsed = Transaction.from(signed);

    expect(parsed.from?.toLowerCase()).toBe(addr.toLowerCase());
    expect(parsed.value.toString()).toBe("1000000000000000000");
  });

  run("validates vault response has required fields", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);

    // getVaultId and getAddress should work (validates vault response)
    const vaultId = wallet.getVaultId();
    const address = await wallet.getAddress();

    expect(typeof vaultId).toBe("string");
    expect(vaultId.length).toBeGreaterThan(0);
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  run("accepts large safe integer for nonce", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();

    // Use a large but realistic nonce value (well within safe integer range)
    const largeNonce = 999999999; // ~1 billion, realistic for high-activity accounts

    const tx = {
      to: addr,
      value: 0n,
      gasLimit: 21000n,
      nonce: largeNonce,
      chainId: 1,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    };

    const signed = await wallet.signTransaction(tx as any);
    const parsed = Transaction.from(signed);

    expect(parsed.from?.toLowerCase()).toBe(addr.toLowerCase());
    expect(parsed.nonce).toBe(largeNonce);
  });

  run("throws on nonce exceeding safe integer range", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();

    const tx = {
      to: addr,
      value: 0n,
      gasLimit: 21000n,
      nonce: 9007199254740992n, // MAX_SAFE_INTEGER + 1
      chainId: 1,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    };

    await expect(wallet.signTransaction(tx as any)).rejects.toThrow(
      "nonce value 9007199254740992 exceeds safe integer range"
    );
  });

  run("throws on chainId exceeding safe integer range", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);
    const addr = await wallet.getAddress();

    const tx = {
      to: addr,
      value: 0n,
      gasLimit: 21000n,
      nonce: 0,
      chainId: 99999999999999999n, // Exceeds safe integer
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    };

    await expect(wallet.signTransaction(tx as any)).rejects.toThrow(
      "chainId value 99999999999999999 exceeds safe integer range"
    );
  });

  run("viem adapter rejects object messages", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const account = await client.toViemAccount();

    await expect(
      account.signMessage({ message: { foo: "bar" } as any })
    ).rejects.toThrow("Unsupported message type");
  });

  run("viem adapter accepts valid string messages", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const account = await client.toViemAccount();

    const message = `test-security-${Date.now()}`;
    const signature = await account.signMessage({ message });

    expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(signature.length).toBeGreaterThan(130); // 0x + 130 hex chars for signature
  });

  run("viem adapter accepts Uint8Array messages", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const account = await client.toViemAccount();

    const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    // Our implementation accepts Uint8Array even though Viem's type doesn't explicitly include it
    const signature = await account.signMessage({ message: message as any });

    expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  run("validates config with empty apiKey", () => {
    expect(() => createEmblemClient({ apiKey: "" })).toThrow(
      "apiKey is required"
    );
  });

  run("validates config with whitespace-only apiKey", () => {
    expect(() => createEmblemClient({ apiKey: "   " })).toThrow(
      "apiKey cannot be empty"
    );
  });

  run("validates config with invalid baseUrl", () => {
    expect(() =>
      createEmblemClient({
        apiKey: "pk_test_1234567890abcdef",
        baseUrl: "not-a-url",
      })
    ).toThrow("baseUrl must be a valid HTTP(S) URL");
  });

  run("race condition: concurrent initialize calls", async () => {
    const client = createEmblemClient({ apiKey: API_KEY!, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);

    // Call getAddress multiple times concurrently
    // Should not cause race conditions or duplicate API calls
    const results = await Promise.all([
      wallet.getAddress(),
      wallet.getAddress(),
      wallet.getAddress(),
      wallet.getVaultId(),
      wallet.getVaultId(),
    ]);

    // All calls should return the same values
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
    expect(results[3]).toBe(results[4]);
    expect(results[0]).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
