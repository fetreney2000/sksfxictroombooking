import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const invalidate = (client: ReturnType<typeof useQueryClient>, keys: string[][]) => {
  for (const key of keys) client.invalidateQueries({ queryKey: key })
}

function requireToken(): string {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('Sesi telah tamat. Sila log masuk semula.')
  return token
}

export interface AdminUser {
  id: string
  username: string
  full_name: string
  role: 'admin' | 'supervisor'
  is_active: boolean
  created_at: string
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = requireToken()
      const { data, error } = await supabase.rpc('admin_list_users', { p_token: token })
      if (error) throw error
      return (data as AdminUser[] | null) ?? []
    },
    staleTime: 15_000,
  })
}

export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      username: string
      password: string
      full_name: string
      role: 'admin' | 'supervisor'
    }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_create_user', {
        p_token: token,
        p_username: input.username,
        p_password: input.password,
        p_full_name: input.full_name,
        p_role: input.role,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['users']]),
  })
}

export function useUpdateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      full_name: string
      role: 'admin' | 'supervisor'
      is_active: boolean
      new_password?: string
    }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_update_user', {
        p_token: token,
        p_user_id: input.id,
        p_full_name: input.full_name,
        p_role: input.role,
        p_is_active: input.is_active,
        p_new_password: input.new_password || null,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['users']]),
  })
}

export function useSaveTeacher() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, full_name }: { id?: string; full_name: string }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_save_teacher', {
        p_token: token,
        p_teacher_id: id ?? null,
        p_full_name: full_name,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useSetTeacherActive() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_set_teacher_active', {
        p_token: token,
        p_teacher_id: id,
        p_is_active: is_active,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useDeleteTeacher() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_delete_teacher', {
        p_token: token,
        p_teacher_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['teachers']]),
  })
}

export function useSaveTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (slot: {
      id: string
      start_time: string
      end_time: string
      sort_order: number
      is_active: boolean
    }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_save_time_slot', {
        p_token: token,
        p_slot_id: slot.id,
        p_start_time: slot.start_time,
        p_end_time: slot.end_time,
        p_sort_order: slot.sort_order,
        p_is_active: slot.is_active,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useToggleTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_toggle_time_slot', {
        p_token: token,
        p_slot_id: id,
        p_is_active: is_active,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useReorderTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_reorder_time_slot', {
        p_token: token,
        p_slot_id: id,
        p_sort_order: sort_order,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useAddBlockedDate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ blocked_date, reason }: { blocked_date: string; reason?: string }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_add_blocked_date', {
        p_token: token,
        p_blocked_date: blocked_date,
        p_reason: reason || null,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['blocked_dates']]),
  })
}

export function useRemoveBlockedDate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_remove_blocked_date', {
        p_token: token,
        p_blocked_date_id: id,
      })
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
      const token = requireToken()
      const { error } = await supabase.rpc('admin_update_booking', {
        p_token: token,
        p_booking_id: id,
        p_booking_date: booking_date,
        p_time_slot_id: time_slot_id,
        p_teacher_id: teacher_id,
        p_class_name: class_name,
        p_purpose: purpose,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['bookings']]),
  })
}

export function useDeleteBooking() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_delete_booking', {
        p_token: token,
        p_booking_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['bookings']]),
  })
}

export function useSaveKelas() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id?: string; name: string }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_save_kelas', {
        p_token: token,
        p_kelas_id: id ?? null,
        p_name: name,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['kelas']]),
  })
}

export function useSetKelasActive() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_set_kelas_active', {
        p_token: token,
        p_kelas_id: id,
        p_is_active: is_active,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['kelas']]),
  })
}

export function useDeleteKelas() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_delete_kelas', {
        p_token: token,
        p_kelas_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['kelas']]),
  })
}

export function useCreateTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ start_time, end_time }: { start_time: string; end_time: string }) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_create_time_slot', {
        p_token: token,
        p_start_time: start_time,
        p_end_time: end_time,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}

export function useDeleteTimeSlot() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = requireToken()
      const { error } = await supabase.rpc('admin_delete_time_slot', {
        p_token: token,
        p_slot_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(client, [['time_slots']]),
  })
}
