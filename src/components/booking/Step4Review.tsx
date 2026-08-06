import { useState } from 'react'
import { CalendarCheck2, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateDisplay, formatDateForDB, formatTime12h, isPastDate, isSlotPast } from '@/lib/datetime'
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
  const { date, timeSlotIds, teacherId, className, purpose, reset, setStep } = useBookingFormStore()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitMutation = useSubmitBooking()

  const { data: teachers } = useTeachers(true)
  const { data: slots } = useTimeSlots(true)
  const { refetch } = useBookingsForDate(date)

  const teacher = teachers?.find((t) => t.id === teacherId)
  const selectedSlots =
    (slots ?? [])
      .filter((s) => timeSlotIds.includes(s.id))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)) ?? []

  const slotTimes =
    selectedSlots.length > 0 ? (
      <div className="space-y-1">
        {selectedSlots.map((s) => (
          <p key={s.id}>
            {formatTime12h(s.start_time)} – {formatTime12h(s.end_time)}
          </p>
        ))}
      </div>
    ) : (
      '-'
    )

  const handleSubmit = async () => {
    if (!date || timeSlotIds.length === 0 || !teacherId) return
    if (isPastDate(date)) {
      toast.error('Maaf, tarikh ini sudah berlalu. Sila pilih tarikh lain.')
      setSubmitting(false)
      onBackToSlots()
      return
    }
    if (selectedSlots.some((s) => isSlotPast(date, s.start_time))) {
      toast.error('Maaf, salah satu slot telah bermula. Sila pilih slot lain.')
      setSubmitting(false)
      onBackToSlots()
      return
    }
    setSubmitting(true)
    try {
      const { data: freshBookings } = await refetch()
      const takenSlots = freshBookings?.filter((b) => timeSlotIds.includes(b.time_slot_id)) ?? []
      if (takenSlots.length > 0) {
        toast.error('Maaf, salah satu slot baru sahaja ditempah oleh orang lain. Sila pilih slot lain.')
        setSubmitting(false)
        onBackToSlots()
        return
      }
      await submitMutation.mutateAsync({
        booking_date: formatDateForDB(date),
        time_slot_ids: timeSlotIds,
        teacher_id: teacherId,
        class_name: className.trim(),
        purpose: purpose.trim(),
      })
      toast.success(`Tempahan berjaya untuk ${timeSlotIds.length} slot!`)
      setSubmitted(true)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        toast.error('Maaf, salah satu slot baru sahaja ditempah oleh orang lain. Sila pilih slot lain.')
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
            <div className="text-left">
              <span className="font-medium text-muted-foreground">Slot: </span>
              {slotTimes}
            </div>
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
       <CardContent className="space-y-5 px-4 sm:px-6">
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <SummaryRow label="Tarikh" value={date ? formatDateDisplay(date) : '-'} />
          <Separator />
          <SummaryRow label="Slot Masa" value={slotTimes} />
          <Separator />
          <SummaryRow label="Bilangan Slot" value={selectedSlots.length > 0 ? `${selectedSlots.length} slot` : '-'} />
          <Separator />
          <SummaryRow label="Nama Guru" value={teacher?.full_name ?? '-'} />
          <Separator />
          <SummaryRow label="Kelas" value={className || '-'} />
          <Separator />
          <SummaryRow label="Tujuan Tempahan" value={purpose || '-'} />
        </div>

         <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
           <Button className="min-h-11 w-full sm:w-auto" variant="ghost" onClick={onBack} disabled={submitting}>
            Kembali
          </Button>
           <Button className="min-h-11 w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hantar Tempahan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="text-right font-medium">{value}</div>
    </div>
  )
}
