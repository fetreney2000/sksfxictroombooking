import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
  page.on('dialog', async (d) => d.dismiss())

  const dump = async (label) => {
    const info = await page.evaluate(() => {
      let stored = null
      try {
        stored = localStorage.getItem('tempahan-auth')
      } catch {
        stored = '<error>'
      }
      let parsed = null
      try {
        parsed = stored ? JSON.parse(stored) : null
      } catch {
        parsed = '<bad-json>'
      }
      return {
        url: location.pathname,
        stored: stored ? stored.slice(0, 160) : stored,
        tokenInStorage: Boolean(parsed?.state?.token),
        userInStorage: parsed?.state?.user ? parsed.state.user.username ?? '<obj>' : null,
        bodyText: document.body.innerText.slice(0, 200).replace(/\n/g, ' | '),
      }
    })
    console.log(`[${label}] url=${info.url}`)
    console.log(`   storage: token=${info.tokenInStorage} user=${info.userInStorage}`)
    console.log(`   body: ${info.bodyText}`)
  }

  const has = async (text) => (await page.evaluate((t) => document.body.innerText.includes(t), text))
  const clickByText = async (text, tag = 'button') => {
    await page.evaluate(
      (t, tg) => {
        const el = Array.from(document.querySelectorAll(tg)).find((b) => b.textContent.includes(t))
        if (el) el.click()
      },
      text,
      tag,
    )
  }

  // Start clean
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 40000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1500)

  // 1. Real login
  await page.type('#username', 'kartini')
  await page.type('#password', '515586')
  await clickByText('Log Masuk')
  await sleep(2500)
  await dump('AFTER LOGIN')
  console.log(`   name visible=${await has('Kartini') || await has('kartini')}`)

  // 2. SPA navigation: /dashboard -> / (booking page) via pushState + popstate
  await page.evaluate(() => {
    history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await sleep(1500)
  await dump('SPA -> /')
  console.log(`   booking heading=${await has('Tempah Slot Bilik ICT')}`)

  // 3. SPA back to /dashboard
  await page.evaluate(() => {
    history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await sleep(1500)
  await dump('SPA -> /dashboard')
  console.log(`   name visible=${await has('Kartini') || await has('kartini')}`)

  // 4. FULL RELOAD at / (the realistic "go to booking page" path)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(1500)
  await dump('RELOAD at /')
  console.log(`   booking heading=${await has('Tempah Slot Bilik ICT')}`)

  // 5. Navigate to /dashboard (full reload)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(2000)
  await dump('RELOAD -> /dashboard')
  console.log(`   name visible=${await has('Kartini') || await has('kartini')}`)
  const linkCount = await page.evaluate(() => document.querySelectorAll('a[href]').length)
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
  )
  console.log(`   linkCount=${linkCount}`)
  console.log(`   links=${JSON.stringify(links.slice(0, 12))}`)

  // 6. Try to reach /login from the possibly-broken state
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 40000 })
  await sleep(2000)
  await dump('-> /login')
  console.log(`   login form=${await has('Log Masuk')}`)

  // 7. Dump full storage and call me() directly with the stored token
  const raw = await page.evaluate(() => localStorage.getItem('tempahan-auth'))
  console.log('--- full tempahan-auth storage ---')
  console.log(raw)
  if (raw) {
    const parsed = JSON.parse(raw)
    const token = parsed?.state?.token
    if (token) {
      const { readFileSync } = await import('node:fs')
      const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8')
      const env = {}
      for (const line of envContent.split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
        if (m) env[m[1]] = m[2].trim()
      }
      const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/me`, {
        method: 'POST',
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: token }),
      })
      console.log(`--- direct me() call with stored token: HTTP ${res.status} ---`)
      console.log(await res.text())
    }
  }

  console.log('--- console errors ---')
  for (const e of consoleErrors) console.log('  - ' + e)

  await browser.close()
}

main().catch((err) => {
  console.error('REPRO FAILED:', err.message)
  process.exit(1)
})
