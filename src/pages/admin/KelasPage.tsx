import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, School, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useKelas } from '@/hooks/useKelas'
import { useDeleteKelas, useSaveKelas, useSetKelasActive } from '@/hooks/mutations'
import type { Kelas } from '@/types/shared'
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

const kelasFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Sila masukkan nama kelas (sekurang-kurangnya 2 aksara).')
    .max(60, 'Nama kelas tidak boleh melebihi 60 aksara.'),
})

type KelasFormValues = z.infer<typeof kelasFormSchema>

export function KelasPage() {
  const { data: kelas, isLoading } = useKelas(true)
  const saveKelas = useSaveKelas()
  const setKelasActive = useSetKelasActive()
  const deleteKelas = useDeleteKelas()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Kelas | null>(null)
  const [deleting, setDeleting] = useState<Kelas | null>(null)

  const form = useForm<KelasFormValues>({
    resolver: zodResolver(kelasFormSchema),
    defaultValues: { name: '' },
  })

  const openAdd = () => {
    setEditing(null)
    form.reset({ name: '' })
    setDialogOpen(true)
  }

  const openEdit = (k: Kelas) => {
    setEditing(k)
    form.reset({ name: k.name })
    setDialogOpen(true)
  }

  const onSubmit = async (values: KelasFormValues) => {
    try {
      await saveKelas.mutateAsync({ id: editing?.id, name: values.name.trim() })
      toast.success(editing ? 'Kelas dikemas kini.' : 'Kelas baru ditambah.')
      setDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      toast.error(message.includes('23505') ? 'Nama kelas sudah digunakan.' : 'Gagal menyimpan kelas.')
    }
  }

  const toggleActive = async (k: Kelas) => {
    try {
      await setKelasActive.mutateAsync({ id: k.id, is_active: !k.is_active })
      toast.success(k.is_active ? 'Kelas dinyahaktifkan.' : 'Kelas diaktifkan.')
    } catch {
      toast.error('Gagal mengemas kini status kelas.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteKelas.mutateAsync(deleting.id)
      toast.success('Kelas dipadam.')
      setDeleting(null)
    } catch {
      toast.error('Gagal memadam kelas.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Urus Kelas</h1>
          <p className="text-sm text-muted-foreground">Senarai kelas yang boleh dipilih dalam borang tempahan.</p>
        </div>
        <Button onClick={openAdd}>
          <School className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Kelas</CardTitle>
          <CardDescription>Kelas aktif dipaparkan dalam borang tempahan awam.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
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
                ) : kelas && kelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      Tiada kelas direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  kelas?.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>
                        {k.is_active ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeDisplay(k.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(k)} aria-label="Sunting">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(k)}
                            aria-label={k.is_active ? 'Nyahaktif' : 'Aktif'}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(k)}
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
            <DialogTitle>{editing ? 'Sunting Kelas' : 'Tambah Kelas Baharu'}</DialogTitle>
            <DialogDescription>Nama kelas seperti yang dipaparkan dalam borang tempahan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kelas-name">Nama Kelas</Label>
              <Input id="kelas-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveKelas.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam kelas ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas {deleting?.name} akan dipadamkan daripada senarai. Tempahan sedia ada tidak terjejas.
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
