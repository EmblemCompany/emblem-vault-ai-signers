import type { EmblemRemoteConfig } from "./types.js";

function sanitizeErrorMessage(status: number, text: string): string {
  // Sanitize error messages to avoid leaking sensitive server information
  let errorMessage = `Emblem signer error ${status}`;

  if (status >= 500) {
    errorMessage += ": Internal server error";
  } else if (status === 401 || status === 403) {
    errorMessage += ": Authentication failed";
  } else if (status === 404) {
    errorMessage += ": Resource not found";
  } else if (status === 405) {
    errorMessage += ": Method not allowed";
  } else if (text) {
    // For 4xx client errors, include limited error details
    errorMessage += `: ${text.substring(0, 200)}`; // Limit to 200 chars
  }

  return errorMessage;
}

async function resolveAuthHeaders(config: EmblemRemoteConfig): Promise<Record<string, string>> {
  // Priority: custom headers -> apiKey -> jwt/getJwt/sdk
  if (typeof config.getAuthHeaders === 'function') {
    const h = await config.getAuthHeaders();
    if (h && typeof h === 'object') return h;
  }
  if (config.apiKey) {
    return { 'x-api-key': config.apiKey };
  }
  const tok = config.jwt ?? (typeof config.getJwt === 'function' ? await config.getJwt() : undefined) ?? (config.sdk?.getSession()?.authToken ?? undefined);
  if (tok) {
    return { 'Authorization': `Bearer ${tok}` };
  }
  throw new Error('No authentication available: provide apiKey, jwt, getJwt(), getAuthHeaders(), or sdk');
}

export async function emblemPost<T = any>(
  path: string,
  body: any,
  config: EmblemRemoteConfig
): Promise<T> {
  const baseUrl = config.baseUrl ?? "https://api.emblemvault.ai";
  const authHeaders = await resolveAuthHeaders(config);
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(body, (key: string, value: any) =>
      typeof value === "bigint" ? value.toString() : value
    ),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(sanitizeErrorMessage(res.status, text));
  }

  return res.json() as Promise<T>;
}

export async function emblemGet<T = any>(
  path: string,
  config: EmblemRemoteConfig
): Promise<T> {
  const baseUrl = config.baseUrl ?? "https://api.emblemvault.ai";
  const authHeaders = await resolveAuthHeaders(config);
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: authHeaders,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(sanitizeErrorMessage(res.status, text));
  }

  return res.json() as Promise<T>;
}
