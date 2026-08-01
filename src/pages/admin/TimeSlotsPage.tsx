import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatTime12h } from '@/lib/datetime'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import {
  useCreateTimeSlot,
  useDeleteTimeSlot,
  useReorderTimeSlot,
  useSaveTimeSlot,
  useToggleTimeSlot,
} from '@/hooks/mutations'
import type { TimeSlot } from '@/types/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
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

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value)
}

export function TimeSlotsPage() {
  const { data: slots, isLoading } = useTimeSlots(true)
  const saveTimeSlot = useSaveTimeSlot()
  const createTimeSlot = useCreateTimeSlot()
  const deleteTimeSlot = useDeleteTimeSlot()
  const toggleTimeSlot = useToggleTimeSlot()
  const reorderTimeSlot = useReorderTimeSlot()

  const [mode, setMode] = useState<'edit' | 'add' | null>(null)
  const [editing, setEditing] = useState<TimeSlot | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [deleting, setDeleting] = useState<TimeSlot | null>(null)

  const openEdit = (slot: TimeSlot) => {
    setEditing(slot)
    setMode('edit')
    setStartTime(slot.start_time.slice(0, 5))
    setEndTime(slot.end_time.slice(0, 5))
  }

  const openAdd = () => {
    setEditing(null)
    setMode('add')
    setStartTime('')
    setEndTime('')
  }

  const handleSave = async () => {
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      toast.error('Format masa tidak sah. Gunakan format HH:mm.')
      return
    }
    try {
      if (mode === 'add') {
        await createTimeSlot.mutateAsync({
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
        })
        toast.success('Slot masa baharu ditambah.')
      } else if (editing) {
        await saveTimeSlot.mutateAsync({
          id: editing.id,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
        })
        toast.success('Slot masa dikemas kini.')
      }
      setMode(null)
      setEditing(null)
    } catch {
      toast.error('Gagal menyimpan slot masa.')
    }
  }

  const toggleActive = async (slot: TimeSlot) => {
    try {
      await toggleTimeSlot.mutateAsync({ id: slot.id, is_active: !slot.is_active })
      toast.success(slot.is_active ? 'Slot dinyahaktifkan.' : 'Slot diaktifkan.')
    } catch {
      toast.error('Gagal mengemas kini slot.')
    }
  }

  const move = async (slot: TimeSlot, direction: -1 | 1) => {
    if (!slots) return
    const index = slots.findIndex((s) => s.id === slot.id)
    const targetIndex = index + direction
    const target = slots[targetIndex]
    if (!target) return
    try {
      await reorderTimeSlot.mutateAsync({ id: slot.id, sort_order: target.sort_order })
      await reorderTimeSlot.mutateAsync({ id: target.id, sort_order: slot.sort_order })
      toast.success('Susunan dikemas kini.')
    } catch {
      toast.error('Gagal menyusun semula slot.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTimeSlot.mutateAsync(deleting.id)
      toast.success('Slot masa dipadam.')
      setDeleting(null)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23503') {
        toast.error('Slot ini mempunyai tempahan dan tidak boleh dipadam. Nyahaktifkan sahaja.')
      } else {
        toast.error('Gagal memadam slot masa.')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Urus Slot Masa</h1>
          <p className="text-sm text-muted-foreground">
            Kemas kini masa slot, aktif/tidak aktif, susunan serta tambah/padam slot.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Slot
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Slot Masa</CardTitle>
          <CardDescription>
            Slot yang tidak aktif tidak akan dipaparkan kepada guru. Slot yang mempunyai tempahan tidak boleh
            dipadam — nyahaktifkan sahaja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Masa Mula</TableHead>
                  <TableHead>Masa Tamat</TableHead>
                  <TableHead>Paparan (12 jam)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-4">
                      <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : slots && slots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                      Tiada slot masa direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  slots?.map((slot, index) => (
                    <TableRow key={slot.id}>
                      <TableCell className="text-muted-foreground">{slot.sort_order}</TableCell>
                      <TableCell className="font-mono text-sm">{slot.start_time}</TableCell>
                      <TableCell className="font-mono text-sm">{slot.end_time}</TableCell>
                      <TableCell>
                        {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={slot.is_active}
                            onCheckedChange={() => toggleActive(slot)}
                            aria-label="Aktif atau tidak"
                          />
                          {slot.is_active ? (
                            <Badge variant="success">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary">Tidak Aktif</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => move(slot, -1)}
                            aria-label="Naikkan slot"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === (slots?.length ?? 0) - 1}
                            onClick={() => move(slot, 1)}
                            aria-label="Turunkan slot"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(slot)} aria-label="Sunting slot">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(slot)}
                            aria-label="Padam slot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(mode)} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'add' ? 'Tambah Slot Masa' : 'Sunting Slot Masa'}</DialogTitle>
            <DialogDescription>Tetapkan masa mula dan masa tamat slot (format 24 jam).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-start">Masa Mula</Label>
                <Input id="slot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-end">Masa Tamat</Label>
                <Input id="slot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Paparan 12 jam: {formatTime12h(`${startTime || '00:00'}:00`)} –{' '}
              {formatTime12h(`${endTime || '00:00'}:00`)}
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMode(null)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saveTimeSlot.isPending || createTimeSlot.isPending}>
                <Settings2 className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam slot masa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Slot {deleting ? `${formatTime12h(deleting.start_time)} – ${formatTime12h(deleting.end_time)}` : ''}{' '}
              akan dipadamkan. Slot yang mempunyai tempahan tidak boleh dipadam — nyahaktifkan sahaja.
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
    </div>
  )
}
