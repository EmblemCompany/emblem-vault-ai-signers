import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("security warnings", () => {
  let consoleWarnSpy;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("warns about short API keys", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    createEmblemClient({ apiKey: "short" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("API key seems unusually short")
    );
  });

  it("does not warn for properly formatted API keys", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    createEmblemClient({ apiKey: "pk_" + "x".repeat(30) });

    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("unusually short")
    );
  });

  it("throws on empty API key", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    expect(() => createEmblemClient({ apiKey: "" })).toThrow("apiKey is required");
  });

  it("throws on whitespace-only API key", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    expect(() => createEmblemClient({ apiKey: "   " })).toThrow("apiKey cannot be empty");
  });

  it("throws on invalid baseUrl", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    expect(() =>
      createEmblemClient({
        apiKey: "pk_test_key",
        baseUrl: "not-a-url"
      })
    ).toThrow("baseUrl must be a valid HTTP(S) URL");
  });

  it("warns about insecure HTTP baseUrl", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    createEmblemClient({
      apiKey: "pk_test_key",
      baseUrl: "http://api.example.com"
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("HTTP instead of HTTPS")
    );
  });

  it("does not warn about HTTP localhost", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    createEmblemClient({
      apiKey: "pk_test_key",
      baseUrl: "http://localhost:3000"
    });

    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("HTTP instead of HTTPS")
    );
  });

  it("allows suppressing browser warnings", async () => {
    const { createEmblemClient } = await import("../src/index.ts");

    createEmblemClient({
      apiKey: "pk_test_key",
      warnOnBrowser: false
    });

    // Should not throw or warn (in Node.js environment)
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("browser environment")
    );
  });
});
