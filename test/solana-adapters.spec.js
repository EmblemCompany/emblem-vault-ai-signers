import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock external libs used by source on import
vi.mock("viem/accounts", () => ({ toAccount: (obj) => obj }));
vi.mock("ethers", () => {
  class AbstractSigner {
    constructor(provider = null) { this.provider = provider; }
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
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) };
}

describe("solana adapters (stubs)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("exposes solana publicKey via /vault/info", async () => {
    expect(API_KEY).toBeTruthy();
    expect(BASE_URL).toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      if (u.pathname === "/vault/info") return okJson(KNOWN_INFO);
      throw new Error("Unexpected fetch");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });

    const s1 = await client.toSolanaWeb3Signer();
    expect(s1.publicKey).toBe(KNOWN_INFO.address);

    const s2 = await client.toSolanaKitSigner();
    expect(s2.publicKey).toBe(KNOWN_INFO.address);
  });
});
