import { useState } from 'react'
import { CalendarCheck2, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateDisplay, formatDateForDB, formatTime12h } from '@/lib/datetime'
import { useBookingFormStore } from '@/store/bookingFormStore'
import { useBookingsForDate, useSubmitBooking } from '@/hooks/useBookings'
import { useTeachers } from '@/hooks/useTeachers'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Step4ReviewProps {
  onBack: () => void
  onBackToSlots: () => void
}

export function Step4Review({ onBack, onBackToSlots }: Step4ReviewProps) {
  const { date, timeSlotId, teacherId, className, purpose, reset, setStep } = useBookingFormStore()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitMutation = useSubmitBooking()

  const { data: teachers } = useTeachers(true)
  const { data: slots } = useTimeSlots(true)
  const { refetch } = useBookingsForDate(date)

  const teacher = teachers?.find((t) => t.id === teacherId)
  const slot = slots?.find((s) => s.id === timeSlotId)

  const handleSubmit = async () => {
    if (!date || !timeSlotId || !teacherId) return
    setSubmitting(true)
    try {
      const { data: freshBookings } = await refetch()
      const slotTaken = freshBookings?.some((b) => b.time_slot_id === timeSlotId) ?? false
      if (slotTaken) {
        toast.error('Maaf, slot ini baru sahaja ditempah oleh orang lain. Sila pilih slot lain.')
        setSubmitting(false)
        onBackToSlots()
        return
      }
      await submitMutation.mutateAsync({
        booking_date: formatDateForDB(date),
        time_slot_id: timeSlotId,
        teacher_id: teacherId,
        class_name: className.trim(),
        purpose: purpose.trim(),
      })
      toast.success('Tempahan berjaya!')
      setSubmitted(true)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        toast.error('Maaf, slot ini baru sahaja ditempah oleh orang lain. Sila pilih slot lain.')
        onBackToSlots()
      } else {
        toast.error('Tempahan gagal, sila cuba lagi.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">Tempahan berjaya!</h3>
          <p className="text-sm text-muted-foreground">Tempahan anda telah diterima. Maklumat ringkas:</p>
          <div className="w-full max-w-sm space-y-1.5 rounded-lg border bg-muted/40 p-4 text-sm text-left">
            <p>
              <span className="font-medium text-muted-foreground">Tarikh: </span>
              {date ? formatDateDisplay(date) : '-'}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Slot: </span>
              {slot ? `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}` : '-'}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Guru: </span>
              {teacher?.full_name ?? '-'}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Kelas: </span>
              {className}
            </p>
          </div>
          <Button
            onClick={() => {
              reset()
              setStep(1)
            }}
          >
            <CalendarCheck2 className="mr-2 h-4 w-4" />
            Tempahan Baharu
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semak & Hantar</CardTitle>
        <CardDescription>Sila semak maklumat tempahan anda sebelum menghantar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <SummaryRow label="Tarikh" value={date ? formatDateDisplay(date) : '-'} />
          <Separator />
          <SummaryRow
            label="Slot Masa"
            value={slot ? `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}` : '-'}
          />
          <Separator />
          <SummaryRow label="Nama Guru" value={teacher?.full_name ?? '-'} />
          <Separator />
          <SummaryRow label="Kelas" value={className || '-'} />
          <Separator />
          <SummaryRow label="Tujuan Tempahan" value={purpose || '-'} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            Kembali
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hantar Tempahan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
