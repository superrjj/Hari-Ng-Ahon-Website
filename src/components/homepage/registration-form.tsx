import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrationService } from '../../services/registrationService'

const categories = [
  'Age Category',
  'OPEN Mountain Bike',
  'OPEN Road Bike',
  'OPEN Gravel Bike',
  'Public Servant',
  'Heavyweight',
]

const roadBikeCategories = [
  'RB OPEN/ELITE',
  'YOUTH (15 and Below)',
  'Junior (16-18)',
  'Under 23 (19-22)',
  'Masters A (23-34)',
  'Masters B (35-44)',
  'Masters C (45-54)',
  'Masters D (55 and above)',
]

const mountainBikeCategories = [
  'MTB OPEN/Elite',
  'YOUTH (15 and Below)',
  'Junior (16-18)',
  'Under 23 (19-22)',
  'Masters A (23-34)',
  'Masters B (35-44)',
  'Masters C (45-54)',
  'Masters D (55 and above)',
]

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL']
const cardClass =
  'rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5'

export function RegistrationForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    address: '',
    contactNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    teamName: '',
    discipline: 'Road Bike',
  })
  const [birthYear, setBirthYear] = useState('')
  const [category, setCategory] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [eventKey, setEventKey] = useState<'criterium' | 'itt'>('criterium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const raceAge = useMemo(() => {
    const year = Number.parseInt(birthYear, 10)
    if (Number.isNaN(year)) return '-'
    return String(new Date().getFullYear() - year)
  }, [birthYear])

  const resolvedAgeCategory = useMemo(() => {
    const age = Number.parseInt(raceAge, 10)
    if (Number.isNaN(age)) return ''
    const cats = form.discipline === 'Mountain Bike' ? mountainBikeCategories : roadBikeCategories
    if (age <= 15) return cats[1]
    if (age <= 18) return cats[2]
    if (age <= 22) return cats[3]
    if (age <= 34) return cats[4]
    if (age <= 44) return cats[5]
    if (age <= 54) return cats[6]
    return cats[7]
  }, [raceAge, form.discipline])

  const onSubmit = async () => {
    setFieldErrors({})
    setError(null)

    const errors: Record<string, string> = {}
    if (!form.email) errors.email = 'Email is required.'
    if (!form.firstName) errors.firstName = 'First name is required.'
    if (!form.lastName) errors.lastName = 'Last name is required.'
    if (!form.gender) errors.gender = 'Please select a gender.'
    if (!form.birthDate) errors.birthDate = 'Date of birth is required.'
    if (!form.address) errors.address = 'Address is required.'
    if (!form.contactNumber) errors.contactNumber = 'Contact number is required.'
    if (!form.emergencyContactName) errors.emergencyContactName = 'Emergency contact name is required.'
    if (!form.emergencyContactNumber) errors.emergencyContactNumber = 'Emergency contact number is required.'
    if (!category) errors.category = 'Please select a category.'
    if (category === 'Age Category') {
      if (!birthYear) errors.birthYear = 'Birth year is required.'
    }
    if (!shirtSize) errors.shirtSize = 'Please select a shirt size.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const { registrationId } = await registrationService.createRegistration({
        raceType: eventKey,
        registrationFee: 1000,
        registrantEmail: form.email,
        rider: {
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          birthDate: form.birthDate,
          birthYear: Number.isNaN(Number(birthYear)) ? null : Number(birthYear),
          address: form.address,
          contactNumber: form.contactNumber,
          emergencyContactName: form.emergencyContactName,
          emergencyContactNumber: form.emergencyContactNumber,
          teamName: form.teamName,
          discipline: form.discipline,
          ageCategory: category === 'Age Category' ? resolvedAgeCategory : category,
          jerseySize: shirtSize,
        },
      })

      navigate(`/register/payment?registrationId=${encodeURIComponent(registrationId)}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-white px-4 py-8 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-[760px] space-y-5 sm:space-y-6">
        <img src="/hna-banner-1.png" alt="Hari ng Ahon 2026 banner" className="w-full rounded-lg object-cover" />

        <Link to="/register/info" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          &larr; Back
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Registration</h1>
          <p className="text-sm text-slate-600">Fill up the rider information and choose your category.</p>
        </div>

        <div className={`${cardClass} grid grid-cols-1 gap-4 md:grid-cols-2`}>
          <Field
            label={<>Email <span className="text-rose-500">*</span></>}
            type="email"
            value={form.email}
            placeholder="you@email.com"
            error={fieldErrors.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Event <span className="text-rose-500">*</span></label>
            <div className="flex flex-col gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setEventKey('criterium')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                  eventKey === 'criterium' ? 'border-[#cfae3f] bg-[#fff6d6]' : 'border-slate-300 bg-white'
                }`}
              >
                <span className={`h-3 w-3 rounded-sm border ${eventKey === 'criterium' ? 'bg-[#cfae3f] border-[#cfae3f]' : 'border-slate-400'}`} />
                Criterium
              </button>
              <button
                type="button"
                onClick={() => setEventKey('itt')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                  eventKey === 'itt' ? 'border-[#cfae3f] bg-[#fff6d6]' : 'border-slate-300 bg-white'
                }`}
              >
                <span className={`h-3 w-3 rounded-sm border ${eventKey === 'itt' ? 'bg-[#cfae3f] border-[#cfae3f]' : 'border-slate-400'}`} />
                Individual Time Trial
              </button>
            </div>
          </div>
        </div>

        <div className={`${cardClass} grid grid-cols-1 gap-4 md:grid-cols-2`}>
          <Field
            label={<>First Name <span className="text-rose-500">*</span></>}
            value={form.firstName}
            placeholder="Juan"
            error={fieldErrors.firstName}
            onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
          />
          <Field
            label={<>Last Name <span className="text-rose-500">*</span></>}
            value={form.lastName}
            placeholder="Dela Cruz"
            error={fieldErrors.lastName}
            onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
          />
          <SelectField
            label={<>Gender <span className="text-rose-500">*</span></>}
            value={form.gender}
            options={['Male', 'Female']}
            placeholder="Select gender"
            error={fieldErrors.gender}
            onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
          />
          <Field
            label={<>Date Of Birth <span className="text-rose-500">*</span></>}
            type="date"
            value={form.birthDate}
            error={fieldErrors.birthDate}
            onChange={(v) => setForm((p) => ({ ...p, birthDate: v }))}
          />
          <Field
            label={<>Address <span className="text-rose-500">*</span></>}
            value={form.address}
            placeholder="Baguio City"
            error={fieldErrors.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />
          <Field
            label={<>Contact Number <span className="text-rose-500">*</span></>}
            value={form.contactNumber}
            placeholder="+63 9XX XXX XXXX"
            error={fieldErrors.contactNumber}
            onChange={(v) => setForm((p) => ({ ...p, contactNumber: v }))}
          />
          <Field
            label={<>Emergency Contact <span className="text-rose-500">*</span></>}
            value={form.emergencyContactName}
            placeholder="Full name"
            error={fieldErrors.emergencyContactName}
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactName: v }))}
          />
          <Field
            label={<>Emergency Contact Number <span className="text-rose-500">*</span></>}
            value={form.emergencyContactNumber}
            placeholder="+63 9XX XXX XXXX"
            error={fieldErrors.emergencyContactNumber}
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactNumber: v }))}
          />
          <Field
            label="Team Name"
            value={form.teamName}
            placeholder="Optional"
            onChange={(v) => setForm((p) => ({ ...p, teamName: v }))}
          />
        </div>

        <div className={`${cardClass} space-y-2`}>
          <label className="text-sm font-semibold text-slate-900">Category <span className="text-rose-500">*</span></label>
          <p className="text-xs text-slate-500">
            *The organizers reserve the right to merge categories with less than 10 participants.
          </p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f] ${
              fieldErrors.category ? 'border-rose-400' : 'border-slate-300'
            }`}
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldErrors.category && <p className="text-xs text-rose-500">{fieldErrors.category}</p>}
        </div>

        {category === 'Age Category' && (
          <div className={`${cardClass} grid grid-cols-1 gap-4 md:grid-cols-2`}>
            <SelectField
              label={<>Discipline <span className="text-rose-500">*</span></>}
              value={form.discipline}
              options={['Road Bike', 'Mountain Bike']}
              onChange={(v) => setForm((p) => ({ ...p, discipline: v }))}
            />
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Birth Year <span className="text-rose-500">*</span></label>
              <input
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f] ${
                  fieldErrors.birthYear ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
              {fieldErrors.birthYear && <p className="text-xs text-rose-500">{fieldErrors.birthYear}</p>}
            </div>
          </div>
        )}

        <div className={`${cardClass} space-y-2 text-sm text-slate-700`}>
          <p className="text-xs text-slate-500">
            Age is based on your age on December 31st of the competition year.
          </p>
          <div className="flex flex-wrap gap-4">
            <p>Race Age: <span className="font-semibold text-slate-900">{raceAge}</span></p>
            <p>Category: <span className="font-semibold text-slate-900">
              {category === 'Age Category' ? resolvedAgeCategory : category}
            </span></p>
          </div>
        </div>

        <div className={`${cardClass} space-y-3`}>
          <label className="text-sm font-semibold text-slate-900">Event Shirt <span className="text-rose-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {shirtSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setShirtSize(size)}
                className={`min-w-[3rem] rounded-md border px-3 py-2 text-sm sm:min-w-[3.25rem] ${
                  shirtSize === size
                    ? 'border-[#cfae3f] bg-[#fff6d6] text-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {fieldErrors.shirtSize && <p className="text-xs text-rose-500">{fieldErrors.shirtSize}</p>}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? 'Saving…' : 'Next'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2 ${
          error ? 'border-rose-400' : 'border-slate-300'
        }`}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  placeholder,
}: {
  label: React.ReactNode
  value: string
  options: string[]
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2 ${
          error ? 'border-rose-400' : 'border-slate-300'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}