# Guava Nexus Roadmap

> **Guava Nexus** is a publishing primitive for provenance, authorship, and narrative lineage.  
> This roadmap prioritizes clarity, finishability, and epistemic integrity over scale or hype.

This document defines **what to build, in what order, and—just as importantly—what not to build**.

---

## Phase 0 — Foundations (COMPLETE)

**Goal**  
Prove that the core idea of Guava Nexus is coherent, grounded, and usable.

**Status:** ✅ Done

### Completed
- Conceptual clarity:
  - Guava Nexus as a *publishing primitive*, not a platform
  - Provenance over permission
  - Versions as narrative episodes, not deprecated states
- On-chain registry:
  - `SeedRegistry.sol`
  - Authorship, versioning, lineage
  - Local tests passing (Foundry)
- Clear scope definition:
  - `STATUS.md`
  - `SPEC.md`
  - `NON_GOALS.md`
- Frontend scaffold:
  - Next.js app (`apps/web`)
  - Write → Publish → Receipt flow
  - Calm, archival UX
  - Mocked persistence (no backend yet)

**Definition of done**  
> The system can be explained and demonstrated without hand-waving.

---

## Phase 1 — Provenance MVP (CORE MVP)

**This is the MVP intended to be finished and shipped.**

**Goal**  
Allow a creator to anchor the provenance of an idea and receive a real, persistent receipt.

### Tasks
- Off-chain persistence
  - Create Supabase project
  - Implement `seed_versions` table (UUID pointer)
  - Insert Seed content on publish
- Environment setup
  - `.env.local` for Supabase keys
  - Supabase client wrapper
- Receipt realism
  - Receipt displays:
    - pointer (UUID)
    - version
    - timestamp
    - optional parent seed ID
- Minimal error handling
  - Empty content
  - Failed publish
  - Network failure

**Definition of done**  
> A user can publish a Seed and receive a **real provenance receipt**, even without blockchain interaction.

**Explicit non-goals**
- No wallets
- No tokens
- No AI
- No collaboration
- No Obsidian plugin yet

---

## Phase 2 — Trustless Anchor (Blockchain Integration)

**Goal**  
Make provenance **trustless**, not merely persistent.

### Tasks
- Wallet integration
  - wagmi + viem
  - Wallet connect
  - Read author address
- Chain write
  - Call `createSeed(pointer, parentId)`
  - Retrieve on-chain `seedId`
- Dual receipt
  - Display both:
    - on-chain `seedId`
    - off-chain pointer (UUID)
- Public verification
  - Read-only receipt view (no wallet required)

**Definition of done**  
> A third party can independently verify authorship and time on-chain.

**Explicit non-goals**
- No marketplaces
- No NFTs as collectibles
- No monetization
- No governance

---

## Phase 3 — Obsidian Bridge (First Adoption Wedge)

**Goal**  
Allow Obsidian users to stamp notes with provenance.

### Tasks
- Minimal Obsidian plugin
  - Command: “Stamp note with Guava Nexus”
  - Extract note content
  - Send to Guava Nexus API
- Write-back to note
  - YAML frontmatter or footer:
    - pointer
    - seedId
    - timestamp
    - version
- Receipt linking
  - Link to public verification page

**Definition of done**  
> An Obsidian user can anchor a note’s provenance without leaving their workflow.

**Explicit non-goals**
- No vault syncing
- No collaboration
- No AI
- No reputation systems

---

## Phase 4 — Lineage Exploration (Optional)

**Goal**  
Make narrative lineage visible and explorable.

### Tasks
- Parent / child Seed views
- Version history browsing
- Simple lineage graph

**Definition of done**  
> Users can see how ideas evolve across time and derivation.

---

## Phase 5 — Intelligence Layer (Very Later)

**Goal**  
Assist humans in navigating collective thought without replacing authorship.

### Tasks (MVP-level only)
- Embeddings + semantic search
- Suggested parent Seeds
- Abstract / summary generation

**Explicit rule**
- No model training
- No autonomous agents
- No learning without consent

---

## Governing Principle

> **If a feature does not strengthen provenance, authorship, or lineage, it does not belong in Guava Nexus.**

This rule overrides all others.

---

## How to Use This Roadmap

- Work on **one phase at a time**
- Each phase must be independently shippable
- Stopping early is allowed and encouraged
- Complexity is a liability, not a signal of progress