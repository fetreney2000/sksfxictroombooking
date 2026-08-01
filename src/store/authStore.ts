import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { me } from '@/lib/auth'

export interface AuthUser {
  id: string
  username: string
  full_name: string
  role: 'admin' | 'supervisor'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  hydrated: boolean
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => set({ token, user, hydrated: true }),
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
            set({ user, hydrated: true })
          } else {
            set({ token: null, user: null, hydrated: true })
          }
        } catch {
          // Network error: keep the stored session, mark hydrated.
          set({ hydrated: true })
        }
      },
    }),
    { name: 'tempahan-auth' },
  ),
)
