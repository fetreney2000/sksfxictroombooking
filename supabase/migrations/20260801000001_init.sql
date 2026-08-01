-- Sistem Tempahan Makmal Komputer
-- Migration 00001: Initial schema

-- profiles: extends auth.users with a role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'supervisor')),
  created_at timestamptz not null default now()
);

-- teachers: admin-managed list shown in the public booking dropdown
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- time_slots: the fixed slots, editable by admin
create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  start_time time not null,
  end_time time not null,
  sort_order int not null,
  is_active boolean not null default true
);

-- blocked_dates: dates admin has closed off (holidays etc)
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

-- bookings: the core table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  time_slot_id uuid not null references public.time_slots(id),
  teacher_id uuid not null references public.teachers(id),
  class_name text not null,
  purpose text not null,
  created_at timestamptz not null default now(),
  -- prevents double-booking the same date + slot
  constraint unique_date_slot unique (booking_date, time_slot_id)
);

create index if not exists idx_bookings_date on public.bookings(booking_date);
