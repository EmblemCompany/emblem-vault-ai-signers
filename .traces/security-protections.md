# Security Protections & Anti-Pattern Detection

## Overview

This library includes **runtime security validations** to help developers avoid common security anti-patterns, similar to Next.js environment variable validation.

**All security warnings are ENABLED BY DEFAULT.** You must explicitly disable them if you understand the risks.

## Quick Reference

| Protection | Default | Can Disable? | How to Disable |
|------------|---------|--------------|----------------|
| Browser environment warning | ✅ Enabled | Yes | `warnOnBrowser: false` |
| API key format validation | ✅ Enabled | No | N/A (always validates) |
| Insecure HTTP warning | ✅ Enabled | No | N/A (always warns) |
| Invalid URL validation | ✅ Enabled | No | N/A (always throws) |
| Integer overflow protection | ✅ Enabled | No | N/A (always validates) |
| Response validation | ✅ Enabled | No | N/A (always validates) |
| Debug logging | ❌ Disabled | N/A | `debugSecurity: true` |

**Key Takeaway:** Only the browser warning can be suppressed. All other validations are mandatory for security.

## What We CAN Protect Against

### ✅ 1. Browser Environment Detection & Warning

**Default:** ✅ **ENABLED** (warns by default)

**Problem:** Developers accidentally using API keys in client-side code.

**Protection:**
```typescript
import { createEmblemClient } from 'emblem-vault-ai-signers';

// ⚠️ In browser environment, this will warn:
const client = createEmblemClient({
  apiKey: 'pk_your_api_key_here'
});

// Console output:
// [Emblem Security Warning] API key is being used in a browser environment.
// API keys should only be used server-side (Node.js).
// Client-side usage exposes your API key to anyone who can view the page source.
// To suppress this warning, pass { warnOnBrowser: false } to createEmblemClient().
```

**Suppressing the warning** (if you understand the risks):
```typescript
const client = createEmblemClient({
  apiKey: userProvidedApiKey,
  warnOnBrowser: false  // ✅ Explicitly acknowledge browser usage
});
```

**In Node.js:** No warning (automatically detects server environment)

### ✅ 2. API Key Format Validation

**Default:** ✅ **ENABLED** (always validates)

**Problem:** Malformed or suspicious API keys.

**Protection:**
```typescript
// ❌ This will warn
createEmblemClient({ apiKey: '123' });
// [Emblem Security Warning] API key seems unusually short. Is this correct?

// ❌ This will throw
createEmblemClient({ apiKey: '' });
// Error: apiKey cannot be empty or whitespace

// ❌ This will throw
createEmblemClient({ apiKey: '   ' });
// Error: apiKey cannot be empty or whitespace
```

### ✅ 3. Insecure HTTP Warning

**Default:** ✅ **ENABLED** (warns by default, except localhost)

**Problem:** Using HTTP instead of HTTPS for baseUrl.

**Protection:**
```typescript
const client = createEmblemClient({
  apiKey: 'pk_key',
  baseUrl: 'http://api.example.com'  // Not localhost
});
// [Emblem Security Warning] baseUrl uses HTTP instead of HTTPS.
// This is insecure for production use.
```

### ✅ 4. Invalid URL Format

**Default:** ✅ **ENABLED** (always throws on invalid URLs)

**Problem:** Malformed URLs.

**Protection:**
```typescript
// ❌ This will throw
createEmblemClient({
  apiKey: 'pk_key',
  baseUrl: 'not-a-url'
});
// Error: baseUrl must be a valid HTTP(S) URL
```

### ✅ 5. Integer Overflow Protection

**Default:** ✅ **ENABLED** (always validates safe integer range)

**Problem:** Large bigint values converted to unsafe integers.

**Protection:**
```typescript
// Automatically protected in transaction normalization
const tx = {
  nonce: 9007199254740992n,  // Exceeds Number.MAX_SAFE_INTEGER
  chainId: 1
};

// ❌ This will throw during signing:
// Error: nonce value 9007199254740992 exceeds safe integer range
```

### ✅ 6. Response Validation

**Default:** ✅ **ENABLED** (always validates server responses)

**Problem:** Server returns malformed data.

**Protection:**
```typescript
// Automatically validates all /vault/info responses:
// - vaultId must exist
// - address must exist
// - evmAddress must exist and start with 0x

// Server returns: { vaultId: null, ... }
// ❌ Error: Invalid vault info response: missing required fields

// Server returns: { evmAddress: "invalid" }
// ❌ Error: Invalid evmAddress format in response
```

---

## What We CANNOT Protect Against

### ❌ 1. Determined Attackers in Browser

**Limitation:** Browser dev tools, memory inspection, breakpoints.

**Why:** JavaScript running in browser is fully accessible to user.

**Example:**
```javascript
// User can always do this in dev tools:
const client = window.__CLIENT_INSTANCE__;
client.config.apiKey = 'stolen_key';

// Or intercept fetch:
window.fetch = function(...args) {
  console.log('Intercepted:', args);
  return originalFetch(...args);
};
```

**Mitigation:** Trust model - users must trust the dApp code.

### ❌ 2. Runtime vs Build-Time Detection

**Limitation:** Can't detect if code will run client-side at build time.

**Why:** This is a runtime library, not a bundler plugin.

**Example:**
```typescript
// We can't prevent bundlers from including this in client bundle
import { createEmblemClient } from 'emblem-vault-ai-signers';

// Will only warn at RUNTIME when code executes in browser
```

