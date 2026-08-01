# PROMPT: Build "Sistem Tempahan Makmal Komputer" (School IT Lab Booking System)

You are an autonomous coding agent. Build a **complete, working, production-ready** web application by following this specification exactly. Do not skip steps. Do not invent requirements that contradict this document. If something is ambiguous, follow the "Defaults & Assumptions" section instead of stopping to ask questions.

Work through the **Build Phases** in order (Phase 0 → Phase 9). Finish and self-test each phase before moving to the next. At the end, run through the **Acceptance Checklist** and fix anything that fails before declaring the project done.

---

## 1. Project Summary

A school needs a booking system for its IT Lab ("Makmal Komputer"). Teachers book time slots through a **public form (no login required)**. Supervisors and Admins log in to view bookings, dashboards, and reports. Admins additionally manage teacher records and lab settings.

The entire teacher-facing (public) UI must be in **Bahasa Melayu Malaysia**. All dates/times must be computed, stored, and displayed using the **Asia/Kuala_Lumpur (UTC+8)** timezone, regardless of the server's or visitor's local timezone.

The app must be a installable **PWA**, deployed on **Vercel's free Hobby tier**, backed by **Supabase's free tier**.

---

## 2. Tech Stack (mandatory, do not substitute)

| Layer | Choice |
|---|---|
| Build tool | Vite (React + TypeScript template) |
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Routing | React Router v6 |
| Data fetching / caching | TanStack Query v5 |
| Global state | Zustand |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Data table | TanStack Table v8 |
| Backend / DB / Auth | Supabase (free tier) |
| Hosting | Vercel (Hobby tier) |
| Date/time library | `date-fns` + `date-fns-tz` (or `luxon`) — pick one and use it consistently everywhere |
| PWA plugin | `vite-plugin-pwa` |

Use TypeScript for the entire codebase, including Supabase generated types.

---

## 3. Defaults & Assumptions (use these instead of asking questions)

- School operating days for bookings: **Monday–Friday** only. Saturday/Sunday dates are shown but disabled (not selectable) in the calendar.
- Bookings can only be made for **today or future dates**. Past dates are disabled.
- A teacher may book **one or more slots on the same date in a single submission is NOT required** — one submission = one date + one slot. If a teacher wants multiple slots, they submit the form again.
- Double-booking the same date+slot is **not allowed**. Enforce this both in the UI (grey out/disable already-booked slots) and in the database (unique constraint + a check on insert).
- Supervisor and Admin accounts are created only by an Admin (or manually via Supabase dashboard for the first bootstrap admin) — there is **no public sign-up**.
- School public holidays are **out of scope for v1** unless Admin manually blocks a date (see Housekeeping, §7.4). Build the schema so holiday-blocking is possible, but a full holiday calendar importer is not required.
- Timezone: assume the school and all users are in Malaysia. Store timestamps in UTC in the DB (Supabase default `timestamptz`), but **always convert to/from `Asia/Kuala_Lumpur`** at the UI boundary.

---

## 4. Roles & Access

| Role | Login required? | Can do |
|---|---|---|
| **Teacher (public)** | No | View calendar, view open/booked slots for a date, submit a booking, clear form |
| **Supervisor** | Yes (Supabase Auth) | Everything a teacher can do (view-only, no booking needed) + view all bookings (list/table), view dashboard (stats/charts), view/export reports |
| **Admin** | Yes (Supabase Auth) | Everything a Supervisor can do + manage teacher list (CRUD), manage/modify time slots, block/unblock dates (housekeeping), manage supervisor/admin user accounts, delete/edit any booking |

Auth: use **Supabase Auth (email + password)**. Store role (`admin` | `supervisor`) in a `profiles` table linked to `auth.users.id`. Protect `/supervisor/*` and `/admin/*` routes with a route guard that checks the logged-in user's role via Supabase session + `profiles` table. Enforce role checks **also** at the database level via Row Level Security (RLS) — never rely on frontend checks alone.

---

## 5. Time Slots (fixed list — implement exactly, but keep editable by Admin per §7.4)

Seed the `time_slots` table with these 12 slots, in this order, each with a `sort_order` integer (1–12):

