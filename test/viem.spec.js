import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock viem/accounts to avoid installing viem during tests
vi.mock("viem/accounts", () => {
  return {
    toAccount: (obj) => obj,
  };
});

// Mock ethers to satisfy src/index.ts dependency chain
vi.mock("ethers", () => {
  class AbstractSigner {
    constructor(provider = null) {
      this.provider = provider;
    }
  }
  return { AbstractSigner };
});

const API_KEY = process.env.EMBLEM_API_KEY;
const BASE_URL = process.env.EMBLEM_BASE_URL;
const KNOWN_INFO = {
  vaultId: "8126815960",
  address: "8nUp5Yft4UgEd5up4NdgNPv6EBzfGmSEXL6BAitT1qfq",
  evmAddress: "0x4Cb73725f7dc42d845eA8E135C42e65649280B4a",
};

function okJson(data) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

describe("viem adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches vault info and signs via API", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }

      if (u.pathname === "/sign-eth-message" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(typeof body.message).toBe("string");
        return okJson({ signerAddress: KNOWN_INFO.evmAddress, signature: "0xdeadbeef" });
      }

      if (u.pathname === "/sign-typed-message" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.domain && body.types && body.message).toBeTruthy();
        return okJson({ signerAddress: KNOWN_INFO.evmAddress, signature: "0xfeedcafe" });
      }

      if (u.pathname === "/sign-eth-tx" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.transaction).toBeTruthy();
        return okJson({ signedTransaction: "0xabc123" });
      }

      throw new Error(`Unexpected fetch ${method} ${u.pathname}`);
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const account = await client.toViemAccount();

    expect(account.address).toBe(KNOWN_INFO.evmAddress);

    const sig1 = await account.signMessage({ message: "hello" });
    expect(sig1).toBe("0xdeadbeef");

    const sig2 = await account.signTypedData({
      domain: { name: "Test", version: "1", chainId: 1 },
      types: { Test: [{ name: "x", type: "uint256" }] },
      primaryType: "Test",
      message: { x: 1 },
    });
    expect(sig2).toBe("0xfeedcafe");

    const raw = await account.signTransaction({
      to: KNOWN_INFO.evmAddress,
      value: 5n,
      chainId: 1,
      nonce: 0,
      gas: 21000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    });
    expect(raw).toBe("0xabc123");
  });
});
