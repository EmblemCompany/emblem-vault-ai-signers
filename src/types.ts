export type Hex = `0x${string}`;

/** Optional auth providers */
export type EmblemAuthProvider = {
  /** Static JWT to send as Authorization: Bearer */
  jwt?: string;
  /** Lazy JWT provider */
  getJwt?: () => Promise<string | null | undefined> | string | null | undefined;
  /** Custom headers provider (e.g., Authorization) */
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** SDK-like object exposing getSession() that returns { authToken? } */
  sdk?: { getSession: () => { authToken?: string | null | undefined } | null | undefined };
};

/** Config for Emblem remote signer */
export type EmblemRemoteConfig = EmblemAuthProvider & {
  /** x-api-key for your authenticate middleware (optional when JWT provided) */
  apiKey?: string;
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
