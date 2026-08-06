import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { bookingDetailsSchema, type BookingDetailsValues } from '@/lib/validators'
import { useBookingFormStore } from '@/store/bookingFormStore'
import { useTeachers } from '@/hooks/useTeachers'
import { useKelas } from '@/hooks/useKelas'
import { useTujuanTempahan } from '@/hooks/useTujuanTempahan'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CUSTOM_PURPOSE_OPTION = 'Lain-lain'

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
  const { data: kelasList, isLoading: kelasLoading, error: kelasError } = useKelas()
  const {
    data: tujuanList,
    isLoading: tujuanLoading,
    error: tujuanError,
  } = useTujuanTempahan()

  const form = useForm<BookingDetailsValues>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
      teacherId: teacherId ?? '',
      className,
      purpose,
      customPurpose: '',
    },
    mode: 'onSubmit',
  })

  const watchPurpose = form.watch('purpose')
  const initializedRef = useRef(false)

  // Restore a custom tujuan saved in the store: if the stored purpose is not a
  // known tujuan, treat it as a "Lain-lain" selection with the custom text.
  useEffect(() => {
    if (!tujuanList || initializedRef.current) return
    initializedRef.current = true
    const names = new Set(tujuanList.map((t) => t.name))
    const isCustom = Boolean(purpose && !names.has(purpose))
    form.setValue('purpose', isCustom ? CUSTOM_PURPOSE_OPTION : purpose)
    form.setValue('customPurpose', isCustom ? purpose : '')
  }, [tujuanList, purpose, form])

  const onSubmit = (values: BookingDetailsValues) => {
    const finalPurpose =
      values.purpose === CUSTOM_PURPOSE_OPTION ? (values.customPurpose ?? '').trim() : values.purpose
    setTeacherId(values.teacherId)
    setClassName(values.className)
    setPurpose(finalPurpose)
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maklumat Tempahan</CardTitle>
        <CardDescription>Isi maklumat guru, kelas dan tujuan tempahan.</CardDescription>
      </CardHeader>
       <CardContent className="px-4 sm:px-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {teachersError || kelasError || tujuanError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Gagal memuatkan senarai {teachersError ? 'guru' : kelasError ? 'kelas' : 'tujuan'}:
                {teachersError?.message ?? kelasError?.message ?? tujuanError?.message}
              </p>
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
            <Label htmlFor="kelas">Kelas</Label>
            <Controller
              control={form.control}
              name="className"
              render={({ field }) => {
                const selectedKelas = kelasList?.find((k) => k.name === field.value) ?? null
                return (
                  <Combobox
                    items={kelasList ?? []}
                    value={selectedKelas}
                    onValueChange={(k) => field.onChange(k ? k.name : '')}
                    itemToStringValue={(k) => k.name}
                    itemToStringLabel={(k) => k.name}
                    disabled={kelasLoading}
                  >
                    <ComboboxInput
                      id="kelas"
                      aria-label="Kelas"
                      aria-invalid={Boolean(form.formState.errors.className)}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Tiada kelas ditemui.</ComboboxEmpty>
                      <ComboboxList>
                        {(k) => (
                          <ComboboxItem key={k.id} value={k}>
                            {k.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )
              }}
            />
            {form.formState.errors.className && (
              <p className="text-sm text-destructive">{form.formState.errors.className.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Tujuan Tempahan</Label>
            <Controller
              control={form.control}
              name="purpose"
              render={({ field }) => {
                const selectedTujuan = tujuanList?.find((t) => t.name === field.value) ?? null
                return (
                  <Combobox
                    items={tujuanList ?? []}
                    value={selectedTujuan}
                    onValueChange={(t) => {
                      field.onChange(t ? t.name : '')
                      if (!t || t.name !== CUSTOM_PURPOSE_OPTION) {
                        form.setValue('customPurpose', '')
                      }
                    }}
                    itemToStringValue={(t) => t.name}
                    itemToStringLabel={(t) => t.name}
                    disabled={tujuanLoading}
                  >
                    <ComboboxInput
                      id="purpose"
                      aria-label="Tujuan Tempahan"
                      aria-invalid={Boolean(form.formState.errors.purpose)}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Tiada tujuan ditemui.</ComboboxEmpty>
                      <ComboboxList>
                        {(t) => (
                          <ComboboxItem key={t.id} value={t}>
                            {t.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )
              }}
            />
            {form.formState.errors.purpose && (
              <p className="text-sm text-destructive">{form.formState.errors.purpose.message}</p>
            )}
          </div>

          {watchPurpose === CUSTOM_PURPOSE_OPTION ? (
            <div className="space-y-2">
              <Label htmlFor="customPurpose">Nyatakan Tujuan</Label>
              <Input
                id="customPurpose"
                {...form.register('customPurpose')}
                aria-invalid={Boolean(form.formState.errors.customPurpose)}
              />
              {form.formState.errors.customPurpose && (
                <p className="text-sm text-destructive">{form.formState.errors.customPurpose.message}</p>
              )}
            </div>
          ) : null}

           <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
             <Button className="min-h-11 w-full sm:w-auto" type="button" variant="ghost" onClick={onBack}>
              Kembali
            </Button>
             <Button className="min-h-11 w-full sm:w-auto" type="submit" disabled={teachersLoading}>
              Seterusnya
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
