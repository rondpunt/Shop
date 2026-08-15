-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: select own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Profiles: insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- cars
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plate text,
  color_hex text not null default '#2E7D32',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cars_user_id_idx on public.cars(user_id);

alter table public.cars enable row level security;

create policy "Cars: select own" on public.cars
  for select to authenticated using (auth.uid() = user_id);
create policy "Cars: insert own" on public.cars
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Cars: update own" on public.cars
  for update to authenticated using (auth.uid() = user_id);
create policy "Cars: delete own" on public.cars
  for delete to authenticated using (auth.uid() = user_id);

-- sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid references public.cars(id) on delete set null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  lat double precision,
  lng double precision,
  address text,
  note text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index sessions_user_id_started_at_idx on public.sessions(user_id, started_at desc);
create index sessions_user_active_idx on public.sessions(user_id) where ended_at is null;

alter table public.sessions enable row level security;

create policy "Sessions: select own" on public.sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "Sessions: insert own" on public.sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Sessions: update own" on public.sessions
  for update to authenticated using (auth.uid() = user_id);
create policy "Sessions: delete own" on public.sessions
  for delete to authenticated using (auth.uid() = user_id);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger cars_updated_at before update on public.cars
  for each row execute function public.set_updated_at();

-- handle_new_user trigger: auto-create profile from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email, provider)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Ensure only one default car per user
create or replace function public.enforce_single_default_car()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.cars
      set is_default = false
      where user_id = new.user_id
        and id <> new.id
        and is_default = true;
  end if;
  return new;
end;
$$;

create trigger cars_single_default
after insert or update of is_default on public.cars
for each row when (new.is_default) execute function public.enforce_single_default_car();

-- Storage bucket for session photos (private, user-scoped folders)
insert into storage.buckets (id, name, public) values ('session-photos', 'session-photos', false)
on conflict (id) do nothing;

create policy "Session photos: select own"
on storage.objects for select to authenticated
using (bucket_id = 'session-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Session photos: insert own"
on storage.objects for insert to authenticated
with check (bucket_id = 'session-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Session photos: update own"
on storage.objects for update to authenticated
using (bucket_id = 'session-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Session photos: delete own"
on storage.objects for delete to authenticated
using (bucket_id = 'session-photos' and auth.uid()::text = (storage.foldername(name))[1]);