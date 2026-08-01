import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Teacher } from '@/types/shared'

export function useTeachers(includeInactive = false) {
  return useQuery({
    queryKey: ['teachers', includeInactive],
    queryFn: async () => {
      let query = supabase.from('teachers').select('*').order('full_name', { ascending: true })
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as Teacher[]) ?? []
    },
    staleTime: 30_000,
  })
}
