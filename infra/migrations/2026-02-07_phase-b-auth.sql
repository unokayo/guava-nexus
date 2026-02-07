-- Phase B: Authorship + Write Authority

-- 1) Add narrative_branch column if it doesn't exist (was added in Phase A)
alter table public.seeds
  add column if not exists narrative_branch text;

-- 2) Store nonces for replay protection
create table if not exists public.auth_nonces (
  address text primary key,
  nonce text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Index for cleanup queries
create index if not exists idx_auth_nonces_expires_at 
  on public.auth_nonces(expires_at);

-- 3) Add cleanup function for expired nonces (run periodically)
-- Can be triggered manually or via Supabase cron extension
create or replace function cleanup_expired_nonces()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.auth_nonces
  where expires_at < now();
end;
$$;
