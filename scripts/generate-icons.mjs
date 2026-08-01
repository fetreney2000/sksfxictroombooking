import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function createCanvas(size) {
  const buf = Buffer.alloc(size * size * 4)
  return {
    buf,
    size,
    set(x, y, r, g, b, a = 255) {
      if (x < 0 || y < 0 || x >= size || y >= size) return
      const i = (y * size + x) * 4
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = a
    },
    fillRect(x0, y0, x1, y1, color) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.set(x, y, ...color)
    },
    fillRoundedRect(x0, y0, x1, y1, radius, color) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const nearTop = y - y0 < radius
          const nearBottom = y1 - y < radius + 1
          const nearLeft = x - x0 < radius
          const nearRight = x1 - x < radius + 1
          let inside = true
          if (nearTop && nearLeft) {
            const dx = x - (x0 + radius)
            const dy = y - (y0 + radius)
            inside = dx * dx + dy * dy <= radius * radius
          } else if (nearTop && nearRight) {
            const dx = x - (x1 - radius - 1)
            const dy = y - (y0 + radius)
            inside = dx * dx + dy * dy <= radius * radius
          } else if (nearBottom && nearLeft) {
            const dx = x - (x0 + radius)
            const dy = y - (y1 - radius - 1)
            inside = dx * dx + dy * dy <= radius * radius
          } else if (nearBottom && nearRight) {
            const dx = x - (x1 - radius - 1)
            const dy = y - (y1 - radius - 1)
            inside = dx * dx + dy * dy <= radius * radius
          }
          if (inside) this.set(x, y, ...color)
        }
      }
    },
    fillTriangle(ax, ay, bx, by, cx, cy, color) {
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
      const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)))
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)))
      const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)))
      const sign = (p1x, p1y, p2x, p2y, p3x, p3y) =>
        (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
      const d1 = sign(bx, by, ax, ay, cx, cy)
      const d2 = sign(cx, cy, bx, by, ax, ay)
      const d3 = sign(ax, ay, cx, cy, bx, by)
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const e1 = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
          const e2 = (x - bx) * (cy - by) - (y - by) * (cx - bx)
          const e3 = (x - cx) * (ay - cy) - (y - cy) * (ax - cx)
          const inTri = hasNeg ? e1 <= 0 && e2 <= 0 && e3 <= 0 : e1 >= 0 && e2 >= 0 && e3 >= 0
          if (inTri) this.set(x, y, ...color)
        }
      }
    },
  }
}

const BLUE = [29, 78, 216] // #1d4ed8
const LIGHT_BLUE = [219, 234, 254] // #dbeafe
const WHITE = [255, 255, 255]

function drawIcon(size) {
  const c = createCanvas(size)
  const s = size / 512
  c.fillRect(0, 0, size, size, BLUE)
  // subtle diagonal highlight band
  c.fillTriangle(0, 0, size, 0, size, size * 0.35, [37, 99, 235])
  // monitor body
  const mx = 116 * s
  const my = 92 * s
  const mw = 280 * s
  const mh = 240 * s
  c.fillRoundedRect(mx, my, mx + mw, my + mh, 24 * s, WHITE)
  // screen
  c.fillRoundedRect(mx + 22 * s, my + 22 * s, mx + mw - 22 * s, my + mh - 22 * s, 14 * s, BLUE)
  // window dots on screen
  const dotR = 12 * s
  const dots = [40 * s, 78 * s, 116 * s]
  for (const dx of dots) {
    for (let y = -dotR; y <= dotR; y++) {
      for (let x = -dotR; x <= dotR; x++) {
        if (x * x + y * y <= dotR * dotR) c.set(mx + 34 * s + dx + x, my + 34 * s + y, ...LIGHT_BLUE)
      }
    }
  }
  // stand
  c.fillTriangle(256 * s - 22 * s, my + mh, 256 * s + 22 * s, my + mh, 256 * s, my + mh + 66 * s, WHITE)
  c.fillRoundedRect(256 * s - 72 * s, my + mh + 56 * s, 256 * s + 72 * s, my + mh + 86 * s, 10 * s, WHITE)
  return c.buf
}

mkdirSync(OUT_DIR, { recursive: true })
for (const size of [192, 512]) {
  const png = encodePng(size, size, drawIcon(size))
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), png)
  console.log(`Generated icon-${size}.png (${png.length} bytes)`)
}

// apple-touch-icon (180x180)
const apple = encodePng(180, 180, drawIcon(180))
writeFileSync(join(__dirname, '..', 'public', 'apple-touch-icon.png'), apple)
console.log(`Generated apple-touch-icon.png (${apple.length} bytes)`)
