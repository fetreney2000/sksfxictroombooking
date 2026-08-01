import {
  TIMEZONE,
  getTodayInKL,
  parseDBDate,
  formatDateForDB,
  formatDateDisplay,
  formatDateShort,
  formatTime12h,
  isWeekend,
  isPastDate,
  getMonthGrid,
} from '../src/lib/datetime'

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error(`FAIL: ${label}`)
    process.exitCode = 1
  } else {
    console.log(`PASS: ${label}`)
  }
}

// "Today" should be a date string matching KL time (UTC+8) regardless of machine tz.
const today = getTodayInKL()
const klNow = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
  .format(new Date())
  .split('/')
  .reverse()
  .join('-')
console.log(`KL today (env 2026-08-01+08): ${formatDateForDB(today)}, browser KL: ${klNow}`)
assert(formatDateForDB(today) === klNow, `getTodayInKL matches KL date (${formatDateForDB(today)} === ${klNow})`)

const d = parseDBDate('2026-08-12')
assert(formatDateForDB(d) === '2026-08-12', 'parseDBDate/formatDateForDB round-trip')
assert(formatDateDisplay(d) === 'Rabu, 12 Ogos 2026', `formatDateDisplay = ${formatDateDisplay(d)}`)
assert(formatDateShort(d) === '12 Ogos 2026', `formatDateShort = ${formatDateShort(d)}`)

assert(formatTime12h('07:20:00') === '7:20 PAGI', `formatTime12h 07:20 = ${formatTime12h('07:20:00')}`)
assert(formatTime12h('09:50:00') === '9:50 PAGI', `formatTime12h 09:50 = ${formatTime12h('09:50:00')}`)
assert(formatTime12h('12:10:00') === '12:10 TENGAHARI', `formatTime12h 12:10 = ${formatTime12h('12:10:00')}`)
assert(formatTime12h('13:10:00') === '1:10 PETANG', `formatTime12h 13:10 = ${formatTime12h('13:10:00')}`)

assert(isWeekend(parseDBDate('2026-08-08')) === true, '2026-08-08 (Sat) is weekend')
assert(isWeekend(parseDBDate('2026-08-10')) === false, '2026-08-10 (Mon) is not weekend')

const monthGrid = getMonthGrid(parseDBDate('2026-08-01'))
assert(monthGrid.length === 6, `Aug 2026 grid has 6 weeks (got ${monthGrid.length})`)
assert(monthGrid[0].filter(Boolean).length === 1, `Aug 2026 first week has 1 day (Aug 1 is Saturday)`)
console.log('Weekdays header length check OK')

const grid = getMonthGrid(parseDBDate('2026-02-01'))
console.log(`Feb 2026 grid: ${grid.length} weeks`)

console.log('All date checks done.')
