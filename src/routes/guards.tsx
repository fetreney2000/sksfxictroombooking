import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, Loader2, LogOut } from 'lucide-react'
import { useCurrentUser, signOut } from '@/hooks/useAuth'
import type { Role } from '@/types/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function ProfileErrorCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="font-semibold">Akaun belum lengkap</p>
          <p className="text-sm text-muted-foreground">
            Rekod profil anda tidak dijumpai. Sila hubungi pentadbir sistem untuk menetapkan peranan anda.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut()
              window.location.href = '/login'
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface RequireRoleProps {
  role: Role
  children: ReactNode
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { session, profile, isLoading, error, isAuthenticated } = useCurrentUser()

  if (isLoading || (isAuthenticated && !profile && !error)) {
    return <FullScreenLoader />
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }
  if (!profile) {
    return <ProfileErrorCard />
  }
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard'} replace />
  }
  return <>{children}</>
}
