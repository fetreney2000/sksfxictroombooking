import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Kelas } from '@/types/shared'

export function useKelas(includeInactive = false) {
  return useQuery({
    queryKey: ['kelas', includeInactive],
    queryFn: async () => {
      let query = supabase.from('kelas').select('*').order('name', { ascending: true })
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as Kelas[]) ?? []
    },
    staleTime: 30_000,
  })
}
