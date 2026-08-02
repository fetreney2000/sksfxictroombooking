import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const FIXTURE = new URL('./fixtures/guru.xlsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const users = new Map()
const sessions = new Map()
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const EXISTING_TEACHERS = [
  { id: uuid(3), full_name: 'Cikgu Siti Aminah', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: uuid(4), full_name: 'Cikgu Ahmad Faizal', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
]

function apiError(code, message) {
  return { code, message, details: null, hint: null }
}

let importedNames = null

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

    const currentUser = () => {
      if (!body?.p_token) return null
      const username = sessions.get(body.p_token)
      if (!username) return null
      return users.get(username) ?? null
    }
    const requireAdmin = () => {
      const user = currentUser()
      if (!user || user.role !== 'admin') {
        req.respond({ status: 403, headers: corsHeaders, body: JSON.stringify(apiError('P0001', 'Tidak dibenarkan.')) })
        return null
      }
      return user
    }

    const rpcName = path.split('/').pop()

    if (method === 'POST' && path.includes('/rpc/')) {
      let payload = null
      let status = 200
      if (rpcName === 'has_users') {
        payload = users.size > 0
      } else if (rpcName === 'bootstrap_admin') {
        const id = uuid(1)
        users.set(body.p_username.toLowerCase(), {
          id,
          username: body.p_username.toLowerCase(),
          password: body.p_password,
          full_name: body.p_full_name,
          role: 'admin',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        payload = id
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
        const user = currentUser()
        payload = user
          ? { id: user.id, username: user.username, full_name: user.full_name, role: user.role, is_active: user.is_active }
          : null
      } else if (rpcName === 'logout') {
        if (body?.p_token) sessions.delete(body.p_token)
        payload = null
      } else if (rpcName === 'admin_import_teachers') {
        if (!requireAdmin()) return
        importedNames = Array.isArray(body.p_names) ? body.p_names : []
        payload = importedNames.length
      }
      req.respond({ status, headers: corsHeaders, body: JSON.stringify(payload) })
      return
    }

    if (method === 'GET' && path.endsWith('/teachers')) {
      req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify(EXISTING_TEACHERS) })
      return
    }
    if (
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
  const clickByText = (text) =>
    page.evaluate((t) => {
      const el = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes(t))
      if (el) el.click()
      return Boolean(el)
    }, text)

  // Bootstrap admin
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 40000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1200)
  await page.type('#bootstrap-username', 'admin')
  await page.type('#bootstrap-password', 'admin123')
  await page.type('#bootstrap-name', 'Pentadbir Sistem')
  await clickByText('Cipta Akaun Pentadbir')
  await sleep(2000)
  let text = await page.evaluate(() => document.body.innerText)
  console.log(`BOOTSTRAP: dashboard=${text.includes('Papan Pemuka')}`)

  // Go to teachers page
  await page.goto(`${BASE}/admin/teachers`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1500)
  text = await page.evaluate(() => document.body.innerText)
  console.log(`PAGE: teachers page=${text.includes('Urus Guru')}`)
  console.log(`PAGE: import button=${text.includes('Import Excel')}`)

  // Open the import dialog and verify the info/spec
  await clickByText('Import Excel')
  await sleep(800)
  text = await page.evaluate(() => document.body.innerText)
  console.log(`DIALOG: title=${text.includes('Import Senarai Guru dari Excel')}`)
  console.log(`DIALOG: client-side note=${text.includes('tiada fail dimuat naik ke pelayan')}`)
  console.log(`DIALOG: spec sheet=${text.includes('nama guru')}`)
  console.log(`DIALOG: spec column=${text.includes('Lajur B')}`)

  // Upload the fixture Excel file
  const input = await page.$('#import-file')
  await input.uploadFile(FIXTURE)
  await sleep(2000)
  text = await page.evaluate(() => document.body.innerText)
  console.log(`PARSE: summary shown=${text.includes('Akan ditambah')}`)
  console.log(`PARSE: count 3=${text.includes('3')}`)
  console.log(`PARSE: lists first name=${text.includes('Cikgu Fatimah Zahra')}`)

  // Import
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Import')
    if (el) el.click()
    return Boolean(el)
  })
  await sleep(2000)
  text = await page.evaluate(() => document.body.innerText)
  console.log(`IMPORT: toast=${text.includes('3 guru telah diimport')}`)
  console.log(`IMPORT: dialog closed=${!text.includes('Import Senarai Guru dari Excel')}`)
  console.log(`IMPORT: rpc names=${JSON.stringify(importedNames)}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('E2E IMPORT FAILED:', err.message)
  process.exit(1)
})
