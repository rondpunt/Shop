create table public.spot_reports (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null,
  status text not null check (status in ('free','busy','full')),
  note text,
  lat double precision,
  lng double precision,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index spot_reports_spot_recent_idx
  on public.spot_reports (spot_id, created_at desc);

alter table public.spot_reports enable row level security;

create policy "Spot reports: public read"
  on public.spot_reports
  for select
  to anon, authenticated
  using (true);

create policy "Spot reports: insert own"
  on public.spot_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Spot reports: update own"
  on public.spot_reports
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Spot reports: delete own"
  on public.spot_reports
  for delete
  to authenticated
  using (auth.uid() = user_id);