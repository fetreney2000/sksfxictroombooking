import { Link, Outlet } from 'react-router-dom'
import { ArrowRight, MonitorSmartphone } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { useCurrentUser } from '@/hooks/useAuth'

export function PublicLayout() {
  const { profile } = useCurrentUser()
  return (
    <div className="flex min-h-screen flex-col">
      {!isSupabaseConfigured && (
          <div className="bg-amber-100/90 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Persekitaran Supabase belum dikonfigurasi. Sila tetapkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
          dalam fail .env.
        </div>
      )}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight sm:text-lg">Sistem Tempahan Bilik ICT</h1>
              <p className="text-xs text-muted-foreground">Tempah slot Bilik ICT untuk pelbagai kegunaan</p>
            </div>
          </div>
          <Link
            to={profile ? '/dashboard' : '/login'}
            className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/70 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white"
          >
            {profile ? 'Papan Pemuka' : 'Log Masuk'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-white/60 bg-white/50 py-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sistem Tempahan Bilik ICT SK SFX Keningau
        </p>
      </footer>
    </div>
  )
}
