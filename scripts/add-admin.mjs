import { readFileSync } from 'node:fs'

// Load VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env
function loadEnv() {
  const content = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tiada dalam .env')
  process.exit(1)
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
}

async function rpc(name, args) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  })
  const text = await res.text()
  if (!res.ok) {
    let parsed = text
    try {
      parsed = JSON.parse(text)
    } catch {
      /* keep raw */
    }
    const message = typeof parsed === 'object' && parsed ? parsed.message : text
    return { ok: false, message, code: typeof parsed === 'object' && parsed ? parsed.code : undefined }
  }
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { ok: true, data }
}

const hasUsers = await rpc('has_users', {})
console.log(`has_users: ${JSON.stringify(hasUsers)}`)

if (hasUsers.data === true) {
  console.error('Pengguna sudah wujud. bootstrap_admin tidak boleh digunakan.')
  process.exit(2)
}

const result = await rpc('bootstrap_admin', {
  p_username: 'kartini',
  p_password: process.argv[2] ?? '515586',
  p_full_name: process.argv[3] ?? 'Kartini',
})
if (result.ok) {
  console.log(`SUCCESS: akaun admin 'kartini' dicipta (id: ${result.data})`)
} else {
  console.error(`FAILED: ${result.message}`)
  process.exit(1)
}
