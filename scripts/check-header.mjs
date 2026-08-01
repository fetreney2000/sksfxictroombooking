import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1200))

const btnBox = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Log Masuk'))
  if (!btn) return null
  const r = btn.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
console.log(`HEADER: Log Masuk button found=${Boolean(btnBox)}`)
if (btnBox) {
  await page.mouse.click(btnBox.x, btnBox.y)
  await new Promise((r) => setTimeout(r, 800))
  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"]')).map((el) => el.textContent.trim()),
  )
  console.log(`HEADER: menu items=[${items.join(' | ')}]`)
  const penyelia = items.some((i) => i.includes('Penyelia'))
  const pentadbir = items.some((i) => i.includes('Pentadbir'))
  console.log(`HEADER: accommodates Penyelia=${penyelia}, Pentadbir=${pentadbir}`)
}
await browser.close()
