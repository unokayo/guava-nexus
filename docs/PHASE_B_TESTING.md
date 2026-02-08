# Phase B Manual QA Checklist

**Context**: Phase B implements off-chain wallet-based authorship, author-only updates, HashName ownership, and consent-based HashRoot association. **No on-chain anchoring yet** — everything is stored in Supabase.

**Prerequisites**:
- MetaMask or compatible wallet installed
- Supabase database with migrations applied
- App running locally or deployed
- At least 2 wallet addresses available for testing

---

## Test Suite 1: Seed Creation & Authorship

### TC1.1: Create Seed with Wallet Signature
**Steps**:
1. Navigate to home page (`/`)
2. Click "Connect Wallet"
3. Approve wallet connection in MetaMask
4. Fill out seed form:
   - Title: "Test Seed for Phase B"
   - Narrative Frame: Select any (e.g., "MAD")
   - Narrative Branch: Select matching branch (e.g., "Philosophy")
   - Idea Pillar: Select any (e.g., "Curiosity")
   - Content: "This is a test seed to verify wallet authorship."
5. Click "Sign & Publish Seed"
6. Sign message in MetaMask popup
7. Wait for success redirect

**Expected**:
- ✅ MetaMask prompts for signature with human-readable message
- ✅ Seed created successfully
- ✅ Redirected to seed detail page (`/seed/[id]`)
- ✅ "Wallet Author" section shows connected wallet address (truncated)

**Failure Cases**:
- ❌ Signature rejected → Shows error, seed not created
- ❌ Nonce expired → Shows "Signature expired" error

---

### TC1.2: Verify Author Address Stored Correctly
**Steps**:
1. After creating seed in TC1.1, note the seed ID
2. Inspect database (Supabase SQL Editor):
   ```sql
   SELECT seed_id, author_address, title 
   FROM seeds 
   WHERE seed_id = [your_seed_id];
   ```

**Expected**:
- ✅ `author_address` matches your wallet address (lowercase)
- ✅ `author_address` is NOT null

---

