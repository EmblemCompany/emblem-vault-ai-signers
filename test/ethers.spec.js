import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock ethers to avoid installing during tests
vi.mock("ethers", () => {
  class AbstractSigner {
    constructor(provider = null) {
      this.provider = provider;
    }
  }
  return {
    AbstractSigner,
  };
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

describe("ethers adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches vault info and signs via API", async () => {
    expect(API_KEY, 'EMBLEM_API_KEY must be set in .env').toBeTruthy();
    expect(BASE_URL, 'EMBLEM_BASE_URL must be set in .env').toBeTruthy();
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();

      if (u.pathname === "/vault/info" && method === "GET") {
        expect(init.headers?.["x-api-key"]).toBe(API_KEY);
        return okJson(KNOWN_INFO);
      }

      if (u.pathname === "/sign-eth-message" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(typeof body.message).toBe("string");
        return okJson({ signerAddress: KNOWN_INFO.evmAddress, signature: "0xaaaabbbb" });
      }

      if (u.pathname === "/sign-typed-message" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.domain && body.types && body.message).toBeTruthy();
        return okJson({ signerAddress: KNOWN_INFO.evmAddress, signature: "0xbbbbcccc" });
      }

      if (u.pathname === "/sign-eth-tx" && method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.vaultId).toBe(KNOWN_INFO.vaultId);
        expect(body.transaction).toBeTruthy();
        // Ensure normalized
        expect(typeof body.transaction.chainId).toBe("number");
        return okJson({ signedTransaction: "0xcccdddd" });
      }

      throw new Error(`Unexpected fetch ${method} ${u.pathname}`);
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(null);

    expect(await wallet.getAddress()).toBe(KNOWN_INFO.evmAddress);
    expect(wallet.getVaultId()).toBe(KNOWN_INFO.vaultId);
    wallet.setChainId(11155111);
    expect(wallet.getChainId()).toBe(11155111);

    const sig1 = await wallet.signMessage("hello");
    expect(sig1).toBe("0xaaaabbbb");

    const sig2 = await wallet.signTypedData(
      { name: "Test", version: "1", chainId: 1 },
      { Test: [{ name: "x", type: "uint256" }] },
      { x: 1 }
    );
    expect(sig2).toBe("0xbbbbcccc");

    const raw = await wallet.signTransaction({
      to: KNOWN_INFO.evmAddress,
      value: 5n,
      chainId: 1,
      nonce: 0,
      gasLimit: 21000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    });
    expect(raw).toBe("0xcccdddd");
  });
});
