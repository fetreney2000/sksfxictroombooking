import { readFileSync } from 'node:fs'

const content = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const env = {}
for (const line of content.split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].trim()
}

const username = process.argv[2]
const password = process.argv[3]
if (!username || !password) {
  console.error('Usage: node scripts/verify-login.mjs <username> <password>')
  process.exit(1)
}

const headers = {
  apikey: env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}
const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/login`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ p_username: username, p_password: password }),
})
const data = await res.json()
if (data && data.user) {
  console.log(`LOGIN OK: role=${data.user.role} username=${data.user.username} full_name=${data.user.full_name}`)
} else {
  console.log(`LOGIN FAILED: ${JSON.stringify(data)}`)
}
