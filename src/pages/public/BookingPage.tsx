import { useState } from 'react'
import { Eraser, Sparkles } from 'lucide-react'
import { useBookingFormStore, useHasFormData } from '@/store/bookingFormStore'
import { StepIndicator } from '@/components/booking/StepIndicator'
import { Step1Calendar } from '@/components/booking/Step1Calendar'
import { Step2Slots } from '@/components/booking/Step2Slots'
import { Step3Details } from '@/components/booking/Step3Details'
import { Step4Review } from '@/components/booking/Step4Review'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function BookingPage() {
  const step = useBookingFormStore((s) => s.step)
  const setStep = useBookingFormStore((s) => s.setStep)
  const reset = useBookingFormStore((s) => s.reset)
  const hasData = useHasFormData()
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClear = () => {
    if (hasData) {
      setConfirmClear(true)
    } else {
      reset()
      setStep(1)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-3 inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Tempahan mudah dan pantas</div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tempah slot Bilik ICT</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Sila lengkapkan 4 langkah di bawah untuk membuat tempahan.
        </p>
      </div>

      <StepIndicator current={step} />

      {step === 1 && <Step1Calendar onNext={() => setStep(2)} />}
      {step === 2 && <Step2Slots onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <Step3Details onBack={() => setStep(2)} onNext={() => setStep(4)} />}
      {step === 4 && <Step4Review onBack={() => setStep(3)} onBackToSlots={() => setStep(2)} />}

      <div className="flex justify-center">
        <Button variant="ghost" onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          Kosongkan Borang
        </Button>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kosongkan borang?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua maklumat yang telah diisi akan dibuang dan anda akan kembali ke langkah pertama.
              Tindakan ini tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset()
                setStep(1)
              }}
            >
              Ya, Kosongkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
