# Guava Nexus v0 — Supabase Schema

This schema supports immutable version history.
In v0, the on-chain `pointer` is the UUID `id` of a row in `seed_versions`.

---

## seeds table (identity)

Purpose: one row per Seed (identity + lineage).

Columns:
- seed_id: bigint (primary key)            // mirrors on-chain seedId
- author_address: text (not null)
- parent_seed_id: bigint (nullable)        // lineage (0/null = none)
- latest_version: int (not null, default 1)
- created_at: timestamptz (not null, default now())
- updated_at: timestamptz (not null, default now())

Constraints (recommended):
- FK (optional): parent_seed_id -> seeds.seed_id

---

## seed_versions table (history)

Purpose: immutable history (one row per version).

Columns:
- id: uuid (primary key, default gen_random_uuid())  // this UUID is the on-chain pointer (v0)
- seed_id: bigint (not null)                          // references seeds.seed_id
- version: int (not null)                             // 1,2,3...
- content: text (not null)                            // full Seed content (markdown/text/json)
- created_at: timestamptz (not null, default now())

Constraints (recommended):
- FK: seed_id -> seeds.seed_id
- UNIQUE: (seed_id, version)
- CHECK: version > 0

---

## Rules

- A Seed is created once in `seeds`.
- Every update inserts a new row into `seed_versions`.
- The latest version is `seeds.latest_version` (cached index).
- The canonical on-chain pointer (v0) equals `seed_versions.id` for that version.

---

## How it works (v0 flow)

### Create Seed
1) Insert version row into `seed_versions` with (seed_id, version=1, content) -> returns `id` (uuid)
2) Call on-chain `createSeed(pointer = uuid, parentId)`
3) Insert row into `seeds` with (seed_id, author_address, parent_seed_id, latest_version=1)

### Update Seed
1) Read current latest_version from `seeds`
2) Insert new version row into `seed_versions` with (seed_id, version=latest_version+1, content) -> returns `id` (uuid)
3) Call on-chain `updateSeed(seedId, newPointer = uuid)`
4) Update `seeds.latest_version` and `seeds.updated_at`