import { useState } from 'react'
import { Info, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTimeDisplay } from '@/lib/datetime'
import { useAllProfiles, useUpdateProfileRole } from '@/hooks/mutations'
import type { Profile } from '@/types/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

export function UsersPage() {
  const { data: profiles, isLoading } = useAllProfiles()
  const updateRole = useUpdateProfileRole()

  const [editing, setEditing] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'supervisor'>('supervisor')

  const openEdit = (profile: Profile) => {
    setEditing(profile)
    setFullName(profile.full_name)
    setRole(profile.role)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!fullName.trim()) {
      toast.error('Sila masukkan nama penuh.')
      return
    }
    try {
      await updateRole.mutateAsync({
        id: editing.id,
        full_name: fullName.trim(),
        role,
      })
      toast.success('Peranan pengguna dikemas kini.')
      setEditing(null)
    } catch {
      toast.error('Gagal mengemas kini pengguna.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Urus Pengguna</h1>
        <p className="text-sm text-muted-foreground">Senarai akaun penyelia dan pentadbir serta peranan mereka.</p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm">
            <p className="font-semibold">Cara mencipta akaun baharu</p>
            <p className="mt-1 text-muted-foreground">
              Akaun penyelia/pentadbir baharu dicipta melalui Supabase Dashboard (Authentication → Users → Add
              user). Akaun yang baru dicipta secara automatik menerima peranan <strong>Penyelia</strong>. Selepas
              akaun wujud, gunakan borang "Ubah Peranan" di bawah untuk menetapkan peranan{' '}
              <strong>Pentadbir</strong> jika perlu.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Pengguna</CardTitle>
          <CardDescription>Kemas kini nama penuh dan peranan setiap akaun.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Penuh</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Tarikh Ditambah</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-4">
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : profiles && profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      Tiada pengguna direkodkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles?.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name}</TableCell>
                      <TableCell>
                        {profile.role === 'admin' ? (
                          <Badge>Pentadbir</Badge>
                        ) : (
                          <Badge variant="secondary">Penyelia</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeDisplay(profile.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(profile)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          Ubah Peranan
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

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Peranan Pengguna</DialogTitle>
            <DialogDescription>Kemas kini nama penuh dan peranan akaun ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nama Penuh</Label>
              <Input id="user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Peranan</Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'admin' | 'supervisor')}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Penyelia</SelectItem>
                  <SelectItem value="admin">Pentadbir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={updateRole.isPending}>
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
