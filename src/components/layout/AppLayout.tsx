import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpenCheck, CalendarDays, CalendarX2, FileDown, Home, LogOut, MonitorSmartphone, School, Table2, UserCog, Users, PanelLeft } from 'lucide-react'
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
    <div className="flex h-full flex-col gap-5 py-5">
      <div className="flex items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10">
          <MonitorSmartphone className="h-5 w-5" />
        </div>
        <div>
           <p className="text-sm font-extrabold leading-tight text-sidebar-foreground">Sistem Tempahan Bilik ICT</p>
           <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/55">Portal pengurusan</p>
        </div>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                 isActive
                   ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10'
                   : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4">
           <p className="truncate text-xs text-sidebar-foreground/45">@{profile?.username ?? ''}</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">{SidebarContent}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
         <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-white/60 bg-white/70 px-4 backdrop-blur-xl sm:px-6">
           <div className="flex items-center gap-3">
             <PanelLeft className="h-5 w-5 text-primary lg:hidden" />
             <div><p className="eyebrow hidden sm:block">Ruang kerja</p><h2 className="truncate text-lg font-extrabold tracking-tight">{title}</h2></div>
           </div>
          {profile ? (
            <div className="flex items-center gap-1">
              <Link
                to="/"
                aria-label="Laman Tempahan"
                 className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Laman Tempahan</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                     <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
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
            </div>
          ) : null}
        </header>
         <main className="flex-1 p-4 pb-24 sm:p-7 sm:pb-24 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation — covers every item in the desktop navbar */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-1px_0_rgba(0,0,0,0.05)] lg:hidden"
      >
        <div className="flex overflow-x-auto">
          <NavLink
            to="/"
            aria-label="Laman Tempahan"
            className="flex min-w-[68px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-5 w-5" />
            <span className="whitespace-nowrap">Laman Tempahan</span>
          </NavLink>
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
