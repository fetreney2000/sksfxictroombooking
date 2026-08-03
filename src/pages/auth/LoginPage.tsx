import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, MonitorSmartphone, Rocket, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { loginSchema, bootstrapSchema, type LoginValues, type BootstrapValues } from '@/lib/validators'
import { loginWithUsername, INVALID_CREDENTIALS } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, isLoading, isAuthenticated } = useCurrentUser()
  const setSession = useAuthStore((s) => s.setSession)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const bootstrapForm = useForm<BootstrapValues>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: { username: '', password: '', fullName: '' },
  })

  const { data: needsBootstrap = false } = useQuery({
    queryKey: ['has_users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_users', {})
      if (error) return false
      return data === false
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const goHome = () => {
    navigate('/dashboard')
  }

  if (isLoading) return null
  if (isAuthenticated && profile) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await loginWithUsername(values.username, values.password)
      setSession(result.token, result.user)
      goHome()
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message === INVALID_CREDENTIALS
          ? 'Nama pengguna atau kata laluan salah.'
          : 'Log masuk gagal, sila cuba lagi.',
      )
      setSubmitting(false)
    }
  }

  const onSubmitBootstrap = async (values: BootstrapValues) => {
    setBootstrapping(true)
    setBootstrapError(null)
    try {
      const { error } = await supabase.rpc('bootstrap_admin', {
        p_username: values.username,
        p_password: values.password,
        p_full_name: values.fullName,
      })
      if (error) throw error
      const result = await loginWithUsername(values.username, values.password)
      setSession(result.token, result.user)
      goHome()
    } catch (err) {
      setBootstrapError(
        err instanceof Error && err.message
          ? err.message
          : 'Gagal mencipta akaun pentadbir pertama.',
      )
      setBootstrapping(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
           <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <div>
             <p className="eyebrow mb-1">Portal rasmi</p>
             <h1 className="text-2xl font-extrabold tracking-tight">Sistem Tempahan Bilik ICT</h1>
            <p className="text-sm text-muted-foreground">Log masuk untuk penyelia dan pentadbir</p>
          </div>
        </div>

        {needsBootstrap && (
          <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Persediaan Akaun Pentadbir Pertama
              </CardTitle>
              <CardDescription>
                Tiada akaun ditemui. Cipta akaun pentadbir pertama untuk memulakan sistem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={bootstrapForm.handleSubmit(onSubmitBootstrap)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bootstrap-username">Nama Pengguna</Label>
                  <Input
                    id="bootstrap-username"
                    autoComplete="off"
                    {...bootstrapForm.register('username')}
                  />
                  {bootstrapForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{bootstrapForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bootstrap-password">Kata Laluan</Label>
                  <Input
                    id="bootstrap-password"
                    type="password"
                    {...bootstrapForm.register('password')}
                  />
                  {bootstrapForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{bootstrapForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bootstrap-name">Nama Penuh</Label>
                  <Input id="bootstrap-name" {...bootstrapForm.register('fullName')} />
                  {bootstrapForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">{bootstrapForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                {bootstrapError && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{bootstrapError}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={bootstrapping}>
                  {bootstrapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cipta Akaun Pentadbir
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

         <Card className="app-card">
          <CardHeader>
           <CardTitle className="text-xl">Log Masuk</CardTitle>
            <CardDescription>Masukkan nama pengguna dan kata laluan anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nama Pengguna</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  {...form.register('username')}
                  aria-invalid={Boolean(form.formState.errors.username)}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Laluan</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                  aria-invalid={Boolean(form.formState.errors.password)}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

               <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Masuk
              </Button>
            </form>
          </CardContent>
         </Card>
         <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Akses selamat untuk warga sekolah</div>
      </div>
    </div>
  )
}
