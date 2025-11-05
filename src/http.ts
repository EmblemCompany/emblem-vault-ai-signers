import type { EmblemRemoteConfig } from "./types.js";

export async function emblemPost<T = any>(
  path: string,
  body: any,
  { apiKey, baseUrl = "https://api.emblemvault.ai" }: EmblemRemoteConfig
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Emblem signer error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function emblemGet<T = any>(
  path: string,
  { apiKey, baseUrl = "https://api.emblemvault.ai" }: EmblemRemoteConfig
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Emblem signer error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}
