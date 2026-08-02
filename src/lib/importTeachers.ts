import readXlsxFile, { type CellValue, type Sheet } from 'read-excel-file/browser'

/** Sheet name expected in the imported Excel file. */
export const IMPORT_SHEET_NAME = 'nama guru'

/** Column index of the teacher names (column B). */
const NAME_COLUMN_INDEX = 1

const HEADER_WORDS = new Set([
  'nama guru',
  'nama penuh',
  'nama',
  'guru',
  'name',
  'teacher',
  'teacher name',
  'cikgu',
])

export interface TeacherImportParseResult {
  /** Unique, valid names that are ready to be imported. */
  names: string[]
  /** Non-empty names found in column B (excluding a header row). */
  total: number
  /** Names skipped because they are shorter than 3 characters. */
  invalid: number
  /** Names skipped because they already exist or repeat within the file. */
  duplicates: number
}

function cellToText(cell: CellValue | null): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return ''
  return String(cell).trim()
}

function isHeaderLike(value: string): boolean {
  return HEADER_WORDS.has(value.toLowerCase())
}

/** Parses an Excel file entirely in the browser (nothing is uploaded).
 *  Expects a sheet named "nama guru" with teacher names in column B,
 *  one name per row. The first row may be a header and is skipped. */
export async function parseTeacherNamesFromExcel(
  file: File,
  existingNames: string[],
): Promise<TeacherImportParseResult> {
  const sheets: Sheet[] = await readXlsxFile(file)
  const sheet = sheets.find((s) => s.sheet.trim().toLowerCase() === IMPORT_SHEET_NAME)
  if (!sheet) {
    throw new Error(`Sheet "${IMPORT_SHEET_NAME}" tidak dijumpai dalam fail.`)
  }

  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  const names: string[] = []
  let total = 0
  let invalid = 0
  let duplicates = 0
  let firstData = true

  for (const row of sheet.data) {
    const name = cellToText(row?.[NAME_COLUMN_INDEX])
    if (!name) continue
    if (firstData) {
      firstData = false
      if (isHeaderLike(name)) continue
    }
    total++
    if (name.length < 3) {
      invalid++
      continue
    }
    const key = name.toLowerCase()
    if (existing.has(key) || seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    names.push(name)
  }

  return { names, total, invalid, duplicates }
}
