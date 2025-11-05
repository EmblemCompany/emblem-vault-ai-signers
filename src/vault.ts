import type { EmblemRemoteConfig, VaultInfo } from "./types";
import { emblemGet, emblemPost } from "./http";

export async function fetchVaultInfo(config: EmblemRemoteConfig): Promise<VaultInfo> {
  let data: {
    vaultId: string;
    address: string;
    evmAddress: `0x${string}`;
    created_by?: string;
  };

  try {
    data = await emblemGet("/vault/info", config);
  } catch (err: any) {
    // Some environments may require POST for this endpoint; try POST fallback
    data = await emblemPost("/vault/info", {}, config);
  }

  return {
    vaultId: data.vaultId,
    tokenId: data.vaultId,
    address: data.address,
    evmAddress: data.evmAddress,
    created_by: data.created_by,
  };
}
