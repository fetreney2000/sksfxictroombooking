import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateCompact, formatDateForDB, formatDateTimeDisplay, formatTime12h, getTodayInKL } from '@/lib/datetime'
import type { BookingWithDetails } from '@/types/shared'
import { useDeleteBooking, useUpdateBooking } from '@/hooks/mutations'
import { useTeachers } from '@/hooks/useTeachers'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BookingsTableProps {
  data: BookingWithDetails[] | undefined
  isLoading: boolean
  isError: boolean
  canManage?: boolean
}

export function BookingsTable({ data, isLoading, isError, canManage = false }: BookingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'booking_date', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState<BookingWithDetails | null>(null)
  const [deleting, setDeleting] = useState<BookingWithDetails | null>(null)

  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()

  const { data: teachers } = useTeachers(true)
  const { data: slots } = useTimeSlots(true)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((b) => {
      if (dateFrom && b.booking_date < dateFrom) return false
      if (dateTo && b.booking_date > dateTo) return false
      return true
    })
  }, [data, dateFrom, dateTo])

  const columns = useMemo<ColumnDef<BookingWithDetails>[]>(
    () => [
      {
        id: 'booking_date',
        accessorKey: 'booking_date',
        header: 'Tarikh',
        cell: ({ row }) => {
          const b = row.original
          const d = new Date(`${b.booking_date}T00:00:00.000Z`)
          return (
            <div>
              <div className="font-medium">{formatDateCompact(d)}</div>
            </div>
          )
        },
      },
      {
        id: 'time_slot',
        accessorFn: (row) => `${row.time_slots?.start_time ?? ''}-${row.time_slots?.end_time ?? ''}`,
        header: 'Slot Masa',
        cell: ({ row }) => {
          const ts = row.original.time_slots
          return ts ? (
            <span className="whitespace-nowrap">
              {formatTime12h(ts.start_time)} – {formatTime12h(ts.end_time)}
            </span>
          ) : (
            '-'
          )
        },
      },
      {
        id: 'teacher',
        accessorFn: (row) => row.teachers?.full_name ?? '',
        header: 'Nama Guru',
        cell: ({ row }) => row.original.teachers?.full_name ?? '-',
      },
      {
        id: 'class_name',
        accessorKey: 'class_name',
        header: 'Kelas',
        cell: ({ row }) => row.original.class_name,
      },
      {
        id: 'purpose',
        accessorKey: 'purpose',
        header: 'Tujuan',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[220px] text-muted-foreground">{row.original.purpose}</span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: 'Tarikh Dibuat',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateTimeDisplay(row.original.created_at)}
          </span>
        ),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: 'Tindakan',
              cell: ({ row }: { row: { original: BookingWithDetails } }) => (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(row.original)} aria-label="Sunting">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(row.original)}
                    aria-label="Padam"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage],
  )

  const globalFilterFn = (row: { original: BookingWithDetails }, _columnId: string, filterValue: string) => {
    const q = filterValue.toLowerCase()
    const ts = row.original.time_slots
    const t = row.original.teachers
    const haystack = [
      row.original.booking_date,
      t?.full_name ?? '',
      row.original.class_name,
      row.original.purpose,
      ts ? `${formatTime12h(ts.start_time)} ${formatTime12h(ts.end_time)}` : '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  }

  const table = useReactTable({
    data: filtered,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const today = getTodayInKL()

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    const booking_date = String(form.get('booking_date'))
    const time_slot_id = String(form.get('time_slot_id'))
    const teacher_id = String(form.get('teacher_id'))
    const class_name = String(form.get('class_name')).trim()
    const purpose = String(form.get('purpose')).trim()
    if (!booking_date || !time_slot_id || !teacher_id || !class_name || !purpose) {
      toast.error('Sila lengkapkan semua medan.')
      return
    }
    try {
      await updateBooking.mutateAsync({
        id: editing.id,
        booking_date,
        time_slot_id,
        teacher_id,
        class_name,
        purpose,
      })
      toast.success('Tempahan dikemas kini.')
      setEditing(null)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        toast.error('Slot ini sudah ditempah untuk tarikh tersebut.')
      } else {
        toast.error('Gagal mengemas kini tempahan.')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteBooking.mutateAsync(deleting.id)
      toast.success('Tempahan dipadam.')
      setDeleting(null)
    } catch {
      toast.error('Gagal memadam tempahan.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari tarikh, guru, kelas, tujuan..."
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              Dari
            </Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              Hingga
            </Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
            >
              Set Semula
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <TableHead key={header.id}>
                      {canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-4">
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  Gagal memuatkan data tempahan.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  Tiada tempahan dijumpai.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Halaman {table.getState().pagination.pageIndex + 1} daripada {table.getPageCount() || 1} ·{' '}
          {table.getFilteredRowModel().rows.length} tempahan
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / halaman
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelum
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Seterusnya
          </Button>
        </div>
      </div>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sunting Tempahan</DialogTitle>
              <DialogDescription>Kemaskini maklumat tempahan.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Tarikh</Label>
                <Input
                  id="edit-date"
                  name="booking_date"
                  type="date"
                  required
                  min={formatDateForDB(today)}
                  defaultValue={editing.booking_date}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slot">Slot Masa</Label>
                <Select name="time_slot_id" defaultValue={editing.time_slot_id} required>
                  <SelectTrigger id="edit-slot" className="w-full">
                    <SelectValue placeholder="Pilih slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots?.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                        {!slot.is_active ? ' (tidak aktif)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-teacher">Nama Guru</Label>
                <Select name="teacher_id" defaultValue={editing.teacher_id} required>
                  <SelectTrigger id="edit-teacher" className="w-full">
                    <SelectValue placeholder="Pilih guru" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">Kelas</Label>
                <Input id="edit-class" name="class_name" required maxLength={60} defaultValue={editing.class_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-purpose">Tujuan</Label>
                <Input
                  id="edit-purpose"
                  name="purpose"
                  required
                  maxLength={300}
                  defaultValue={editing.purpose}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={updateBooking.isPending}>
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleting && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Padam tempahan ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tempahan pada {deleting.booking_date} untuk kelas {deleting.class_name} akan dipadamkan secara
                kekal. Tindakan ini tidak boleh dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Padam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
