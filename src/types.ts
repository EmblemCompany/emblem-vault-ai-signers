export type Hex = `0x${string}`;

/** Config for Emblem remote signer */
export type EmblemRemoteConfig = {
  /** x-api-key for your authenticate middleware */
  apiKey: string;
  /** Base URL for the Emblem signer API */
  baseUrl?: string; // default: https://api.emblemvault.ai
};

export type VaultInfo = {
  vaultId: string;
  tokenId?: string; // alias of vaultId for compatibility
  address: string; // Solana address
  evmAddress: `0x${string}`;
  created_by?: string;
};
