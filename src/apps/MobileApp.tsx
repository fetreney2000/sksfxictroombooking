import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'
import {
  IonApp,
  IonBackButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonPage,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTitle,
  IonToolbar,
  setupIonicReact,
} from '@ionic/react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useCurrentUser, signOut } from '@/hooks/useAuth'
import { BookingPage } from '@/pages/public/BookingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { BookingsListPage } from '@/pages/supervisor/BookingsListPage'
import { DashboardPage } from '@/pages/supervisor/DashboardPage'
import { ReportsPage } from '@/pages/supervisor/ReportsPage'
import { TeachersPage } from '@/pages/admin/TeachersPage'
import { KelasPage } from '@/pages/admin/KelasPage'
import { TujuanPage } from '@/pages/admin/TujuanPage'
import { TimeSlotsPage } from '@/pages/admin/TimeSlotsPage'
import { HousekeepingPage } from '@/pages/admin/HousekeepingPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

setupIonicReact({ swipeBackEnabled: true })

const pageTitles: Record<string, string> = {
  '/': 'Tempah Bilik ICT',
  '/login': 'Log Masuk',
  '/dashboard': 'Papan Pemuka',
  '/supervisor/bookings': 'Semua Tempahan',
  '/supervisor/reports': 'Laporan',
  '/admin/bookings': 'Semua Tempahan',
  '/admin/reports': 'Laporan',
  '/admin/teachers': 'Urus Guru',
  '/admin/kelas': 'Urus Kelas',
  '/admin/tujuan': 'Urus Tujuan',
  '/admin/slots': 'Urus Slot Masa',
  '/admin/housekeeping': 'Urus Tarikh',
  '/admin/users': 'Urus Pengguna',
}

interface MobilePageProps {
  children: ReactNode
  title: string
  showMenu?: boolean
  defaultHref?: string
}

function MobileTabs() {
  const { profile } = useCurrentUser()
  const location = useLocation()
  if (location.pathname === '/login' || location.pathname === '/') return null

  const base = profile?.role === 'admin' ? '/admin' : '/supervisor'
  return (
    <IonFooter className="mobile-tab-footer">
      <IonTabBar>
        <IonTabButton tab="dashboard" href="/dashboard">
          <IonLabel>Utama</IonLabel>
        </IonTabButton>
        <IonTabButton tab="bookings" href={`${base}/bookings`}>
          <IonLabel>Tempahan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="reports" href={`${base}/reports`}>
          <IonLabel>Laporan</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonFooter>
  )
}

function MobilePage({ children, title, showMenu = false, defaultHref = '/' }: MobilePageProps) {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            {showMenu ? <IonMenuButton aria-label="Buka menu" /> : <IonBackButton defaultHref={defaultHref} />}
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="mobile-page-content">{children}</div>
      </IonContent>
      <MobileTabs />
    </IonPage>
  )
}

