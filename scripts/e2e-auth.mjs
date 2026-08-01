import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

// --- Mock in-memory backend ------------------------------------------------
const users = new Map() // username -> { id, username, password, full_name, role, is_active, created_at }
const sessions = new Map() // token -> username

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function apiError(code, message) {
  return { code, message, details: null, hint: null }
}

// --- Puppeteer setup --------------------------------------------------------
async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_NAME_NOT_RESOLVED')) consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`))

  const nextUserId = { n: 1 }
  const nextToken = { n: 1 }

  await page.setRequestInterception(true)
  const seen = []
  page.on('request', (req) => {
    if (req.url().includes('supabase.co')) seen.push(`${req.method()} ${req.url().slice(0, 120)}`)
  })
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

    const currentUser = () => {
      if (!body?.p_token) return null
      const username = sessions.get(body.p_token)
      if (!username) return null
      return users.get(username) ?? null
    }
    const requireAdmin = () => {
      const u = currentUser()
      if (!u || u.role !== 'admin') {
        req.respond({ status: 403, headers: corsHeaders, body: JSON.stringify(apiError('P0001', 'Tidak dibenarkan.')) })
        return null
      }
      return u
    }

    const rpcName = path.split('/').pop()

    if (method === 'POST' && path.includes('/rpc/')) {
      let payload = null
      let status = 200
      if (rpcName === 'has_users') {
        payload = users.size > 0
      } else if (rpcName === 'bootstrap_admin') {
        if (users.size > 0) {
          status = 400
          payload = apiError('P0002', 'Pengguna pertama telah wujud.')
        } else {
          const id = uuid(nextUserId.n++)
          users.set(body.p_username.toLowerCase(), {
            id,
            username: body.p_username.toLowerCase(),
            password: body.p_password,
            full_name: body.p_full_name,
            role: 'admin',
            is_active: true,
            created_at: '2026-08-01T08:00:00.000Z',
          })
          payload = id
        }
      } else if (rpcName === 'login') {
        const user = users.get(body.p_username.toLowerCase())
        if (user && user.password === body.p_password && user.is_active) {
          const token = `tok-${nextToken.n++}`
          sessions.set(token, user.username)
          payload = {
            token,
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
          }
        } else {
          payload = null
        }
      } else if (rpcName === 'me') {
        const u = currentUser()
        payload = u ? { id: u.id, username: u.username, full_name: u.full_name, role: u.role, is_active: u.is_active } : null
      } else if (rpcName === 'logout') {
        if (body?.p_token) sessions.delete(body.p_token)
        payload = null
      } else if (rpcName === 'admin_list_users') {
        if (!requireAdmin()) return
        payload = Array.from(users.values()).map((u) => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
        }))
      } else if (rpcName === 'admin_create_user') {
        if (!requireAdmin()) return
        const id = uuid(nextUserId.n++)
        users.set(body.p_username.toLowerCase(), {
          id,
          username: body.p_username.toLowerCase(),
          password: body.p_password,
          full_name: body.p_full_name,
          role: body.p_role,
          is_active: true,
          created_at: '2026-08-01T09:00:00.000Z',
        })
        payload = id
      } else if (rpcName === 'admin_update_user') {
        if (!requireAdmin()) return
        const target = Array.from(users.values()).find((u) => u.id === body.p_user_id)
        if (target) {
          target.full_name = body.p_full_name
          target.role = body.p_role
          target.is_active = body.p_is_active
          if (body.p_new_password) target.password = body.p_new_password
        }
        payload = null
      }

      req.respond({ status, headers: corsHeaders, body: JSON.stringify(payload) })
      return
    }

    // Public read queries used by dashboard / tables
    if (method === 'GET' && path.endsWith('/time_slots')) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    if (method === 'GET' && path.endsWith('/teachers')) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    if (method === 'GET' && path.endsWith('/blocked_dates')) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }
    if (method === 'GET' && path.endsWith('/bookings')) {
      req.respond({ status: 200, headers: corsHeaders, body: '[]' })
      return
    }

    req.respond({ status: 404, headers: corsHeaders, body: '{}' })
  })

  // ------------------------------------------------------------
  // TEST 1: unauthenticated guard redirect
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))
  let url = page.url()
  console.log(`GUARD: /admin/dashboard -> ${url.replace(BASE, '')} (redirect=${url.includes('/login')})`)

  // TEST 2: bootstrap card visible (no users yet)
  let text = await page.evaluate(() => document.body.innerText)
  console.log(`BOOTSTRAP: card shown=${text.includes('Persediaan Akaun Pentadbir Pertama')}`)
  console.log(`PAGE URL: ${page.url()}`)
  console.log('--- requests seen ---')
  for (const s of seen) console.log('  ' + s)
  console.log(`--- console errors so far (${consoleErrors.length}) ---`)
  for (const e of consoleErrors.slice(0, 8)) console.log('  ' + e)

  // TEST 3: create first admin via the setup form
  await page.type('#bootstrap-username', 'admin')
  await page.type('#bootstrap-password', 'admin123')
  await page.type('#bootstrap-name', 'Pentadbir Sistem')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cipta Akaun Pentadbir'))
    btn.click()
  })
  await new Promise((r) => setTimeout(r, 2000))
  url = page.url()
  text = await page.evaluate(() => document.body.innerText)
  console.log(`BOOTSTRAP: redirected to dashboard=${url.includes('/admin/dashboard')}`)
  console.log(`BOOTSTRAP: dashboard renders=${text.includes('Papan Pemuka')}`)

  // TEST 4: logout via user menu (real mouse clicks so Radix opens)
  const triggerBox = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Pentadbir Sistem'))
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  console.log(`LOGOUT: trigger found=${Boolean(triggerBox)}`)
  if (triggerBox) {
    await page.mouse.click(triggerBox.x, triggerBox.y)
    await new Promise((r) => setTimeout(r, 800))
    const logoutBox = await page.evaluate(() => {
      const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
        el.textContent.includes('Log Keluar'),
      )
      if (!item) return null
      const r = item.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    console.log(`LOGOUT: logout item found=${Boolean(logoutBox)}`)
    if (logoutBox) await page.mouse.click(logoutBox.x, logoutBox.y)
  }
  await new Promise((r) => setTimeout(r, 2000))
  url = page.url()
  console.log(`LOGOUT: back to login=${url.includes('/login')} (url=${url.replace(BASE, '')})`)

  // TEST 5: wrong password shows error
  await page.type('#username', 'admin')
  await page.type('#password', 'wrongpass')
  await page.evaluate(() => {
    const submit = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Log Masuk',
    )
    submit.click()
  })
  await new Promise((r) => setTimeout(r, 1200))
  text = await page.evaluate(() => document.body.innerText)
  console.log(`LOGIN: wrong password error=${text.includes('Nama pengguna atau kata laluan salah.')}`)

  // TEST 6: correct login (replace the stale wrong password first)
  await page.evaluate(() => {
    const input = document.querySelector('#password')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'admin123')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 300))
  await page.evaluate(() => {
    const submit = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Log Masuk',
    )
    submit.click()
  })
  await new Promise((r) => setTimeout(r, 2000))
  url = page.url()
  console.log(`LOGIN: redirected to dashboard=${url.includes('/admin/dashboard')} (url=${url.replace(BASE, '')})`)

  // TEST 7: users page — create a supervisor account
  await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  text = await page.evaluate(() => document.body.innerText)
  console.log(`USERS: admin listed=${text.includes('admin') && text.includes('Pentadbir Sistem')}`)

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Tambah Pengguna'))
    btn.click()
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.type('#new-username', 'penyelia1')
  await page.type('#new-password', 'pass1234')
  await page.type('#new-name', 'Cikgu Penyelia')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cipta Akaun'))
    btn.click()
  })
  await new Promise((r) => setTimeout(r, 1500))
  text = await page.evaluate(() => document.body.innerText)
  console.log(`USERS: new supervisor listed=${text.includes('penyelia1') && text.includes('Cikgu Penyelia')}`)

  // TEST 8: supervisor guard — penyelia1 cannot access /admin
  // (clear the admin session, then log in as the new supervisor)
  await page.evaluate(() => localStorage.removeItem('tempahan-auth'))
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  await page.type('#username', 'penyelia1')
  await page.type('#password', 'pass1234')
  await page.evaluate(() => {
    const submit = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Log Masuk',
    )
    submit.click()
  })
  await new Promise((r) => setTimeout(r, 2000))
  url = page.url()
  text = await page.evaluate(() => document.body.innerText)
  console.log(`SUPERVISOR: login redirects to /supervisor/dashboard=${url.includes('/supervisor/dashboard')} (url=${url.replace(BASE, '')})`)

  // Supervisor tries /admin/users -> guard should bounce to /supervisor/dashboard
  await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  url = page.url()
  console.log(`SUPERVISOR: /admin blocked -> ${url.replace(BASE, '')}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('AUTH E2E FAILED:', err.message)
  process.exit(1)
})
