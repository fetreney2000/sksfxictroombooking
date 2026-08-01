import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { RequireRole, RequireAnyRole } from '@/routes/guards'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookingPage } from '@/pages/public/BookingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { BookingsListPage } from '@/pages/supervisor/BookingsListPage'
import { DashboardPage } from '@/pages/supervisor/DashboardPage'
import { ReportsPage } from '@/pages/supervisor/ReportsPage'
import { TeachersPage } from '@/pages/admin/TeachersPage'
import { TimeSlotsPage } from '@/pages/admin/TimeSlotsPage'
import { HousekeepingPage } from '@/pages/admin/HousekeepingPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<BookingPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAnyRole>
              <AppLayout />
            </RequireAnyRole>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>

        <Route
          path="/supervisor"
          element={
            <RequireRole role="supervisor">
              <AppLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="bookings" element={<BookingsListPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AppLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="bookings" element={<BookingsListPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="slots" element={<TimeSlotsPage />} />
          <Route path="housekeeping" element={<HousekeepingPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
