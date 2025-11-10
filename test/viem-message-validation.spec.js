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
});
