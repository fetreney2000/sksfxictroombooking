import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const users = new Map()
const sessions = new Map()

const SLOTS = [
  ['07:20:00', '07:50:00'],
  ['07:50:00', '08:20:00'],
].map(([start, end], i) => ({
  id: `11111111-1111-4111-8111-00000000000${i + 1}`,
  start_time: start,
  end_time: end,
  sort_order: i + 1,
  is_active: true,
}))

const LONG_NAME = 'Cikgu Muhammad Abdullah Bin Ismail Al-Bakistani'

const addDaysTo = (str, n) => {
  const d = new Date(`${str}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const klDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
const today = addDaysTo(klDate, 0)
const tomorrow = addDaysTo(klDate, 1)
const dayAfter = addDaysTo(klDate, 2)

// B1: today + first slot (already started) -> must NOT appear in upcoming.
// B2/B3: tomorrow -> long-name teacher (most bookings).
// B4: day after tomorrow.
const BOOKINGS = [
  {
    id: 'bk-past',
    booking_date: today,
    time_slot_id: SLOTS[0].id,
    teacher_id: 't-1',
    class_name: '5 Cerdik',
    purpose: 'Kelas PdPc',
    created_at: '2026-08-01T03:00:00.000Z',
    teachers: { id: 't-1', full_name: 'Cikgu Siti Aminah' },
    time_slots: { id: SLOTS[0].id, start_time: SLOTS[0].start_time, end_time: SLOTS[0].end_time, sort_order: 1 },
  },
  {
    id: 'bk-up1',
    booking_date: tomorrow,
    time_slot_id: SLOTS[0].id,
    teacher_id: 't-2',
    class_name: '5 Bijak',
    purpose: 'Kelas PdPc',
    created_at: '2026-08-01T03:00:00.000Z',
    teachers: { id: 't-2', full_name: LONG_NAME },
    time_slots: { id: SLOTS[0].id, start_time: SLOTS[0].start_time, end_time: SLOTS[0].end_time, sort_order: 1 },
  },
  {
    id: 'bk-up2',
    booking_date: tomorrow,
    time_slot_id: SLOTS[1].id,
    teacher_id: 't-2',
    class_name: '5 Amanah',
    purpose: 'Kelas PdPc',
    created_at: '2026-08-01T03:00:00.000Z',
    teachers: { id: 't-2', full_name: LONG_NAME },
    time_slots: { id: SLOTS[1].id, start_time: SLOTS[1].start_time, end_time: SLOTS[1].end_time, sort_order: 2 },
  },
  {
    id: 'bk-up3',
    booking_date: dayAfter,
    time_slot_id: SLOTS[0].id,
    teacher_id: 't-3',
    class_name: '4 Amanah',
    purpose: 'Kelas PdPc',
    created_at: '2026-08-01T03:00:00.000Z',
    teachers: { id: 't-3', full_name: 'Cikgu Ahmad Faizal' },
    time_slots: { id: SLOTS[0].id, start_time: SLOTS[0].start_time, end_time: SLOTS[0].end_time, sort_order: 1 },
  },
]

function apiError(code, message) {
  return { code, message, details: null, hint: null }
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

  const nextToken = { n: 1 }
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
    const body = req.postData() ? JSON.parse(req.postData()) : null
    const rpcName = path.split('/').pop()

    if (method === 'POST' && path.includes('/rpc/')) {
      let payload = null
      let status = 200
      if (rpcName === 'has_users') {
        payload = users.size > 0
      } else if (rpcName === 'bootstrap_admin') {
        users.set(body.p_username.toLowerCase(), {
          id: '00000000-0000-4000-8000-000000000001',
          username: body.p_username.toLowerCase(),
          password: body.p_password,
          full_name: body.p_full_name,
          role: 'admin',
          is_active: true,
        })
        payload = '00000000-0000-4000-8000-000000000001'
      } else if (rpcName === 'login') {
        const user = users.get(body.p_username.toLowerCase())
        if (user && user.password === body.p_password) {
          const token = `tok-${nextToken.n++}`
          sessions.set(token, user.username)
          payload = { token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } }
        } else {
          payload = null
        }
      } else if (rpcName === 'me') {
        const username = body?.p_token ? sessions.get(body.p_token) : null
        const user = username ? users.get(username) : null
        payload = user ? { id: user.id, username: user.username, full_name: user.full_name, role: user.role, is_active: user.is_active } : null
      }
      req.respond({ status, headers: corsHeaders, body: JSON.stringify(payload) })
      return
    }

    if (path.endsWith('/bookings')) {
      req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(BOOKINGS) })
      return
    }
    if (path.endsWith('/time_slots')) {
      req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(SLOTS) })
      return
    }
    if (path.endsWith('/teachers') || path.endsWith('/kelas') || path.endsWith('/tujuan_tempahan') || path.endsWith('/blocked_dates')) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    req.respond({ status: 404, headers: corsHeaders, body: '{}' })
  })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 40000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1200)
  await page.type('#bootstrap-username', 'admin')
  await page.type('#bootstrap-password', 'admin123')
  await page.type('#bootstrap-name', 'Pentadbir Sistem')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cipta Akaun Pentadbir'))
    btn.click()
  })
  await sleep(2500)

  // Wait for booking data to render in the upcoming card
  for (let i = 0; i < 20; i++) {
    const hasData = await page.evaluate(() => document.body.innerText.includes('Cikgu Ahmad Faizal'))
    if (hasData) break
    await sleep(500)
  }

  const upcomingText = await page.evaluate(() => {
    const title = Array.from(document.querySelectorAll('div')).find(
      (el) => el.textContent?.trim() === 'Tempahan Akan Datang',
    )
    const card = title?.parentElement?.parentElement ?? null
    return card ? card.innerText : ''
  })
  console.log(`UPCOMING: card text present=${upcomingText.includes('Tempahan Akan Datang')}`)
  console.log(`UPCOMING: excludes today's past-slot booking=${!upcomingText.includes('Cikgu Siti Aminah')}`)
  console.log(`UPCOMING: includes long-name teacher=${upcomingText.includes('Cikgu Muhammad')}`)
  console.log(`UPCOMING: includes future booking=${upcomingText.includes('Cikgu Ahmad Faizal')}`)

  // Guru Paling Aktif name must be contained inside the stat card
  const containment = await page.evaluate(() => {
    const valueEl = Array.from(document.querySelectorAll('p[title]')).find((el) =>
      el.closest('.rounded-xl')?.textContent?.includes('Guru Paling Aktif'),
    )
    if (!valueEl) return { found: false }
    const stat = valueEl.closest('.rounded-xl')
    const vr = valueEl.getBoundingClientRect()
    const cr = stat.getBoundingClientRect()
    return {
      found: true,
      value: valueEl.textContent,
      truncated: valueEl.scrollWidth > valueEl.clientWidth,
      containedRight: vr.right <= cr.right + 1,
      containedLeft: vr.left >= cr.left - 1,
    }
  })
  console.log(`ACTIVE-TEACHER: card found=${containment.found} value="${containment.value}"`)
  console.log(`ACTIVE-TEACHER: truncated=${containment.truncated} containedRight=${containment.containedRight} containedLeft=${containment.containedLeft}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('DASHBOARD E2E FAILED:', err.message)
  process.exit(1)
})
