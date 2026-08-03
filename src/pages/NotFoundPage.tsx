import { Link } from 'react-router-dom'
import { MonitorSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
        <MonitorSmartphone className="h-7 w-7" />
      </div>
      <div>
        <p className="eyebrow mb-1">Ralat 404</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Halaman Tidak Dijumpai</h1>
        <p className="mt-1 text-sm text-muted-foreground">Halaman yang anda cari tidak wujud.</p>
      </div>
      <Button asChild>
        <Link to="/">Kembali ke Laman Utama</Link>
      </Button>
    </div>
  )
}
