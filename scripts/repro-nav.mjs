import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const users = new Map()
const sessions = new Map()
let uid = 1
let tok = 1

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 }) // mobile

  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_NAME_NOT_RESOLVED')) consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`))

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (!url.includes('supabase.co')) {
      req.continue()
      return
    }
    const u = new URL(url)
    const method = req.method()
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*',
      'content-type': 'application/json',
    }
    if (method === 'OPTIONS') {
      req.respond({ status: 204, headers: cors, body: '' })
      return
    }
    const path = u.pathname
    const body = req.postData() ? JSON.parse(req.postData()) : null
    const rpcName = path.split('/').pop()

    if (method === 'POST' && path.includes('/rpc/')) {
      let payload = null
      if (rpcName === 'has_users') payload = users.size > 0
      else if (rpcName === 'bootstrap_admin') {
        const id = uuid(uid++)
        users.set(body.p_username.toLowerCase(), {
          id,
          username: body.p_username.toLowerCase(),
          password: body.p_password,
          full_name: body.p_full_name,
          role: 'admin',
          is_active: true,
          created_at: 'x',
        })
        payload = id
      } else if (rpcName === 'login') {
        const user = users.get(body.p_username.toLowerCase())
        if (user && user.password === body.p_password && user.is_active) {
          const token = `tok-${tok++}`
          sessions.set(token, user.username)
          payload = {
            token,
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
          }
        } else payload = null
      } else if (rpcName === 'me') {
        const username = sessions.get(body?.p_token)
        const user = username ? users.get(username) : null
        payload = user
          ? { id: user.id, username: user.username, full_name: user.full_name, role: user.role, is_active: user.is_active }
          : null
      } else if (rpcName === 'logout') {
        if (body?.p_token) sessions.delete(body.p_token)
        payload = null
      } else if (rpcName === 'admin_list_users') {
        payload = Array.from(users.values()).map((u) => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
        }))
      }
      req.respond({ status: 200, headers: cors, body: JSON.stringify(payload) })
      return
    }

    // Public reads
    const empty = ['time_slots', 'teachers', 'kelas', 'tujuan_tempahan', 'blocked_dates', 'bookings']
    if (method === 'GET' && empty.some((e) => path.endsWith('/' + e))) {
      req.respond({ status: 200, headers: cors, body: '[]' })
      return
    }
    req.respond({ status: 404, headers: cors, body: '{}' })
  })

  // Bootstrap first admin on the login page
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))
  await page.type('#bootstrap-username', 'admin')
  await page.type('#bootstrap-password', 'admin123')
  await page.type('#bootstrap-name', 'Pentadbir Sistem')
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cipta Akaun Pentadbir')).click()
  })
  await new Promise((r) => setTimeout(r, 2000))
  console.log(`LOGIN -> dashboard: ${page.url().includes('/dashboard')}`)

  // Go to booking page
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))
  const bookingText = await page.evaluate(() => document.body.innerText)
  console.log(`BOOKING page renders: ${bookingText.includes('Tempah Slot Bilik ICT')}`)

  // Now go to dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1800))
  const text = await page.evaluate(() => document.body.innerText)
  console.log(`DASHBOARD renders heading: ${text.includes('Papan Pemuka')}`)
  console.log(`DASHBOARD shows user name: ${text.includes('Pentadbir Sistem')}`)

  // Check bottom nav presence and clickability on mobile
  const nav = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter((a) => a.getAttribute('href'))
    const navLinks = links.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 30) }))
    return navLinks
  })
  console.log('LINKS on dashboard:')
  for (const l of nav.slice(0, 15)) console.log(`  ${l.href} :: ${l.text}`)

  // Click "Semua Tempahan" if present
  const clicked = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((el) => el.getAttribute('href')?.includes('/bookings'))
    if (!a) return false
    a.click()
    return true
  })
  await new Promise((r) => setTimeout(r, 1200))
  console.log(`Clicked bookings link: ${clicked} -> url=${page.url().replace(BASE, '')}`)

  // Bottom nav visibility on mobile
  const bottomNav = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigasi utama"]')
    if (!nav) return { found: false }
    const r = nav.getBoundingClientRect()
    const sidebar = Array.from(document.querySelectorAll('aside')).find((a) => a.offsetParent !== null)
    return {
      found: true,
      visible: r.width > 0 && r.height > 0,
      bottom: Math.round(r.bottom),
      viewport: window.innerHeight,
      desktopSidebarVisible: Boolean(sidebar),
    }
  })
  console.log(`MOBILE bottom nav: ${JSON.stringify(bottomNav)}`)

  // Desktop viewport: bottom nav hidden, sidebar visible
  await page.setViewport({ width: 1280, height: 800 })
  await new Promise((r) => setTimeout(r, 600))
  const desktop = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigasi utama"]')
    const r = nav ? nav.getBoundingClientRect() : null
    const sidebar = Array.from(document.querySelectorAll('aside')).find((a) => a.offsetParent !== null)
    return { bottomNavVisible: r ? r.width > 0 && r.height > 0 : false, sidebarVisible: Boolean(sidebar) }
  })
  console.log(`DESKTOP: bottom nav visible=${desktop.bottomNavVisible}, sidebar visible=${desktop.sidebarVisible}`)

  console.log('CONSOLE ERRORS:')
  for (const e of consoleErrors.slice(0, 10)) console.log('  ' + e)

  await browser.close()
}

main().catch((err) => {
  console.error('REPRO FAILED:', err.message)
  process.exit(1)
})
