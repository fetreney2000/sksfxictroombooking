import { supabase } from '@/lib/supabaseClient'
import type { AuthUser } from '@/store/authStore'

export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'

export interface LoginResult {
  token: string
  user: AuthUser
}

export async function loginWithUsername(username: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.rpc('login', {
    p_username: username,
    p_password: password,
  })
  if (error) throw error
  if (!data) throw new Error(INVALID_CREDENTIALS)
  return {
    token: data.token,
    user: { ...data.user, full_name: data.user.full_name || data.user.username },
  }
}

export async function me(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.rpc('me', { p_token: token })
  if (error) throw error
  // `me` is a set-returning function, so PostgREST returns a JSON array even
  // for a single (or zero) rows. Normalize both shapes to a single user.
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as AuthUser | null
}

export async function logoutRemote(token: string): Promise<void> {
  const { error } = await supabase.rpc('logout', { p_token: token })
  if (error) throw error
}
