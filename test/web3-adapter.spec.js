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

describe("web3 adapter (minimal)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("signs message and transaction via API", async () => {
    expect(API_KEY).toBeTruthy();
    expect(BASE_URL).toBeTruthy();

    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "GET") return okJson(KNOWN_INFO);
      if (u.pathname === "/sign-eth-message" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        return okJson({ signerAddress: KNOWN_INFO.evmAddress, signature: "0xabc" });
      }
      if (u.pathname === "/sign-eth-tx" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        return okJson({ signedTransaction: "0xdead" });
      }
      throw new Error("Unexpected fetch");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const web3 = await client.toWeb3Adapter();

    expect(web3.address).toBe(KNOWN_INFO.evmAddress);

    const sig = await web3.signMessage("hello");
    expect(sig).toBe("0xabc");

    const raw = await web3.signTransaction({
      to: KNOWN_INFO.evmAddress,
      value: 5n,
      chainId: 1,
      nonce: 0,
      gas: 21000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    });
    expect(raw.rawTransaction).toBe("0xdead");
  });
});
