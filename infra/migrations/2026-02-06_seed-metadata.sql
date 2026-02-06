-- Seed metadata (identity layer) - Phase A

-- 1) Seeds table: add invariant metadata columns (nullable for backwards compatibility)
alter table public.seeds
  add column if not exists title text,
  add column if not exists narrative_frame text,
  add column if not exists root_category text,
  add column if not exists hashroot text;

-- 2) Ensure author_address can be null for now (since app currently inserts null)
alter table public.seeds
  alter column author_address drop not null;

-- 3) Parent FK for lineage integrity (optional)
-- NOTE: this will fail if you already have rows with invalid parent_seed_id values.
-- If it fails, we will clean them up before re-adding the constraint.
alter table public.seeds
  add constraint if not exists fk_parent_seed
  foreign key (parent_seed_id)
  references public.seeds(seed_id)
  on delete restrict;

-- 4) Seed versions: rename content -> content_body
alter table public.seed_versions
  rename column content to content_body;

-- 5) Add description field
alter table public.seed_versions
  add column if not exists description text;

-- Optional cleanup if FK fails (DO NOT RUN UNLESS FK ERRORS)
-- update public.seeds s
-- set parent_seed_id = null
-- where parent_seed_id is not null
--   and not exists (
--     select 1 from public.seeds p where p.seed_id = s.parent_seed_id
--   );
