import { useAuthStore } from '@/store/authStore'
import { logoutRemote } from '@/lib/auth'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  return {
    session: token ? { token, user } : null,
    initializing: !hydrated,
  }
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  return {
    session: token ? { token, user } : null,
    profile: user,
    isLoading: !hydrated,
    error: null,
    isAuthenticated: Boolean(token && user),
  }
}

export async function signOut() {
  const token = useAuthStore.getState().token
  if (token) {
    try {
      await logoutRemote(token)
    } catch {
      // Ignore network errors; always clear the local session.
    }
  }
  useAuthStore.getState().clearSession()
}
