import { Link, Outlet } from 'react-router-dom'
import { LogIn, MonitorSmartphone, ShieldCheck, UserCog } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { useCurrentUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function PublicLayout() {
  const { isAuthenticated, profile } = useCurrentUser()
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Persekitaran Supabase belum dikonfigurasi. Sila tetapkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
          dalam fail .env.
        </div>
      )}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">Sistem Tempahan Bilik ICT</h1>
              <p className="text-xs text-muted-foreground">Tempah slot Bilik ICT untuk sesi PdPc</p>
            </div>
          </div>
          {isAuthenticated ? (
            <Link
              to={profile?.role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard'}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4" />
              Papan Pemuka
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="h-4 w-4" />
                  Log Masuk
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Log masuk sebagai</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/login">
                    <UserCog className="mr-2 h-4 w-4" />
                    Penyelia
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Pentadbir
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-background py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sistem Tempahan Bilik ICT SK SFX Keningau
        </p>
      </footer>
    </div>
  )
}
