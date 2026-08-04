import { create } from 'zustand'
import { isSameDay } from '@/lib/datetime'

export type BookingStep = 1 | 2 | 3 | 4

interface BookingFormStore {
  step: BookingStep
  date: Date | null
  timeSlotIds: string[]
  teacherId: string | null
  className: string
  purpose: string
  setStep: (step: BookingStep) => void
  setDate: (date: Date | null) => void
  setTimeSlotIds: (ids: string[] | ((prev: string[]) => string[])) => void
  setTeacherId: (id: string | null) => void
  setClassName: (value: string) => void
  setPurpose: (value: string) => void
  reset: () => void
}

const initialState = {
  step: 1 as BookingStep,
  date: null,
  timeSlotIds: [] as string[],
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
      timeSlotIds:
        state.date && date && isSameDay(state.date, date) ? state.timeSlotIds : [],
    })),
  setTimeSlotIds: (timeSlotIds) =>
    set((state) => ({
      timeSlotIds:
        typeof timeSlotIds === 'function' ? timeSlotIds(state.timeSlotIds) : timeSlotIds,
    })),
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
      state.timeSlotIds.length > 0 ||
      state.teacherId !== null ||
      state.className.trim().length > 0 ||
      state.purpose.trim().length > 0
    )
  })
}
