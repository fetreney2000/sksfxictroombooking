import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { formatDateForDB } from '@/lib/datetime'
import type { BookingWithDetails } from '@/types/shared'
import type { TablesInsert } from '@/types/database'

export function useBookingsForDate(date: Date | null) {
  const dateStr = date ? formatDateForDB(date) : null
  return useQuery({
    queryKey: ['bookings', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, teachers(id, full_name)')
        .eq('booking_date', dateStr!)
      if (error) throw error
      return data as unknown as BookingWithDetails[]
    },
    enabled: !!dateStr,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useAllBookings() {
  return useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, teachers(id, full_name), time_slots(id, start_time, end_time, sort_order)')
        .order('booking_date', { ascending: false })
      if (error) throw error
      return (data as unknown as BookingWithDetails[]) ?? []
    },
    staleTime: 15_000,
  })
}

interface SubmitBookingInput {
  booking_date: string
  time_slot_id: string
  teacher_id: string
  class_name: string
  purpose: string
}

export function useSubmitBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitBookingInput) => {
      const payload: TablesInsert<'bookings'> = {
        booking_date: input.booking_date,
        time_slot_id: input.time_slot_id,
        teacher_id: input.teacher_id,
        class_name: input.class_name,
        purpose: input.purpose,
      }
      const { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select('*, teachers(full_name), time_slots(start_time, end_time)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
