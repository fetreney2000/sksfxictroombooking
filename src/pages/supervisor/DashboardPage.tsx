import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, GraduationCap, TrendingUp, Trophy, Users } from 'lucide-react'
import {
  addDaysToDate,
  formatDateForDB,
  formatDateShort,
  getTodayInKL,
  isPastDate,
  isSlotPast,
} from '@/lib/datetime'
import { useAllBookings } from '@/hooks/useBookings'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function getMondayOfWeek(date: Date): Date {
  const day = date.getUTCDay()
  const diff = (day + 6) % 7
  return addDaysToDate(date, -diff)
}

export function DashboardPage() {
  const { data: bookings, isLoading } = useAllBookings()
  const { data: slots } = useTimeSlots()

  const stats = useMemo(() => {
    const today = getTodayInKL()
    const monday = getMondayOfWeek(today)
    const weekStart = formatDateForDB(monday)
    const weekEndDate = addDaysToDate(monday, 6)
    const weekEnd = formatDateForDB(weekEndDate)
    const currentMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`

    const list = bookings ?? []
    const thisWeek = list.filter((b) => b.booking_date >= weekStart && b.booking_date <= weekEnd)
    const thisMonth = list.filter((b) => b.booking_date.startsWith(currentMonth))

    const byDate = new Map<string, number>()
    const byTeacher = new Map<string, number>()
    for (const b of list) {
      byDate.set(b.booking_date, (byDate.get(b.booking_date) ?? 0) + 1)
      const name = b.teachers?.full_name ?? 'Tidak diketahui'
      byTeacher.set(name, (byTeacher.get(name) ?? 0) + 1)
    }

    let busiestDate = 'Tiada data'
    let busiestCount = 0
    for (const [date, count] of byDate) {
      if (count > busiestCount) {
        busiestCount = count
        busiestDate = date
      }
    }

    let activeTeacher = 'Tiada data'
    let teacherCount = 0
    for (const [name, count] of byTeacher) {
      if (count > teacherCount) {
        teacherCount = count
        activeTeacher = name
      }
    }

    const activeSlotCount = slots?.filter((s) => s.is_active).length ?? 12
    const possibleThisWeek = Math.max(1, activeSlotCount * 5)
    const utilization = Math.min(100, Math.round((thisWeek.length / possibleThisWeek) * 100))

    return {
      totalThisWeek: thisWeek.length,
      totalThisMonth: thisMonth.length,
      busiestDate,
      busiestCount,
      activeTeacher,
      teacherCount,
      utilization,
    }
  }, [bookings, slots])

  const chartData = useMemo(() => {
    const today = getTodayInKL()
    const map = new Map<string, number>()
    const list = bookings ?? []
    for (let i = 13; i >= 0; i--) {
      const d = addDaysToDate(today, -i)
      map.set(formatDateForDB(d), 0)
    }
    for (const b of list) {
      if (map.has(b.booking_date)) map.set(b.booking_date, (map.get(b.booking_date) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([date, count]) => ({
      date,
      label: formatDateShort(new Date(`${date}T00:00:00.000Z`)),
      count,
    }))
  }, [bookings])

  // Upcoming bookings: dates from today onwards, but today's slots whose start
  // time has already passed are excluded.
  const recent = useMemo(() => {
    const list = bookings ?? []
    return list
      .filter((b) => {
        const date = new Date(`${b.booking_date}T00:00:00.000Z`)
        if (isPastDate(date)) return false
        if (b.time_slots?.start_time && isSlotPast(date, b.time_slots.start_time)) return false
        return true
      })
      .sort((a, b) => {
        if (a.booking_date !== b.booking_date) return a.booking_date.localeCompare(b.booking_date)
        const at = a.time_slots?.start_time ?? ''
        const bt = b.time_slots?.start_time ?? ''
        return at.localeCompare(bt)
      })
      .slice(0, 5)
  }, [bookings])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Papan Pemuka</h1>
        <p className="text-sm text-muted-foreground">Ringkasan tempahan Makmal Komputer.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Tempahan Minggu Ini"
            value={String(stats.totalThisWeek)}
            hint="Isnin - Jumaat"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Tempahan Bulan Ini"
            value={String(stats.totalThisMonth)}
            hint="Sepanjang bulan semasa"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Hari Paling Sibuk"
            value={stats.busiestDate !== 'Tiada data' ? formatDateShort(new Date(`${stats.busiestDate}T00:00:00.000Z`)) : stats.busiestDate}
            hint={stats.busiestCount > 0 ? `${stats.busiestCount} tempahan` : '-'}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Guru Paling Aktif"
            value={stats.activeTeacher}
            hint={stats.teacherCount > 0 ? `${stats.teacherCount} tempahan` : '-'}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tempahan Setiap Hari</CardTitle>
            <CardDescription>14 hari terakhir (mengikut zon waktu Asia/Kuala_Lumpur)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="count" name="Tempahan" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Penggunaan Slot</CardTitle>
              <CardDescription>Minggu ini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.utilization}%</p>
                  <p className="text-xs text-muted-foreground">slot telah digunakan</p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats.utilization}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tempahan Akan Datang</CardTitle>
              <CardDescription>5 tempahan terdekat</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tiada tempahan akan datang.</p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{b.teachers?.full_name ?? '-'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateShort(new Date(`${b.booking_date}T00:00:00.000Z`))} · {b.class_name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold" title={value}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
