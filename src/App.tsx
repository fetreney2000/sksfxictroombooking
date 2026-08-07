import { lazy, Suspense } from 'react'
import DesktopApp from '@/apps/DesktopApp'
import { DeviceModeProvider, useIsMobile } from '@/device/DeviceModeContext'

const MobileApp = lazy(() => import('@/apps/MobileApp'))

export default function App() {
  return (
    <DeviceModeProvider>
      <PlatformApp />
    </DeviceModeProvider>
  )
}

function PlatformApp() {
  if (!useIsMobile()) return <DesktopApp />

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" aria-busy="true" />}>
      <MobileApp />
    </Suspense>
  )
}
