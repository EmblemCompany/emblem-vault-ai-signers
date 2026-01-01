import type { EmblemRemoteConfig, VaultInfo } from "./types.js";
import { emblemPost } from "./http.js";

export async function fetchVaultInfo(config: EmblemRemoteConfig): Promise<VaultInfo> {
  // Note: The server only supports POST for /vault/info
  // No need to try GET first, just use POST directly
  const data: Partial<{
    vaultId: string;
    address: string;
    evmAddress: `0x${string}`;
    created_by?: string;
  }> = await emblemPost("/vault/info", {}, config);

  // Validate required response data (vaultId + evmAddress are required for EVM)
  if (!data || !data.vaultId || !data.evmAddress) {
    throw new Error('Invalid vault info response: missing required fields');
  }

  if (!String(data.evmAddress).startsWith('0x')) {
    throw new Error('Invalid evmAddress format in response');
  }

  return {
    vaultId: data.vaultId,
    tokenId: data.vaultId,
    address: data.address || '', // Solana address may be absent; keep optional
    evmAddress: data.evmAddress as `0x${string}`,
    created_by: data.created_by,
  };
}
