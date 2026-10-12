-- Run once in your Supabase Free project's SQL editor.
create table if not exists public.study_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb check (octet_length(payload::text) <= 500000),
 updated_at timestamptz not null default now()
);
alter table public.study_profiles enable row level security;
revoke all on public.study_profiles from anon;
grant select, insert, update on public.study_profiles to authenticated;
create policy "Read own learning data" on public.study_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own learning data" on public.study_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own learning data" on public.study_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
