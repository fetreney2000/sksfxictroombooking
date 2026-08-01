import { useState } from 'react'
import { Info, ShieldCheck, UserCog, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useAllUsers, useCreateUser, useUpdateUser, type AdminUser } from '@/hooks/mutations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Role = 'admin' | 'supervisor'

export function UsersPage() {
  const { data: users, isLoading } = useAllUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', password: '', fullName: '', role: 'supervisor' as Role })
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ fullName: '', role: 'supervisor' as Role, isActive: true, newPassword: '' })
  const [editError, setEditError] = useState<string | null>(null)

  const openCreate = () => {
    setCreateForm({ username: '', password: '', fullName: '', role: 'supervisor' })
    setCreateError(null)
    setCreateOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setEditForm({ fullName: user.full_name, role: user.role, isActive: user.is_active, newPassword: '' })
    setEditError(null)
  }

  const handleCreate = async () => {
    const { username, password, fullName, role } = createForm
    if (!username.trim() || !password || !fullName.trim()) {
      setCreateError('Sila lengkapkan semua medan.')
      return
    }
    if (password.length < 6) {
      setCreateError('Kata laluan sekurang-kurangnya 6 aksara.')
      return
    }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      setCreateError('Nama pengguna tidak sah (3-30 aksara; huruf, nombor, titik, sempang, garis bawah).')
      return
    }
    setCreateError(null)
    try {
      await createUser.mutateAsync({ username: username.trim(), password, full_name: fullName.trim(), role })
      toast.success('Akaun pengguna dicipta.')
      setCreateOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setCreateError(
        message.includes('23505') ? 'Nama pengguna sudah digunakan.' : 'Gagal mencipta akaun.',
      )
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    if (!editForm.fullName.trim()) {
      setEditError('Sila masukkan nama penuh.')
      return
    }
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setEditError('Kata laluan baharu sekurang-kurangnya 6 aksara.')
      return
    }
    setEditError(null)
    try {
      await updateUser.mutateAsync({
        id: editing.id,
        full_name: editForm.fullName.trim(),
        role: editForm.role,
        is_active: editForm.isActive,
        new_password: editForm.newPassword || undefined,
      })
      toast.success('Akaun pengguna dikemas kini.')
      setEditing(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setEditError(message || 'Gagal mengemas kini akaun.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Urus Pengguna</h1>
          <p className="text-sm text-muted-foreground">Senarai akaun penyelia dan pentadbir.</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm">
            <p className="font-semibold">Maklumat akaun</p>
            <p className="mt-1 text-muted-foreground">
              Akaun dicipta di sini dengan nama pengguna dan kata laluan. Kata laluan disimpan dalam
              pangkalan data menggunakan penyulitan <strong>bcrypt</strong>. Log masuk hanya menggunakan
              nama pengguna dan kata laluan — tiada pendaftaran awam.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Pengguna</CardTitle>
          <CardDescription>Kemas kini nama, peranan, status dan kata laluan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Nama Penuh</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tarikh Ditambah</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-4">
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                      Tiada pengguna direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm font-medium">{user.username}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge>Pentadbir</Badge>
                        ) : (
                          <Badge variant="secondary">Penyelia</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeDisplay(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          Ubah
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baharu</DialogTitle>
            <DialogDescription>Cipta akaun penyelia atau pentadbir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Nama Pengguna</Label>
              <Input
                id="new-username"
                placeholder="cth. cikgu_aziz"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Kata Laluan</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Sekurang-kurangnya 6 aksara"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nama Penuh</Label>
              <Input
                id="new-name"
                placeholder="cth. Cikgu Aziz Rahman"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Peranan</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Penyelia</SelectItem>
                  <SelectItem value="admin">Pentadbir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={createUser.isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                Cipta Akaun
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Pengguna</DialogTitle>
            <DialogDescription>Kemas kini akaun: {editing?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Penuh</Label>
              <Input
                id="edit-name"
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Peranan</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Penyelia</SelectItem>
                  <SelectItem value="admin">Pentadbir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Kata Laluan Baharu (pilihan)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Biarkan kosong jika tidak mahu tukar"
                value={editForm.newPassword}
                onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Akaun Aktif</p>
                <p className="text-xs text-muted-foreground">Pengguna tidak aktif tidak boleh log masuk.</p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm((f) => ({ ...f, isActive: checked }))}
                aria-label="Aktif atau tidak"
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button onClick={handleUpdate} disabled={updateUser.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
