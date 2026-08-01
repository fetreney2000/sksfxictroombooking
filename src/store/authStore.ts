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

/** A valid session user must be a plain object with the expected fields.
 *  Guards against malformed shapes persisted by older versions (e.g. a JSON
 *  array spread into `{0: {...}}` when `me` returned a PostgREST array). */
function hasValidUser(u: unknown): u is AuthUser {
  return (
    typeof u === 'object' &&
    u !== null &&
    !Array.isArray(u) &&
    typeof (u as AuthUser).id === 'string' &&
    typeof (u as AuthUser).username === 'string' &&
    typeof (u as AuthUser).full_name === 'string' &&
    ((u as AuthUser).role === 'admin' || (u as AuthUser).role === 'supervisor')
  )
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
          if (hasValidUser(user)) {
            set({ user: normalizeUser(user), hydrated: true })
          } else {
            // Invalid/unknown session: drop it so the login page shows again.
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
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> | undefined
        const user = state?.user
        // Keep the session only if the user is structurally valid; otherwise
        // discard it so the user logs in again with a clean session.
        if (state?.token && hasValidUser(user)) {
          return { token: state.token, user: normalizeUser(user), hydrated: false }
        }
        return { ...DEFAULT_STATE }
      },
    },
  ),
)
