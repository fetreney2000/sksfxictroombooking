-- Pembetulan: pgcrypto dalam skema 'extensions'
-- Jalankan sekali dalam SQL Editor untuk membaiki fungsi log masuk/pentadbir.
-- (Sama ada fail ini ATAU jalankan semula supabase/migrations/20260801000004_custom_auth.sql)

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

  if v_user.password_hash = extensions.crypt(p_password, v_user.password_hash) then
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
  values (lower(trim(p_username)), extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_full_name, 'admin')
  returning id into v_id;

  return v_id;
end;
$$;

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
  values (lower(trim(p_username)), extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_full_name, p_role)
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
      password_hash = case when p_new_password is not null then extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)) else password_hash end
  where id = p_user_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');