| # | Start | End |
|---|---|---|
| 1 | 07:20 | 07:50 |
| 2 | 07:50 | 08:20 |
| 3 | 08:20 | 08:50 |
| 4 | 08:50 | 09:20 |
| 5 | 09:20 | 09:50 |
| 6 | 09:50 | 10:20 |
| 7 | 10:20 | 10:40 |
| 8 | 10:40 | 11:10 |
| 9 | 11:10 | 11:40 |
| 10 | 11:40 | 12:10 |
| 11 | 12:10 | 12:40 |
| 12 | 12:40 | 13:10 |

Store times as `time` type (24h, e.g. `07:20:00`) in the DB, and format to 12-hour `hh:mm AM/PM` in the UI.

---

## 6. Public Booking Flow (teacher-facing, Bahasa Melayu UI)

Build this as a **multi-step form on a single public route** (e.g. `/`), with a visible step indicator (Langkah 1 of 4, etc). Use Zustand to hold in-progress form state across steps so nothing is lost when navigating back a step. Use TanStack Query for all Supabase reads/writes (fetching booked slots, submitting booking).

### Step 1 — Pilih Tarikh (Select Date)
- Show a calendar (shadcn/ui `Calendar` component or a custom one).
- Disable: past dates, weekends, and any date an Admin has blocked (see §7.4).
- Highlight today's date (Asia/Kuala_Lumpur "today", not the browser's local today).

### Step 2 — Pilih Slot Masa (Select Time Slot)
- After a date is chosen, fetch all bookings for that date from Supabase.
- Render all 12 slots as selectable cards/buttons, in `sort_order`.
- Already-booked slots are shown disabled/greyed with a label like "Telah Ditempah" (Already Booked), and optionally show which class already has it.
- Teacher clicks an open slot to select it, then proceeds.

### Step 3 — Maklumat Tempahan (Booking Details)
- **Nama Guru (Teacher Name)**: a searchable dropdown/select populated from the `teachers` table (admin-managed list, not free text). Use shadcn/ui `Combobox`/`Select`.
- **Kelas (Class)**: free text input (e.g. "5 Cerdik", "4 Amanah"). Required.
- **Tujuan (Purpose)**: free text textarea (e.g. "Kelas PdPc TMK"). Required.
- Client-side validation (required fields, sensible max lengths) using `react-hook-form` + `zod`, with error messages in Bahasa Melayu.

### Step 4 — Semak & Hantar (Review & Submit)
- Show a read-only summary of: tarikh, slot masa, nama guru, kelas, tujuan.
- Two buttons:
  - **"Hantar Tempahan"** (Submit Booking) — primary button. On click: re-validate the slot is still free (handle race condition — see §9), insert the booking, show a success state/toast with a confirmation summary and a "Tempahan Baharu" button to start over.
  - **"Kosongkan Borang"** (Clear Form) — secondary/ghost button, available at every step — resets all Zustand form state and returns to Step 1. Ask for confirmation via a small dialog before clearing if any field has data.
- Handle submission errors gracefully (e.g. slot got taken by someone else in the meantime → show a friendly Bahasa Melayu error and send them back to Step 2 with the slot list refreshed).

### Sample Bahasa Melayu UI copy (use/adapt these; keep tone formal but friendly)
- Page title: "Sistem Tempahan Makmal Komputer"
- "Pilih Tarikh" / "Pilih Slot Masa" / "Maklumat Tempahan" / "Semak & Hantar"
- "Nama Guru", "Kelas", "Tujuan Tempahan"
- "Hantar Tempahan", "Kosongkan Borang", "Kembali", "Seterusnya"
- "Slot ini telah ditempah" (This slot is already booked)
- "Tempahan berjaya!" (Booking successful!)
- "Tempahan gagal, sila cuba lagi." (Booking failed, please try again)
- "Tiada slot tersedia pada tarikh ini." (No slots available on this date)

---

## 7. Authenticated Areas

### 7.1 Login (`/login`)
- Email + password form (Supabase Auth). On success, redirect based on role: Admin → `/admin`, Supervisor → `/supervisor`.
- This page can be in English or Bahasa Melayu (internal tool) — be consistent, Bahasa Melayu preferred for uniformity.

