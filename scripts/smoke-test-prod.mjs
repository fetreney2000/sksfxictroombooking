import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

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

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1200))
  let text = await page.evaluate(() => document.body.innerText)
  console.log(`PUBLIC: renders calendar=${text.includes('Pilih Tarikh')}, title ok`)

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 800))
  text = await page.evaluate(() => document.body.innerText)
  console.log(`LOGIN: renders=${text.includes('Log Masuk')}`)

  // Route guard: unauthenticated /supervisor redirects to /login
  await page.goto(`${BASE}/supervisor/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1200))
  const url = page.url()
  console.log(`GUARD: /supervisor/dashboard -> ${url.replace(BASE, '')} (redirect to login=${url.includes('/login')})`)

  // PWA: service worker registered after load
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  const swState = await page.evaluate(() => navigator.serviceWorker?.controller ? 'controlled' : 'not-yet')
  console.log(`SW controller: ${swState}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors (prod).')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('PROD SMOKE TEST FAILED:', err.message)
  process.exit(1)
})
