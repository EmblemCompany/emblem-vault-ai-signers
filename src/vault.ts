import type { EmblemRemoteConfig, VaultInfo } from "./types.js";
import { emblemPost } from "./http.js";

export async function fetchVaultInfo(config: EmblemRemoteConfig): Promise<VaultInfo> {
  // Note: The server only supports POST for /vault/info
  // No need to try GET first, just use POST directly
  const data: {
    vaultId: string;
    address: string;
    evmAddress: `0x${string}`;
    created_by?: string;
  } = await emblemPost("/vault/info", {}, config);

  // Validate response data
  if (!data.vaultId || !data.address || !data.evmAddress) {
    throw new Error('Invalid vault info response: missing required fields');
  }

  if (!data.evmAddress.startsWith('0x')) {
    throw new Error('Invalid evmAddress format in response');
  }

  return {
    vaultId: data.vaultId,
    tokenId: data.vaultId,
    address: data.address,
    evmAddress: data.evmAddress,
    created_by: data.created_by,
  };
}
