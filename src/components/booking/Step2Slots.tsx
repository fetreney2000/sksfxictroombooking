import { useEffect } from 'react'
import { AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateDisplay, formatTime12h, isSlotPast } from '@/lib/datetime'
import { useBookingFormStore } from '@/store/bookingFormStore'
import { useBookingsForDate } from '@/hooks/useBookings'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface Step2SlotsProps {
  onBack: () => void
  onNext: () => void
}

export function Step2Slots({ onBack, onNext }: Step2SlotsProps) {
  const date = useBookingFormStore((s) => s.date)
  const timeSlotId = useBookingFormStore((s) => s.timeSlotId)
  const setTimeSlotId = useBookingFormStore((s) => s.setTimeSlotId)

  const { data: slots, isLoading: slotsLoading, error: slotsError } = useTimeSlots()
  const { data: bookings, isLoading: bookingsLoading, error: bookingsError } = useBookingsForDate(date)

  const loading = slotsLoading || bookingsLoading
  const error = slotsError ?? bookingsError

  const bookedSlotMap = new Map<string, string>()
  if (bookings) {
    for (const b of bookings) {
      bookedSlotMap.set(b.time_slot_id, b.class_name)
    }
  }

  // Today's slots whose start time has already passed cannot be booked.
  const isUnavailablePast = (startTime: string) => (date ? isSlotPast(date, startTime) : false)

  // Drop the selection if the chosen slot has just become a past slot.
  useEffect(() => {
    if (!date || !timeSlotId || !slots) return
    const selected = slots.find((s) => s.id === timeSlotId)
    if (selected && isSlotPast(date, selected.start_time)) {
      setTimeSlotId(null)
    }
  }, [date, timeSlotId, slots, setTimeSlotId])

  const anySlotAvailable =
    slots?.some((s) => !bookedSlotMap.has(s.id) && !isUnavailablePast(s.start_time)) ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih Slot Masa</CardTitle>
        <CardDescription>
          {date ? (
            <>
              Tarikh: <span className="font-medium text-foreground">{formatDateDisplay(date)}</span>
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Gagal memuatkan slot.</p>
              <p>Ralat: {error.message}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : slots && slots.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Tiada slot tersedia pada tarikh ini.</p>
            <p className="text-sm text-muted-foreground">Sila hubungi pentadbir jika perlu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots?.map((slot) => {
              const booked = bookedSlotMap.has(slot.id)
              const past = isUnavailablePast(slot.start_time)
              const unavailable = booked || past
              const selected = timeSlotId === slot.id
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => setTimeSlotId(slot.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
                    unavailable && 'cursor-not-allowed border-muted bg-muted/40 opacity-60',
                    !unavailable && !selected && 'hover:border-primary/50 hover:bg-accent',
                    selected && 'border-primary bg-primary/10 ring-1 ring-primary',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={cn('text-sm font-semibold', selected && 'text-primary')}>
                      {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                    </span>
                    {unavailable ? (
                      <Badge variant="secondary" className="shrink-0">
                        {booked ? 'Telah Ditempah' : 'Masa Berlalu'}
                      </Badge>
                    ) : selected ? (
                      <Badge className="shrink-0">Dipilih</Badge>
                    ) : null}
                  </div>
                  {booked ? (
                    <span className="text-xs text-muted-foreground">
                      Kelas: {bookedSlotMap.get(slot.id) || '-'}
                    </span>
                  ) : past ? (
                    <span className="text-xs text-muted-foreground">Slot telah bermula</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Slot tersedia</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        {slots && slots.length > 0 && !anySlotAvailable && (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Tiada slot tersedia pada waktu ini. Semua slot telah berlalu atau ditempah.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onBack}>
            Kembali
          </Button>
          <Button onClick={onNext} disabled={!timeSlotId}>
            Seterusnya
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
