# Guava Nexus v0 — Status

## What Guava Nexus v0 is
Guava Nexus v0 is a **publishing primitive** and **creative authorship tool**.
Guava Nexus treats versions as narrative episodes, not deprecated states; earlier versions remain semantically vital to later ones.

It lets an author:
- publish a “Seed” (a piece of work) off-chain,
- anchor proof of authorship + time on-chain,
- update the work over time (versioning),
- optionally link it to a parent Seed (lineage).

v0 is intentionally minimal: it proves **authorship, versioning, and lineage** without storing full content on-chain.

---

## What exists and works today

### On-chain (Arbitrum-ready)
- `SeedRegistry.sol` (Foundry project in `contracts/`)
  - createSeed(pointer, parentId)
  - updateSeed(seedId, newPointer) — author-only
  - getSeed(seedId)
  - version increments on update
  - timestamps recorded
  - events emitted

### Tests
- `SeedRegistry.t.sol` passes locally via Foundry.

### Off-chain plan (storage)
- Supabase schema defined in `DB_SCHEMA.md`
- Pointer convention: on-chain pointer = off-chain `seed_versions.id` (UUID)

---

## What v0 does NOT do (non-goals)
- No tokens, no incentives, no staking
- No marketplaces
- No social feeds
- No plagiarism detection/arbitration
- No upgradeability or proxy patterns
- No economic value handling

(See `NON_GOALS.md`.)

---

## Next step (one thing only)
Build the **minimal publisher UI**:
- Create Seed content off-chain (Supabase)
- Get back a `seed_versions.id` (UUID)
- Call `createSeed(pointer, parentId)` on Arbitrum testnet
- Display the Seed (read on-chain + fetch off-chain content)