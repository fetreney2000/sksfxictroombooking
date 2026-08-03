import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const SLOTS = [
  ['07:20:00', '07:50:00'],
  ['07:50:00', '08:20:00'],
  ['08:20:00', '08:50:00'],
  ['08:50:00', '09:20:00'],
  ['09:20:00', '09:50:00'],
  ['09:50:00', '10:20:00'],
  ['10:20:00', '10:40:00'],
  ['10:40:00', '11:10:00'],
  ['11:10:00', '11:40:00'],
  ['11:40:00', '12:10:00'],
  ['12:10:00', '12:40:00'],
  ['12:40:00', '13:10:00'],
].map(([start, end], i) => ({
  id: `11111111-1111-4111-8111-00000000000${i + 1}`,
  start_time: start,
  end_time: end,
  sort_order: i + 1,
  is_active: true,
}))

const timeToMinutes = (time) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  return Number(match[1]) * 60 + Number(match[2])
}

// Current KL wall-clock time, in minutes since midnight.
const klTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kuala_Lumpur',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date())
const [klHour, klMinute] = klTime.split(':').map(Number)
const nowMinutes = klHour * 60 + klMinute

const expectedPast = SLOTS.filter((s) => timeToMinutes(s.start_time) <= nowMinutes).length

const klDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
const todayISO = `${klDate}T00:00:00.000Z`

// A booking on today's first slot: both past AND booked.
const bookedToday = {
  id: 'bk-past-today',
  booking_date: klDate,
  time_slot_id: SLOTS[0].id,
  teacher_id: '11111111-2222-4111-8111-000000000001',
  class_name: '5 Cerdik',
  purpose: 'Kelas PdPc',
  created_at: '2026-08-01T03:00:00.000Z',
  teachers: { id: '11111111-2222-4111-8111-000000000001', full_name: 'Cikgu Siti Aminah' },
  time_slots: { id: SLOTS[0].id, start_time: SLOTS[0].start_time, end_time: SLOTS[0].end_time, sort_order: 1 },
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
  })
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message.slice(0, 200)}`))

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (!url.includes('supabase.co')) {
      req.continue()
      return
    }
    const u = new URL(url)
    const path = u.pathname
    const method = req.method()
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*',
      'access-control-expose-headers': 'Content-Range',
      'content-type': 'application/json',
    }
    if (method === 'OPTIONS') {
      req.respond({ status: 204, headers: corsHeaders, body: '' })
      return
    }
    if (path.endsWith('/time_slots')) {
      req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(SLOTS) })
      return
    }
    if (path.endsWith('/bookings')) {
      req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify([bookedToday]) })
      return
    }
    if (
      path.endsWith('/teachers') ||
      path.endsWith('/kelas') ||
      path.endsWith('/tujuan_tempahan') ||
      path.endsWith('/blocked_dates')
    ) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    req.respond({ status: 404, headers: corsHeaders, body: '{}' })
  })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1200)

  // Select today's date (must be selectable — not a past date)
  const selected = await page.evaluate((iso) => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === iso,
    )
    if (!btn) return false
    btn.click()
    return !btn.disabled
  }, todayISO)
  await sleep(400)
  console.log(`TODAY: date selectable=${selected} (${todayISO})`)

  // Go to step 2
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith('Seterusnya'))
    btn.click()
  })
  await sleep(1200)

  const slotState = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG'),
    )
    return {
      count: buttons.length,
      disabled: buttons.filter((b) => b.disabled).length,
      masaBerlalu: buttons.filter((b) => b.textContent.includes('Masa Berlalu')).length,
      telahDitempah: buttons.filter((b) => b.textContent.includes('Telah Ditempah')).length,
      kelasInfo: buttons.filter((b) => b.textContent.includes('Kelas: 5 Cerdik')).length,
    }
  })
  console.log(`SLOTS: total=${slotState.count} disabled=${slotState.disabled} masaBerlalu=${slotState.masaBerlalu} telahDitempah=${slotState.telahDitempah}`)
  console.log(`SLOTS: disabled matches expected past=${slotState.disabled === expectedPast}`)
  console.log(`SLOTS: booked-past slot shows Telah Ditempah=${slotState.telahDitempah === 1}`)
  console.log(`SLOTS: booked-past slot shows booked class=${slotState.kelasInfo === 1}`)
  console.log(`SLOTS: non-booked past slots show Masa Berlalu=${expectedPast >= 1 ? slotState.masaBerlalu === expectedPast - 1 : slotState.masaBerlalu === 0}`)

  // "Seterusnya" must stay disabled since no slot can be selected
  const nextDisabled = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith('Seterusnya'))
    return btn ? btn.disabled : null
  })
  console.log(`SLOTS: Seterusnya disabled=${nextDisabled}`)

  const noSlotsMessage = await page.evaluate(() =>
    document.body.innerText.includes('Tiada slot tersedia pada waktu ini.'),
  )
  console.log(`SLOTS: no-slots message shown=${noSlotsMessage}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('E2E PAST SLOTS FAILED:', err.message)
  process.exit(1)
})
