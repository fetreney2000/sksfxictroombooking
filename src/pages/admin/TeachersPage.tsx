import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, FileSpreadsheet, Loader2, Pencil, Trash2, UserPlus, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { teacherFormSchema } from '@/lib/validators'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useTeachers } from '@/hooks/useTeachers'
import { useDeleteTeacher, useImportTeachers, useSaveTeacher, useSetTeacherActive } from '@/hooks/mutations'
import type { TeacherImportParseResult } from '@/lib/importTeachers'
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

type ImportPhase = 'idle' | 'parsing' | 'ready' | 'error'

export function TeachersPage() {
  const { data: teachers, isLoading } = useTeachers(true)
  const saveTeacher = useSaveTeacher()
  const setTeacherActive = useSetTeacherActive()
  const deleteTeacher = useDeleteTeacher()
  const importTeachers = useImportTeachers()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [deleting, setDeleting] = useState<Teacher | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle')
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<TeacherImportParseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { full_name: '' },
  })

  const resetImport = () => {
    setImportPhase('idle')
    setImportError(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportPhase('parsing')
    setImportError(null)
    setImportResult(null)
    try {
      const { parseTeacherNamesFromExcel } = await import('@/lib/importTeachers')
      const result = await parseTeacherNamesFromExcel(
        file,
        teachers?.map((t) => t.full_name) ?? [],
      )
      if (result.total === 0) {
        setImportError(`Tiada nama dijumpai dalam lajur B sheet "${'nama guru'}".`)
        setImportPhase('error')
      } else {
        setImportResult(result)
        setImportPhase('ready')
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal membaca fail Excel.')
      setImportPhase('error')
    }
  }

  const handleImport = async () => {
    if (!importResult || importResult.names.length === 0) return
    try {
      const added = await importTeachers.mutateAsync(importResult.names)
      toast.success(`${added} guru telah diimport.`)
      setImportOpen(false)
      resetImport()
    } catch {
      toast.error('Gagal mengimport senarai guru.')
    }
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={openAdd}>
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah Guru
          </Button>
        </div>
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
              <Input id="teacher-name" {...form.register('full_name')} />
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

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) resetImport()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Senarai Guru dari Excel</DialogTitle>
            <DialogDescription>
              Tambah ramai guru sekaligus daripada fail Excel. Fail diproses sepenuhnya dalam pelayar
              anda — tiada fail dimuat naik ke pelayan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Format fail yang diperlukan:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Sheet bernama <span className="font-medium text-foreground">nama guru</span>
              </li>
              <li>
                Nama guru dalam <span className="font-medium text-foreground">Lajur B</span>, satu nama
                setiap baris
              </li>
              <li>Baris pertama boleh menjadi pengepala (cth. &quot;Nama Guru&quot;)</li>
              <li>Nama sekurang-kurangnya 3 aksara</li>
              <li>Nama yang sudah wujud atau berulang akan diabaikan</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">Fail Excel (.xlsx)</Label>
            <Input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={importPhase === 'parsing' || importTeachers.isPending}
            />
          </div>

          {importPhase === 'parsing' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Membaca fail…
            </p>
          ) : null}

          {importPhase === 'error' ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          ) : null}

          {importPhase === 'ready' && importResult ? (
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <p>
                  Nama dijumpai: <span className="font-medium">{importResult.total}</span>
                </p>
                <p>
                  Akan ditambah: <span className="font-medium text-emerald-600">{importResult.names.length}</span>
                </p>
                <p>
                  Diabaikan:{' '}
                  <span className="font-medium text-muted-foreground">
                    {importResult.invalid + importResult.duplicates}
                  </span>
                  {importResult.invalid > 0 && ` (${importResult.invalid} terlalu pendek)`}
                  {importResult.duplicates > 0 && ` (${importResult.duplicates} duplikat)`}
                </p>
              </div>
              {importResult.names.length > 0 ? (
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md bg-muted/40 p-2 text-xs">
                  {importResult.names.slice(0, 30).map((name) => (
                    <p key={name}>{name}</p>
                  ))}
                  {importResult.names.length > 30 && (
                    <p className="text-muted-foreground">
                      … dan {importResult.names.length - 30} lagi
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Semua nama telah pun wujud dalam senarai guru.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleImport}
              disabled={importPhase !== 'ready' || importResult?.names.length === 0 || importTeachers.isPending}
            >
              {importTeachers.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Import
            </Button>
          </DialogFooter>
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
