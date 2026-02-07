-- Phase B Step 2: HashName ownership via wallet signatures

-- Add owner_address column to hashnames table
alter table public.hashnames
  add column if not exists owner_address text;

-- Index for owner lookups
create index if not exists idx_hashnames_owner_address 
  on public.hashnames(owner_address) 
  where owner_address is not null;

-- Note: owner_address is nullable to allow unclaimed HashNames
-- When null, the HashName is unclaimed and can be claimed by any wallet
-- When set, only that wallet address (lowercase) can resolve hashroot requests
