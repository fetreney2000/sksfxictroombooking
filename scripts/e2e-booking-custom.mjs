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
]
const KELAS = [
  { id: '11111111-3333-4111-8111-000000000001', name: '5 Cerdik', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
]
const TUJUAN = [
  { id: '11111111-4444-4111-8111-000000000001', name: 'Kelas PdPc TMK', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: '11111111-4444-4111-8111-000000000002', name: 'Lain-lain', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
]
const BLOCKED = []

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

async function selectCombobox(page, id, filterText) {
  await page.click(`#${id}`)
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.type(filterText)
  await new Promise((r) => setTimeout(r, 400))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 500))
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

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('supabase.co')) {
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
      if (path.endsWith('/time_slots')) {
        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(SLOTS) })
        return
      }
      if (path.endsWith('/teachers')) {
        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(TEACHERS) })
        return
      }
      if (path.endsWith('/kelas')) {
        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(KELAS) })
        return
      }
      if (path.endsWith('/tujuan_tempahan')) {
        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(TUJUAN) })
        return
      }
      if (path.endsWith('/blocked_dates')) {
        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(BLOCKED) })
        return
      }
      if (path.endsWith('/bookings')) {
        if (method === 'POST') {
          postedBooking = body
          req.respond({ status: 201, headers: corsHeaders, body: JSON.stringify(body) })
          return
        }
        req.respond({ status: 200, headers: corsHeaders, body: '[]' })
        return
      }
      req.respond({ status: 404, headers: corsHeaders, body: '{}' })
      return
    }
    req.continue()
  })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))

  // --- Step 1: pick Tuesday 2026-08-04 (a future weekday) ---
  const bookingDate = new Date('2026-08-04T00:00:00.000Z')
  await page.evaluate((iso) => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]')).find(
      (b) => b.getAttribute('aria-label') === iso,
    )
    btn.click()
  }, bookingDate.toISOString())
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 1200))

  // --- Step 2: pick first available slot ---
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

  // --- Step 3 ---
  await selectCombobox(page, 'teacherId', 'Siti')
  await selectCombobox(page, 'kelas', '5 Cerdik')

  // Select "Lain-lain" from the tujuan combobox
  await selectCombobox(page, 'purpose', 'Lain-lain')

  // Custom textbox must appear
  const customShown = await page.evaluate(() => Boolean(document.querySelector('#customPurpose')))
  console.log(`CUSTOM: textbox shown after selecting Lain-lain=${customShown}`)

  // Submit with an empty custom tujuan -> validation error
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 800))
  let text = await page.evaluate(() => document.body.innerText)
  console.log(`CUSTOM: validation error on empty=${text.includes('Sila masukkan tujuan tempahan (sekurang-kurangnya 5 aksara)')}`)

  // Type a custom tujuan and continue
  await page.type('#customPurpose', 'Penyediaan bahan projek tahun 6')
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 800))

  // --- Step 4: review shows the custom tujuan ---
  text = await page.evaluate(() => document.body.innerText)
  console.log(`CUSTOM: review shows custom purpose=${text.includes('Penyediaan bahan projek tahun 6')}`)

  // Go back to step 3 -> combobox must show "Lain-lain" and text preserved
  await clickButton(page, 'Kembali')
  await new Promise((r) => setTimeout(r, 800))
  text = await page.evaluate(() => document.body.innerText)
  const backState = await page.evaluate(() => {
    const purposeInput = document.querySelector('#purpose')
    const custom = document.querySelector('#customPurpose')
    return {
      purposeValue: purposeInput ? purposeInput.value : null,
      customValue: custom ? custom.value : null,
    }
  })
  console.log(`CUSTOM: back to step 3 purpose=${backState.purposeValue} custom=${backState.customValue}`)

  // Forward again and submit
  await clickButton(page, 'Seterusnya')
  await new Promise((r) => setTimeout(r, 800))
  await clickButton(page, 'Hantar Tempahan')
  await new Promise((r) => setTimeout(r, 1500))

  text = await page.evaluate(() => document.body.innerText)
  console.log(`CUSTOM: booking success=${text.includes('Tempahan berjaya!')}`)
  console.log(`CUSTOM: POST purpose="${postedBooking?.purpose}"`)
  console.log(`CUSTOM: POST purpose is custom text=${postedBooking?.purpose === 'Penyediaan bahan projek tahun 6'}`)
  console.log(`CUSTOM: POST purpose not "Lain-lain"=${postedBooking?.purpose !== 'Lain-lain'}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('E2E CUSTOM FAILED:', err.message)
  process.exit(1)
})
