import { describe, it, expect, beforeEach, vi } from "vitest";

describe("http bigint serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes bigint values to strings in POST body", async () => {
    let capturedBody;
    const fetchMock = vi.fn(async (url, init = {}) => {
      capturedBody = init.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: "success" }),
      };
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    const testData = {
      regularNumber: 42,
      bigintValue: 123456789012345678901234567890n,
      nestedObject: {
        anotherBigint: 9007199254740991n,
        string: "test",
      },
      arrayWithBigint: [1n, 2n, 3n],
      mixedArray: [100, 200n, "text"],
    };

    await emblemPost("/test", testData, {
      apiKey: "pk_test_1234567890abcdef",
      baseUrl: "https://test.example.com",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(capturedBody).toBeDefined();

    const parsedBody = JSON.parse(capturedBody);

    // Verify bigints are converted to strings
    expect(parsedBody.regularNumber).toBe(42);
    expect(parsedBody.bigintValue).toBe("123456789012345678901234567890");
    expect(parsedBody.nestedObject.anotherBigint).toBe("9007199254740991");
    expect(parsedBody.nestedObject.string).toBe("test");
    expect(parsedBody.arrayWithBigint).toEqual(["1", "2", "3"]);
    expect(parsedBody.mixedArray).toEqual([100, "200", "text"]);

    // Verify types in serialized JSON
    expect(typeof parsedBody.bigintValue).toBe("string");
    expect(typeof parsedBody.nestedObject.anotherBigint).toBe("string");
  });

  it("handles transaction objects with bigint values", async () => {
    let capturedBody;
    const fetchMock = vi.fn(async (url, init = {}) => {
      capturedBody = init.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ signedTransaction: "0xabcd" }),
      };
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    const txData = {
      vaultId: "12345",
      transaction: {
        to: "0x1234567890123456789012345678901234567890",
        value: 1000000000000000000n, // 1 ETH in wei
        gasLimit: 21000n,
        maxFeePerGas: 50000000000n, // 50 gwei
        maxPriorityFeePerGas: 2000000000n, // 2 gwei
        nonce: 5,
        chainId: 1,
      },
    };

    await emblemPost("/sign-eth-tx", txData, {
      apiKey: "pk_test_1234567890abcdef",
      baseUrl: "https://test.example.com",
    });

    const parsedBody = JSON.parse(capturedBody);

    // Verify transaction bigint fields are strings
    expect(parsedBody.transaction.value).toBe("1000000000000000000");
    expect(parsedBody.transaction.gasLimit).toBe("21000");
    expect(parsedBody.transaction.maxFeePerGas).toBe("50000000000");
    expect(parsedBody.transaction.maxPriorityFeePerGas).toBe("2000000000");

    // Verify regular numbers stay as numbers
    expect(parsedBody.transaction.nonce).toBe(5);
    expect(parsedBody.transaction.chainId).toBe(1);
    expect(parsedBody.vaultId).toBe("12345");
  });

  it("handles edge case with zero bigint", async () => {
    let capturedBody;
    const fetchMock = vi.fn(async (url, init = {}) => {
      capturedBody = init.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: "success" }),
      };
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await emblemPost("/test", { zeroBigint: 0n }, {
      apiKey: "pk_test_1234567890abcdef",
      baseUrl: "https://test.example.com",
    });

    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody.zeroBigint).toBe("0");
    expect(typeof parsedBody.zeroBigint).toBe("string");
  });

  it("preserves null and undefined values", async () => {
    let capturedBody;
    const fetchMock = vi.fn(async (url, init = {}) => {
      capturedBody = init.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: "success" }),
      };
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await emblemPost("/test", {
      nullValue: null,
      undefinedValue: undefined,
      bigintValue: 42n,
    }, {
      apiKey: "pk_test_1234567890abcdef",
      baseUrl: "https://test.example.com",
    });

    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody.nullValue).toBe(null);
    expect(parsedBody.undefinedValue).toBe(undefined);
    expect(parsedBody.bigintValue).toBe("42");
  });
});
