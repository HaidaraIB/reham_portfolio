-- Run in the Supabase SQL editor. Then create your user in Authentication > Users.
-- Run the administrator INSERT at the bottom with that user's UUID.
create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.portfolio_admins enable row level security;
revoke all on public.portfolio_admins from anon, authenticated;
grant select on public.portfolio_admins to authenticated;
create policy "Admins can see their own membership" on public.portfolio_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.portfolio (
  id integer primary key check (id = 1),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.portfolio enable row level security;
revoke all on public.portfolio from anon, authenticated;
grant select on public.portfolio to anon, authenticated;
grant insert, update on public.portfolio to authenticated;
create policy "Public can read portfolio" on public.portfolio for select using (true);
create policy "Allowlisted admins can insert" on public.portfolio for insert to authenticated
  with check (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())));
create policy "Allowlisted admins can update" on public.portfolio for update to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())));

-- Replace the UUID and uncomment before running this statement separately:
-- insert into public.portfolio_admins (user_id) values ('YOUR-USER-UUID');
