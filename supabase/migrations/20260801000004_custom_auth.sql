-- Sistem Tempahan Makmal Komputer
-- Migration 00004: Custom username/password auth
--
-- Replaces Supabase Auth email/password with an application-managed
-- `users` table. Passwords are hashed with bcrypt using the `pgcrypto`
-- extension (`crypt(password, gen_salt('bf', 10))`).
--
-- Access model:
--   * No RLS policies on `users` / `sessions` — hashes must never be
--     readable directly. ALL access goes through security-definer RPCs.
--   * `login(username, password)` verifies the bcrypt hash and issues a
--     random session token stored in `sessions`.
--   * Admin operations validate the token via `token_user()` and require
--     the caller to have role 'admin'.
--
-- Bootstrap: with an empty `users` table, call
--   select public.bootstrap_admin('admin', 'PASSWORD', 'Pentadbir Sistem');
-- (also available as a first-run form on the login page).

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-zA-Z0-9._-]{3,30}$'),
  password_hash text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'supervisor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_users_lower_username on public.users(lower(username));

alter table public.users enable row level security;
alter table public.sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Session helpers
-- ---------------------------------------------------------------------------

-- Resolve a valid (non-expired) session token to its user. Null if invalid.
create or replace function public.token_user(p_token uuid)
returns public.users
language sql
security definer
set search_path = public
stable
as $$
  select u.*
  from public.users u
  join public.sessions s on s.user_id = u.id
  where s.token = p_token and s.expires_at > now();
$$;

-- Return the currently authenticated user for a token (client session check).
create or replace function public.me(p_token uuid)
returns table (id uuid, username text, full_name text, role text, is_active boolean)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.username, u.full_name, u.role, u.is_active
  from public.token_user(p_token) u;
$$;

-- Does the system have any users yet? (drives the first-run setup UI)
create or replace function public.has_users()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.users);
$$;

-- ---------------------------------------------------------------------------
-- Authentication
-- ---------------------------------------------------------------------------

-- Verify credentials (bcrypt) and create a session token.
-- Returns { token, user } or null on bad username/password/inactive account.
create or replace function public.login(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_token uuid;
begin
  select * into v_user
  from public.users
  where lower(username) = lower(trim(p_username));

  if v_user.id is null or v_user.is_active = false then
    return null;
  end if;

  if v_user.password_hash = crypt(p_password, v_user.password_hash) then
    insert into public.sessions (user_id)
    values (v_user.id)
    returning token into v_token;

    return json_build_object(
      'token', v_token,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name,
        'role', v_user.role
      )
    );
  end if;

  return null;
end;
$$;

-- Invalidate a session token.
create or replace function public.logout(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.sessions where token = p_token;
$$;

-- Create the very first admin account. Only works while the table is empty.
create or replace function public.bootstrap_admin(p_username text, p_password text, p_full_name text default 'Pentadbir')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.users) then
    raise exception 'Pengguna pertama telah wujud.';
  end if;
  if length(p_password) < 6 then
    raise exception 'Kata laluan terlalu pendek (sekurang-kurangnya 6 aksara).';
  end if;
  if not (p_username ~ '^[a-zA-Z0-9._-]{3,30}$') then
    raise exception 'Nama pengguna tidak sah (3-30 aksara; huruf, nombor, titik, sempang, garis bawah).';
  end if;

  insert into public.users (username, password_hash, full_name, role)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf', 10)), p_full_name, 'admin')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: user management
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_user(p_token uuid, p_username text, p_password text, p_full_name text, p_role text default 'supervisor')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
  v_id uuid;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  if length(p_password) < 6 then
    raise exception 'Kata laluan terlalu pendek (sekurang-kurangnya 6 aksara).';
  end if;
  if not (p_username ~ '^[a-zA-Z0-9._-]{3,30}$') then
    raise exception 'Nama pengguna tidak sah (3-30 aksara; huruf, nombor, titik, sempang, garis bawah).';
  end if;
  if p_role not in ('admin', 'supervisor') then
    raise exception 'Peranan tidak sah.';
  end if;

  insert into public.users (username, password_hash, full_name, role)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf', 10)), p_full_name, p_role)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_update_user(
  p_token uuid,
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_is_active boolean,
  p_new_password text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  if p_role not in ('admin', 'supervisor') then
    raise exception 'Peranan tidak sah.';
  end if;
  if p_new_password is not null and length(p_new_password) < 6 then
    raise exception 'Kata laluan terlalu pendek (sekurang-kurangnya 6 aksara).';
  end if;

  update public.users
  set full_name = p_full_name,
      role = p_role,
      is_active = p_is_active,
      password_hash = case when p_new_password is not null then crypt(p_new_password, gen_salt('bf', 10)) else password_hash end
  where id = p_user_id;
