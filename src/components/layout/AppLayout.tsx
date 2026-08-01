import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpenCheck, CalendarDays, CalendarX2, FileDown, LogOut, MonitorSmartphone, School, Table2, UserCog, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser, signOut } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function buildNavItems(base: string, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { to: '/dashboard', label: 'Papan Pemuka', icon: BarChart3 },
    { to: `${base}/bookings`, label: 'Tempahan', icon: Table2 },
    { to: `${base}/reports`, label: 'Laporan', icon: FileDown },
  ]
  if (isAdmin) {
    items.push(
      { to: '/admin/teachers', label: 'Guru', icon: Users },
      { to: '/admin/kelas', label: 'Kelas', icon: School },
      { to: '/admin/tujuan', label: 'Tujuan', icon: BookOpenCheck },
      { to: '/admin/slots', label: 'Slot', icon: CalendarDays },
      { to: '/admin/housekeeping', label: 'Tarikh', icon: CalendarX2 },
      { to: '/admin/users', label: 'Pengguna', icon: UserCog },
    )
  }
  return items
}

const pageTitles: Record<string, string> = {
  dashboard: 'Papan Pemuka',
  bookings: 'Semua Tempahan',
  reports: 'Laporan',
  teachers: 'Urus Guru',
  kelas: 'Urus Kelas',
  tujuan: 'Urus Tujuan',
  slots: 'Urus Slot Masa',
  housekeeping: 'Urus Tarikh',
  users: 'Urus Pengguna',
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useCurrentUser()

  const isAdmin = profile?.role === 'admin'
  const base = isAdmin ? '/admin' : '/supervisor'
  const navItems = buildNavItems(base, isAdmin)
  const section = location.pathname.split('/')[2] ?? ''
  const title = pageTitles[section] ?? 'Papan Pemuka'
  const displayName = profile?.full_name || profile?.username || ''

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MonitorSmartphone className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Sistem Tempahan Bilik ICT</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4">
        <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? ''}</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-background lg:block">{SidebarContent}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(displayName || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[130px] truncate text-sm font-medium">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span>{displayName}</span>
                    <span className="text-xs text-muted-foreground">@{profile.username}</span>
                    <Badge variant={isAdmin ? 'default' : 'secondary'} className="w-fit">
                      {isAdmin ? 'Pentadbir' : 'Penyelia'}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6 sm:pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation — covers every item in the desktop navbar */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-1px_0_rgba(0,0,0,0.05)] lg:hidden"
      >
        <div className="flex overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[68px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
