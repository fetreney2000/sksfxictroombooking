-- Sistem Tempahan Bilik ICT
-- Migration 00007: Bulk import teachers (client-side Excel import)

-- Bulk insert teacher names supplied by the admin (parsed from an Excel file
-- entirely in the browser). Empty names are skipped, existing names
-- (case-insensitive) are ignored. Returns how many new teachers were added.
create or replace function public.admin_import_teachers(p_token uuid, p_names text[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.users;
  v_name text;
  v_added int := 0;
begin
  v_admin := public.token_user(p_token);
  if v_admin is null or v_admin.role <> 'admin' then
    raise exception 'Tidak dibenarkan.';
  end if;

  foreach v_name in array p_names loop
    v_name := trim(v_name);
    if v_name = '' then
      continue;
    end if;
    if not exists (select 1 from public.teachers where lower(full_name) = lower(v_name)) then
      insert into public.teachers (full_name) values (v_name);
      v_added := v_added + 1;
    end if;
  end loop;

  return v_added;
end;
$$;

grant execute on function public.admin_import_teachers(uuid, text[]) to anon, authenticated;

-- Refresh the PostgREST schema cache.
select pg_notify('pgrst', 'reload schema');
