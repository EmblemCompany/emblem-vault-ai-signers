import { describe, it, expect, beforeEach, vi } from "vitest";

describe("security features integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Suppress console.warn in tests to avoid noisy output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it("handles large bigint values in real transaction signing", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
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

      if (u.pathname === "/sign-eth-tx" && init.method === "POST") {
        const body = JSON.parse(init.body);

        // Verify large bigints are converted to hex strings
        expect(body.transaction.value).toBe("0xde0b6b3a7640000"); // 1 ETH in hex
        expect(body.transaction.gasLimit).toBe("0x5208"); // 21000 in hex

        return {
          ok: true,
          status: 200,
          json: async () => ({
            signedTransaction: "0xserialized",
          }),
        };
      }

      throw new Error(`Unexpected request to ${url}`);
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const wallet = await client.toEthersWallet();

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000000000000000000n, // 1 ETH as bigint
      gasLimit: 21000n,
      nonce: 1,
      chainId: 1,
    };

    const result = await wallet.signTransaction(tx);
    expect(result).toBe("0xserialized");
  });

  it("detects and throws on integer overflow in real transaction", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
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
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const wallet = await client.toEthersWallet();

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      nonce: 9007199254740992n, // MAX_SAFE_INTEGER + 1
      chainId: 1,
    };

    await expect(wallet.signTransaction(tx)).rejects.toThrow(
      "nonce value 9007199254740992 exceeds safe integer range"
    );
  });

  it("validates vault response in real initialization flow", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: null, // Missing required field!
            address: "SoL123",
            evmAddress: "0x1234567890123456789012345678901234567890",
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });

    await expect(client.toEthersWallet()).rejects.toThrow(
      "Invalid vault info response: missing required fields"
    );
  });

  it("validates evmAddress format in real initialization", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vaultId: "123",
            address: "SoL123",
            evmAddress: "invalid", // Missing 0x prefix!
          }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });

    await expect(client.toEthersWallet()).rejects.toThrow(
      "Invalid evmAddress format in response"
    );
  });

  it("sanitizes server errors in real signing flow", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
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

      if (u.pathname === "/sign-eth-tx" && init.method === "POST") {
        return {
          ok: false,
          status: 500,
          text: async () =>
            "Internal error: Database connection failed at line 123",
        };
      }

      throw new Error(`Unexpected request to ${url}`);
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const wallet = await client.toEthersWallet();

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000n,
      nonce: 1,
      chainId: 1,
    };

    try {
      await wallet.signTransaction(tx);
      expect.fail("Should have thrown");
    } catch (err) {
      // Verify server details are hidden
      expect(err.message).toContain("Internal server error");
      expect(err.message).not.toContain("Database connection failed");
      expect(err.message).not.toContain("line 123");
    }
  });

  it("sanitizes authentication errors to prevent key leaks", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
        return {
          ok: false,
          status: 401,
          text: async () => "Unauthorized: Invalid API key pk_test_12345",
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });

    try {
      await client.toEthersWallet();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).toContain("Authentication failed");
      expect(err.message).not.toContain("pk_test_12345");
    }
  });

  it("accepts maximum safe integer values in transactions", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
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

      if (u.pathname === "/sign-eth-tx" && init.method === "POST") {
        const body = JSON.parse(init.body);

        // Verify MAX_SAFE_INTEGER is accepted
        expect(body.transaction.nonce).toBe(Number.MAX_SAFE_INTEGER);
        expect(typeof body.transaction.nonce).toBe("number");

        return {
          ok: true,
          status: 200,
          json: async () => ({
            signedTransaction: "0xserialized",
          }),
        };
      }

      throw new Error(`Unexpected request to ${url}`);
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const wallet = await client.toEthersWallet();

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      nonce: Number.MAX_SAFE_INTEGER,
      chainId: 1,
    };

    const result = await wallet.signTransaction(tx);
    expect(result).toBe("0xserialized");
  });

  it("uses POST directly without wasteful GET attempt", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      // Should only see POST, never GET
      if (u.pathname === "/vault/info") {
        expect(init.method).toBe("POST");

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
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    await client.toEthersWallet();

    // Verify only called once (POST), not twice (GET + POST)
    const vaultInfoCalls = fetchMock.mock.calls.filter((call) => {
      const url = new URL(call[0]);
      return url.pathname === "/vault/info";
    });

    expect(vaultInfoCalls).toHaveLength(1);
    expect(vaultInfoCalls[0][1].method).toBe("POST");
  });

  it("recovers from failed initialization attempts", async () => {
    let attemptCount = 0;

    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
        attemptCount++;

        if (attemptCount === 1) {
          // First attempt fails
          return {
            ok: false,
            status: 500,
            text: async () => "Internal server error",
          };
        }

        // Second attempt succeeds
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
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });

    // First attempt fails
    await expect(client.toEthersWallet()).rejects.toThrow(
      "Internal server error"
    );

    // Second attempt should retry and succeed
    const wallet = await client.toEthersWallet();
    expect(wallet).toBeDefined();
    expect(await wallet.getAddress()).toBe(
      "0x1234567890123456789012345678901234567890"
    );
  });

  it("converts large value fields to hex in transactions", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);

      if (u.pathname === "/vault/info" && init.method === "POST") {
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

      if (u.pathname === "/sign-eth-tx" && init.method === "POST") {
        const body = JSON.parse(init.body);

        // Verify large values are hex strings, not numbers
        expect(body.transaction.value).toBe("0xde0b6b3a7640000"); // 1 ETH
        expect(body.transaction.gasLimit).toBe("0x5208"); // 21000
        expect(typeof body.transaction.value).toBe("string");
        expect(typeof body.transaction.gasLimit).toBe("string");

        // Verify small integer values remain numbers
        expect(typeof body.transaction.nonce).toBe("number");
        expect(typeof body.transaction.chainId).toBe("number");

        return {
          ok: true,
          status: 200,
          json: async () => ({
            signedTransaction: "0xserialized",
          }),
        };
      }

      throw new Error(`Unexpected request to ${url}`);
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const wallet = await client.toEthersWallet();

    const tx = {
      to: "0x1234567890123456789012345678901234567890",
      value: 1000000000000000000n, // 1 ETH
      gasLimit: 21000n,
      nonce: 1,
      chainId: 1,
    };

    const result = await wallet.signTransaction(tx);
    expect(result).toBe("0xserialized");
  });
});