**Better Solution:** Use environment-specific imports (Next.js pattern):
```typescript
// lib/server-only.ts
export { createEmblemClient } from 'emblem-vault-ai-signers';

// In page (client) code:
import { createEmblemClient } from 'lib/server-only';  // Build error!
```

### ❌ 3. Preventing Code Reuse Anti-Patterns

**Limitation:** Can't prevent developers from reusing wallet instances incorrectly.

**Why:** JavaScript allows mutation; we can only warn, not enforce.

**Example:**
```typescript
// ❌ Anti-pattern we CAN'T prevent:
const wallet = await client.toEthersWallet();

// Later, developer tries to hack it:
(wallet as any)._config = { apiKey: 'different_key' };
// This is wrong, but we can't prevent it at compile or runtime
```

**Mitigation:** Documentation, code reviews, TypeScript strict mode.

---

## Usage Patterns

### ✅ Recommended: Server-Side Only

```typescript
// app/api/sign/route.ts (Next.js API route)
import { createEmblemClient } from 'emblem-vault-ai-signers';

export async function POST(req: Request) {
  const { userApiKey, message } = await req.json();

  const client = createEmblemClient({ apiKey: userApiKey });
  const wallet = await client.toEthersWallet();
  const signature = await wallet.signMessage(message);

  return Response.json({ signature });
}
```

### ⚠️ Acceptable: Client-Side with User's Own Keys

```typescript
// User provides their own API key (not hardcoded)
function SigningComponent() {
  const [userApiKey, setUserApiKey] = useState('');

  const signMessage = async () => {
    // ✅ User understands they're sharing their key with this dApp
    const client = createEmblemClient({
      apiKey: userApiKey,
      warnOnBrowser: false  // Acknowledge browser usage
    });

    const wallet = await client.toEthersWallet();
    const sig = await wallet.signMessage('hello');
  };
}
```

### ❌ Anti-Pattern: Hardcoded Keys Client-Side

```typescript
// ❌ NEVER DO THIS
const client = createEmblemClient({
  apiKey: 'pk_hardcoded_key_12345'  // Exposed to everyone!
});
```

---

## Debug Mode

Enable security debugging:

```typescript
const client = createEmblemClient({
  apiKey: 'pk_key',
  debugSecurity: true
});

// Console output:
// [Emblem Security Debug] {
//   environment: 'node',
//   hasBaseUrl: false,
//   apiKeyLength: 32,
//   timestamp: '2025-11-10T09:00:00.000Z'
// }
```

---

## API Reference

### Environment Detection

```typescript
import { isBrowserEnvironment, isNodeEnvironment } from 'emblem-vault-ai-signers';

if (isBrowserEnvironment()) {
  console.warn('Running in browser!');
}

if (isNodeEnvironment()) {
  console.log('Running in Node.js');
}
```

### Configuration Options

```typescript
interface EmblemSecurityConfig extends EmblemRemoteConfig {
  /**
   * Suppress browser environment warning
   * @default undefined (warnings ENABLED by default)
   */
  warnOnBrowser?: boolean;

  /**
   * Enable debug logging for security checks
   * @default false (disabled by default)
   */
  debugSecurity?: boolean;
}
```

**Default Behavior:**
- `warnOnBrowser: undefined` → **Warns in browser** ✅
- `warnOnBrowser: false` → Suppresses warnings ❌
- `warnOnBrowser: true` → Warns in browser ✅
- `debugSecurity: undefined` → No debug output
- `debugSecurity: true` → Shows security debug info ✅

---

## Comparison with Next.js Env Vars

| Feature | Next.js | This Library |
|---------|---------|--------------|
| Build-time validation | ✅ Yes | ❌ No (runtime library) |
| Runtime warnings | ✅ Yes | ✅ Yes |
| Prevent client bundling | ✅ Yes | ❌ No (not a bundler) |
| Environment detection | ✅ Yes | ✅ Yes |
| Format validation | ✅ Yes | ✅ Yes |

**Bottom Line:** We provide **runtime warnings** similar to Next.js, but can't provide **build-time prevention** because we're a library, not a framework.

---

## Recommendations for Framework Integration

### For Next.js Projects:

```typescript
// lib/emblem-server.ts
import 'server-only';  // ✅ Build error if imported client-side
export { createEmblemClient } from 'emblem-vault-ai-signers';
```

### For Vite Projects:

```typescript
// vite.config.ts
export default {
  define: {
    'process.env.EMBLEM_API_KEY': JSON.stringify(process.env.EMBLEM_API_KEY)
  }
};
```

### For Custom Bundlers:

Create a bundler plugin that errors if `emblem-vault-ai-signers` is imported in client-side code.

---

## Summary

**What we provide (ALL ENABLED BY DEFAULT):**
- ✅ Runtime environment detection & warnings (browser detection)
- ✅ API key format validation (empty, whitespace, length checks)
- ✅ URL validation & HTTP warnings (insecure protocols)
- ✅ Response data validation (required fields, format checks)
- ✅ Integer overflow protection (safe integer range)

**What we can't provide:**
- ❌ Build-time prevention (not a bundler)
- ❌ Protection against determined attackers
- ❌ Compile-time anti-pattern enforcement

**The security boundary is:** *"Do you trust the code running with your API key?"*

**To disable warnings:** You must **explicitly** set `warnOnBrowser: false` - there is no global disable switch. This is intentional to force conscious acknowledgment of security risks.
