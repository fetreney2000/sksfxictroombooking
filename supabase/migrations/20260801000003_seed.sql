-- Sistem Tempahan Makmal Komputer
-- Migration 00003: Seed data (12 time slots + sample teachers)

insert into public.time_slots (start_time, end_time, sort_order) values
  ('07:20:00', '07:50:00', 1),
  ('07:50:00', '08:20:00', 2),
  ('08:20:00', '08:50:00', 3),
  ('08:50:00', '09:20:00', 4),
  ('09:20:00', '09:50:00', 5),
  ('09:50:00', '10:20:00', 6),
  ('10:20:00', '10:40:00', 7),
  ('10:40:00', '11:10:00', 8),
  ('11:10:00', '11:40:00', 9),
  ('11:40:00', '12:10:00', 10),
  ('12:10:00', '12:40:00', 11),
  ('12:40:00', '13:10:00', 12);

insert into public.teachers (full_name) values
  ('Cikgu Siti Aminah'),
  ('Cikgu Ahmad Faizal'),
  ('Cikgu Nurul Huda'),
  ('Cikgu Mohd Ridzuan'),
  ('Puan Malini Raman'),
  ('En. Kelvin Tan')
on conflict do nothing;
