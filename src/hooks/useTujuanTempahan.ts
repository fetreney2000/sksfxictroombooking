import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { TujuanTempahan } from '@/types/shared'

export function useTujuanTempahan(includeInactive = false) {
  return useQuery({
    queryKey: ['tujuan_tempahan', includeInactive],
    queryFn: async () => {
      let query = supabase.from('tujuan_tempahan').select('*').order('name', { ascending: true })
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as TujuanTempahan[]) ?? []
    },
    staleTime: 30_000,
  })
}
