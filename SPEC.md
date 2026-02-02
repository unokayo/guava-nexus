# Guava Nexus v0 — Specification

## Purpose
Guava Nexus v0 proves that a structured idea (“Seed”) can be:
- authored by a wallet,
- anchored on a public ledger,
- versioned over time,
- and linked by lineage (parent → child),
without trusting a central authority.

## Core Entities

### Seed
A Seed is a versioned record of structured thought.
Each Seed has:
- an author (wallet address)
- a current content pointer (off-chain reference)
- a version number
- an optional parent Seed (lineage)

## On-chain Responsibilities (Arbitrum)
The blockchain stores only what is necessary for:
- authorship proof
- verifiable version history
- verifiable lineage

v0 stores:
- Seed ID
- author address
- content pointer (CID or hash)
- version number
- parent Seed ID (optional)
- timestamps (or block numbers)
And emits events for create/update.

## Off-chain Responsibilities
Off-chain storage holds:
- the full Seed content (text/markdown/json)
- rich metadata (tags, summaries, etc.)

v0 will use (choose one):
- Supabase (fast shipping)
- IPFS (content-addressed permanence) [optional later]

## Allowed Actions (v0)

### Create Seed
User can create a Seed by submitting:
- content pointer
- optional parentSeedId

Result:
- SeedCreated event emitted
- Seed stored with version = 1

### Update Seed
Only the original author can update their Seed by submitting:
- new content pointer

Result:
- version increments
- SeedUpdated event emitted

### Read Seed
Anyone can:
- read Seed state from chain
- reconstruct history from events
- fetch content off-chain using pointer

## Out of Scope (v0)
See NON_GOALS.md

## Success Criteria
v0 is done when:
- a wallet can create a Seed,
- update it,
- and the UI can display:
  - current version
  - history of updates
  - parent linkage (if any),
with on-chain verification that the author is real.