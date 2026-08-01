import { useAllBookings } from '@/hooks/useBookings'
import { useCurrentUser } from '@/hooks/useAuth'
import { BookingsTable } from '@/components/tables/BookingsTable'

export function BookingsListPage() {
  const { data, isLoading, isError } = useAllBookings()
  const { profile } = useCurrentUser()
  const canManage = profile?.role === 'admin'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Semua Tempahan</h1>
        <p className="text-sm text-muted-foreground">Senarai lengkap tempahan Makmal Komputer.</p>
      </div>
      <BookingsTable data={data} isLoading={isLoading} isError={isError} canManage={canManage} />
    </div>
  )
}
