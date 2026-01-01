import { describe, it, expect, beforeEach, vi } from "vitest";

describe("JWT authentication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses static JWT with Authorization Bearer header", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        // Verify JWT is sent as Bearer token
        expect(init.headers["Authorization"]).toBe("Bearer test-jwt-token-12345");
        expect(init.headers["x-api-key"]).toBeUndefined();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ jwt: "test-jwt-token-12345" });
    const wallet = await client.toEthersWallet(null);

    expect(wallet).toBeDefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("uses getJwt() function to retrieve JWT dynamically", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        callCount++;
        // Verify JWT changes on each call
        expect(init.headers["Authorization"]).toBe(`Bearer dynamic-jwt-${callCount}`);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      getJwt: () => `dynamic-jwt-${callCount + 1}`,
    });

    await client.toEthersWallet(null);
    expect(callCount).toBe(1);
  });

  it("uses async getJwt() function", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Bearer async-jwt-token");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      getJwt: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-jwt-token";
      },
    });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("uses SDK object with getSession() method", async () => {
    const mockSDK = {
      getSession: () => ({
        authToken: "sdk-provided-jwt",
        user: { vaultId: "123" },
      }),
    };

    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Bearer sdk-provided-jwt");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ sdk: mockSDK });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("uses getAuthHeaders() for custom auth headers", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Custom custom-token");
        expect(init.headers["X-Custom-Header"]).toBe("custom-value");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      getAuthHeaders: () => ({
        Authorization: "Custom custom-token",
        "X-Custom-Header": "custom-value",
      }),
    });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("prioritizes getAuthHeaders over apiKey", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        // Should use custom headers, not apiKey
        expect(init.headers["Authorization"]).toBe("Bearer custom-jwt");
        expect(init.headers["x-api-key"]).toBeUndefined();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      apiKey: "pk_test_1234567890abcdef",
      getAuthHeaders: () => ({ Authorization: "Bearer custom-jwt" }),
    });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("prioritizes apiKey over JWT when both provided", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        // Should use apiKey, not JWT
        expect(init.headers["x-api-key"]).toBe("pk_test_1234567890abcdef");
        expect(init.headers["Authorization"]).toBeUndefined();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      apiKey: "pk_test_1234567890abcdef",
      jwt: "should-not-be-used",
    });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws when no authentication method provided", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    expect(() => createEmblemClient({})).toThrow("Authentication required");
  });

  it("handles SDK returning null session", async () => {
    const mockSDK = {
      getSession: () => null,
    };

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ sdk: mockSDK });

    // Error should be thrown when trying to use the client, not at creation
    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "No authentication available"
    );
  });

  it("handles SDK returning session without authToken", async () => {
    const mockSDK = {
      getSession: () => ({
        user: { vaultId: "123" },
        // Missing authToken
      }),
    };

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ sdk: mockSDK });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "No authentication available"
    );
  });

  it("handles getJwt() returning null", async () => {
    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      getJwt: () => null,
    });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "No authentication available"
    );
  });

  it("handles getJwt() returning undefined", async () => {
    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      getJwt: () => undefined,
    });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "No authentication available"
    );
  });

  it("overrides baseUrl when provided with JWT", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      // Verify custom baseUrl is used
      expect(url).toBe("https://custom-api.example.com/vault/info");
      expect(init.headers["Authorization"]).toBe("Bearer test-jwt");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          vaultId: "123",
          address: "SoL123",
          evmAddress: "0x1234567890123456789012345678901234567890",
        }),
      };
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({
      jwt: "test-jwt",
      baseUrl: "https://custom-api.example.com",
    });

    await client.toEthersWallet(null);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("handles 401 with invalid JWT", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        return {
          ok: false,
          status: 401,
          text: async () => "Invalid JWT token",
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ jwt: "invalid-jwt" });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "Authentication failed"
    );
  });

  it("handles expired JWT with 401", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        return {
          ok: false,
          status: 401,
          text: async () => "JWT expired",
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ jwt: "expired-jwt" });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "Authentication failed"
    );
  });

  it("handles malformed JWT gracefully", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Bearer not.a.valid.jwt");
        return {
          ok: false,
          status: 401,
          text: async () => "Malformed JWT",
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ jwt: "not.a.valid.jwt" });

    await expect(client.toEthersWallet(null)).rejects.toThrow(
      "Authentication failed"
    );
  });

  it("works with viem adapter using SDK auth", async () => {
    const mockSDK = {
      getSession: () => ({
        authToken: "viem-test-jwt",
      }),
    };

    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Bearer viem-test-jwt");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ sdk: mockSDK });
    const account = await client.toViemAccount();

    expect(account).toBeDefined();
    expect(account.address).toBe("0x1234567890123456789012345678901234567890");
  });

  it("works with web3 adapter using JWT", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
        expect(init.headers["Authorization"]).toBe("Bearer web3-jwt");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ jwt: "web3-jwt" });
    const adapter = await client.toWeb3Adapter();

    expect(adapter).toBeDefined();
  });
});
