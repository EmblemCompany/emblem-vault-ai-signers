import { describe, it, expect } from "vitest";

describe("integer overflow protection", () => {
  it("throws on nonce exceeding safe integer range", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: 9007199254740992n, // MAX_SAFE_INTEGER + 1
      chainId: 1,
    };

    expect(() => normalizeTxForEmblem(tx)).toThrow(
      "nonce value 9007199254740992 exceeds safe integer range"
    );
  });

  it("throws on chainId exceeding safe integer range", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: 1,
      chainId: 99999999999999999n,
    };

    expect(() => normalizeTxForEmblem(tx)).toThrow(
      "chainId value 99999999999999999 exceeds safe integer range"
    );
  });

  it("accepts safe integer values", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: 42,
      chainId: 1,
      gasLimit: 21000n,
    };

    const result = normalizeTxForEmblem(tx);

    expect(result.nonce).toBe(42);
    expect(result.chainId).toBe(1);
    expect(result.gasLimit).toBe("0x5208"); // Converted to hex
  });

  it("accepts maximum safe integer", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: Number.MAX_SAFE_INTEGER,
      chainId: 1,
    };

    const result = normalizeTxForEmblem(tx);

    expect(result.nonce).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("accepts minimum safe integer", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: 0,
      chainId: Number.MIN_SAFE_INTEGER,
    };

    const result = normalizeTxForEmblem(tx);

    expect(result.nonce).toBe(0);
    expect(result.chainId).toBe(Number.MIN_SAFE_INTEGER);
  });

  it("handles bigint nonce conversion", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      nonce: 100n, // Safe bigint
      chainId: 1,
    };

    const result = normalizeTxForEmblem(tx);

    expect(result.nonce).toBe(100);
  });

  it("converts large value fields to hex instead of number", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      value: 1000000000000000000n, // 1 ETH in wei (too large for safe integer)
      gasLimit: 21000n,
      nonce: 1,
      chainId: 1,
    };

    const result = normalizeTxForEmblem(tx);

    // Value should be hex, not number
    expect(result.value).toBe("0xde0b6b3a7640000");
    expect(result.gasLimit).toBe("0x5208");

    // Nonce and chainId are numbers (safe range)
    expect(typeof result.nonce).toBe("number");
    expect(typeof result.chainId).toBe("number");
  });

  it("removes unsupported fields: type, accessList", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000n,
      nonce: 1,
      chainId: 1,
      type: 2, // EIP-1559 type
      accessList: [{ address: "0xabcd", storageKeys: [] }],
    };

    const result = normalizeTxForEmblem(tx);

    // These fields should be removed
    expect(result.type).toBeUndefined();
    expect(result.accessList).toBeUndefined();

    // Other fields should remain
    expect(result.to).toBe("0x1234567890123456789012345678901234567890");
    expect(result.value).toBe("0x3e8");
  });

  it("removes viem-specific fields: account, chain, from", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000n,
      nonce: 1,
      chainId: 1,
      account: { address: "0xabcd", type: "json-rpc" }, // viem account object
      chain: { id: 1, name: "mainnet" }, // viem chain object
      from: "0xabcd1234567890123456789012345678abcd1234", // from address
    };

    const result = normalizeTxForEmblem(tx);

    // These viem-specific fields should be removed
    expect(result.account).toBeUndefined();
    expect(result.chain).toBeUndefined();
    expect(result.from).toBeUndefined();

    // Other fields should remain
    expect(result.to).toBe("0x1234567890123456789012345678901234567890");
    expect(result.value).toBe("0x3e8");
    expect(result.nonce).toBe(1);
    expect(result.chainId).toBe(1);
  });

  it("removes all unsupported fields in combination", async () => {
    const { normalizeTxForEmblem } = await import("../src/utils.ts");

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000n,
      nonce: 1,
      chainId: 1,
      // All fields that should be removed
      type: 2,
      accessList: [],
      account: { address: "0xabcd" },
      chain: { id: 1 },
      from: "0xabcd1234567890123456789012345678abcd1234",
    };

    const result = normalizeTxForEmblem(tx);

    // All unsupported fields should be removed
    expect(result.type).toBeUndefined();
    expect(result.accessList).toBeUndefined();
    expect(result.account).toBeUndefined();
    expect(result.chain).toBeUndefined();
    expect(result.from).toBeUndefined();

    // Supported fields should remain
    expect(result.to).toBe("0x1234567890123456789012345678901234567890");
    expect(result.value).toBe("0x3e8");
    expect(result.nonce).toBe(1);
    expect(result.chainId).toBe(1);
  });
});
