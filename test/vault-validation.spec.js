import { describe, it, expect, beforeEach, vi } from "vitest";

describe("vault response validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates required fields are present", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: null, // Missing!
        address: "SoL123",
        evmAddress: "0xabc",
      }),
    }));

    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");

    await expect(
      fetchVaultInfo({ apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Invalid vault info response: missing required fields");
  });

  it("validates evmAddress format", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "invalid", // Missing 0x prefix!
      }),
    }));

    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");

    await expect(
      fetchVaultInfo({ apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Invalid evmAddress format in response");
  });

  it("accepts valid vault info", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0xabc123",
        created_by: "user@example.com",
      }),
    }));

    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");

    const result = await fetchVaultInfo({ apiKey: "pk_test_1234567890abcdef" });

    expect(result).toEqual({
      vaultId: "123",
      tokenId: "123", // Alias
      address: "SoL123",
      evmAddress: "0xabc123",
      created_by: "user@example.com",
    });
  });

  it("accepts vault info without optional fields", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0xabc123",
        // created_by is optional
      }),
    }));

    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");

    const result = await fetchVaultInfo({ apiKey: "pk_test_1234567890abcdef" });

    expect(result.vaultId).toBe("123");
    expect(result.created_by).toBeUndefined();
  });

  it("uses POST directly (no GET attempt)", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      expect(init.method).toBe("POST");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          vaultId: "123",
          address: "SoL123",
          evmAddress: "0xabc123",
        }),
      };
    });

    global.fetch = fetchMock;

    const { fetchVaultInfo } = await import("../src/vault.ts");

    await fetchVaultInfo({ apiKey: "pk_test_1234567890abcdef" });

    // Should only call once (POST), not twice (GET + POST)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST" })
    );
  });
});
