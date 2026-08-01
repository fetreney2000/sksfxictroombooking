import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { me } from '@/lib/auth'

export interface AuthUser {
  id: string
  username: string
  full_name: string
  role: 'admin' | 'supervisor'
}

/** Ensure the user object always carries a displayable full_name. */
function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, full_name: user.full_name || user.username }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  hydrated: boolean
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
  hydrate: () => Promise<void>
}

const DEFAULT_STATE = {
  token: null as string | null,
  user: null as AuthUser | null,
  hydrated: false,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setSession: (token, user) => set({ token, user: normalizeUser(user), hydrated: true }),
      clearSession: () => set({ token: null, user: null, hydrated: true }),
      hydrate: async () => {
        const { token } = get()
        if (!token) {
          set({ hydrated: true })
          return
        }
        try {
          const user = await me(token)
          if (user) {
            set({ user: normalizeUser(user), hydrated: true })
          } else {
            set({ token: null, user: null, hydrated: true })
          }
        } catch {
          // Network error: keep the stored session, mark hydrated.
          set({ hydrated: true })
        }
      },
    }),
    {
      name: 'tempahan-auth',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> | undefined
        const user = state?.user
        // Keep the session only if it is structurally valid; otherwise discard
        // it so the user logs in again with a clean session.
        if (
          state?.token &&
          user &&
          typeof user.id === 'string' &&
          typeof user.username === 'string' &&
          typeof user.full_name === 'string' &&
          (user.role === 'admin' || user.role === 'supervisor')
        ) {
          return { token: state.token, user: normalizeUser(user), hydrated: false }
        }
        return { ...DEFAULT_STATE }
      },
    },
  ),
)
