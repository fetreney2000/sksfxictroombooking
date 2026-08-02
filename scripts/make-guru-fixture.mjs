import * as XLSX from 'xlsx'
import { writeFileSync } from 'node:fs'

const rows = [
  [null, 'Nama Guru'],
  [null, 'Cikgu Fatimah Zahra'],
  [null, 'Cikgu Harith Iskandar'],
  [null, 'Cikgu Aina Sofea'],
  [null, ''],
  [null, 'Ab'],
  [null, 'Cikgu Siti Aminah'],
  [null, 'Cikgu Fatimah Zahra'],
]

const ws = XLSX.utils.aoa_to_sheet(rows)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'nama guru')

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
writeFileSync(new URL('./fixtures/guru.xlsx', import.meta.url), buf)
console.log('fixture written: scripts/fixtures/guru.xlsx')
