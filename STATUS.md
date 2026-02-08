# Guava Nexus v0 — Status

## What Guava Nexus v0 is
Guava Nexus v0 is a **publishing primitive** and **creative authorship tool**.
Guava Nexus treats versions as narrative episodes, not deprecated states; earlier versions remain semantically vital to later ones.

It lets an author:
- publish a "Seed" (a piece of work) off-chain with cryptographic authorship proof,
- update the work over time (versioning) with author-only mutation,
- optionally link it to a parent Seed (lineage),
- request consent-based association with identity namespaces (HashNames).

v0 is intentionally minimal: it proves **authorship, versioning, and consent-based association** without on-chain anchoring yet.

---

## Phase B (Current): Off-Chain Authorship & Ownership — ✅ COMPLETE

### What Works Today

**Seed Authorship & Versioning:**
- Wallet-based seed creation via MetaMask signature + nonce
- Author address cryptographically bound to each seed
- Author-only updates enforced (403 Forbidden if non-author attempts update)
- Append-only version history (versions never overwritten)
- Full version history viewable in UI
- Parent seed validation (lineage integrity)

**HashName Identity Namespaces:**
- HashNames can be claimed via wallet signature (off-chain ownership)
- Owner-only control over association requests
- Unclaimed HashNames remain claimable by any wallet

**HashRoot Consent-Based Association:**
- Seeds can request attachment to HashNames
- Requests stored as `pending` (not approved by default)
- Only HashName owner can approve or reject requests
- Approved HashRoots appear on seed detail page
- Rejected requests archived (visible but clearly marked)
- UI clearly distinguishes pending vs approved vs rejected states

**Security & Replay Protection:**
- Nonce-based authentication (10-minute expiry, single-use)
- Signature verification using viem
- All write operations require wallet signature
- Address normalization (lowercase) for consistency

**UI Truthfulness:**
- No false on-chain claims (clearly labeled "off-chain")
- Pending HashRoots never displayed as approved
- Wallet authorship shown (not "blockchain verified")
- Phase clearly communicated as v0

### Implementation Details
- **Database**: Supabase (off-chain storage)
- **Auth**: Wallet signatures via MetaMask (no sessions, no user accounts)
- **Schema**: See `DB_SCHEMA.md` and `infra/migrations/`
- **Testing**: See `docs/PHASE_B_TESTING.md` for manual QA checklist

---

## Phase C (Deferred): On-Chain Anchoring

**Not Yet Implemented:**
- On-chain anchoring via `SeedRegistry.sol` on Arbitrum
- Transaction hash storage
- On-chain pointer (`seed_versions.id` → blockchain)
- Blockchain-verified timestamps
- On-chain authorship proofs

**Contract Ready But Not Wired:**
- `SeedRegistry.sol` exists in `contracts/` (Foundry project)
- Tests pass locally (`SeedRegistry.t.sol`)
- Integration with API routes deferred to Phase C

---

## What v0 Does NOT Do (Non-Goals)
- No tokens, no incentives, no staking ($Future placeholder only)
- No marketplaces or economic value handling
- No social feeds or engagement metrics
- No algorithmic ranking or discovery
- No plagiarism detection/arbitration
- No public identity profiles or social graphs
- No upgradeability or proxy patterns

(See `NON_GOALS.md`.)

---

---

## Phase B Lock

**Phase B is now complete and locked.**

No further Phase B scope changes will be accepted. All Phase B features are implemented, tested, and documented. The system is ready for demo and user feedback.

What Phase B includes:
- Wallet-based seed creation and authorship
- Author-only updates with signature verification
- HashName claiming and ownership
- HashRoot consent-based association (request → approve/reject)
- Nonce-based replay protection
- Parent seed validation and lineage tracking

What Phase B intentionally excludes (deferred to later phases):
- On-chain anchoring
- Transaction hash storage
- Blockchain-verified timestamps
- Smart contract integration

---

## Next Steps

**Phase C-lite (UX Polish Only):**
- Improve HashName Owner Inbox UI
- Add consistent navigation and empty states
- Reusable wallet connection component

**Phase C (On-Chain Anchoring):**
When ready to anchor on-chain:
1. Wire API routes to call `SeedRegistry.sol` after DB operations
2. Store transaction hashes in database
3. Handle transaction failures and rollbacks
4. Add on-chain status indicators to UI
5. Deploy contract to Arbitrum testnet/mainnet

**Testing:**
See `docs/PHASE_B_TESTING.md` for complete manual QA checklist.
