import { useMemo, useState } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateCompact, formatDateTimeDisplay, formatTime12h } from '@/lib/datetime'
import { useAllBookings } from '@/hooks/useBookings'
import { useTeachers } from '@/hooks/useTeachers'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import type { BookingWithDetails } from '@/types/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ReportsPage() {
  const { data: bookings, isLoading } = useAllBookings()
  const { data: teachers } = useTeachers(true)
  const { data: slots } = useTimeSlots(true)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('')

  const filtered = useMemo(() => {
    const list = bookings ?? []
    return list.filter((b) => {
      if (dateFrom && b.booking_date < dateFrom) return false
      if (dateTo && b.booking_date > dateTo) return false
      if (teacherFilter !== 'all' && b.teacher_id !== teacherFilter) return false
      if (classFilter && !b.class_name.toLowerCase().includes(classFilter.toLowerCase())) return false
      return true
    })
  }, [bookings, dateFrom, dateTo, teacherFilter, classFilter])

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('Tiada data untuk dieksport.')
      return
    }
    const header = ['Tarikh', 'Slot Masa', 'Nama Guru', 'Kelas', 'Tujuan', 'Tarikh Dibuat']
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = filtered.map((b) => {
      const ts = b.time_slots
      return [
        b.booking_date,
        ts ? `${formatTime12h(ts.start_time)} - ${formatTime12h(ts.end_time)}` : '',
        b.teachers?.full_name ?? '',
        b.class_name,
        b.purpose,
        b.created_at,
      ]
        .map(escape)
        .join(',')
    })
    const csv = [header.map(escape).join(','), ...rows].join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-tempahan-makmal-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Laporan CSV telah dimuat turun.')
  }

  const slotMap = useMemo(() => {
    const map = new Map<string, { start_time: string; end_time: string }>()
    if (slots) for (const s of slots) map.set(s.id, { start_time: s.start_time, end_time: s.end_time })
    return map
  }, [slots])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">Tapisan laporan dan eksport ke fail CSV.</p>
        </div>
        <Button onClick={exportCsv}>
          <FileDown className="mr-2 h-4 w-4" />
          Eksport CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tapisan Laporan</CardTitle>
          <CardDescription>Tapis tempahan mengikut tarikh, guru atau kelas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">Dari Tarikh</Label>
              <Input
                id="report-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">Hingga Tarikh</Label>
              <Input
                id="report-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-teacher">Guru</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger id="report-teacher" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Guru</SelectItem>
                  {teachers?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-class">Kelas</Label>
              <Input
                id="report-class"
                placeholder="Contoh: 5 Cerdik"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Hasil Laporan <span className="text-muted-foreground">({filtered.length} tempahan)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">Tiada tempahan sepadan dengan tapisan.</p>
              <p className="text-sm text-muted-foreground">Cuba ubah tapisan atau jarak tarikh.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Slot Masa</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Tarikh Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 50).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateCompact(new Date(`${b.booking_date}T00:00:00.000Z`))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatSlot(slotMap, b)}
                      </TableCell>
                      <TableCell>{b.teachers?.full_name ?? '-'}</TableCell>
                      <TableCell>{b.class_name}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="line-clamp-2">{b.purpose}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTimeDisplay(b.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 50 && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Paparan 50 tempahan pertama. Eksport CSV untuk senarai penuh.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatSlot(slotMap: Map<string, { start_time: string; end_time: string }>, b: BookingWithDetails): string {
  const slot = slotMap.get(b.time_slot_id)
  return slot ? `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}` : '-'
}