### 7.2 Supervisor Area (`/supervisor/*`)
- **Semua Tempahan (All Bookings)**: a TanStack Table listing every booking with columns: Tarikh, Slot Masa, Nama Guru, Kelas, Tujuan, Tarikh Dibuat. Support sorting, column filtering, search box, and date-range filter. Paginate.
- **Papan Pemuka (Dashboard)**: summary cards (e.g. total bookings this week/month, busiest day, most active teacher, slot utilization %) plus at least one chart (e.g. bookings per day/week using `recharts`).
- **Laporan (Reports)**: a filterable report view (by date range, by teacher, by class) with an **export to CSV** button (client-side CSV generation is fine; no server needed).

### 7.3 Admin Area (`/admin/*`)
Includes everything in §7.2, plus:
- **Urus Guru (Manage Teachers)**: CRUD screen (list, add, edit, deactivate) for the `teachers` table that powers the public form's teacher dropdown. Use a form + TanStack Table.
- **Urus Slot Masa (Manage Time Slots)**: allow editing start/end time, label, active/inactive toggle, and reordering of the 12 slots. Deactivating a slot should hide it from the public form without deleting historical bookings tied to it.
- **Housekeeping**: 
  - Block/unblock specific dates (e.g. school holidays, exam days) so they cannot be booked — reuse this in Step 1 of the public flow.
  - Ability to edit or delete any existing booking (with a confirmation dialog).
- **Urus Pengguna (Manage Users)**: list existing supervisor/admin accounts and their roles; allow inviting/creating new ones via Supabase Auth admin functions (can be a simple form that calls a Supabase Edge Function, or documented manual step if Edge Functions add too much complexity — see §9 fallback note).

### 7.4 Shared Layout
- Persistent sidebar/topbar nav for authenticated areas showing the current user's name/role and a logout button.
- Route guards: unauthenticated users hitting `/supervisor/*` or `/admin/*` are redirected to `/login`; supervisors hitting `/admin/*` are redirected to `/supervisor` (or shown a "no access" page).

---

## 8. Database Schema (Supabase / PostgreSQL)

Create a SQL migration file with the following (adapt types as needed but keep the intent):

```sql
-- profiles: extends auth.users with a role
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'supervisor')),
  created_at timestamptz not null default now()
);

-- teachers: admin-managed list shown in the public booking dropdown
create table teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- time_slots: the 12 fixed slots, editable by admin
create table time_slots (
  id uuid primary key default gen_random_uuid(),
  start_time time not null,
  end_time time not null,
  sort_order int not null,
  is_active boolean not null default true
);

-- blocked_dates: dates admin has closed off (holidays etc)
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

-- bookings: the core table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  time_slot_id uuid not null references time_slots(id),
  teacher_id uuid not null references teachers(id),
  class_name text not null,
  purpose text not null,
  created_at timestamptz not null default now(),
  -- prevents double-booking the same date + slot
  constraint unique_date_slot unique (booking_date, time_slot_id)
);

create index idx_bookings_date on bookings(booking_date);
```

### Row Level Security (enable on every table)
- `teachers`, `time_slots`: public **SELECT** allowed (needed for the public form); INSERT/UPDATE/DELETE restricted to `admin` role only.
- `blocked_dates`: public **SELECT** allowed (needed to disable dates in the calendar); write restricted to `admin`.
- `bookings`: public **SELECT** allowed (needed to grey out taken slots) and public **INSERT** allowed (this is the booking submission — no auth required), but public UPDATE/DELETE **forbidden**. Supervisors get SELECT-all; Admins get SELECT/UPDATE/DELETE-all.
- `profiles`: users can SELECT their own row; admins can SELECT/UPDATE all.

Write RLS policies explicitly for each table/action combination — do not leave any table without RLS enabled.

---

## 9. Concurrency & Data Integrity

