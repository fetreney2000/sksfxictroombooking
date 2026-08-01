import { Link } from 'react-router-dom'
import { MonitorSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <MonitorSmartphone className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">404 - Halaman Tidak Dijumpai</h1>
        <p className="mt-1 text-sm text-muted-foreground">Halaman yang anda cari tidak wujud.</p>
      </div>
      <Button asChild>
        <Link to="/">Kembali ke Laman Utama</Link>
      </Button>
    </div>
  )
}
