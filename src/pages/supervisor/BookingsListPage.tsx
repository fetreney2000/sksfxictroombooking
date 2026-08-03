import { useAllBookings } from '@/hooks/useBookings'
import { useCurrentUser } from '@/hooks/useAuth'
import { BookingsTable } from '@/components/tables/BookingsTable'

export function BookingsListPage() {
  const { data, isLoading, isError } = useAllBookings()
  const { profile } = useCurrentUser()
  const canManage = profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
         <p className="eyebrow">Operasi</p>
         <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Semua Tempahan</h1>
        <p className="text-sm text-muted-foreground">Senarai lengkap tempahan Makmal Komputer.</p>
      </div>
      <BookingsTable data={data} isLoading={isLoading} isError={isError} canManage={canManage} />
    </div>
  )
}