- The DB `unique (booking_date, time_slot_id)` constraint is the source of truth against double-booking. The frontend must **catch the unique-violation error** on insert and show: "Maaf, slot ini baru sahaja ditempah oleh orang lain. Sila pilih slot lain." (Sorry, this slot was just booked by someone else. Please choose another slot.) Then refresh the slot list.
- Always re-fetch the current date's booked slots right before showing Step 2 and right before final submit, don't rely on stale cached data (use TanStack Query's `staleTime: 0` or `refetchOnMount` for this specific query, or manually invalidate).
- Fallback note for §7.3 user management: if creating a Supabase Edge Function for admin user invites is too complex, it is acceptable to document that new Supervisor/Admin accounts are created directly in the Supabase Dashboard (Authentication → Users) and their role is then set via a simple "assign role" form in the Admin UI that just writes to `profiles`. State clearly in the README which approach was implemented.

---

## 10. Timezone Handling (critical — implement carefully)

- Create a single shared utility module, e.g. `src/lib/datetime.ts`, and **import from it everywhere** — never call `new Date()` or format dates ad-hoc elsewhere in the app.
- Constant: `const TIMEZONE = 'Asia/Kuala_Lumpur';`
- Provide helper functions such as:
  - `getTodayInKL(): Date` — "today" per Malaysia time, not the browser's local time.
  - `formatDateForDB(date: Date): string` — `yyyy-MM-dd` in KL time, for storing in `booking_date`.
  - `formatDateDisplay(date: Date): string` — human-readable Malay format, e.g. `Isnin, 12 Ogos 2026`.
  - `formatTime12h(time: string): string` — converts `07:20:00` → `7:20 PAGI`/`AM` style. Decide once whether to show AM/PM in English or Malay (PAGI/TENGAHARI/PETANG) and be consistent; using standard `AM`/`PM` is acceptable and simpler.
  - `isWeekend(date: Date): boolean`, `isPastDate(date: Date): boolean` — both evaluated in KL time.
- Malay weekday/month names for calendar display: Isnin, Selasa, Rabu, Khamis, Jumaat, Sabtu, Ahad / Januari, Februari, Mac, April, Mei, Jun, Julai, Ogos, September, Oktober, November, Disember.

---

## 11. PWA Requirements

- Use `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- `manifest.json` (or inline config): `name: "Sistem Tempahan Makmal Komputer"`, `short_name: "Tempahan Makmal"`, `theme_color`, `background_color`, `display: "standalone"`, icons at 192x192 and 512x512 (generate simple placeholder icons if no brand assets are provided).
- Cache static assets for offline app-shell loading. Do **not** aggressively cache Supabase API responses (bookings must always be fresh) — use a network-first strategy for API calls if runtime caching is configured at all.
- Ensure the app is served over HTTPS (Vercel provides this by default) since PWA install requires it.

---

## 12. Project Structure (expected)

```
/src
  /components
    /ui              <- shadcn/ui generated components
    /booking         <- Step1Calendar, Step2Slots, Step3Details, Step4Review
    /layout          <- AuthLayout, PublicLayout, Sidebar, Topbar
    /tables           <- BookingsTable, TeachersTable, etc (TanStack Table wrappers)
  /pages
    /public          <- BookingPage.tsx
    /auth            <- LoginPage.tsx
    /supervisor      <- BookingsListPage, DashboardPage, ReportsPage
    /admin           <- TeachersPage, TimeSlotsPage, HousekeepingPage, UsersPage
  /store             <- Zustand stores (bookingFormStore, authStore if needed)
  /hooks             <- custom hooks wrapping TanStack Query (useBookings, useTeachers, useTimeSlots...)
  /lib
    datetime.ts
    supabaseClient.ts
    validators.ts    <- zod schemas
  /routes            <- React Router route definitions + guards
  /types             <- generated Supabase types + shared TS types
/supabase
  /migrations        <- SQL migration files per §8
.env.example
vite.config.ts
```

---

## 13. Environment Variables

Create `.env.example` with:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Never commit real keys. Read them via `import.meta.env` in `supabaseClient.ts`. Document in the README how to set these in Vercel's project settings for deployment.

---

## 14. Build Phases (follow in order)

**Phase 0 — Scaffold**
Initialize Vite + React + TS project. Install and configure Tailwind CSS, shadcn/ui, React Router, TanStack Query, TanStack Table, Zustand, Supabase JS client, `react-hook-form` + `zod`, `date-fns`/`date-fns-tz`, `vite-plugin-pwa`. Confirm the dev server runs with a blank "Hello World" page before proceeding.

**Phase 1 — Supabase Setup**
Write and apply the SQL migrations from §8, including RLS policies. Seed `time_slots` with the 12 rows from §5. Seed a handful of sample `teachers` rows. Generate TypeScript types from the Supabase schema. Create `supabaseClient.ts`.

**Phase 2 — Datetime Utility**
Implement `src/lib/datetime.ts` per §10. Write a few quick console-log/manual tests confirming KL-time "today" and formatting behave correctly regardless of the machine's local timezone.

**Phase 3 — Public Booking Flow**
Build the 4-step form per §6, wired to live Supabase data, with the Zustand store, validation, loading/error/empty states, and the "Kosongkan Borang" flow. This is the core deliverable — test it thoroughly, including the double-booking race condition from §9.

**Phase 4 — Auth**
Build `/login`, Supabase Auth integration, `profiles` role lookup, and route guards for `/supervisor/*` and `/admin/*`.

**Phase 5 — Supervisor Area**
Build the bookings table, dashboard (stats + at least one chart), and reports/export screens per §7.2.

**Phase 6 — Admin Area**
Build teacher CRUD, time-slot management, housekeeping (blocked dates + booking edit/delete), and user/role management per §7.3.

**Phase 7 — PWA**
Configure manifest + service worker per §11. Verify installability (Lighthouse PWA check).

**Phase 8 — Polish**
Responsive design pass (mobile-first, since teachers will likely use phones/tablets in the lab or staff room). Loading skeletons, empty states, toast notifications, consistent Bahasa Melayu copy review (no leftover Lorem Ipsum or English strings on public pages), accessibility basics (labels, focus states, contrast).

**Phase 9 — Deployment**
Add a `vercel.json` if needed for SPA routing (rewrite all routes to `index.html`). Document build command (`vite build`) and output directory (`dist`) for Vercel. Confirm environment variables are documented. Provide step-by-step deployment instructions in the README (connect repo to Vercel, set env vars, deploy).

---

## 15. Acceptance Checklist (verify all before finishing)

- [ ] Public form works end-to-end without login: pick date → pick slot → enter teacher/class/purpose → review → submit → success message.
- [ ] "Kosongkan Borang" clears all state and returns to Step 1 (with confirmation if data exists).
- [ ] Weekends, past dates, and admin-blocked dates cannot be selected in the calendar.
- [ ] Already-booked slots are visibly disabled and cannot be selected.
- [ ] Double-booking is impossible even under a race condition (DB constraint + graceful UI error).
- [ ] All 12 time slots match §5 exactly and display correctly in 12-hour format.
- [ ] All public-facing text is in Bahasa Melayu — no leftover English strings.
- [ ] All dates/times shown are correct for Asia/Kuala_Lumpur regardless of the tester's local timezone/device.
- [ ] Supervisor login works; supervisor can view all bookings, dashboard, and reports; cannot access `/admin/*`.
- [ ] Admin login works; admin can do everything supervisor can, plus manage teachers, time slots, blocked dates, edit/delete bookings, and manage user roles.
- [ ] RLS policies prevent an anonymous/public client from reading/writing anything beyond what §8 specifies (spot-check with the anon key).
- [ ] TanStack Table on the bookings list supports sort, filter/search, and pagination.
- [ ] Dashboard shows at least one meaningful chart and summary stats.
- [ ] Reports can be exported to CSV.
- [ ] App passes a Lighthouse PWA audit and is installable on mobile.
- [ ] App builds successfully with `vite build` and deploys cleanly on Vercel Hobby tier (SPA routing works on refresh/deep links, not just client-side nav).
- [ ] `.env.example` and README deployment instructions are present and accurate.
- [ ] No console errors in normal usage; TypeScript compiles with no errors (`tsc --noEmit` passes).

---

## 16. Deliverables

1. Full source code in the structure described in §12.
2. Supabase SQL migrations (§8) runnable to reproduce the schema from scratch.
3. `.env.example`.
4. `README.md` covering: setup, environment variables, running locally, running Supabase migrations/seed, deploying to Vercel, and a short user guide per role (teacher / supervisor / admin).
