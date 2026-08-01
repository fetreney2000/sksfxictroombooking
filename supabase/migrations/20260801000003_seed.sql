-- Sistem Tempahan Bilik ICT
-- Migration 00003: Seed data (12 time slots + sample teachers)
-- Idempotent: safe to run multiple times.

insert into public.time_slots (start_time, end_time, sort_order)
select v.start_time, v.end_time, v.sort_order
from (values
  ('07:20:00'::time, '07:50:00'::time, 1),
  ('07:50:00'::time, '08:20:00'::time, 2),
  ('08:20:00'::time, '08:50:00'::time, 3),
  ('08:50:00'::time, '09:20:00'::time, 4),
  ('09:20:00'::time, '09:50:00'::time, 5),
  ('09:50:00'::time, '10:20:00'::time, 6),
  ('10:20:00'::time, '10:40:00'::time, 7),
  ('10:40:00'::time, '11:10:00'::time, 8),
  ('11:10:00'::time, '11:40:00'::time, 9),
  ('11:40:00'::time, '12:10:00'::time, 10),
  ('12:10:00'::time, '12:40:00'::time, 11),
  ('12:40:00'::time, '13:10:00'::time, 12)
) as v(start_time, end_time, sort_order)
where not exists (select 1 from public.time_slots);

insert into public.teachers (full_name)
select v.full_name
from (values
  ('Cikgu Siti Aminah'),
  ('Cikgu Ahmad Faizal'),
  ('Cikgu Nurul Huda'),
  ('Cikgu Mohd Ridzuan'),
  ('Puan Malini Raman'),
  ('En. Kelvin Tan')
) as v(full_name)
where not exists (select 1 from public.teachers);

-- Refresh the PostgREST schema cache so newly created tables are queryable immediately.
select pg_notify('pgrst', 'reload schema');

