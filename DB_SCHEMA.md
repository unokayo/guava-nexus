# Guava Nexus v0 — Supabase Schema

## seeds table
- id: uuid (primary key)
- seed_id: bigint (unique)  // mirrors on-chain seedId
- author_address: text
- version: int
- parent_seed_id: bigint (nullable)
- content: text  // the full Seed content
- created_at: timestamptz
- updated_at: timestamptz

## seeds table (identity)
- seed_id: bigint (primary key)           // mirrors on-chain seedId
- author_address: text (not null)
- parent_seed_id: bigint (nullable)
- created_at: timestamptz
- updated_at: timestamptz

## seed_versions table (history)
- id: uuid (primary key)
- seed_id: bigint (not null)              // references seeds.seed_id
- version: int (not null)                 // 1,2,3...
- pointer: text (not null)                // stored on-chain too (v0)
- content: text (not null)                // the full Seed content
- created_at: timestamptz

## Rules
- A Seed is created once in `seeds`.
- Every update inserts a new row into `seed_versions`.
- Latest version = max(version) for a given seed_id.

## How it works
- When user creates Seed:
  1) Insert content row into Supabase -> returns uuid
  2) Call createSeed(pointer = uuid, parentId)
  3) Store seed_id + pointer + author in Supabase
- When user updates Seed:
  1) Insert new content row OR update existing (v0 recommendation: insert new row)
  2) Call updateSeed(seedId, newPointer = new uuid)