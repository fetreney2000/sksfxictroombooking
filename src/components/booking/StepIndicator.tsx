import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { BookingStep } from '@/store/bookingFormStore'

const STEP_LABELS: { step: BookingStep; label: string }[] = [
  { step: 1, label: 'Pilih Tarikh' },
  { step: 2, label: 'Pilih Slot Masa' },
  { step: 3, label: 'Maklumat Tempahan' },
  { step: 4, label: 'Semak & Hantar' },
]

export function StepIndicator({ current }: { current: BookingStep }) {
  return (
    <ol className="flex w-full items-center">
      {STEP_LABELS.map(({ step, label }, index) => {
        const completed = step < current
        const active = step === current
        return (
          <li key={step} className={cn('flex items-center', index > 0 && 'flex-1')}>
            {index > 0 && (
              <div className={cn('mx-2 h-0.5 flex-1 rounded sm:mx-3', completed ? 'bg-primary' : 'bg-border')} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-all',
                  active && 'border-primary bg-primary text-primary-foreground',
                  completed && 'border-primary bg-primary text-primary-foreground',
                  !active && !completed && 'border-border bg-background text-muted-foreground',
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : step}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
