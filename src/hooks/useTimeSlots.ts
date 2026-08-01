import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { TimeSlot } from '@/types/shared'

export function useTimeSlots(includeInactive = false) {
  return useQuery({
    queryKey: ['time_slots', includeInactive],
    queryFn: async () => {
      let query = supabase.from('time_slots').select('*').order('sort_order', { ascending: true })
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as TimeSlot[]) ?? []
    },
    staleTime: 30_000,
  })
}
