import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Save, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { parsePatientRecord, type PatientRecord } from '../../../../shared/schemas/patient.schema'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'

type PatientIntakeFormProps = {
  patient: PatientRecord | null
  onSubmitPatient: (patient: PatientRecord) => void
  onCancel?: () => void
}

type PatientFormValues = {
  id: string
  name: string
  age: string
  sex: string
  symptoms: string
  conditions: string
  allergies: string
  medications: string
  notes: string
}

const formSchema: z.ZodType<PatientFormValues> = z.object({
  id: z.string().default(''),
  name: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.')
  ),
  age: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().refine((value) => value === '' || /^\d{1,3}$/.test(value), 'Please enter a valid age.')
  ),
  sex: z.string().max(40, 'Sex is too long.').default(''),
  symptoms: z.string().max(500).default(''),
  conditions: z.string().max(500).default(''),
  allergies: z.string().max(500).default(''),
  medications: z.string().max(500).default(''),
  notes: z.string().max(2000, 'Notes are too long.').default('')
})

const normalizeList = (value: string | undefined) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? []

const buildDefaultValues = (patientData: PatientRecord | null): PatientFormValues => ({
  id: patientData?.id ?? '',
  name: patientData?.name ?? '',
  age: patientData?.age !== undefined && patientData.age !== null ? String(patientData.age) : '',
  sex: patientData?.sex ?? '',
  symptoms: patientData?.symptoms?.join(', ') ?? '',
  conditions: patientData?.conditions?.join(', ') ?? '',
  allergies: patientData?.allergies?.join(', ') ?? '',
  medications: patientData?.medications?.join(', ') ?? '',
  notes: patientData?.notes ?? ''
})

const emptyFormValues: PatientFormValues = {
  id: '',
  name: '',
  age: '',
  sex: '',
  symptoms: '',
  conditions: '',
  allergies: '',
  medications: '',
  notes: ''
}

export function PatientIntakeForm({ patient, onSubmitPatient, onCancel }: PatientIntakeFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(formSchema as any) as any,
    defaultValues: patient ? buildDefaultValues(patient) : emptyFormValues,
    mode: 'onBlur'
  })

  useEffect(() => {
    form.reset(patient ? buildDefaultValues(patient) : emptyFormValues)
  }, [form, patient])

  const onSubmit = (values: PatientFormValues) => {
    const payload = {
      id: values.id || crypto.randomUUID(),
      name: values.name.trim(),
      age: values.age.trim() ? Number(values.age.trim()) : undefined,
      sex: values.sex.trim(),
      symptoms: normalizeList(values.symptoms),
      conditions: normalizeList(values.conditions),
      allergies: normalizeList(values.allergies),
      medications: normalizeList(values.medications),
      notes: values.notes.trim(),
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    onSubmitPatient(parsePatientRecord(payload))
  }

  const { register, handleSubmit, formState: { errors } } = form

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-accent shadow-brutal">
          <UserRound className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Patient intake</p>
          <h2 className="text-2xl font-black">{patient ? 'Edit Patient Record' : 'Create Patient Record'}</h2>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name / Identifier"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <Input
            label="Age"
            type="number"
            min="0"
            max="150"
            inputMode="numeric"
            aria-invalid={Boolean(errors.age)}
            aria-describedby={errors.age ? 'age-error' : undefined}
            {...register('age')}
          />
        </div>

        {errors.name && (
          <p id="name-error" className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertCircle className="h-4 w-4" /> {errors.name.message}
          </p>
        )}

        {errors.age && (
          <p id="age-error" className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertCircle className="h-4 w-4" /> {errors.age.message}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Sex" placeholder="Male, Female, Non-binary" {...register('sex')} />
          <Input label="Symptoms" placeholder="Fatigue, headache" {...register('symptoms')} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Conditions" placeholder="Asthma, seasonal allergies" {...register('conditions')} />
          <Input label="Allergies" placeholder="Peanuts, penicillin" {...register('allergies')} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Medications" placeholder="Ibuprofen, vitamin D" {...register('medications')} />
          <div className="hidden md:block" />
        </div>

        <Textarea
          label="Notes"
          placeholder="Additional context from the patient intake form."
          {...register('notes')}
        />

        {errors.notes && (
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertCircle className="h-4 w-4" /> {errors.notes.message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" className="gap-2">
            <Save className="h-4 w-4" />
            {patient ? 'Update Record' : 'Create Record'}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
