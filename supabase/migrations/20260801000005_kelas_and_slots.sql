-- Sistem Tempahan Bilik ICT
-- Migration 00005: Kelas (classes) management + time slot create/delete

-- ---------------------------------------------------------------------------
-- kelas: admin-managed list of classes shown in the public booking form
-- ---------------------------------------------------------------------------
create table if not exists public.kelas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.kelas enable row level security;

-- public read (needed for the booking combobox)
drop policy if exists "kelas_select_public" on public.kelas;
create policy "kelas_select_public" on public.kelas
  for select using (true);

drop policy if exists "kelas_insert_admin" on public.kelas;
create policy "kelas_insert_admin" on public.kelas
  for insert with check (public.is_admin());

drop policy if exists "kelas_update_admin" on public.kelas;
create policy "kelas_update_admin" on public.kelas
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "kelas_delete_admin" on public.kelas;
create policy "kelas_delete_admin" on public.kelas
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin: kelas
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_kelas(p_token uuid, p_kelas_id uuid, p_name text)
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

  if p_kelas_id is null then
    insert into public.kelas (name) values (trim(p_name));
  else
    update public.kelas set name = trim(p_name) where id = p_kelas_id;
  end if;
end;
$$;

create or replace function public.admin_set_kelas_active(p_token uuid, p_kelas_id uuid, p_is_active boolean)
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
  update public.kelas set is_active = p_is_active where id = p_kelas_id;
end;
$$;

create or replace function public.admin_delete_kelas(p_token uuid, p_kelas_id uuid)
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
  delete from public.kelas where id = p_kelas_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: time slots (create + delete)
-- ---------------------------------------------------------------------------

-- Create a new slot at the end of the list.
create or replace function public.admin_create_time_slot(p_token uuid, p_start_time time, p_end_time time)
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

  insert into public.time_slots (start_time, end_time, sort_order)
  values (
    p_start_time,
    p_end_time,
    (select coalesce(max(sort_order), 0) + 1 from public.time_slots)
  );
end;
$$;

-- Delete a slot. Fails with a foreign key violation if bookings reference it.
create or replace function public.admin_delete_time_slot(p_token uuid, p_slot_id uuid)
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
  delete from public.time_slots where id = p_slot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (idempotent)
-- ---------------------------------------------------------------------------
grant select on table public.kelas to anon, authenticated;
grant insert, update, delete on table public.kelas to authenticated;
grant all on table public.kelas to service_role;

grant execute on function public.admin_save_kelas(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_set_kelas_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_kelas(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_create_time_slot(uuid, time, time) to anon, authenticated;
grant execute on function public.admin_delete_time_slot(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: sample classes
-- ---------------------------------------------------------------------------
insert into public.kelas (name)
select v.name
from (values
  ('1 Amanah'), ('1 Bestari'), ('2 Amanah'), ('2 Bestari'),
  ('3 Amanah'), ('3 Bestari'), ('4 Amanah'), ('4 Bestari'),
  ('5 Amanah'), ('5 Bestari'), ('6 Amanah'), ('6 Bestari')
) as v(name)
where not exists (select 1 from public.kelas);

-- Refresh the PostgREST schema cache.
select pg_notify('pgrst', 'reload schema');
