import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpenCheck, Pencil, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useTujuanTempahan } from '@/hooks/useTujuanTempahan'
import {
  useDeleteTujuanTempahan,
  useSaveTujuanTempahan,
  useSetTujuanTempahanActive,
} from '@/hooks/mutations'
import type { TujuanTempahan } from '@/types/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

const tujuanFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Sila masukkan tujuan tempahan (sekurang-kurangnya 3 aksara).')
    .max(100, 'Tujuan tempahan tidak boleh melebihi 100 aksara.'),
})

type TujuanFormValues = z.infer<typeof tujuanFormSchema>

export function TujuanPage() {
  const { data: tujuan, isLoading } = useTujuanTempahan(true)
  const saveTujuan = useSaveTujuanTempahan()
  const setTujuanActive = useSetTujuanTempahanActive()
  const deleteTujuan = useDeleteTujuanTempahan()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TujuanTempahan | null>(null)
  const [deleting, setDeleting] = useState<TujuanTempahan | null>(null)

  const form = useForm<TujuanFormValues>({
    resolver: zodResolver(tujuanFormSchema),
    defaultValues: { name: '' },
  })

  const openAdd = () => {
    setEditing(null)
    form.reset({ name: '' })
    setDialogOpen(true)
  }

  const openEdit = (t: TujuanTempahan) => {
    setEditing(t)
    form.reset({ name: t.name })
    setDialogOpen(true)
  }

  const onSubmit = async (values: TujuanFormValues) => {
    try {
      await saveTujuan.mutateAsync({ id: editing?.id, name: values.name.trim() })
      toast.success(editing ? 'Tujuan tempahan dikemas kini.' : 'Tujuan tempahan ditambah.')
      setDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      toast.error(
        message.includes('23505') ? 'Nama tujuan sudah digunakan.' : 'Gagal menyimpan tujuan tempahan.',
      )
    }
  }

  const toggleActive = async (t: TujuanTempahan) => {
    try {
      await setTujuanActive.mutateAsync({ id: t.id, is_active: !t.is_active })
      toast.success(t.is_active ? 'Tujuan dinyahaktifkan.' : 'Tujuan diaktifkan.')
    } catch {
      toast.error('Gagal mengemas kini status tujuan.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTujuan.mutateAsync(deleting.id)
      toast.success('Tujuan tempahan dipadam.')
      setDeleting(null)
    } catch {
      toast.error('Gagal memadam tujuan tempahan.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Urus Tujuan Tempahan</h1>
          <p className="text-sm text-muted-foreground">
            Senarai tujuan tempahan yang boleh dipilih dalam borang tempahan.
          </p>
        </div>
        <Button onClick={openAdd}>
          <BookOpenCheck className="mr-2 h-4 w-4" />
          Tambah Tujuan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Tujuan Tempahan</CardTitle>
          <CardDescription>Tujuan aktif dipaparkan dalam borang tempahan awam.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tujuan Tempahan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tarikh Ditambah</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-4">
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tujuan && tujuan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      Tiada tujuan tempahan direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  tujuan?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        {t.is_active ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeDisplay(t.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label="Sunting">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(t)}
                            aria-label={t.is_active ? 'Nyahaktif' : 'Aktif'}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(t)}
                            aria-label="Padam"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sunting Tujuan Tempahan' : 'Tambah Tujuan Tempahan'}</DialogTitle>
            <DialogDescription>Tujuan tempahan seperti yang dipaparkan dalam borang tempahan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tujuan-name">Tujuan Tempahan</Label>
              <Input id="tujuan-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveTujuan.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam tujuan tempahan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tujuan {deleting?.name} akan dipadamkan daripada senarai. Tempahan sedia ada tidak terjejas.
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
