import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the http module BEFORE imports
vi.mock("../src/http.ts", () => ({
  emblemPost: vi.fn()
}));

// Mock the vault module BEFORE imports
vi.mock("../src/vault.ts", () => ({
  fetchVaultInfo: vi.fn()
}));

import { toSolanaWeb3Signer, toSolanaKitSigner, EmblemSolanaSigner } from "../src/solana.ts";

describe("solana remote signer", () => {
  const mockConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.emblemvault.ai"
  };

  const mockVaultInfo = {
    address: "6DLyVmpMMENDpundNYV3MNUk4AHsZyrfyrec31hZ4mRD",
    vaultId: "123456",
    chain: "solana"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Solana signer from remote vault", async () => {
    const { fetchVaultInfo } = await import("../src/vault.ts");
    const mockFetch = fetchVaultInfo;

    mockFetch.mockResolvedValueOnce(mockVaultInfo);

    const signer = await toSolanaWeb3Signer(mockConfig);

    expect(mockFetch).toHaveBeenCalledWith(mockConfig);
    expect(signer.publicKey).toBe("6DLyVmpMMENDpundNYV3MNUk4AHsZyrfyrec31hZ4mRD");

    // Should NOT have any private key properties
    expect(signer).not.toHaveProperty('privateKey');
    expect(signer).not.toHaveProperty('secretKey');
  });

  it("signs messages via remote API", async () => {
    const { emblemPost } = await import("../src/http.ts");
    const mockPost = emblemPost;

    mockPost.mockResolvedValueOnce({
      signature: btoa("mock-signature-bytes")
    });

    const signer = new EmblemSolanaSigner(mockConfig, mockVaultInfo);
    const signature = await signer.signMessage("Hello Solana");

    expect(mockPost).toHaveBeenCalledWith(
      "/sign-solana-message",
      {
        vaultId: "123456",
        message: btoa("Hello Solana")
      },
      mockConfig
    );

    expect(signature).toBeInstanceOf(Uint8Array);
  });

  it("signs transactions via remote API", async () => {
    const { emblemPost } = await import("../src/http.ts");
    const mockPost = emblemPost;

    const mockTransaction = {
      serialize: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5]))
    };

    mockPost.mockResolvedValueOnce({
      serializedSignedTransaction: btoa("signed-transaction")
    });

    const signer = new EmblemSolanaSigner(mockConfig, mockVaultInfo);
    const signedTx = await signer.signTransaction(mockTransaction);

    expect(mockPost).toHaveBeenCalledWith(
      "/sign-solana-transaction",
      {
        vaultId: "123456",
        transactionToSign: btoa(String.fromCharCode(1, 2, 3, 4, 5)),
        broadcast: false,
        versionedTransaction: true
      },
      mockConfig
    );

    expect(signedTx).toBeInstanceOf(Uint8Array);
  });
});