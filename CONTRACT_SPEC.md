# Guava Nexus v0 — Contract Spec (SeedRegistry)

## Goal
Provide an on-chain registry on Arbitrum that:
- proves authorship of a Seed by wallet address,
- supports versioned updates by the original author only,
- supports optional lineage (parentSeedId),
- emits events so history can be indexed and reconstructed.

## Data Model (On-chain)

### Seed struct
- author: address
- pointer: bytes32 OR string (v0 choice: start with string pointer)
- version: uint32
- parentId: uint256 (0 means no parent)
- createdAt: uint64 (block timestamp)
- updatedAt: uint64 (block timestamp)

### Storage
- nextSeedId: uint256 (auto-increment, starting at 1)
- seeds: mapping(uint256 => Seed)

## Functions (Write)

### createSeed(pointer, parentId) -> seedId
Rules:
- pointer must be non-empty
- parentId may be 0, or must refer to an existing seed
Effects:
- seedId = nextSeedId; nextSeedId++
- seeds[seedId] = { author=msg.sender, pointer, version=1, parentId, createdAt=now, updatedAt=now }
- emit SeedCreated(seedId, msg.sender, pointer, parentId, now)

### updateSeed(seedId, newPointer)
Rules:
- seedId must exist
- only seeds[seedId].author can call
- newPointer must be non-empty
Effects:
- seeds[seedId].pointer = newPointer
- seeds[seedId].version += 1
- seeds[seedId].updatedAt = now
- emit SeedUpdated(seedId, msg.sender, newPointer, seeds[seedId].version, now)

## Functions (Read)

### getSeed(seedId) -> (author, pointer, version, parentId, createdAt, updatedAt)
Rules:
- seedId must exist

## Events

### SeedCreated(seedId, author, pointer, parentId, timestamp)
### SeedUpdated(seedId, author, pointer, version, timestamp)

## Errors
- SeedNotFound(seedId)
- NotAuthor()
- EmptyPointer()
- InvalidParent(parentId)