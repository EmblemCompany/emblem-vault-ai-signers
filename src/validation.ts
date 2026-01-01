import type { EmblemRemoteConfig } from "./types.js";

/**
 * Environment detection utilities for warning about unsafe usage patterns
 */

/**
 * Detect if code is running in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if we're in a Node.js server environment
 */
export function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' &&
         process.versions != null &&
         process.versions.node != null;
}

/**
 * Validate API key format and warn about potential security issues
 */
export function validateApiKey(apiKey?: string, options: { warnOnBrowser?: boolean } = {}): void {
  if (apiKey == null) return; // optional
  if (typeof apiKey !== 'string') {
    throw new Error('apiKey must be a string when provided');
  }
  if (apiKey.trim() === '') {
    throw new Error('apiKey cannot be empty or whitespace');
  }
  if (options.warnOnBrowser !== false && isBrowserEnvironment()) {
    console.warn(
      '[Emblem Security Warning] API key is being used in a browser environment. '
      + 'Prefer JWT or a secure server-side usage. '
      + 'To suppress this warning, pass { warnOnBrowser: false } to createEmblemClient().' 
    );
  }
  if (!apiKey.startsWith('pk_') && !apiKey.startsWith('sk_') && apiKey.length < 16) {
    console.warn('[Emblem Security Warning] API key seems unusually short. Is this correct?');
  }
}

/**
 * Validate baseUrl format
 */
export function validateBaseUrl(baseUrl?: string): void {
  if (!baseUrl) return; // undefined is ok, will use default

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('baseUrl must be a valid HTTP(S) URL');
  }

  // Warn about http (not https)
  if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    console.warn('[Emblem Security Warning] baseUrl uses HTTP instead of HTTPS. This is insecure for production use.');
  }
}

/**
 * Validate Ethereum address format
 */
export function validateEthereumAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new Error('Address is required');
  }

  if (!address.startsWith('0x')) {
    throw new Error('Address must start with 0x');
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address format');
  }
}

/**
 * Validate vault ID
 */
export function validateVaultId(vaultId: string): void {
  if (!vaultId || typeof vaultId !== 'string') {
    throw new Error('vaultId is required');
  }

  if (vaultId.trim() === '') {
    throw new Error('vaultId cannot be empty');
  }
}

/**
 * Safe number conversion with bounds checking
 */
export function toSafeNumber(value: any, fieldName: string): number {
  const num = Number(value);

  if (!Number.isSafeInteger(num)) {
    throw new Error(`${fieldName} value ${value} exceeds safe integer range (max: ${Number.MAX_SAFE_INTEGER})`);
  }

  return num;
}

/**
 * Extended config with security options
 */
export interface EmblemSecurityConfig extends EmblemRemoteConfig {
  /**
   * Suppress browser environment warning
   * @default false
   */
  warnOnBrowser?: boolean;

  /**
   * Enable debug logging for security-related checks
   * @default false
   */
  debugSecurity?: boolean;
}

/**
 * Comprehensive configuration validation
 */
export function validateConfig(config: EmblemSecurityConfig): void {
  // Validate auth: require at least one method (apiKey, jwt, getJwt, getAuthHeaders, sdk)
  const hasApiKey = !!config.apiKey;
  const hasJwt = !!config.jwt;
  const hasGetJwt = typeof config.getJwt === 'function';
  const hasHeaders = typeof config.getAuthHeaders === 'function';
  const hasSdk = !!config.sdk && typeof config.sdk.getSession === 'function';
  if (!hasApiKey && !hasJwt && !hasGetJwt && !hasHeaders && !hasSdk) {
    throw new Error('Authentication required: provide apiKey, jwt, getJwt(), getAuthHeaders(), or sdk');
  }

  // Validate API key if present
  validateApiKey(config.apiKey, { warnOnBrowser: config.warnOnBrowser });

  // Validate baseUrl if provided
  if (config.baseUrl) {
    validateBaseUrl(config.baseUrl);
  }

  // Security audit logging
  if (config.debugSecurity) {
    console.log('[Emblem Security Debug]', {
      environment: isBrowserEnvironment() ? 'browser' : 'node',
      hasBaseUrl: !!config.baseUrl,
      apiKeyLength: config.apiKey ? config.apiKey.length : 0,
      timestamp: new Date().toISOString(),
    });
  }
}
