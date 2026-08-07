import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const MOBILE_BREAKPOINT = 768

interface DeviceModeContextValue {
  isMobile: boolean
}

const DeviceModeContext = createContext<DeviceModeContextValue | null>(null)

function isMobileUserAgent() {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const userAgentData = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  const mobilePattern = /Android|BlackBerry|IEMobile|iPhone|iPad|iPod|Opera Mini|Mobile|Tablet/i
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return Boolean(userAgentData.userAgentData?.mobile) || mobilePattern.test(userAgent) || iPadOs
}

function getIsMobile() {
  if (typeof window === 'undefined') return false

  const viewportMobile = window.innerWidth < MOBILE_BREAKPOINT

  // maxTouchPoints is used above for iPadOS, but is not enough by itself:
  // Windows touchscreen laptops and headless browser emulation can report it.
  return isMobileUserAgent() || viewportMobile
}

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(getIsMobile)

  useEffect(() => {
    const update = () => setIsMobile(getIsMobile())
    const coarsePointer = window.matchMedia('(pointer: coarse)')

    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    coarsePointer.addEventListener?.('change', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      coarsePointer.removeEventListener?.('change', update)
    }
  }, [])

  return <DeviceModeContext.Provider value={{ isMobile }}>{children}</DeviceModeContext.Provider>
}

export function useIsMobile() {
  const context = useContext(DeviceModeContext)
  if (!context) throw new Error('useIsMobile must be used within DeviceModeProvider')
  return context.isMobile
}
