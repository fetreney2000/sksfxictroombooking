import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addMonthsToDate,
  formatMonthYear,
  getMonthGrid,
  getTodayInKL,
  isPastDate,
  isSameDay,
  isWeekend,
  MALAY_DAYS_SHORT,
} from '@/lib/datetime'
import { Button } from '@/components/ui/button'

export interface CalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  disabledDates?: Set<string>
  className?: string
}

/**
 * A simple Malay-language calendar month view.
 * Disabled: past dates, weekends, and dates in `disabledDates` (blocked dates).
 * Weekends (Sabtu/Ahad) are still visible but rendered disabled.
 */
export function Calendar({ selected, onSelect, disabledDates = new Set(), className }: CalendarProps) {
  const [viewMonth, setViewMonth] = React.useState(() => {
    const today = getTodayInKL()
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  })
  const today = getTodayInKL()
  const grid = getMonthGrid(viewMonth)

  const isDateDisabled = (date: Date): boolean => {
    const key = formatKey(date)
    return isPastDate(date) || isWeekend(date) || disabledDates.has(key)
  }

  const goToPrevMonth = () => setViewMonth((m) => addMonthsToDate(m, -1))
  const goToNextMonth = () => setViewMonth((m) => addMonthsToDate(m, 1))
  const goToToday = () => {
    const t = getTodayInKL()
    setViewMonth(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1)))
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between px-1 pb-2">
        <Button type="button" variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold">{formatMonthYear(viewMonth)}</div>
            <button type="button" onClick={goToToday} className="cursor-pointer text-xs text-primary hover:underline">
            Hari ini
          </button>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={goToNextMonth} aria-label="Bulan seterusnya">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {MALAY_DAYS_SHORT.map((day) => (
          <div key={day} className="py-1 text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center">
        {grid.flat().map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-9" />
          }
          const disabled = isDateDisabled(date)
          const isSelected = selected ? isSameDay(date, selected) : false
          const isToday = isSameDay(date, today)
          const isWeekendDay = isWeekend(date)
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-label={date.toISOString()}
              aria-pressed={isSelected}
              className={cn(
                'flex h-9 items-center justify-center rounded-md text-sm transition-colors',
                disabled
                  ? 'cursor-not-allowed text-muted-foreground/40 line-through decoration-muted-foreground/30'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                isWeekendDay && !disabled && 'text-muted-foreground/60',
                isToday && !isSelected && 'ring-1 ring-inset ring-primary text-primary font-semibold',
                isSelected && 'bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {date.getUTCDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-input" /> Tarikh tersedia
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" /> Tarikh dipilih
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted line-through decoration-muted-foreground/50" />{' '}
          Tidak tersedia
        </span>
      </div>
    </div>
  )
}

function formatKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
