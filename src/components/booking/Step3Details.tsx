import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { bookingDetailsSchema, type BookingDetailsValues } from '@/lib/validators'
import { useBookingFormStore } from '@/store/bookingFormStore'
import { useTeachers } from '@/hooks/useTeachers'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Step3DetailsProps {
  onBack: () => void
  onNext: () => void
}

export function Step3Details({ onBack, onNext }: Step3DetailsProps) {
  const teacherId = useBookingFormStore((s) => s.teacherId)
  const className = useBookingFormStore((s) => s.className)
  const purpose = useBookingFormStore((s) => s.purpose)
  const setTeacherId = useBookingFormStore((s) => s.setTeacherId)
  const setClassName = useBookingFormStore((s) => s.setClassName)
  const setPurpose = useBookingFormStore((s) => s.setPurpose)

  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useTeachers()

  const form = useForm<BookingDetailsValues>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
      teacherId: teacherId ?? '',
      className,
      purpose,
    },
    mode: 'onSubmit',
  })

  const onSubmit = (values: BookingDetailsValues) => {
    setTeacherId(values.teacherId)
    setClassName(values.className)
    setPurpose(values.purpose)
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maklumat Tempahan</CardTitle>
        <CardDescription>Isi maklumat guru, kelas dan tujuan tempahan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {teachersError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Gagal memuatkan senarai guru: {teachersError.message}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="teacherId">Nama Guru</Label>
            <Controller
              control={form.control}
              name="teacherId"
              render={({ field }) => {
                const selectedTeacher = teachers?.find((t) => t.id === field.value) ?? null
                return (
                  <Combobox
                    items={teachers ?? []}
                    value={selectedTeacher}
                    onValueChange={(teacher) => field.onChange(teacher ? teacher.id : '')}
                    itemToStringValue={(teacher) => teacher.full_name}
                    itemToStringLabel={(teacher) => teacher.full_name}
                    disabled={teachersLoading}
                  >
                    <ComboboxInput
                      id="teacherId"
                      aria-label="Nama Guru"
                      aria-invalid={Boolean(form.formState.errors.teacherId)}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Tiada guru ditemui.</ComboboxEmpty>
                      <ComboboxList>
                        {(teacher) => (
                          <ComboboxItem key={teacher.id} value={teacher}>
                            {teacher.full_name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )
              }}
            />
            {form.formState.errors.teacherId && (
              <p className="text-sm text-destructive">{form.formState.errors.teacherId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="className">Kelas</Label>
            <Input
              id="className"
              {...form.register('className')}
              aria-invalid={Boolean(form.formState.errors.className)}
            />
            {form.formState.errors.className && (
              <p className="text-sm text-destructive">{form.formState.errors.className.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Tujuan Tempahan</Label>
            <Textarea
              id="purpose"
              rows={4}
              {...form.register('purpose')}
              aria-invalid={Boolean(form.formState.errors.purpose)}
            />
            {form.formState.errors.purpose && (
              <p className="text-sm text-destructive">{form.formState.errors.purpose.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={onBack}>
              Kembali
            </Button>
            <Button type="submit" disabled={teachersLoading}>
              Seterusnya
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
