import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks to avoid real deps
vi.mock("viem/accounts", () => ({ toAccount: (obj) => obj }));
vi.mock("ethers", () => {
  class AbstractSigner { constructor(provider = null) { this.provider = provider; } }
  return { AbstractSigner };
});

const KNOWN_INFO = {
  vaultId: "8126815960",
  address: "8nUp5Yft4UgEd5up4NdgNPv6EBzfGmSEXL6BAitT1qfq",
  evmAddress: "0x4Cb73725f7dc42d845eA8E135C42e65649280B4a",
};

function okJson(data) {
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) };
}

function unauthorized(text = "unauthorized") {
  return { ok: false, status: 401, json: async () => ({ error: text }), text: async () => text };
}

describe("unauthorized error handling", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("toViemAccount fails on 401 from /vault/info", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      if (u.pathname === "/vault/info") return unauthorized();
      throw new Error("unexpected call");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "invalid", baseUrl: "https://dev-api.emblemvault.ai" });
    await expect(client.toViemAccount()).rejects.toThrow(/401/);
  });

  it("toEthersWallet fails on 401 from /vault/info", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      if (u.pathname === "/vault/info") return unauthorized();
      throw new Error("unexpected call");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "invalid", baseUrl: "https://dev-api.emblemvault.ai" });
    await expect(client.toEthersWallet(null)).rejects.toThrow(/401/);
  });

  it("toWeb3Adapter fails on 401 from /vault/info", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      if (u.pathname === "/vault/info") return unauthorized();
      throw new Error("unexpected call");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "invalid", baseUrl: "https://dev-api.emblemvault.ai" });
    await expect(client.toWeb3Adapter()).rejects.toThrow(/401/);
  });

  it("signMessage fails with 401 after successful vault info", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();
      if (u.pathname === "/vault/info" && method === "GET") return okJson(KNOWN_INFO);
      if (u.pathname === "/sign-eth-message" && method === "POST") return unauthorized();
      throw new Error("unexpected call");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "invalid", baseUrl: "https://dev-api.emblemvault.ai" });

    // viem
    const account = await client.toViemAccount();
    await expect(account.signMessage({ message: "hello" })).rejects.toThrow(/401/);

    // ethers
    const wallet = await client.toEthersWallet(null);
    await expect(wallet.signMessage("hello")).rejects.toThrow(/401/);

    // web3 adapter
    const web3 = await client.toWeb3Adapter();
    await expect(web3.signMessage("hello")).rejects.toThrow(/401/);
  });
});

