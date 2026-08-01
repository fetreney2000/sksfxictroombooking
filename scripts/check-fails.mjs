import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
const fails = []
page.on('requestfailed', (req) => fails.push(`${req.url()} :: ${req.failure()?.errorText}`))
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1500))
console.log('FAILED REQUESTS:')
for (const f of fails) console.log('  ' + f)
await browser.close()
