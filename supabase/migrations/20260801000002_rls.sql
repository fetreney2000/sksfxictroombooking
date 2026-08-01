-- Sistem Tempahan Bilik ICT
-- Migration 00002: Row Level Security policies + auth helper

-- Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.time_slots enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;

-- Helper: is the current authenticated user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- users can read their own row; admins can read/update all
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- teachers: public read; admin write
-- ---------------------------------------------------------------------------
drop policy if exists "teachers_select_public" on public.teachers;
create policy "teachers_select_public" on public.teachers
  for select using (true);

drop policy if exists "teachers_insert_admin" on public.teachers;
create policy "teachers_insert_admin" on public.teachers
  for insert with check (public.is_admin());

drop policy if exists "teachers_update_admin" on public.teachers;
create policy "teachers_update_admin" on public.teachers
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "teachers_delete_admin" on public.teachers;
create policy "teachers_delete_admin" on public.teachers
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- time_slots: public read; admin write
-- ---------------------------------------------------------------------------
drop policy if exists "time_slots_select_public" on public.time_slots;
create policy "time_slots_select_public" on public.time_slots
  for select using (true);

drop policy if exists "time_slots_insert_admin" on public.time_slots;
create policy "time_slots_insert_admin" on public.time_slots
  for insert with check (public.is_admin());

drop policy if exists "time_slots_update_admin" on public.time_slots;
create policy "time_slots_update_admin" on public.time_slots
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "time_slots_delete_admin" on public.time_slots;
create policy "time_slots_delete_admin" on public.time_slots
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- blocked_dates: public read; admin write
-- ---------------------------------------------------------------------------
drop policy if exists "blocked_dates_select_public" on public.blocked_dates;
create policy "blocked_dates_select_public" on public.blocked_dates
  for select using (true);

drop policy if exists "blocked_dates_insert_admin" on public.blocked_dates;
create policy "blocked_dates_insert_admin" on public.blocked_dates
  for insert with check (public.is_admin());

drop policy if exists "blocked_dates_update_admin" on public.blocked_dates;
create policy "blocked_dates_update_admin" on public.blocked_dates
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blocked_dates_delete_admin" on public.blocked_dates;
create policy "blocked_dates_delete_admin" on public.blocked_dates
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- bookings
-- public select + insert (booking submission, no auth required);
-- updates/deletes restricted to admins
-- ---------------------------------------------------------------------------
drop policy if exists "bookings_select_public" on public.bookings;
create policy "bookings_select_public" on public.bookings
  for select using (true);

drop policy if exists "bookings_insert_public" on public.bookings;
create policy "bookings_insert_public" on public.bookings
  for insert with check (true);

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin" on public.bookings
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a user is created in Supabase Auth
-- (via the dashboard or admin API). The very first user becomes an admin;
-- subsequent users default to supervisor. Set the role afterwards from the
-- "Urus Pengguna" screen or with a direct UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text;
begin
  if not exists (select 1 from public.profiles) then
    new_role := 'admin';
  else
    new_role := 'supervisor';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants (idempotent). Supabase sets default privileges that already cover
-- this; explicit grants keep the migration self-contained.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on table public.profiles to authenticated;
grant update on table public.profiles to authenticated;

grant select on table public.teachers to anon, authenticated;
grant insert, update, delete on table public.teachers to authenticated;

grant select on table public.time_slots to anon, authenticated;
grant insert, update, delete on table public.time_slots to authenticated;

grant select on table public.blocked_dates to anon, authenticated;
grant insert, update, delete on table public.blocked_dates to authenticated;

grant select, insert on table public.bookings to anon, authenticated;
grant update, delete on table public.bookings to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.teachers to service_role;
grant all on table public.time_slots to service_role;
grant all on table public.blocked_dates to service_role;
grant all on table public.bookings to service_role;

