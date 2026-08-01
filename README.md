# Sistem Tempahan Makmal Komputer

Sistem tempahan slot masa **Makmal Komputer** untuk sekolah. Guru menempah slot melalui **borang awam (tanpa log masuk)**, manakala Penyelia dan Pentadbir melihat tempahan, papan pemuka, dan laporan selepas log masuk.

- **Bahasa antara muka awam:** Bahasa Melayu Malaysia
- **Zon waktu:** Asia/Kuala_Lumpur (UTC+8) untuk semua tarikh/masa
- **Stack:** Vite + React 18 + TypeScript + Supabase + Tailwind CSS + shadcn/ui + TanStack Query/Table + Zustand + recharts + PWA

---

## Senarai Kandungan

1. [Ciri-ciri](#ciri-ciri)
2. [Teknologi](#teknologi)
3. [Keperluan](#keperluan)
4. [Pemasangan Tempatan](#pemasangan-tempatan)
5. [Persediaan Supabase](#persediaan-supabase)
6. [Penyebaran ke Vercel](#penyebaran-ke-vercel)
7. [Struktur Projek](#struktur-projek)
8. [Skrip](#skrip)
9. [Panduan Pengguna](#panduan-pengguna)
10. [Nota Teknikal](#nota-teknikal)

---

## Ciri-ciri

### Guru (awam, tiada log masuk)
- Kalendar Bahasa Melayu: pilih tarikh (Isnin–Jumaat sahaja; hujung minggu, tarikh lepas dan tarikh disekat tidak boleh dipilih).
- Pilih slot masa (12 slot tetap, dipaparkan dalam format 12 jam).
- Maklumat tempahan: nama guru (dropdown daripada senarai guru), kelas, tujuan.
- Semak & hantar dengan pengesahan; kawalan slot sudah ditempah dan perlindungan tempahan dua kali (DB `unique` constraint + UI mesra).

### Penyelia (log masuk)
- **Semua Tempahan:** jadual TanStack dengan carian, penapisan tarikh, isihan, dan pembahagian halaman.
- **Papan Pemuka:** kad statistik (tempahan minggu/bulan ini, hari paling sibuk, guru paling aktif, penggunaan slot %) + carta tempahan setiap hari.
- **Laporan:** tapisan (tarikh, guru, kelas) + eksport CSV.

### Pentadbir (log masuk)
Semua keupayaan Penyelia, tambahan:
- **Urus Guru:** tambah, sunting, aktif/tidak aktif, padam.
- **Urus Slot Masa:** ubah masa mula/tamat, aktif/tidak aktif, susun semula.
- **Urus Tarikh:** sekat/buka tarikh (cuti, hari peperiksaan) + sunting/padam mana-mana tempahan.
- **Urus Pengguna:** senarai akaun penyelia/pentadbir dan ubah peranan.

---

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Build | Vite (React + TypeScript) |
| Framework | React 18 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| State | Zustand |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Table | TanStack Table v8 |
| Chart | recharts |
| Backend/DB/Auth | Supabase (pelan percuma) |
| Tarikh/Masa | date-fns + date-fns-tz |
| PWA | vite-plugin-pwa |

---

## Keperluan

- Node.js 18+ dan npm
- Akaun [Supabase](https://supabase.com) (pelan percuma)
- Akaun [Vercel](https://vercel.com) (pelan Hobby percuma)
- (Pilihan) Supabase CLI untuk menjalankan migrasi

---

## Pemasangan Tempatan

```bash
# 1. Klon repositori
git clone <repo-url> .
cd sistem-tempahan-makmal

# 2. Pasang kebergantungan
npm install

# 3. Salin fail persekitaran dan isi nilai sebenar
cp .env.example .env
# .env
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# 4. Jalankan pelayan pembangunan
npm run dev
```

Buka `http://localhost:5173`. Laman utama adalah borang tempahan awam.

---

## Persediaan Supabase

### Pilihan A: Supabase CLI (disyorkan)

```bash
npm install -D supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### Pilihan B: SQL Editor dalam Dashboard

1. Cipta projek baharu di [supabase.com](https://supabase.com) (rantau **Southeast Asia** untuk kependaman terbaik — `ap-southeast-1`).
2. Buka **SQL Editor** dan jalankan **`supabase/full_setup.sql`** (gabungan semua migrasi dalam satu fail, termasuk muat semula cache skema PostgREST). 

   Atau, jalankan fail berikut mengikut urutan:
   - `supabase/migrations/20260801000001_init.sql`
   - `supabase/migrations/20260801000002_rls.sql`
   - `supabase/migrations/20260801000003_seed.sql`

   > **Jika anda mendapat ralat "Could not find the table 'public.time_slots' in the schema cache"**, ini bermaksud jadual belum wujud atau cache PostgREST belum dimuat semula. Jalankan semula `supabase/full_setup.sql` (ia idempotent) atau jalankan `select pg_notify('pgrst', 'reload schema');` dalam SQL Editor.

Migrasi ini mencipta jadual (`profiles`, `teachers`, `time_slots`, `blocked_dates`, `bookings`), **Row Level Security** untuk setiap jadual, trigger auto-profil apabila pengguna auth dicipta, dan data asas (12 slot masa + 6 guru contoh).

### Kekunci API

1. Pergi ke **Project Settings → API**.
2. Salin **Project URL** ke `VITE_SUPABASE_URL`.
3. Salin **anon public key** ke `VITE_SUPABASE_ANON_KEY`.
4. (Pilihan) Salin `service_role` jika perlu — **jangan dedahkan kepada pelanggan**.

### Pengguna pertama (Pentadbir bootstrap)

Tiada pendaftaran awam. Semua akaun penyelia/pentadbir dicipta oleh pentadbir:

1. Pergi ke **Authentication → Users → Add user** dan cipta pengguna pertama (e-mel + kata laluan).
2. Trigger `on_auth_user_created` secara automatik mencipta profil **Pentadbir** untuk pengguna **pertama** (pengguna seterusnya menjadi Penyelia secara automatik).
3. Log masuk di `/login` menggunakan akaun tersebut.

> **Sekiranya pengguna pertama perlu dijadikan Pentadbir secara manual** (cth. profil telah wujud sebelum trigger dipasang):
> ```sql
> update public.profiles set role = 'admin' where id = '<user-uuid>';
> ```

### Nota: pengurusan akaun baharu

Pengurusan pengguna (Urus Pengguna) melaksanakan pendekatan **fallback** yang dibenarkan oleh spesifikasi: akaun baharu dicipta dalam **Supabase Dashboard (Authentication → Users)**, dan peranan (Penyelia/Pentadbir) ditetapkan melalui borang **"Ubah Peranan"** dalam aplikasi yang hanya menulis ke jadual `profiles`. Tiada Edge Function diperlukan.

---

## Penyebaran ke Vercel

1. Push repositori ke GitHub/GitLab/Bitbucket.
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** dan import repositori.
3. Vercel akan mengesan Vite secara automatik:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Tetapkan pemboleh ubah persekitaran (Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Klik **Deploy**.

Fail `vercel.json` disertakan supaya **pautan dalam/deep-link** (cth. `/login`, `/admin/bookings`) dan muat semula halaman tidak kembali 404 — semua laluan ditulis semula ke `index.html` (SPA routing).

PWA memerlukan HTTPS — Vercel menyediakan sijil secara automatik.

---

## Struktur Projek

```
src/
  components/
    ui/          # Komponen shadcn/ui (button, dialog, calendar, combobox, dll.)
    booking/     # Step1Calendar, Step2Slots, Step3Details, Step4Review, StepIndicator
    layout/      # PublicLayout, AppLayout (sidebar + topbar)
    tables/      # BookingsTable
  pages/
    public/      # BookingPage
    auth/        # LoginPage
    supervisor/  # BookingsListPage, DashboardPage, ReportsPage
    admin/       # TeachersPage, TimeSlotsPage, HousekeepingPage, UsersPage
  hooks/         # Pembungkus TanStack Query (useBookings, useTeachers, mutations, useAuth)
  lib/           # datetime.ts, supabaseClient.ts, validators.ts, utils.ts
  store/         # bookingFormStore (Zustand)
  routes/        # guards.tsx
  types/         # database.ts (jenis Supabase), shared.ts
supabase/
  migrations/    # Skrip SQL (00001 init, 00002 RLS, 00003 seed)
scripts/         # generate-icons.mjs, test-datetime.ts, smoke tests
```

---

## Skrip

| Arahan | Keterangan |
|---|---|
| `npm run dev` | Pelayan pembangunan Vite |
| `npm run build` | Typecheck + bina produksi ke `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preview` | Pratonton binaan produksi |
| `npm run test:datetime` | Ujian utiliti tarikh/masa (zon Asia/Kuala_Lumpur) |
| `npm run generate:icons` | Jana ikon PWA placeholder |
| `node scripts/e2e-booking.mjs` | Ujian E2E aliran tempahan awam (mock Supabase, perlukan `npm run dev`) |

---

## Panduan Pengguna

### Guru (tiada log masuk)
1. Buka laman utama `/`.
2. **Langkah 1 — Pilih Tarikh:** pilih tarikh Isnin–Jumaat (hari lain dipadamkan). Tarikh yang disekat oleh pentadbir tidak boleh dipilih.
3. **Langkah 2 — Pilih Slot Masa:** pilih slot yang tersedia. Slot bertanda *Telah Ditempah* tidak boleh dipilih.
4. **Langkah 3 — Maklumat Tempahan:** pilih nama guru daripada senarai, isi kelas dan tujuan, kemudian **Seterusnya**.
5. **Langkah 4 — Semak & Hantar:** semak maklumat dan klik **Hantar Tempahan**. Mesej "Tempahan berjaya!" muncul.

Butang **Kosongkan Borang** memadam semua maklumat dan kembali ke Langkah 1 (dengan dialog pengesahan jika ada data).

### Penyelia
- Log masuk di `/login`.
- **Papan Pemuka:** ringkasan statistik dan carta.
- **Semua Tempahan:** carian, tapisan tarikh, isihan lajur, pembahagian halaman.
- **Laporan:** tetapkan tapisan dan muat turun **Eksport CSV**.

### Pentadbir
Semua keupayaan Penyelia, tambahan:
- **Urus Guru:** tambah/sunting/aktifkan/nyahaktifkan/padam guru.
- **Urus Slot Masa:** ubah masa, aktif/tidak aktif, susun semula slot.
- **Urus Tarikh:** sekat/buka tarikh; sunting/padam tempahan.
- **Urus Pengguna:** ubah peranan akaun (Penyelia/Pentadbir). Akaun baharu dicipta di Supabase Dashboard.

---

## Nota Teknikal

### Zon waktu
Semua tarikh/masa dikira, disimpan (sebagai `timestamptz`/`date` di Supabase) dan dipaparkan menggunakan **Asia/Kuala_Lumpur**. Keseluruhan logik tarikh berpusat di `src/lib/datetime.ts` — jangan panggil `new Date()` secara ad-hoc di tempat lain.

### Perlindungan tempahan dua kali
- **DB:** constraint `unique (booking_date, time_slot_id)` pada jadual `bookings`.
- **UI:** slot yang telah ditempah dikelabukan; sebelum hantar, senarai slot disegar semula; jika ralat `23505` berlaku, mesej mesra dipaparkan dan pengguna dikembalikan ke Langkah 2 dengan senarai dikemas kini.

### Row Level Security (RLS)
Setiap jadual mendayakan RLS dengan dasar eksplisit:
- `teachers`, `time_slots`, `blocked_dates`: SELECT awam; tulis hanya `admin`.
- `bookings`: SELECT + INSERT awam (tanpa log masuk); UPDATE/DELETE hanya `admin`.
- `profiles`: pengguna hanya boleh SELECT baris sendiri; pentadbir SELECT/UPDATE semua.

Peranan disemak melalui fungsi `public.is_admin()` (security definer) di peringkat pangkalan data — **bukan hanya di bahagian hadapan**.

### PWA
- Manifest: nama "Sistem Tempahan Makmal Komputer", `display: standalone`, ikon 192/512 (placeholder dijana oleh `node scripts/generate-icons.mjs`).
- Service worker (`vite-plugin-pwa`, `registerType: 'autoUpdate'`) mengcache aset statik (app-shell luar talian). Panggilan API Supabase **tidak** diagregat-cache — sentiasa segar.
- Pemasangan memerlukan HTTPS (disediakan oleh Vercel).

### Kata laluan yang kukuh & keselamatan
- Jangan sekali-kali komit `.env` atau kekunci sebenar. Gunakan pemboleh ubah persekitaran Vercel untuk pengeluaran.
- Kekunci `anon` hanya untuk operasi yang dibenarkan oleh RLS.
