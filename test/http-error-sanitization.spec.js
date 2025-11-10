import { describe, it, expect, beforeEach, vi } from "vitest";

describe("http error sanitization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes 500 errors to hide server details", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal error: Database connection failed at line 123",
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 500: Internal server error");

    // Should NOT include server details
    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.not.toThrow("Database connection failed");
  });

  it("sanitizes 401 errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: Invalid API key pk_test_12345",
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 401: Authentication failed");

    // Should NOT leak API key
    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.not.toThrow("pk_test_12345");
  });

  it("sanitizes 403 errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => "Forbidden: You don't have access to vault_id_12345",
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 403: Authentication failed");
  });

  it("sanitizes 404 errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => "Not found: /internal/vault/data endpoint",
    }));

    global.fetch = fetchMock;

    const { emblemGet } = await import("../src/http.ts");

    await expect(
      emblemGet("/test", { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 404: Resource not found");
  });

  it("sanitizes 405 errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 405,
      text: async () => "Method not allowed: Only POST supported",
    }));

    global.fetch = fetchMock;

    const { emblemGet } = await import("../src/http.ts");

    await expect(
      emblemGet("/test", { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 405: Method not allowed");
  });

  it("includes limited 4xx error details (max 200 chars)", async () => {
    const longError = "a".repeat(300);
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => longError,
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    try {
      await emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" });
    } catch (err) {
      expect(err.message).toContain("Emblem signer error 400:");
      expect(err.message.length).toBeLessThan(250); // Truncated to 200 chars + prefix
      expect(err.message).not.toContain("a".repeat(300)); // Full error not included
    }
  });

  it("handles errors when text() fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error("Text parsing failed");
      },
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    await expect(
      emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" })
    ).rejects.toThrow("Emblem signer error 500: Internal server error");
  });

  it("succeeds on 200 OK", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: "success" }),
    }));

    global.fetch = fetchMock;

    const { emblemPost } = await import("../src/http.ts");

    const result = await emblemPost("/test", {}, { apiKey: "pk_test_1234567890abcdef" });
    expect(result).toEqual({ result: "success" });
  });
});
