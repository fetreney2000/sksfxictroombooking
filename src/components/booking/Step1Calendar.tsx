import { formatDateDisplay, formatDateShort } from '@/lib/datetime'
import { useBookingFormStore } from '@/store/bookingFormStore'
import { useBlockedDateSet } from '@/hooks/useBlockedDates'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Step1CalendarProps {
  onNext: () => void
}

export function Step1Calendar({ onNext }: Step1CalendarProps) {
  const date = useBookingFormStore((s) => s.date)
  const setDate = useBookingFormStore((s) => s.setDate)
  const blockedDates = useBlockedDateSet()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih Tarikh</CardTitle>
        <CardDescription>
          Pilih tarikh tempahan. Tempahan hanya dibenarkan pada hari Isnin hingga Jumaat.
        </CardDescription>
      </CardHeader>
       <CardContent className="space-y-5 px-4 sm:px-6">
        <Calendar selected={date} onSelect={setDate} disabledDates={blockedDates} />
        {date ? (
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            <span className="font-medium text-muted-foreground">Tarikh dipilih: </span>
            <span className="font-semibold">{formatDateDisplay(date)}</span>
            <span className="ml-2 text-xs text-muted-foreground">({formatDateShort(date)})</span>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Sila pilih tarikh untuk meneruskan.
          </div>
        )}
         <div className="flex items-center justify-end gap-2 border-t pt-4">
           <Button className="min-h-11 w-full sm:w-auto" onClick={onNext} disabled={!date}>
            Seterusnya
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
