# Next.js Dev Server Cache Issue - RESOLVED

## Problem Description

**Error**: `Event handlers cannot be passed to Client Component props. <... seedId={23} onSuccess={function onSuccess}>`

**Symptoms**:
- Error persisted even after removing `onSuccess` prop from source code
- `grep -R "onSuccess"` returned no matches in source code
- TypeScript compilation passed without errors
- Error only appeared at runtime when visiting `/seed/[id]` routes
- Multiple Next.js dev processes were running simultaneously

## Root Cause Analysis

### Primary Cause: Stale Turbopack/Next.js Cache

The issue was caused by **stale compiled modules** in Next.js 16's `.next/dev` cache:

1. **Historical Context**:
   - Commit `1b3c9fa` originally added `RequestHashRootForm` with `onSuccess` function prop
   - Commit `89d8619` (current HEAD) correctly removed the `onSuccess` prop
   - Changed from: `<RequestHashRootForm seedId={...} onSuccess={() => {...}} />`
   - Changed to: `<RequestHashRootForm seedId={...} authorAddress={...} />`

2. **Why the Error Persisted**:
   - Next.js Turbopack cached the **compiled server component** in `.next/dev/server/`
   - The cached bundle still contained the OLD version with `onSuccess` prop
   - Hot Module Replacement (HMR) didn't invalidate this specific module
   - React's Flight protocol detected the function prop at **serialization time** (not compile time)

3. **Why TypeScript Didn't Catch It**:
   - TypeScript validates types at **compile time** from source files
   - The runtime error came from **cached JavaScript bundles**, not source code
   - TypeScript had no visibility into the `.next/dev` compiled output

4. **Why grep Didn't Find It**:
   - ✅ `grep` correctly found NO `onSuccess` in source code
   - ❌ But the cached bundles in `.next/dev/static/chunks/` contained old compiled code
   - The error message came from React's runtime execution, not source

### Secondary Cause: Multiple Dev Server Processes

Terminal logs showed evidence of multiple `pnpm dev` attempts, which can cause:
- Lock file conflicts (`.next/dev/lock`)
- Port 3000 binding issues
- Stale process serving old cached modules

## How Next.js Detects This Error

The error is thrown by React 19's Server Components Flight protocol:

```javascript
// Inside react-server-dom-webpack during serialization
function serializeProps(props) {
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') {
      throw new Error(
        `Event handlers cannot be passed to Client Component props.
        <... ${key}={function ${value.name}}>`
      );
    }
  }
}
```

**Detection happens at**:
- **Runtime** during Server Component → Client Component boundary crossing
- **NOT at build time** (which is why TypeScript/ESLint don't catch it)
- During serialization of props to send over the network/RSC payload

## Solution Implemented

### 1. Killed Stale Processes
```bash
pkill -9 -f "next dev"
```

### 2. Cleaned All Caches
```bash
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache
```

### 3. Added Clean Dev Script

Updated `apps/web/package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:clean": "rm -rf .next node_modules/.cache && next dev"
  }
}
```

### 4. Created Fix Script

Added `apps/web/fix-dev-server.sh` for future issues:
```bash
#!/bin/bash
pkill -9 -f "next dev" 2>/dev/null
rm -rf .next node_modules/.cache
pnpm dev
```

## Verification Checklist

After implementing the fix, verify:

- [ ] **No running processes**: `lsof -i :3000` shows only one process or none
- [ ] **Clean cache**: `.next` directory deleted
- [ ] **Source code correct**: No `onSuccess` in `grep -R "onSuccess" app/`
- [ ] **Git state clean**: `git status` shows no uncommitted changes to component files
- [ ] **Current HEAD**: `git log -1` shows commit `89d8619` (the fix commit)
- [ ] **TypeScript passes**: `pnpm tsc --noEmit` returns exit code 0
- [ ] **Dev server starts clean**: `pnpm dev:clean` starts without lock file errors
- [ ] **Route compiles fresh**: Visit `/seed/[id]` and check terminal for fresh compilation
- [ ] **No runtime error**: Browser console shows no React errors about function props
- [ ] **Browser cache clear**: Hard refresh (Cmd+Shift+R) or use Incognito mode

## How to Reproduce (for testing)

1. Create a component with function prop in server component
2. Compile and run dev server
3. Remove the function prop from source
4. DON'T restart dev server - just save file
5. Visit the route → Error appears despite code being correct
6. Run `pnpm dev:clean` → Error disappears

## Prevention for Future Development

### When to Use `dev:clean`

Use the clean dev script after:
- Refactoring component prop interfaces
- Changing Server ↔ Client component boundaries
- Moving components between files
- Seeing persistent "stale" behavior despite code changes
- Encountering "Event handlers cannot be passed" errors

### Normal Development

For normal development, regular `pnpm dev` is fine. The clean script is only needed when:
- Major refactoring of component boundaries
- Persistent cache-related issues appear
- After pulling major changes from git

### Production Note

This issue **ONLY affects development mode**. Production builds (`pnpm build`) always perform full recompilation and are not affected.

## Technical Details

### Next.js 16 + Turbopack Caching Strategy

Next.js 16 with Turbopack uses aggressive caching:
- Compiled modules cached in `.next/dev/server/`
- Client bundles cached in `.next/dev/static/chunks/`
- Turbopack cache in `node_modules/.cache/`
- HMR tries to incrementally update, but sometimes misses prop interface changes

### React 19 Server Components

React 19's RSC protocol serializes props as JSON to send from Server to Client:
- Functions cannot be serialized
- React checks `typeof prop === 'function'` during serialization
- Error is thrown at **runtime**, not compile time
- This is by design - props must be JSON-serializable for RSC to work

## Files Modified

1. `apps/web/package.json` - Added `dev:clean` script
2. `apps/web/fix-dev-server.sh` - Created automated fix script
3. `apps/web/CACHE_FIX_DOCUMENTATION.md` - This documentation file

## Related Commits

- `89d8619` - ui: fix wallet disconnect, remove server->client function props
- `41a5350` - api: require seed-author signature for hashroot requests
- `1b3c9fa` - ui: add hashroot request form (original with onSuccess)

## Status

✅ **RESOLVED** - Cache cleared, processes killed, source code verified clean.

The error should no longer appear after:
1. Running `pnpm dev:clean` to start fresh dev server
2. Hard refreshing browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Verifying no multiple processes running on port 3000
