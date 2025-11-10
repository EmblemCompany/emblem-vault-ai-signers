import { describe, it, expect, beforeEach, vi } from "vitest";

describe("viem message validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts valid string messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    // Mock signing response
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ signature: "0x1234" }),
    }));

    const signature = await viemAccount.signMessage({
      message: "Hello World",
    });

    expect(signature).toBe("0x1234");
  });

  it("accepts valid Uint8Array messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ signature: "0x5678" }),
    }));

    const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const signature = await viemAccount.signMessage({ message });

    expect(signature).toBe("0x5678");
  });

  it("accepts valid hex string messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ signature: "0x9abc" }),
    }));

    const signature = await viemAccount.signMessage({
      message: { raw: "0x48656c6c6f" },
    });

    expect(signature).toBe("0x9abc");
  });

  it("rejects object messages that convert to [object Object]", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    await expect(
      viemAccount.signMessage({ message: { foo: "bar" } })
    ).rejects.toThrow("Unsupported message type");
  });

  it("rejects function messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    await expect(
      viemAccount.signMessage({ message: () => "hello" })
    ).rejects.toThrow("Unsupported message type");
  });

  it("rejects symbol messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    await expect(
      viemAccount.signMessage({ message: Symbol("test") })
    ).rejects.toThrow("Unsupported message type");
  });

  it("rejects number messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    await expect(
      viemAccount.signMessage({ message: 42 })
    ).rejects.toThrow("Unsupported message type: number");
  });

  it("rejects boolean messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        vaultId: "123",
        address: "SoL123",
        evmAddress: "0x1234567890123456789012345678901234567890",
      }),
    }));

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    await expect(
      viemAccount.signMessage({ message: true })
    ).rejects.toThrow("Unsupported message type: boolean");
  });

  it("sends raw: true when message has raw property (string)", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
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
      if (u.pathname === "/sign-eth-message") {
        const body = JSON.parse(init.body);
        // Verify raw flag is set to true
        expect(body.raw).toBe(true);
        expect(body.message).toBe("0x48656c6c6f");
        return {
          ok: true,
          status: 200,
          json: async () => ({ signature: "0xrawsig" }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    const signature = await viemAccount.signMessage({
      message: { raw: "0x48656c6c6f" },
    });

    expect(signature).toBe("0xrawsig");
  });

  it("sends raw: true when message has raw property (Uint8Array)", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
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
      if (u.pathname === "/sign-eth-message") {
        const body = JSON.parse(init.body);
        // Verify raw flag is set to true
        expect(body.raw).toBe(true);
        expect(body.message).toBe("0x48656c6c6f");
        return {
          ok: true,
          status: 200,
          json: async () => ({ signature: "0xrawsig2" }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    const signature = await viemAccount.signMessage({
      message: { raw: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) },
    });

    expect(signature).toBe("0xrawsig2");
  });

  it("sends raw: false when message is regular string", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
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
      if (u.pathname === "/sign-eth-message") {
        const body = JSON.parse(init.body);
        // Verify raw flag is set to false for regular strings
        expect(body.raw).toBe(false);
        expect(body.message).toBe("Hello World");
        return {
          ok: true,
          status: 200,
          json: async () => ({ signature: "0xstringsig" }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    const signature = await viemAccount.signMessage({
      message: "Hello World",
    });

    expect(signature).toBe("0xstringsig");
  });

  it("sends raw: false when message is Uint8Array", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
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
      if (u.pathname === "/sign-eth-message") {
        const body = JSON.parse(init.body);
        // Verify raw flag is set to false for Uint8Array
        expect(body.raw).toBe(false);
        expect(body.message).toBe("0x48656c6c6f");
        return {
          ok: true,
          status: 200,
          json: async () => ({ signature: "0xbytessig" }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    const signature = await viemAccount.signMessage({
      message: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
    });

    expect(signature).toBe("0xbytessig");
  });

  it("sends raw: false when message is hex string", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const u = new URL(url);
      if (u.pathname === "/vault/info") {
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
      if (u.pathname === "/sign-eth-message") {
        const body = JSON.parse(init.body);
        // Verify raw flag is set to false for direct hex string
        expect(body.raw).toBe(false);
        expect(body.message).toBe("0x48656c6c6f");
        return {
          ok: true,
          status: 200,
          json: async () => ({ signature: "0xhexsig" }),
        };
      }
    });

    global.fetch = fetchMock;

    const { createEmblemClient } = await import("../src/index.ts");
    const client = createEmblemClient({ apiKey: "pk_test_1234567890abcdef" });
    const viemAccount = await client.toViemAccount();

    const signature = await viemAccount.signMessage({
      message: "0x48656c6c6f",
    });

    expect(signature).toBe("0xhexsig");
  });
});
