import type { Tables } from './database'

export type Role = 'admin' | 'supervisor'

export type Profile = Tables<'profiles'>
export type Teacher = Tables<'teachers'>
export type TimeSlot = Tables<'time_slots'>
export type BlockedDate = Tables<'blocked_dates'>
export type Booking = Tables<'bookings'>

/** A booking row with its joined relations resolved. */
export interface BookingWithDetails extends Booking {
  teachers: Pick<Teacher, 'id' | 'full_name' | 'is_active'> | null
  time_slots: Pick<TimeSlot, 'id' | 'start_time' | 'end_time' | 'sort_order'> | null
}

export interface BookingFormState {
  date: Date | null
  timeSlotId: string | null
  teacherId: string | null
  className: string
  purpose: string
}