function MobileMenu() {
  const { profile } = useCurrentUser()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const base = isAdmin ? '/admin' : '/supervisor'
  const links = profile
    ? [
        ['/dashboard', 'Papan Pemuka'],
        [`${base}/bookings`, 'Semua Tempahan'],
        [`${base}/reports`, 'Laporan'],
        ...(isAdmin
          ? [
              ['/admin/teachers', 'Guru'],
              ['/admin/kelas', 'Kelas'],
              ['/admin/tujuan', 'Tujuan'],
              ['/admin/slots', 'Slot Masa'],
              ['/admin/housekeeping', 'Tarikh'],
              ['/admin/users', 'Pengguna'],
            ]
          : []),
      ]
    : [['/', 'Tempah Bilik ICT'], ['/login', 'Log Masuk']]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <IonMenu contentId="mobile-main" type="overlay">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Sistem Tempahan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          {links.map(([href, label]) => (
            <IonMenuToggle key={href} autoHide={false}>
              <IonItem button detail routerLink={href}>
                <IonLabel>{label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
          {profile && (
            <IonMenuToggle autoHide={false}>
              <IonItem button detail={false} onClick={handleLogout}>
                <IonLabel>Log Keluar</IonLabel>
              </IonItem>
            </IonMenuToggle>
          )}
        </IonList>
      </IonContent>
    </IonMenu>
  )
}

function MobileLoadingPage() {
  return <MobilePage title="Memuatkan"><div className="mobile-loading" aria-label="Memuatkan" /></MobilePage>
}

function MobileGuard({ children, role }: { children: ReactNode; role?: 'admin' | 'supervisor' }) {
  const { session, profile, isLoading } = useCurrentUser()
  if (isLoading) return <MobileLoadingPage />
  if (!session) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function MobileWorkspace({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <MobilePage title={pageTitles[location.pathname] ?? 'Sistem Tempahan'} showMenu>
      {children}
    </MobilePage>
  )
}

function MobileBackNavigation() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleBackButton = (event: Event) => {
      const detail = (event as CustomEvent<{ register?: (priority: number, handler: () => void) => void }>).detail
      if (detail?.register) {
        detail.register(10, () => navigate(-1))
      } else {
        navigate(-1)
      }
    }

    document.addEventListener('ionBackButton', handleBackButton)
    return () => document.removeEventListener('ionBackButton', handleBackButton)
  }, [navigate])

  return null
}

function MobileRoutes() {
  return (
    <IonRouterOutlet id="mobile-main">
      <MobileBackNavigation />
      <Routes>
        <Route path="/" element={<MobilePage title="Tempah Bilik ICT" showMenu><BookingPage /></MobilePage>} />
        <Route path="/login" element={<MobilePage title="Log Masuk"><LoginPage /></MobilePage>} />
        <Route
          path="/dashboard"
          element={<MobileGuard><MobileWorkspace><DashboardPage /></MobileWorkspace></MobileGuard>}
        />
        <Route path="/supervisor" element={<MobileGuard role="supervisor"><Navigate to="/dashboard" replace /></MobileGuard>} />
        <Route
          path="/supervisor/bookings"
          element={<MobileGuard role="supervisor"><MobileWorkspace><BookingsListPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/supervisor/reports"
          element={<MobileGuard role="supervisor"><MobileWorkspace><ReportsPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/bookings"
          element={<MobileGuard role="admin"><MobileWorkspace><BookingsListPage /></MobileWorkspace></MobileGuard>}
        />
        <Route path="/admin" element={<MobileGuard role="admin"><Navigate to="/dashboard" replace /></MobileGuard>} />
        <Route
          path="/admin/reports"
          element={<MobileGuard role="admin"><MobileWorkspace><ReportsPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/teachers"
          element={<MobileGuard role="admin"><MobileWorkspace><TeachersPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/kelas"
          element={<MobileGuard role="admin"><MobileWorkspace><KelasPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/tujuan"
          element={<MobileGuard role="admin"><MobileWorkspace><TujuanPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/slots"
          element={<MobileGuard role="admin"><MobileWorkspace><TimeSlotsPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/housekeeping"
          element={<MobileGuard role="admin"><MobileWorkspace><HousekeepingPage /></MobileWorkspace></MobileGuard>}
        />
        <Route
          path="/admin/users"
          element={<MobileGuard role="admin"><MobileWorkspace><UsersPage /></MobileWorkspace></MobileGuard>}
        />
        <Route path="*" element={<MobilePage title="Halaman Tidak Dijumpai"><NotFoundPage /></MobilePage>} />
      </Routes>
    </IonRouterOutlet>
  )
}

export default function MobileApp() {
  return (
    <BrowserRouter>
      <IonApp>
        <IonSplitPane contentId="mobile-main">
          <MobileMenu />
          <MobileRoutes />
        </IonSplitPane>
        <Toaster />
      </IonApp>
    </BrowserRouter>
  )
}
