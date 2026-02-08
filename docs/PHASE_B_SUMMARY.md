# Phase B: Wallet Signature Authorship - Implementation Summary

## Completed: 2026-02-07

### What Was Implemented

Phase B Step 1 adds minimal wallet-signature authentication to Guava Nexus, enabling:
- Cryptographic proof of authorship on seed creation
- Author-only enforcement on seed updates
- Nonce-based replay protection
- No sessions, profiles, or on-chain calls (kept minimal as required)

### Architecture

**Authentication Flow:**
1. User connects wallet (MetaMask via window.ethereum)
2. User requests action (create/update seed)
3. Frontend requests nonce from `/api/auth/nonce`
4. Frontend generates signed message with nonce
5. User signs message via MetaMask
6. Frontend sends signature + nonce + timestamp to API
7. Backend verifies signature, checks nonce, deletes nonce (single-use)
8. If valid, proceeds with database operation

**Security Features:**
- Nonce expires in 10 minutes
- Nonces are single-use (deleted after verification)
- Signature includes action type and seed_id (for updates)
- Timestamp validation prevents old signatures
- Address normalization (lowercase) for consistency

### Database Changes

**New table: `auth_nonces`**
```sql
create table public.auth_nonces (
  address text primary key,
  nonce text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
```

**Migration:** `infra/migrations/2026-02-07_phase-b-auth.sql`

### New Files Created

1. **`apps/web/app/api/auth/nonce/route.ts`**
   - POST endpoint to generate nonces
   - Normalizes address to lowercase
   - Upserts into auth_nonces table
   - Returns nonce + expiry timestamp

2. **`apps/web/lib/auth.ts`**
   - `generateSigningMessage()` - Creates human-readable message
   - `verifySignature()` - Uses viem to verify signature
   - `isTimestampValid()` - Checks timestamp within 10min window

3. **`apps/web/lib/verifyAuth.ts`**
   - `verifyAuth()` - Server-side verification function
   - Validates address format
   - Checks nonce exists and hasn't expired
   - Verifies signature matches
   - Deletes nonce after successful verification

4. **`apps/web/lib/useWallet.ts`**
   - React hook for wallet connection
   - Auto-detects connected wallet on mount
   - Handles account changes
   - Returns address, connection status, errors

5. **`apps/web/lib/useSignature.ts`**
   - React hook for requesting signatures
   - Fetches nonce from server
   - Generates signing message
   - Requests signature via MetaMask
   - Returns signed data bundle

### Modified Files

1. **`apps/web/app/api/seeds/route.ts`**
   - Added auth field extraction (address, signature, nonce, timestamp)
   - Calls `verifyAuth()` before seed creation
   - Sets `author_address` to verified address (not null anymore)
   - Returns 401 if auth fails

2. **`apps/web/app/api/seeds/[id]/update/route.ts`**
   - Added auth field extraction
   - Calls `verifyAuth()` with seed_id included
   - Fetches seed with author_address
   - Returns 403 if verified address doesn't match seed author
   - Returns 401 if auth fails

3. **`apps/web/app/page.tsx`**
   - Added wallet connection UI section
   - Integrated useWallet and useSignature hooks
   - Modified handleSubmit to check wallet and request signature
   - Updated button states (isSigning, address checks)
   - Shows "Connect Wallet" or "Sign & Publish Seed"

4. **`apps/web/app/seed/[id]/UpdateSeedForm.tsx`**
   - Added wallet connection UI section
   - Integrated useWallet and useSignature hooks
   - Modified handleSubmit to check wallet and request signature
   - Updated button states
   - Shows "Connect Wallet" or "Sign & Publish update"

5. **`apps/web/package.json`**
   - Added dependency: `viem@2.26.5`

### Dependencies Added

- **viem** (v2.26.5): Lightweight Ethereum library for signature verification
  - Tree-shakeable
  - TypeScript native
  - No full wagmi setup required
  - ~50KB bundle size

### Testing Checklist

Before using in production:

1. **Run migration:**
   ```sql
   -- Execute infra/migrations/2026-02-07_phase-b-auth.sql in Supabase SQL Editor
   ```

2. **Test seed creation flow:**
   - Connect wallet
   - Fill out seed form
   - Click "Sign & Publish Seed"
   - Sign MetaMask popup
   - Verify seed created with author_address

3. **Test seed update flow:**
   - Navigate to existing seed (that you authored)
   - Connect same wallet
   - Edit content
   - Click "Sign & Publish update"
   - Sign MetaMask popup
   - Verify update succeeds

4. **Test author-only enforcement:**
   - Try to update a seed with different wallet
   - Verify 403 error: "Only the original author can update this Seed"

5. **Test nonce expiry:**
   - Get nonce
   - Wait >10 minutes
   - Try to use expired nonce
   - Verify 401 error

### What's NOT Included (As Required)

- ❌ No sessions or session management
- ❌ No user profiles or accounts table
- ❌ No full wagmi setup (just viem for verification)
- ❌ No on-chain contract calls
- ❌ No token minting or mintpool
- ❌ No on-chain registry wiring

### Next Steps (Phase C)

When ready to connect on-chain:
1. Wire `createSeed()` to call `SeedRegistry.createSeed()` after DB insert
2. Wire `updateSeed()` to call `SeedRegistry.updateSeed()` after version insert
3. Store transaction hashes in seeds table
4. Add pointer generation logic (pointer = seed_versions.id UUID)
5. Handle transaction failures and rollbacks

### Commit

```
commit dac1303
Author: [Your Name]
Date:   2026-02-07

phase-b: add wallet signature authorship and author-only updates

Implements minimal wallet-signature authentication for Seeds:
- Nonce-based replay protection via auth_nonces table
- Signature verification using viem
- Author capture on seed creation
- Author-only enforcement on seed updates
- Minimal UI: wallet connection + signing flow
- No sessions, profiles, or on-chain calls yet
```

### Notes

- All addresses are stored and compared in lowercase for consistency
- Nonces are single-use and automatically deleted after verification
- Signature messages include action type and seed_id to prevent misuse
- TypeScript passes with no errors
- UI is minimally invasive (small wallet connection box above forms)
- Works with MetaMask; other wallets implementing window.ethereum should work too