### TC1.3: Create Seed with Parent Lineage
**Steps**:
1. Create first seed (Seed A) following TC1.1
2. Note Seed A's ID
3. Create second seed (Seed B) with:
   - Parent Seed ID: [Seed A's ID]
   - Other fields: any valid values
4. Sign and publish

**Expected**:
- ✅ Seed B created successfully
- ✅ Seed B detail page shows "Derived from: [Seed A's ID]"

**Edge Case**:
- Enter non-existent parent ID (e.g., 99999)
- **Expected**: Error message "Parent Seed #99999 does not exist."

---

## Test Suite 2: Author-Only Updates

### TC2.1: Update Seed as Original Author
**Steps**:
1. Navigate to seed created by your wallet
2. Scroll to "Update this Seed" form at bottom
3. Modify content: "Updated content from original author"
4. Click "Sign & Publish update"
5. Sign message in MetaMask

**Expected**:
- ✅ Update succeeds
- ✅ Page refreshes showing new version (e.g., "v2")
- ✅ Content displays updated text
- ✅ Version history shows both v1 and v2
- ✅ Clicking v1 in history shows original content

---

### TC2.2: Attempt Update from Different Wallet (403 Forbidden)
**Steps**:
1. Navigate to seed created by Wallet A
2. Disconnect Wallet A from MetaMask
3. Connect Wallet B (different address)
4. Scroll to "Update this Seed" form
5. Modify content: "Trying to update from wrong wallet"
6. Click "Sign & Publish update"
7. Sign message in MetaMask

**Expected**:
- ✅ Request fails with error
- ✅ Error message: "Only the original author can update this Seed"
- ✅ HTTP status: 403 Forbidden
- ✅ Seed content unchanged

---

### TC2.3: Verify Version History Immutability
**Steps**:
1. Create seed with initial content
2. Update seed 2-3 times
3. Navigate to v1 using version history links
4. Verify v1 content is unchanged
5. Navigate to latest version

**Expected**:
- ✅ Each version preserves its original content
- ✅ No versions overwritten
- ✅ Version numbers increment sequentially (1, 2, 3...)
- ✅ Each version has its own timestamp

---

## Test Suite 3: HashName Ownership

### TC3.1: Claim Unclaimed HashName
**Steps**:
1. Navigate to `/hashnames/%23testname` (or use any unclaimed handle)
2. Verify status shows "Unclaimed"
3. Connect wallet
4. Click "Claim this HashName"
5. Sign message in MetaMask

**Expected**:
- ✅ Success message: "HashName claimed successfully!"
- ✅ Page updates to show "You own this HashName"
- ✅ "Owner (Off-chain)" shows your wallet address
- ✅ "Manage requests" button appears

**Failure Cases**:
- ❌ HashName already claimed → Error: "HashName already claimed by another wallet."

---

### TC3.2: Attempt to Claim Already-Owned HashName (Idempotent)
**Steps**:
1. Claim HashName with Wallet A
2. Try to claim same HashName again with Wallet A

**Expected**:
- ✅ Success message: "You already own this HashName."
- ✅ No error, idempotent operation

---

### TC3.3: Verify Off-Chain Ownership Labeling
**Steps**:
1. Navigate to any claimed HashName page

**Expected**:
- ✅ UI clearly states "Owner (Off-chain)"
- ✅ Disclaimer visible: "Ownership is tracked off-chain via wallet signatures"
- ✅ No false claims about blockchain verification

---

## Test Suite 4: HashRoot Request/Approval Flow

### TC4.1: Request HashRoot Attachment
**Steps**:
1. Create a seed (note its ID)
2. On seed detail page, find "Request HashRoot Attachment" section
3. Enter HashName handle: `#testname` (or any active HashName)
4. Click "Request attachment"

**Expected**:
- ✅ Success message: "Request submitted for #testname"
- ✅ Page refreshes
- ✅ "HashRoot Requests (Pending)" section appears
- ✅ Request shows with label "Awaiting approval"
- ✅ Request does NOT appear in "HashRoots (Approved)" section

---

### TC4.2: Approve HashRoot Request as Owner
**Steps**:
1. Complete TC4.1 to create pending request
2. Disconnect seed author wallet
3. Connect wallet that owns `#testname`
4. Navigate to `/hashnames/%23testname/requests`
5. Find pending request for the seed
6. Click "Approve"
7. Sign message in MetaMask

**Expected**:
- ✅ Success alert: "Request approved successfully"
- ✅ Request removed from pending list
- ✅ Navigate back to seed detail page
- ✅ HashName now appears in "HashRoots (Approved)" section
- ✅ Approved HashRoot is clickable link

---

### TC4.3: Reject HashRoot Request as Owner
**Steps**:
1. Create new seed
2. Request attachment to `#testname`
3. As HashName owner, navigate to `/hashnames/%23testname/requests`
4. Click "Reject" on the request
5. Sign message in MetaMask

**Expected**:
- ✅ Success alert: "Request rejected successfully"
- ✅ Request removed from pending list
- ✅ Navigate to seed detail page
- ✅ Rejected request appears in "HashRoot Archive (Rejected)" section (collapsed)
- ✅ Request marked with rejection timestamp
- ✅ Request NOT in "HashRoots (Approved)" section

---

### TC4.4: Non-Owner Cannot Resolve Requests
**Steps**:
1. Create pending HashRoot request
2. Navigate to `/hashnames/%23testname/requests` with wallet that does NOT own HashName
3. Attempt to click "Approve" or "Reject"
4. Sign message if prompted

**Expected**:
- ✅ Error: "Only the HashName owner can resolve requests."
- ✅ HTTP status: 403 Forbidden
- ✅ Request status unchanged

---

## Test Suite 5: UI Clarity & Truthfulness

### TC5.1: Verify Pending vs Approved Distinction
**Steps**:
1. Create seed with pending HashRoot request
2. On seed detail page, inspect both sections

**Expected**:
- ✅ "HashRoots (Approved)" section exists (may be empty)
- ✅ "HashRoot Requests (Pending)" section exists
- ✅ Pending requests have reduced opacity and "Awaiting approval" label
- ✅ Approved HashRoots are fully opaque with normal styling
- ✅ No way to confuse pending with approved

---

### TC5.2: Verify No False On-Chain Claims
**Steps**:
1. Inspect all UI text on:
   - Home page
   - Seed detail page
   - HashName pages

**Expected**:
- ✅ No claims of "blockchain verified"
- ✅ No claims of "immutable" or "on-chain"
- ✅ Ownership clearly labeled "off-chain"
- ✅ "GUAVA NEXUS v0" or similar phase indicator visible

---

### TC5.3: Copy Provenance Does Not Claim On-Chain Anchoring
**Steps**:
1. Navigate to any seed detail page
2. Click "Copy provenance"
3. Inspect clipboard contents

**Expected**:
- ✅ Shows Seed ID, version, UUID, timestamp
- ✅ Does NOT show transaction hash
- ✅ Does NOT claim "verified on blockchain"

---

## Test Suite 6: Security & Replay Protection

### TC6.1: Nonce Single-Use Enforcement
**Steps**:
1. Open browser developer console
2. Create seed and capture the nonce from request
3. Attempt to reuse same nonce + signature for another seed creation

**Expected**:
- ✅ Second request fails
- ✅ Error: "Invalid or expired nonce"
- ✅ HTTP status: 401 Unauthorized

---

### TC6.2: Nonce Expiry (10 Minutes)
**Steps**:
1. Request nonce from `/api/auth/nonce`
2. Wait >10 minutes
3. Attempt to use expired nonce

**Expected**:
- ✅ Request fails
- ✅ Error: "Nonce expired"
- ✅ HTTP status: 401 Unauthorized

---

### TC6.3: Address Normalization
**Steps**:
1. Create seed with wallet address in mixed case (e.g., `0xAbC123...`)
2. Check database:
   ```sql
   SELECT author_address FROM seeds WHERE seed_id = [your_seed_id];
   ```

**Expected**:
- ✅ Address stored in lowercase
- ✅ Future auth checks work regardless of case

---

## Summary Checklist

**Seed Authorship:**
- [ ] TC1.1: Create seed with wallet signature
- [ ] TC1.2: Author address stored correctly
- [ ] TC1.3: Parent seed lineage works

**Author-Only Updates:**
- [ ] TC2.1: Update succeeds for original author
- [ ] TC2.2: Update fails (403) for different wallet
- [ ] TC2.3: Version history immutable

**HashName Ownership:**
- [ ] TC3.1: Claim unclaimed HashName
- [ ] TC3.2: Idempotent claim (already owned)
- [ ] TC3.3: Off-chain labeling clear

**HashRoot Consent:**
- [ ] TC4.1: Request HashRoot attachment
- [ ] TC4.2: Owner approves request
- [ ] TC4.3: Owner rejects request
- [ ] TC4.4: Non-owner cannot resolve (403)

**UI Truthfulness:**
- [ ] TC5.1: Pending vs approved distinction clear
- [ ] TC5.2: No false on-chain claims
- [ ] TC5.3: Provenance doesn't claim blockchain

**Security:**
- [ ] TC6.1: Nonce single-use enforced
- [ ] TC6.2: Nonce expiry works
- [ ] TC6.3: Address normalization consistent

---

## Known Limitations (Phase B)

✅ **Expected Behavior:**
- No on-chain anchoring or transaction hashes
- No blockchain-verified timestamps (using Supabase timestamps)
- Ownership is off-chain only (no smart contract enforcement)
- HashRoot requests do not require wallet signature (design decision pending)

❌ **Not Tested (Out of Scope for Phase B):**
- On-chain seed registry integration
- Token economics or $Future mechanics
- Social features or feed algorithms
- Dispute resolution
