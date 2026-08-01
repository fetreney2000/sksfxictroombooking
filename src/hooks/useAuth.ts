import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/types/shared'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setInitializing(false)
      })
      .catch(() => {
        if (!active) return
        setInitializing(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { session, initializing }
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

export function useCurrentUser() {
  const { session } = useAuth()
  const { data: profile, isLoading, error } = useProfile(session?.user?.id)
  return {
    session,
    profile: profile ?? null,
    isLoading,
    error,
    isAuthenticated: Boolean(session),
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}
