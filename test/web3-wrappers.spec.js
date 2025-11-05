import { describe, it, expect, vi } from "vitest";

// Mock web3 minimal surface
vi.mock("web3", () => {
  class Web3Mock {
    constructor(provider) {
      this.provider = provider;
      this.eth = {
        accounts: {
          privateKeyToAccount: (pk) => ({
            address: "0x0000000000000000000000000000000000000000",
            privateKey: pk,
          }),
        },
      };
    }
  }
  return { default: Web3Mock };
});

describe("web3.js wrapper (mocked)", () => {
  it("creates an account from a private key", async () => {
    const Web3 = (await import("web3")).default;
    const web3 = new Web3("http://localhost:8545");
    const acct = web3.eth.accounts.privateKeyToAccount(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    expect(acct.address).toBe("0x0000000000000000000000000000000000000000");
  });
});

