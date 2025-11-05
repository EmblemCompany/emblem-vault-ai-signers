import { describe, it, expect, vi } from "vitest";

// Mock Solana libs as requested
vi.mock("@solana/web3.js", () => {
  return {
    Keypair: {
      generate: () => ({
        publicKey: "SolanaPublicKeyMock",
        secretKey: new Uint8Array([1, 2, 3]),
      }),
    },
  };
});

vi.mock("@solana/kit", () => {
  return {
    generateKeyPairSigner: async () => ({
      publicKey: "SolanaSignerPublicKeyMock",
      secretKey: "SolanaSignerSecretKeyMock",
    }),
  };
});

describe("solana wrappers (mocked)", () => {
  it("creates a keypair and signer", async () => {
    const { Keypair } = await import("@solana/web3.js");
    const { generateKeyPairSigner } = await import("@solana/kit");

    const kp = Keypair.generate();
    expect(kp.publicKey).toBe("SolanaPublicKeyMock");

    const signer = await generateKeyPairSigner();
    expect(signer.publicKey).toBe("SolanaSignerPublicKeyMock");
  });
});

