import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2, UserPlus, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { teacherFormSchema } from '@/lib/validators'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useTeachers } from '@/hooks/useTeachers'
import { useDeleteTeacher, useSaveTeacher, useSetTeacherActive } from '@/hooks/mutations'
import type { Teacher } from '@/types/shared'
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

type TeacherFormValues = { full_name: string }

export function TeachersPage() {
  const { data: teachers, isLoading } = useTeachers(true)
  const saveTeacher = useSaveTeacher()
  const setTeacherActive = useSetTeacherActive()
  const deleteTeacher = useDeleteTeacher()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [deleting, setDeleting] = useState<Teacher | null>(null)

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { full_name: '' },
  })

  const openAdd = () => {
    setEditing(null)
    form.reset({ full_name: '' })
    setDialogOpen(true)
  }

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher)
    form.reset({ full_name: teacher.full_name })
    setDialogOpen(true)
  }

  const onSubmit = async (values: TeacherFormValues) => {
    try {
      await saveTeacher.mutateAsync({
        id: editing?.id,
        full_name: values.full_name.trim(),
      })
      toast.success(editing ? 'Guru dikemas kini.' : 'Guru baru ditambah.')
      setDialogOpen(false)
    } catch {
      toast.error('Gagal menyimpan guru.')
    }
  }

  const toggleActive = async (teacher: Teacher) => {
    try {
      await setTeacherActive.mutateAsync({ id: teacher.id, is_active: !teacher.is_active })
      toast.success(teacher.is_active ? 'Guru dinyahaktifkan.' : 'Guru diaktifkan.')
    } catch {
      toast.error('Gagal mengemas kini status guru.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTeacher.mutateAsync(deleting.id)
      toast.success('Guru dipadam.')
      setDeleting(null)
    } catch {
      toast.error('Guru ini mempunyai tempahan dan tidak boleh dipadam. Nyahaktifkan sahaja.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Urus Guru</h1>
          <p className="text-sm text-muted-foreground">Senarai guru yang boleh membuat tempahan.</p>
        </div>
        <Button onClick={openAdd}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Guru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Guru</CardTitle>
          <CardDescription>Guru aktif akan dipaparkan dalam borang tempahan awam.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Penuh</TableHead>
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
                ) : teachers && teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      Tiada guru direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers?.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.full_name}</TableCell>
                      <TableCell>
                        {teacher.is_active ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeDisplay(teacher.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)} aria-label="Sunting">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(teacher)}
                            aria-label={teacher.is_active ? 'Nyahaktif' : 'Aktif'}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(teacher)}
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
            <DialogTitle>{editing ? 'Sunting Guru' : 'Tambah Guru Baru'}</DialogTitle>
            <DialogDescription>Nama penuh guru seperti yang akan dipaparkan dalam borang tempahan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Nama Penuh</Label>
              <Input id="teacher-name" placeholder="Contoh: Cikgu Siti Aminah" {...form.register('full_name')} />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveTeacher.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name} akan dipadamkan daripada senarai guru. Guru yang mempunyai rekod tempahan
              tidak boleh dipadam — anda boleh menyahaktifkan guru tersebut.
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
