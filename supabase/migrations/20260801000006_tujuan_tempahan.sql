-- Sistem Tempahan Bilik ICT
-- Migration 00006: Tujuan Tempahan (purposes) management

-- ---------------------------------------------------------------------------
-- tujuan_tempahan: admin-managed list of purposes shown in the public form
-- ---------------------------------------------------------------------------
create table if not exists public.tujuan_tempahan (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tujuan_tempahan enable row level security;

-- public read (needed for the booking combobox)
drop policy if exists "tujuan_tempahan_select_public" on public.tujuan_tempahan;
create policy "tujuan_tempahan_select_public" on public.tujuan_tempahan
  for select using (true);

drop policy if exists "tujuan_tempahan_insert_admin" on public.tujuan_tempahan;
create policy "tujuan_tempahan_insert_admin" on public.tujuan_tempahan
  for insert with check (public.is_admin());

drop policy if exists "tujuan_tempahan_update_admin" on public.tujuan_tempahan;
create policy "tujuan_tempahan_update_admin" on public.tujuan_tempahan
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tujuan_tempahan_delete_admin" on public.tujuan_tempahan;
create policy "tujuan_tempahan_delete_admin" on public.tujuan_tempahan
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin: tujuan tempahan
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_tujuan_tempahan(p_token uuid, p_tujuan_id uuid, p_name text)
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

  if p_tujuan_id is null then
    insert into public.tujuan_tempahan (name) values (trim(p_name));
  else
    update public.tujuan_tempahan set name = trim(p_name) where id = p_tujuan_id;
  end if;
end;
$$;

create or replace function public.admin_set_tujuan_tempahan_active(p_token uuid, p_tujuan_id uuid, p_is_active boolean)
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
  update public.tujuan_tempahan set is_active = p_is_active where id = p_tujuan_id;
end;
$$;

create or replace function public.admin_delete_tujuan_tempahan(p_token uuid, p_tujuan_id uuid)
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
  delete from public.tujuan_tempahan where id = p_tujuan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (idempotent)
-- ---------------------------------------------------------------------------
grant select on table public.tujuan_tempahan to anon, authenticated;
grant insert, update, delete on table public.tujuan_tempahan to authenticated;
grant all on table public.tujuan_tempahan to service_role;

grant execute on function public.admin_save_tujuan_tempahan(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_set_tujuan_tempahan_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_tujuan_tempahan(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: sample purposes
-- ---------------------------------------------------------------------------
insert into public.tujuan_tempahan (name)
select v.name
from (values
  ('Kelas PdPc'),
  ('Kelas Tambahan'),
  ('Kursus / Seminar'),
  ('Ujian Amali'),
  ('Peperiksaan Online'),
  ('Bengkel ICT'),
  ('Latihan Guru'),
  ('Program Sekolah'),
  ('Mesyuarat / Taklimat'),
  ('Lain-lain')
) as v(name)
where not exists (select 1 from public.tujuan_tempahan);

-- Refresh the PostgREST schema cache.
select pg_notify('pgrst', 'reload schema');