end;
$$;

-- List users without exposing password hashes.
create or replace function public.admin_list_users(p_token uuid)
returns table (id uuid, username text, full_name text, role text, is_active boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  return query
    select u.id, u.username, u.full_name, u.role, u.is_active, u.created_at
    from public.users u
    order by u.created_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: teachers
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_teacher(p_token uuid, p_teacher_id uuid, p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  if p_teacher_id is null then
    insert into public.teachers (full_name) values (trim(p_full_name));
  else
    update public.teachers set full_name = trim(p_full_name) where id = p_teacher_id;
  end if;
end;
$$;

create or replace function public.admin_set_teacher_active(p_token uuid, p_teacher_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  update public.teachers set is_active = p_is_active where id = p_teacher_id;
end;
$$;

create or replace function public.admin_delete_teacher(p_token uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  delete from public.teachers where id = p_teacher_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: time slots
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_time_slot(
  p_token uuid,
  p_slot_id uuid,
  p_start_time time,
  p_end_time time,
  p_sort_order int,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  update public.time_slots
  set start_time = p_start_time,
      end_time = p_end_time,
      sort_order = p_sort_order,
      is_active = p_is_active
  where id = p_slot_id;
end;
$$;

create or replace function public.admin_toggle_time_slot(p_token uuid, p_slot_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  update public.time_slots set is_active = p_is_active where id = p_slot_id;
end;
$$;

create or replace function public.admin_reorder_time_slot(p_token uuid, p_slot_id uuid, p_sort_order int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  update public.time_slots set sort_order = p_sort_order where id = p_slot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: blocked dates
-- ---------------------------------------------------------------------------

create or replace function public.admin_add_blocked_date(p_token uuid, p_blocked_date date, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  insert into public.blocked_dates (blocked_date, reason)
  values (p_blocked_date, p_reason);
end;
$$;

create or replace function public.admin_remove_blocked_date(p_token uuid, p_blocked_date_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  delete from public.blocked_dates where id = p_blocked_date_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: bookings
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_booking(
  p_token uuid,
  p_booking_id uuid,
  p_booking_date date,
  p_time_slot_id uuid,
  p_teacher_id uuid,
  p_class_name text,
  p_purpose text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  update public.bookings
  set booking_date = p_booking_date,
      time_slot_id = p_time_slot_id,
      teacher_id = p_teacher_id,
      class_name = p_class_name,
      purpose = p_purpose
  where id = p_booking_id;
end;
$$;

create or replace function public.admin_delete_booking(p_token uuid, p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;
  delete from public.bookings where id = p_booking_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (idempotent)
-- ---------------------------------------------------------------------------
grant execute on function public.token_user(uuid) to anon, authenticated;
grant execute on function public.me(uuid) to anon, authenticated;
grant execute on function public.has_users() to anon, authenticated;
grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.logout(uuid) to anon, authenticated;
grant execute on function public.bootstrap_admin(text, text, text) to anon, authenticated;
grant execute on function public.admin_create_user(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_update_user(uuid, uuid, text, text, boolean, text) to anon, authenticated;
grant execute on function public.admin_list_users(uuid) to anon, authenticated;
grant execute on function public.admin_save_teacher(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_set_teacher_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_teacher(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_save_time_slot(uuid, uuid, time, time, int, boolean) to anon, authenticated;
grant execute on function public.admin_toggle_time_slot(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_reorder_time_slot(uuid, uuid, int) to anon, authenticated;
grant execute on function public.admin_add_blocked_date(uuid, date, text) to anon, authenticated;
grant execute on function public.admin_remove_blocked_date(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_update_booking(uuid, uuid, date, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.admin_delete_booking(uuid, uuid) to anon, authenticated;

-- Refresh the PostgREST schema cache.
select pg_notify('pgrst', 'reload schema');
