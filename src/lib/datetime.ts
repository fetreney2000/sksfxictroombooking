import { formatInTimeZone } from 'date-fns-tz'
import { ms } from 'date-fns/locale/ms'

/**
 * Timezone and date/time utilities.
 *
 * IMPORTANT: Every date in this app is represented as a `Date` object whose
 * UTC calendar fields equal the calendar fields in Asia/Kuala_Lumpur.
 * We call these "KL-shim dates". They are created from `yyyy-MM-dd` strings
 * (e.g. `new Date('2026-08-12T00:00:00.000Z')`) and must be formatted with
 * `timeZone: 'UTC'` so the machine's local timezone never leaks in.
 *
 * NEVER call `new Date()` or format dates ad-hoc anywhere else in the app —
 * always import from this module.
 */

export const TIMEZONE = 'Asia/Kuala_Lumpur'

export const MALAY_MONTHS = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
]

export const MALAY_DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

export const MALAY_DAYS_SHORT = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab']

/** Return today's date in KL as a KL-shim Date (midnight KL time). */
export function getTodayInKL(): Date {
  const now = new Date()
  const klDateStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd')
  return new Date(`${klDateStr}T00:00:00.000Z`)
}

/** Convert a `yyyy-MM-dd` string from the DB into a KL-shim Date. */
export function parseDBDate(dbDate: string): Date {
  return new Date(`${dbDate}T00:00:00.000Z`)
}

/** Format a KL-shim Date as `yyyy-MM-dd` (for `booking_date`). */
export function formatDateForDB(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
}

/** Full Malay display format: e.g. `Isnin, 12 Ogos 2026`. */
export function formatDateDisplay(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'eeee, d MMMM yyyy', { locale: ms })
}

/** Short Malay display format: e.g. `12 Ogos 2026`. */
export function formatDateShort(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'd MMMM yyyy', { locale: ms })
}

/** Month + year only, e.g. `Ogos 2026`. */
export function formatMonthYear(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'MMMM yyyy', { locale: ms })
}

/** Malay date used in compact table cells, e.g. `12 Ogo 2026`. */
export function formatDateCompact(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'd MMM yyyy', { locale: ms })
}

/** Timestamp (DB `timestamptz`) rendered in KL time, e.g. `12 Ogo 2026, 10:44 PG`. */
export function formatDateTimeDisplay(timestamp: string): string {
  return formatInTimeZone(new Date(timestamp), TIMEZONE, 'd MMM yyyy, h:mm a', { locale: ms })
}

/** Convert `HH:mm:ss` from the DB into 12-hour Malay format, e.g. `7:20 PAGI`. */
export function formatTime12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return time
  let hour = Number(match[1])
  const minute = match[2]
  let period: string
  let displayHour: number
  if (hour === 12) {
    period = 'TENGAHARI'
    displayHour = 12
  } else if (hour > 12) {
    period = 'PETANG'
    displayHour = hour - 12
  } else {
    period = 'PAGI'
    displayHour = hour === 0 ? 12 : hour
  }
  return `${displayHour}:${minute} ${period}`
}

/** KL-shim Date arithmetic */
export function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function addMonthsToDate(date: Date, months: number): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** Sunday = 0 ... Saturday = 6, evaluated in KL time. */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay()
}

/** Compare two KL-shim Dates at day granularity. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

/** Saturday or Sunday, evaluated in KL time. */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/** True if `date` is strictly before today in KL time. */
export function isPastDate(date: Date): boolean {
  return date.getTime() < getTodayInKL().getTime()
}

/**
 * Build the weeks (array of rows, each of 7 cells) for a month view.
 * Leading/trailing cells from adjacent months are included as `null`
 * so the calendar grid is always aligned, but they are not rendered.
 */
export function getMonthGrid(monthDate: Date): (Date | null)[][] {
  const first = startOfMonth(monthDate)
  const firstDay = first.getUTCDay()
  const daysInMonth = endOfMonth(monthDate).getUTCDate()
  const grid: (Date | null)[][] = []
  let week: (Date | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d)))
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}
