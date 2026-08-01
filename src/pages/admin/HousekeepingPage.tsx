import { useState } from 'react'
import { CalendarX2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateCompact, formatDateForDB, getTodayInKL } from '@/lib/datetime'
import { useAllBookings } from '@/hooks/useBookings'
import { useBlockedDates } from '@/hooks/useBlockedDates'
import { useAddBlockedDate, useRemoveBlockedDate } from '@/hooks/mutations'
import { BookingsTable } from '@/components/tables/BookingsTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export function HousekeepingPage() {
  const { data: blockedDates, isLoading: blockedLoading } = useBlockedDates()
  const { data: bookings, isLoading, isError } = useAllBookings()
  const addBlockedDate = useAddBlockedDate()
  const removeBlockedDate = useRemoveBlockedDate()

  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = getTodayInKL()
  const todayStr = formatDateForDB(today)

  const handleAdd = async () => {
    if (!date) {
      toast.error('Sila pilih tarikh.')
      return
    }
    if (date < todayStr) {
      toast.error('Tarikh sudah lepas dan tidak boleh disekat.')
      return
    }
    setSubmitting(true)
    try {
      await addBlockedDate.mutateAsync({ blocked_date: date, reason: reason.trim() || undefined })
      toast.success('Tarikh telah disekat.')
      setDate('')
      setReason('')
    } catch (err) {
      const code = (err as { code?: string })?.code
      toast.error(code === '23505' ? 'Tarikh ini sudah disekat.' : 'Gagal menyekat tarikh.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeBlockedDate.mutateAsync(id)
      toast.success('Tarikh tidak lagi disekat.')
    } catch {
      toast.error('Gagal membuka sekatan tarikh.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Urus Tarikh</h1>
        <p className="text-sm text-muted-foreground">
          Sekat tarikh (cuti sekolah, hari peperiksaan) supaya tidak boleh ditempah, dan urus tempahan sedia ada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sekat Tarikh</CardTitle>
          <CardDescription>Tarikh yang disekat tidak akan boleh dipilih dalam borang tempahan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="block-date">Tarikh</Label>
              <Input
                id="block-date"
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="block-reason">Sebab (pilihan)</Label>
              <Input
                id="block-reason"
                placeholder="Contoh: Cuti perayaan, Hari peperiksaan"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
              />
            </div>
            <Button onClick={handleAdd} disabled={submitting}>
              <Plus className="mr-2 h-4 w-4" />
              Sekat Tarikh
            </Button>
          </div>

          <Separator />

          {blockedLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : blockedDates && blockedDates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CalendarX2 className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Tiada tarikh disekat pada masa ini.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {blockedDates
                ?.slice()
                .sort((a, b) => b.blocked_date.localeCompare(a.blocked_date))
                .map((bd) => (
                  <li
                    key={bd.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatDateCompact(new Date(`${bd.blocked_date}T00:00:00.000Z`))}</Badge>
                      {bd.reason && <span className="text-sm text-muted-foreground">{bd.reason}</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(bd.id)}
                      aria-label="Buka sekatan tarikh"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Urus Tempahan</CardTitle>
          <CardDescription>Sunting atau padam mana-mana tempahan sedia ada.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingsTable data={bookings} isLoading={isLoading} isError={isError} canManage />
        </CardContent>
      </Card>
    </div>
  )
}
