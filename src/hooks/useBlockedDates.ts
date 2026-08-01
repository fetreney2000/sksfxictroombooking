import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { BlockedDate } from '@/types/shared'

export function useBlockedDates() {
  return useQuery({
    queryKey: ['blocked_dates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blocked_dates').select('*')
      if (error) throw error
      return (data as BlockedDate[]) ?? []
    },
    staleTime: 60_000,
  })
}

/** Set of blocked dates as `yyyy-MM-dd` strings, for quick lookups. */
export function useBlockedDateSet(): Set<string> {
  const { data } = useBlockedDates()
  const set = new Set<string>()
  if (data) {
    for (const d of data) set.add(d.blocked_date)
  }
  return set
}
