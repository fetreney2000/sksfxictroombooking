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

const TEACHERS = [
  { id: '11111111-2222-4111-8111-000000000001', full_name: 'Cikgu Siti Aminah', is_active: true, created_at: '2026-01-05T01:00:00.000Z' },
  { id: '11111111-2222-4111-8111-000000000002', full_name: 'Cikgu Ahmad Faizal', is_active: true, created_at: '2026-01-05T01:00:00.000Z' },
  { id: '11111111-2222-4111-8111-000000000003', full_name: 'Cikgu Nurul Huda', is_active: true, created_at: '2026-01-05T01:00:00.000Z' },
]

const BLOCKED = [{ id: 'b-1', blocked_date: '2026-08-05', reason: 'Cuti perayaan', created_at: '2026-01-01T00:00:00.000Z' }]

const KELAS = [
  { id: '11111111-3333-4111-8111-000000000001', name: '5 Cerdik', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: '11111111-3333-4111-8111-000000000002', name: '4 Amanah', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: '11111111-3333-4111-8111-000000000003', name: '5 Bijak', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
]

const TUJUAN = [
  { id: '11111111-4444-4111-8111-000000000001', name: 'Kelas PdPc TMK', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: '11111111-4444-4111-8111-000000000002', name: 'Ujian Amali', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: '11111111-4444-4111-8111-000000000003', name: 'Ujian amali TMK', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
]

// Track which slots are "booked" for the chosen date in the mock.
const mockBookings = new Map()

function buildBookingsFor(date) {
  const rows = []
  for (const [slotId, cls] of mockBookings.entries()) {
    if (!cls.date === undefined) continue
  }
  for (const [key, info] of mockBookings) {
    if (info.date !== date) continue
    rows.push({
      id: `bk-${info.slotId}-${date}`,
      booking_date: date,
      time_slot_id: info.slotId,
      teacher_id: info.teacherId,
      class_name: info.className,
      purpose: info.purpose,
      created_at: '2026-08-01T03:00:00.000Z',
      teachers: TEACHERS.find((t) => t.id === info.teacherId) ?? null,
      time_slots: SLOTS.find((s) => s.id === info.slotId) ?? null,
    })
  }
  return rows
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
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`))

  let postedBooking = null
  let forceConflictSlot = null
  let forceConflictDate = null

  await page.setRequestInterception(true)
  const seenRequests = []
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('supabase.co')) {
      seenRequests.push(`${req.method()} ${url}`)
      const u = new URL(url)
      const path = u.pathname
      const method = req.method()
      const parsedBody = method === 'POST' && req.postData() ? JSON.parse(req.postData()) : null
      const body = Array.isArray(parsedBody) ? parsedBody[0] : parsedBody

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

      let payload = null
      if (path.endsWith('/time_slots')) payload = SLOTS
      else if (path.endsWith('/teachers')) payload = TEACHERS
      else if (path.endsWith('/kelas')) payload = KELAS
      else if (path.endsWith('/tujuan_tempahan')) payload = TUJUAN
      else if (path.endsWith('/blocked_dates')) payload = BLOCKED
      else if (path.endsWith('/bookings') && method === 'GET') {
        const date = u.searchParams.get('booking_date')?.replace('eq.', '')
        payload = buildBookingsFor(date)
      } else if (path.endsWith('/bookings') && method === 'POST') {
        const rows = Array.isArray(parsedBody) ? parsedBody : [parsedBody]
        // Simulate the unique-constraint race: a slot was just taken by someone else.
        if (rows.some((r) => r.time_slot_id === forceConflictSlot && r.booking_date === forceConflictDate)) {
          req.respond({
            status: 409,
            headers: corsHeaders,
            body: JSON.stringify({
              code: '23505',
              details: 'Key (booking_date, time_slot_id)=(...) already exists.',
              hint: null,
              message: 'duplicate key value violates unique constraint "unique_date_slot"',
            }),
          })
          return
        }
        for (const row of rows) {
          mockBookings.set(`${row.time_slot_id}`, {
            date: row.booking_date,
            slotId: row.time_slot_id,
            teacherId: row.teacher_id,
            className: row.class_name,
            purpose: row.purpose,
          })
        }
        postedBooking = rows
        payload = rows.length > 0 ? buildBookingsFor(rows[0].booking_date) : []
      }

      if (payload !== null) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(payload),
        })
        return
      }
      req.respond({ status: 404, headers: corsHeaders, body: '{}' })
      return
    }
    req.continue()
  })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))

  // Blocked date (2026-08-05, from mock) must be disabled in the calendar
  const blockedDisabled = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === '2026-08-05T00:00:00.000Z',
    )
    return btn ? btn.disabled : 'not-found'
  })
  console.log(`STEP1: admin-blocked date disabled=${blockedDisabled}`)

  // --- Step 1: pick date 2026-08-04 (Tuesday, a future weekday) ---
  const bookingDate = new Date('2026-08-04T00:00:00.000Z')
  await page.evaluate((iso) => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === iso,
    )
    btn.click()
  }, bookingDate.toISOString())
  await new Promise((r) => setTimeout(r, 300))
  const step1Text = await page.evaluate(() => document.body.innerText)
  console.log(`STEP1: selected date shown=${step1Text.includes('Selasa, 4 Ogos 2026')}`)
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 1200))

  // --- Step 2: slots ---
  let text = await page.evaluate(() => document.body.innerText)
  console.log(`STEP2: renders slot picker=${text.includes('Pilih Slot Masa')}`)
  console.log(`STEP2: shows 12 slots=${text.includes('7:20 PAGI') && text.includes('1:10 PETANG')}`)
  console.log('--- STEP2 body text (first 800 chars) ---')
  console.log(text.slice(0, 800).replace(/\n+/g, ' | '))
  console.log('--- supabase requests seen ---')
  for (const r of seenRequests) console.log('  ' + r)
  console.log('STEP2: blocked date info not shown here (expected)')

  // Select two available slots (multi-slot booking, max 4)
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      (b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG')) &&
      !b.disabled,
    )
    cards[0].click()
    cards[1].click()
  })
  await new Promise((r) => setTimeout(r, 300))
  let slotText = await page.evaluate(() => document.body.innerText)
  console.log(`STEP2: count 2/4 shown=${slotText.includes('2/4 dipilih')}`)

  // Select two more -> 4/4; a 5th slot must become disabled
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG'),
    )
    cards[2].click()
    cards[3].click()
  })
  await new Promise((r) => setTimeout(r, 300))
  slotText = await page.evaluate(() => document.body.innerText)
  console.log(`STEP2: count 4/4 shown=${slotText.includes('4/4 dipilih')}`)
  const fifthDisabled = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG'),
    )
    return cards.length > 4 ? Boolean(cards[4].disabled) : null
  })
  console.log(`STEP2: 5th slot disabled at max=${fifthDisabled}`)

  // Deselect two, back to 2/4, then continue
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG'),
    )
    cards[3].click()
    cards[2].click()
  })
  await new Promise((r) => setTimeout(r, 300))
  slotText = await page.evaluate(() => document.body.innerText)
  console.log(`STEP2: back to 2/4=${slotText.includes('2/4 dipilih')}`)

  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 600))

  // --- Step 3: details ---
  text = await page.evaluate(() => document.body.innerText)
  console.log(`STEP3: renders details=${text.includes('Maklumat Tempahan')}`)

  // Open teacher combobox (Base UI): click the input, type to filter, press ArrowDown + Enter
  await page.click('#teacherId')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type('Siti')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 500))

  const afterSelect = await page.evaluate(() => {
    const input = document.querySelector('#teacherId')
    const classInput = document.querySelector('#kelas')
    return {
      comboLabel: input ? input.value : 'no-input',
      classNameValue: classInput ? classInput.value : 'no-input',
    }
  })
  console.log(`STEP3: combobox value after select="${afterSelect.comboLabel}"`)
  console.log(`STEP3: className input value="${afterSelect.classNameValue}"`)

  // Select class from the kelas combobox
  await page.click('#kelas')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type('5 Cerdik')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 500))

  // Select purpose from the tujuan combobox
  await page.click('#purpose')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type('Kelas PdPc TMK')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 500))

  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 800))

  // --- Step 4: review ---
  text = await page.evaluate(() => document.body.innerText)
  console.log(`STEP4: renders review=${text.includes('Semak & Hantar')}`)
  console.log(`STEP4: shows summary fields=${text.includes('Cikgu Siti Aminah') && text.includes('5 Cerdik') && text.includes('Kelas PdPc TMK')}`)
  const slotLineCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('p')).filter((p) =>
      p.textContent?.includes('PAGI') || p.textContent?.includes('TENGAHARI') || p.textContent?.includes('PETANG'),
    ).length
  })
  console.log(`STEP4: slots stacked as separate lines=${slotLineCount === 2}`)
  console.log('--- STEP4 body text (first 1200 chars) ---')
  console.log(text.slice(0, 1200).replace(/\n+/g, ' | '))

  await clickButton(page, 'Hantar Tempahan')
  await new Promise((r) => setTimeout(r, 1500))

  text = await page.evaluate(() => document.body.innerText)
  console.log(`SUCCESS: shows success=${text.includes('Tempahan berjaya')}`)
  console.log(`POST payload: ${JSON.stringify(postedBooking)}`)
  const rows = Array.isArray(postedBooking) ? postedBooking : [postedBooking]
  const postOk =
    rows.length === 2 &&
    rows.every(
      (r) =>
        r.booking_date === '2026-08-04' &&
        r.teacher_id === '11111111-2222-4111-8111-000000000001' &&
        r.class_name === '5 Cerdik' &&
        r.purpose === 'Kelas PdPc TMK',
    ) &&
    rows.some((r) => r.time_slot_id === '11111111-1111-4111-8111-000000000001') &&
    rows.some((r) => r.time_slot_id === '11111111-1111-4111-8111-000000000002')
  console.log(`POST payload correct (2 slots): ${postOk}`)

  // --- New booking button ---
  await clickButton(page, 'Tempahan Baharu')
  await new Promise((r) => setTimeout(r, 800))
  text = await page.evaluate(() => document.body.innerText)
  const resetOk =
    text.includes('Sila pilih tarikh untuk meneruskan.') &&
    text.includes('Pilih Tarikh') &&
    !text.includes('Tempahan anda telah diterima.')
  console.log(`RESET: back to step 1 with cleared form=${resetOk}`)

  // --- Double-booking race: choose same date again; slot 1 now booked ---
  await page.evaluate((iso) => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === iso,
    )
    btn.click()
  }, bookingDate.toISOString())
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 1200))
  const raceBookedCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      b.textContent.includes('Telah Ditempah'),
    ).length
  })
  console.log(`RACE: two slots show Telah Ditempah=${raceBookedCount === 2}`)
  text = await page.evaluate(() => document.body.innerText)
  console.log(`RACE: booked class shown=${text.includes('Kelas: 5 Cerdik')}`)

  // --- 23505 submit race: slot looks free but is taken at submit time ---
  // Use a fresh date (2026-08-06) where slot 1 appears open.
  await page.evaluate(() => {
    document.querySelectorAll('button[aria-label]').forEach(() => {})
  })
  await page.evaluate(() => window.history.pushState({}, '', '/'))
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 800))
  const freshDate = new Date('2026-08-06T00:00:00.000Z')
  await page.evaluate((iso) => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === iso,
    )
    btn.click()
  }, freshDate.toISOString())
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 1200))

  // Select first available slot
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[type="button"]')).filter((b) =>
      (b.textContent.includes('PAGI') || b.textContent.includes('TENGAHARI') || b.textContent.includes('PETANG')) &&
      !b.disabled,
    )
    cards[0].click()
  })
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 600))

  await page.click('#teacherId')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 400))
  await page.click('#kelas')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type('5 Bijak')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 400))
  await page.click('#purpose')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type('Ujian amali TMK')
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 400))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 600))

  // Arm the conflict, then submit.
  forceConflictSlot = '11111111-1111-4111-8111-000000000001'
  forceConflictDate = '2026-08-06'
  await clickButton(page, 'Hantar Tempahan')
  await new Promise((r) => setTimeout(r, 1800))
  text = await page.evaluate(() => document.body.innerText)
  console.log(
    `RACE23505: friendly error shown=${text.includes('baru sahaja ditempah oleh orang lain')}`,
  )
  console.log(`RACE23505: back to slot step=${text.includes('Pilih Slot Masa')}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

async function clickButton(page, label) {
  const clicked = await page.evaluate((lbl) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.trim().startsWith(lbl),
    )
    if (!btn) return false
    btn.click()
    return true
  }, label)
  if (!clicked) console.log(`  !! button "${label}" not found`)
}

main().catch((err) => {
  console.error('E2E TEST FAILED:', err.message)
  process.exit(1)
})


