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

describe("solana adapters", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("exposes solana publicKey via /vault/info", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }
      throw new Error(`Unexpected fetch: ${method} ${u.pathname}`);
    });
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });

    const s1 = await client.toSolanaWeb3Signer();
    expect(s1.publicKey).toBe(KNOWN_INFO.address);

    const s2 = await client.toSolanaKitSigner();
    expect(s2.publicKey).toBe(KNOWN_INFO.address);
  });

  it("implements signMessage functionality", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }
      if (u.pathname === "/sign-solana-message" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        const body = JSON.parse(init.body);
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.message).toBeTruthy();
        return okJson({ signature: btoa("mock-signature") });
      }
      throw new Error(`Unexpected fetch: ${method} ${u.pathname}`);
    });
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const signer = await client.toSolanaWeb3Signer();

    const signature = await signer.signMessage("test message");
    expect(signature).toBeInstanceOf(Uint8Array);
  });

  it("implements signTransaction functionality", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }
      if (u.pathname === "/sign-solana-transaction" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        const body = JSON.parse(init.body);
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.transactionToSign).toBeTruthy();
        expect(body.broadcast).toBe(false);
        return okJson({ serializedSignedTransaction: btoa("mock-signed-transaction") });
      }
      throw new Error(`Unexpected fetch: ${method} ${u.pathname}`);
    });
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const signer = await client.toSolanaWeb3Signer();

    const mockTransaction = {
      serialize: () => new Uint8Array([1, 2, 3, 4, 5]),
      recentBlockhash: "test-blockhash"
    };

    const signedTx = await signer.signTransaction(mockTransaction);
    expect(signedTx).toBeInstanceOf(Uint8Array);
  });

  it("implements signAndBroadcast functionality", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }
      if (u.pathname === "/sign-solana-transaction" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        const body = JSON.parse(init.body);
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.broadcast).toBe(true);
        return okJson({ transactionSignature: "mock-signature-hash" });
      }
      throw new Error(`Unexpected fetch: ${method} ${u.pathname}`);
    });
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const signer = await client.toSolanaWeb3Signer();

    const mockTransaction = {
      serialize: () => new Uint8Array([1, 2, 3, 4, 5])
    };

    const signature = await signer.signAndBroadcast(mockTransaction, true);
    expect(signature).toBe("mock-signature-hash");
  });

  it("implements utility methods", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "POST") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }
      throw new Error(`Unexpected fetch: ${method} ${u.pathname}`);
    });
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const signer = await client.toSolanaWeb3Signer();

    // Test getVaultId
    expect(signer.getVaultId()).toBe(KNOWN_INFO.vaultId);

    // Test canSign
    expect(signer.canSign(KNOWN_INFO.address)).toBe(true);
    expect(signer.canSign("other-address")).toBe(false);
  });
});
