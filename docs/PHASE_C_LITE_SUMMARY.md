# Phase C-lite: HashName Inbox UX Polish

**Status:** ✅ Complete  
**Commit:** `049a94f`

## Overview

Phase C-lite focused on improving the HashName Owner Inbox UX and adding UI polish across the app without changing the trust model or adding new features. All changes are frontend-only (plus one minor API enhancement).

---

## Phase B Lock

**Phase B is now officially locked.** No further Phase B scope changes will be accepted.

### What Phase B Includes (Complete)
- Wallet-based seed creation and authorship
- Author-only updates with signature verification
- HashName claiming and ownership
- HashRoot consent-based association (request → approve/reject)
- Nonce-based replay protection
- Parent seed validation and lineage tracking

### What Phase B Excludes (Deferred)
- On-chain anchoring
- Transaction hash storage
- Blockchain-verified timestamps
- Smart contract integration

See `STATUS.md` for full details.

---

## Phase C-lite Improvements

### 1. Reusable WalletBar Component

**File:** `apps/web/components/WalletBar.tsx`

**Purpose:** Eliminate code duplication and provide consistent wallet connection UX across all pages.

**Variants:**
- **default**: Full-width component with detailed copy about MetaMask disconnect limitations
- **compact**: Inline component suitable for forms and smaller UI sections

**Features:**
- Connect/Disconnect/Switch Account buttons
- Wallet address display (shortened with full address on hover)
- Truthful copy about MetaMask limitations
- Consistent styling with app theme

**Usage:**
```tsx
import { WalletBar } from "@/components/WalletBar";

// Default variant (full width)
<WalletBar />

// Compact variant (inline)
<WalletBar variant="compact" />
```

**Applied to:**
- Home page (`app/page.tsx`)
- Seed detail page forms (`app/seed/[id]/UpdateSeedForm.tsx`, `RequestHashRootForm.tsx`)
- HashName page (`app/hashnames/[handle]/page.tsx`)
- HashName Inbox (`app/hashnames/[handle]/requests/page.tsx`)

---

### 2. HashName Owner Inbox UI Improvements

**File:** `apps/web/app/hashnames/[handle]/requests/page.tsx`

**Key Changes:**

#### Tab Navigation
- **Pending**: Active requests awaiting owner action
- **Approved**: Link to HashName page to view approved Seeds
- **Archive**: Rejected requests (placeholder for now)

#### Improved Request Cards
Each pending request now shows:
- **Seed title** (not just ID) — clickable link to seed
- **Seed ID** (clickable link)
- **Requester wallet** (shortened, click to copy full address)
- **Request timestamp** (formatted as locale string)
- **Approve/Reject buttons** (disabled if not owner, with clear visual feedback)

#### Better UX Feedback
- Success toast after approve/reject action
- Error messages inline (not just alerts)
- Loading states during processing
- Empty state with helpful guidance

#### Enhanced Copy
- "You control what associates with this HashName" authority message
- Clear explanation of owner-only permissions
- Instructions for non-owners

---

### 3. API Enhancement

**File:** `apps/web/app/api/hashnames/[handle]/route.ts`

**Change:** Pending requests now include seed titles via Supabase join:

```typescript
.select(`
  id, 
  seed_id, 
  requester_label, 
  created_at,
  seeds!inner(title)
`)
```

This eliminates the need for additional client-side fetches and improves inbox load performance.

---

### 4. Consistent Navigation

**Applied across all pages:**
- Header with "← Home" link in top-right
- Footer with contextual navigation links
- Consistent border/spacing for navigation sections

**Examples:**
- HashName Inbox: "← HashName page" + "Home"
- HashName page: "← Home"
- Seed page: "Home" + "All seeds →"

---

## Files Changed

| File | Lines Changed | Description |
|------|--------------|-------------|
| `STATUS.md` | +20 | Phase B lock documentation |
| `apps/web/components/WalletBar.tsx` | +89 (new) | Reusable wallet connection component |
| `apps/web/app/page.tsx` | -48, +3 | Use WalletBar component |
| `apps/web/app/seed/[id]/UpdateSeedForm.tsx` | -47, +3 | Use WalletBar compact variant |
| `apps/web/app/seed/[id]/RequestHashRootForm.tsx` | -47, +6 | Use WalletBar compact variant |
| `apps/web/app/hashnames/[handle]/page.tsx` | -12, +9 | Use WalletBar + navigation improvements |
| `apps/web/app/hashnames/[handle]/requests/page.tsx` | -145, +284 | Complete inbox UI overhaul |
| `apps/web/app/api/hashnames/[handle]/route.ts` | +7 | Add seed titles to pending requests |

**Total:** 8 files, 416 insertions(+), 269 deletions(-)

---

## Testing Checklist

### WalletBar Component
- [ ] Connect wallet from Home page
- [ ] Switch account from Seed update form
- [ ] Disconnect from HashName page
- [ ] Verify compact variant renders correctly in forms
- [ ] Verify default variant shows full MetaMask disconnect copy

### HashName Inbox
- [ ] Navigate to HashName Inbox as owner
- [ ] Verify pending requests show seed titles (not just IDs)
- [ ] Click seed title → navigates to seed detail page
- [ ] Click requester wallet → copies to clipboard
- [ ] Approve a request → shows success toast, removes from pending
- [ ] Reject a request → shows success toast, removes from pending
- [ ] Switch to "Approved" tab → shows link to HashName page
- [ ] Switch to "Archive" tab → shows empty state
- [ ] Navigate as non-owner → shows "not owner" warning

### Navigation
- [ ] From Home → Seed → HashName → Inbox (verify all nav links work)
- [ ] From Inbox → HashName page → Home
- [ ] Verify header "← Home" link on all pages

### TypeScript
- [x] `pnpm -C apps/web tsc --noEmit` passes

---

## Non-Goals (Deferred)

These were intentionally **not** included in Phase C-lite:

- **Approved Seeds list in Inbox**: Users can view approved Seeds on the HashName page (seed detail page shows approved HashRoots)
- **Archive/Rejected requests UI**: Placeholder tab exists, but full archive UI deferred
- **Request notes**: Owner can provide notes when rejecting, but UI doesn't expose this yet
- **Pagination**: Not needed for v0 demo (expected request counts are small)
- **Real-time updates**: Page refresh after approve/reject is sufficient for v0

---

## Next Steps

**Demo-ready v0 is now complete.**

For future phases:
- **Phase C (On-Chain Anchoring)**: Wire `SeedRegistry.sol` contract, store tx hashes, handle blockchain confirmations
- **Phase D (Discovery)**: Add search, filtering, and browsing UI for Seeds and HashNames
- **Phase E (Social)**: Implement follows, notifications, and public profiles (if desired)

---

## Verification

**Commit Hash:** `049a94f`  
**Branch:** `phase-a/metadata-schema`  
**TypeScript:** ✅ Passes  
**Manual QA:** Pending user testing
