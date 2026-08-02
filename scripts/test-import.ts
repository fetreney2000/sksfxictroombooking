import { readFileSync } from 'node:fs'
import { parseTeacherNamesFromExcel } from '../src/lib/importTeachers'

const bytes = readFileSync(new URL('./fixtures/guru.xlsx', import.meta.url))
const file = new File([bytes], 'guru.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
})

const result = await parseTeacherNamesFromExcel(file, ['Cikgu Siti Aminah'])

const expectedNames = ['Cikgu Fatimah Zahra', 'Cikgu Harith Iskandar', 'Cikgu Aina Sofea']
const pass =
  JSON.stringify(result.names) === JSON.stringify(expectedNames) &&
  result.total === 6 &&
  result.invalid === 1 &&
  result.duplicates === 2

console.log('names:', JSON.stringify(result.names))
console.log('total:', result.total, 'invalid:', result.invalid, 'duplicates:', result.duplicates)
console.log(pass ? 'PASS' : 'FAIL')

if (!pass) process.exit(1)
