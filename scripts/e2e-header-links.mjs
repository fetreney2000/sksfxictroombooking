import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const users = new Map()
const sessions = new Map()

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
      } else if (rpcName === 'logout') {
        if (body?.p_token) sessions.delete(body.p_token)
        payload = null
      }
      req.respond({ status, headers: corsHeaders, body: JSON.stringify(payload) })
      return
    }

    if (
      path.endsWith('/teachers') ||
      path.endsWith('/time_slots') ||
      path.endsWith('/kelas') ||
      path.endsWith('/tujuan_tempahan') ||
      path.endsWith('/blocked_dates') ||
      path.endsWith('/bookings')
    ) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    req.respond({ status: 404, headers: corsHeaders, body: '{}' })
  })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const linkHref = (href) =>
    page.evaluate((h) => {
      const a = Array.from(document.querySelectorAll('a')).find((el) => el.getAttribute('href') === h)
      return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null
    }, href)
  const clickLink = (href) =>
    page.evaluate((h) => {
      const a = Array.from(document.querySelectorAll('a')).find((el) => el.getAttribute('href') === h)
      if (a) a.click()
      return Boolean(a)
    }, href)

  // 1. Booking page (logged out): subtle Log Masuk link
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1500)
  let link = await linkHref('/login')
  console.log(`PUBLIC-LOGGED-OUT: /login link=${JSON.stringify(link)}`)
  const clicked = await clickLink('/login')
  await sleep(1500)
  console.log(`PUBLIC-LOGGED-OUT: click navigated to login=${page.url().includes('/login')} (clicked=${clicked})`)

  // 2. Bootstrap admin (bootstrap card is shown since no users exist yet)
  await page.type('#bootstrap-username', 'admin')
  await page.type('#bootstrap-password', 'admin123')
  await page.type('#bootstrap-name', 'Pentadbir Sistem')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cipta Akaun Pentadbir'))
    btn.click()
  })
  await sleep(2500)
  let url = page.url()
  console.log(`BOOTSTRAP: redirected to dashboard=${url.includes('/dashboard')}`)

  // 3. Dashboard: subtle Laman Tempahan link -> booking page
  link = await linkHref('/')
  console.log(`DASHBOARD: / link=${JSON.stringify(link)}`)
  await clickLink('/')
  await sleep(1500)
  console.log(`DASHBOARD: click navigated to booking page=${page.url() === `${BASE}/`}`)

  // 4. Booking page (logged in): Papan Pemuka link -> dashboard
  link = await linkHref('/dashboard')
  console.log(`PUBLIC-LOGGED-IN: /dashboard link=${JSON.stringify(link)}`)
  await clickLink('/dashboard')
  await sleep(1500)
  url = page.url()
  console.log(`PUBLIC-LOGGED-IN: click navigated to dashboard=${url.includes('/dashboard')}`)

  // 5. Booking page logged in: no Log Masuk link
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1500)
  link = await linkHref('/login')
  console.log(`PUBLIC-LOGGED-IN: /login link absent=${link === null}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('HEADER LINKS E2E FAILED:', err.message)
  process.exit(1)
})
