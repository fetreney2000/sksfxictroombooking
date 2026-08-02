import { z } from 'zod'

export const classNameSchema = z
  .string()
  .trim()
  .min(2, 'Sila masukkan nama kelas (sekurang-kurangnya 2 aksara).')
  .max(60, 'Nama kelas tidak boleh melebihi 60 aksara.')

export const purposeSchema = z
  .string()
  .trim()
  .min(5, 'Sila masukkan tujuan tempahan (sekurang-kurangnya 5 aksara).')
  .max(300, 'Tujuan tempahan tidak boleh melebihi 300 aksara.')

export const bookingDetailsSchema = z
  .object({
    teacherId: z.string().uuid('Sila pilih nama guru.').min(1, 'Sila pilih nama guru.'),
    className: classNameSchema,
    purpose: purposeSchema,
    customPurpose: z
      .string()
      .trim()
      .max(300, 'Tujuan tempahan tidak boleh melebihi 300 aksara.')
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.purpose === 'Lain-lain') {
      const custom = (values.customPurpose ?? '').trim()
      if (custom.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customPurpose'],
          message: 'Sila masukkan tujuan tempahan (sekurang-kurangnya 5 aksara).',
        })
      }
    }
  })

export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>

export const teacherFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'Sila masukkan nama penuh guru (sekurang-kurangnya 3 aksara).')
    .max(100, 'Nama guru tidak boleh melebihi 100 aksara.'),
})

export const timeSlotFormSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format masa tidak sah (HH:mm).'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format masa tidak sah (HH:mm).'),
})

export const blockedDateFormSchema = z.object({
  blocked_date: z.string().min(1, 'Sila pilih tarikh.'),
  reason: z.string().max(200, 'Sebab tidak boleh melebihi 200 aksara.').optional(),
})

export const profileRoleFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Sila masukkan nama penuh.'),
  role: z.enum(['admin', 'supervisor']),
})

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Nama pengguna sekurang-kurangnya 3 aksara.')
    .max(30, 'Nama pengguna tidak boleh melebihi 30 aksara.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Nama pengguna hanya boleh mengandungi huruf, nombor, titik, sempang dan garis bawah.'),
  password: z.string().min(6, 'Kata laluan sekurang-kurangnya 6 aksara.'),
})

export type LoginValues = z.infer<typeof loginSchema>

export const bootstrapSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Nama pengguna sekurang-kurangnya 3 aksara.')
    .max(30, 'Nama pengguna tidak boleh melebihi 30 aksara.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Nama pengguna hanya boleh mengandungi huruf, nombor, titik, sempang dan garis bawah.'),
  password: z.string().min(6, 'Kata laluan sekurang-kurangnya 6 aksara.'),
  fullName: z.string().trim().min(3, 'Sila masukkan nama penuh.').max(100, 'Nama penuh terlalu panjang.'),
})

export type BootstrapValues = z.infer<typeof bootstrapSchema>
