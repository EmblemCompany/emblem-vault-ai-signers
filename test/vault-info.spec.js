import { describe, it, expect, vi } from "vitest";

vi.mock("viem/accounts", () => ({ toAccount: (obj) => obj }));
vi.mock("ethers", () => {
  class AbstractSigner { constructor(provider = null) { this.provider = provider; } }
  return { AbstractSigner };
});

function okJson(data) {
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) };
}

describe("vault info alias", () => {
  it("exposes tokenId alias equal to vaultId", async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const u = new URL(String(url));
      if (u.pathname === "/vault/info") return okJson({ vaultId: "123", address: "SoL", evmAddress: "0xabc" });
      throw new Error("unexpected fetch");
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");
    const info = await fetchVaultInfo({ apiKey: "k", baseUrl: "https://dev-api.emblemvault.ai" });
    expect(info.vaultId).toBe("123");
    expect(info.tokenId).toBe("123");
  });
});

