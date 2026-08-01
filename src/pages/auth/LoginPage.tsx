import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, MonitorSmartphone } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { loginSchema, type LoginValues } from '@/lib/validators'
import { useCurrentUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile, isLoading } = useCurrentUser()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isLoading) return null
  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard'} replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    if (from?.startsWith('/admin')) {
      navigate('/admin/dashboard')
    } else if (from?.startsWith('/supervisor')) {
      navigate('/supervisor/dashboard')
    } else {
      navigate('/supervisor/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sistem Tempahan Makmal Komputer</h1>
            <p className="text-sm text-muted-foreground">Log masuk untuk penyelia dan pentadbir</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log Masuk</CardTitle>
            <CardDescription>Masukkan emel dan kata laluan anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Emel</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@sekolah.edu.my"
                  {...form.register('email')}
                  aria-invalid={Boolean(form.formState.errors.email)}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Laluan</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
