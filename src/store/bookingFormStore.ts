import { create } from 'zustand'

export type BookingStep = 1 | 2 | 3 | 4

interface BookingFormStore {
  step: BookingStep
  date: Date | null
  timeSlotId: string | null
  teacherId: string | null
  className: string
  purpose: string
  setStep: (step: BookingStep) => void
  setDate: (date: Date | null) => void
  setTimeSlotId: (id: string | null) => void
  setTeacherId: (id: string | null) => void
  setClassName: (value: string) => void
  setPurpose: (value: string) => void
  reset: () => void
}

const initialState = {
  step: 1 as BookingStep,
  date: null,
  timeSlotId: null,
  teacherId: null,
  className: '',
  purpose: '',
}

export const useBookingFormStore = create<BookingFormStore>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setDate: (date) =>
    set((state) => ({
      date,
      timeSlotId: state.date && date && state.date.toISOString() === date.toISOString() ? state.timeSlotId : null,
    })),
  setTimeSlotId: (timeSlotId) => set({ timeSlotId }),
  setTeacherId: (teacherId) => set({ teacherId }),
  setClassName: (className) => set({ className }),
  setPurpose: (purpose) => set({ purpose }),
  reset: () => set({ ...initialState }),
}))

/** True if the user has entered any data so far. */
export function useHasFormData(): boolean {
  return useBookingFormStore((state) => {
    return (
      state.date !== null ||
      state.timeSlotId !== null ||
      state.teacherId !== null ||
      state.className.trim().length > 0 ||
      state.purpose.trim().length > 0
    )
  })
}
