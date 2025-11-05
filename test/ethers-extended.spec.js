import { describe, it, expect, vi } from "vitest";

vi.mock("ethers", () => {
  class AbstractSigner { constructor(provider = null) { this.provider = provider; } }
  const resolveAddress = async (a) => a;
  return { AbstractSigner, resolveAddress };
});

function okJson(data) { return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) }; }

const API_KEY = "k";
const BASE_URL = "https://dev-api.emblemvault.ai";
const INFO = { vaultId: "1", address: "Sol", evmAddress: "0x1111111111111111111111111111111111111111" };

describe("ethers extended", () => {
  it("signAndBroadcast returns tx hash and wait option", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      const method = (init.method || "GET").toUpperCase();
      if (u.pathname === "/vault/info" && method === "GET") return okJson(INFO);
      if (u.pathname === "/sign-eth-tx" && method === "POST") return okJson({ signedTransaction: "0xsigned" });
      throw new Error("unexpected fetch");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const provider = {
      broadcastTransaction: async (raw) => ({ hash: "0xhash" }),
      waitForTransaction: async (hash) => ({ hash }),
      getNetwork: async () => ({ chainId: 1n }),
      getTransactionCount: async () => 0,
      estimateGas: async () => 21000n,
      getFeeData: async () => ({ gasPrice: 1n }),
    };

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const wallet = await client.toEthersWallet(provider);
    const hash = await wallet.signAndBroadcast({ to: INFO.evmAddress, value: 0n });
    expect(hash).toBe("0xhash");
    const hash2 = await wallet.signAndBroadcast({ to: INFO.evmAddress, value: 0n }, true);
    expect(hash2).toBe("0xhash");
  });
});
