import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:5173'
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
  await new Promise((r) => setTimeout(r, 1500))

  // Step 1: calendar present
  const dayButtons = await page.$$('button[aria-label]')
  console.log(`Calendar day buttons found: ${dayButtons.length}`)

  // "Seterusnya" should be disabled with no date selected
  const nextDisabled = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const next = buttons.find((b) => b.textContent.trim() === 'Seterusnya')
    return next ? next.disabled : 'not-found'
  })
  console.log(`Seterusnya disabled (no date): ${nextDisabled}`)

  // Count disabled day cells (past/weekend in current month view)
  const disabledDays = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button[disabled]')).length
  })
  console.log(`Disabled calendar cells: ${disabledDays}`)

  // Click a weekday in the future, e.g. Monday 2026-08-03 (if visible this month)
  const clicked = await page.evaluate(() => {
    const today = new Date()
    const monday = new Date(Date.UTC(2026, 7, 3)) // 2026-08-03
    const buttons = Array.from(document.querySelectorAll('button[aria-label]'))
    const target = buttons.find((b) => b.getAttribute('aria-label') === monday.toISOString())
    if (!target) return 'not-found'
    target.click()
    return 'clicked'
  })
  console.log(`Click 2026-08-03: ${clicked}`)

  await new Promise((r) => setTimeout(r, 800))
  const bodyText = await page.evaluate(() => document.body.innerText)
  console.log(`Shows selected date text: ${bodyText.includes('Tarikh dipilih')}`)

  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  - ' + e)
  } else {
    console.log('No console errors.')
  }

  await browser.close()
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message)
  process.exit(1)
})
