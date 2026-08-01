import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Profile, TimeSlot } from '@/types/shared'

const invalidate = (client: ReturnType<typeof useQueryClient>, keys: string[][]) => {
  for (const key of keys) client.invalidateQueries({ queryKey: key })
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return (data as Profile[]) ?? []
    },
    staleTime: 15_000,
  })
}

export function useSaveTeacher() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, full_name }: { id?: string; full_name: string }) => {
      if (id) {
        const { error } = await supabase.from('teachers').update({ full_name }).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('teachers').insert({ full_name })
        if (error) throw error
      }
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useSetTeacherActive() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('teachers').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useDeleteTeacher() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teachers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useSaveTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (slot: Pick<TimeSlot, 'id' | 'start_time' | 'end_time' | 'sort_order' | 'is_active'>) => {
      const { error } = await supabase
        .from('time_slots')
        .update({
          start_time: slot.start_time,
          end_time: slot.end_time,
          sort_order: slot.sort_order,
          is_active: slot.is_active,
        })
        .eq('id', slot.id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useToggleTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('time_slots').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useReorderTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from('time_slots').update({ sort_order }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useAddBlockedDate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ blocked_date, reason }: { blocked_date: string; reason?: string }) => {
      const { error } = await supabase.from('blocked_dates').insert({ blocked_date, reason: reason || null })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['blocked_dates']]),
  })
}

export function useRemoveBlockedDate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['blocked_dates']]),
  })
}

export function useUpdateBooking() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      booking_date,
      time_slot_id,
      teacher_id,
      class_name,
      purpose,
    }: {
      id: string
      booking_date: string
      time_slot_id: string
      teacher_id: string
      class_name: string
      purpose: string
    }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_date, time_slot_id, teacher_id, class_name, purpose })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['bookings']]),
  })
}

export function useDeleteBooking() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['bookings']]),
  })
}

export function useUpdateProfileRole() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, full_name, role }: { id: string; full_name: string; role: 'admin' | 'supervisor' }) => {
      const { error } = await supabase.from('profiles').update({ full_name, role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['profiles']]),
  })
}
