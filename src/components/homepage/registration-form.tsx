import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrationService } from '../../services/registrationService'

const categories = [
  'OPEN Mountain Bike',
  'OPEN Road Bike',
  'OPEN Gravel Bike',
  'Public Servant',
  'Heavyweight',
]

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL']

export function RegistrationForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    gender: 'MALE',
    birthDate: '',
    address: '',
    contactNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    teamName: '',
    discipline: 'Road Bike',
  })
  const [birthYear, setBirthYear] = useState('2004')
  const [category, setCategory] = useState('OPEN Road Bike')
  const [shirtSize, setShirtSize] = useState('L')
  const [eventKey, setEventKey] = useState<'criterium' | 'itt'>('criterium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const raceAge = useMemo(() => {
    const year = Number.parseInt(birthYear, 10)
    if (Number.isNaN(year)) return '-'
    return String(new Date().getFullYear() - year)
  }, [birthYear])

  const onSubmit = async () => {
    setError(null)
    if (!form.email || !form.firstName || !form.lastName || !form.birthDate) {
      setError('Please fill required fields.')
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
          ageCategory: category,
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
    <section className="bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-[760px] space-y-6">
        <img src="/hna-banner-1.png" alt="Hari ng Ahon 2026 banner" />

        <Link to="/register/info" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          &larr; Back
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Registration</h1>
          <p className="text-sm text-slate-600">Fill up the rider information and choose your category.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
          <Field
            label="Email *"
            type="email"
            value={form.email}
            placeholder="you@email.com"
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Event *</label>
            <div className="flex flex-col gap-2">
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

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
          <Field
            label="First Name *"
            value={form.firstName}
            placeholder="Juan"
            onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
          />
          <Field
            label="Last Name *"
            value={form.lastName}
            placeholder="Dela Cruz"
            onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
          />
          <SelectField
            label="Gender *"
            value={form.gender}
            options={['MALE', 'FEMALE']}
            onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
          />
          <Field
            label="Date Of Birth *"
            type="date"
            value={form.birthDate}
            onChange={(v) => setForm((p) => ({ ...p, birthDate: v }))}
          />
          <Field
            label="Address *"
            value={form.address}
            placeholder="Baguio City"
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />
          <Field
            label="Contact Number *"
            value={form.contactNumber}
            placeholder="+63 9XX XXX XXXX"
            onChange={(v) => setForm((p) => ({ ...p, contactNumber: v }))}
          />
          <Field
            label="Emergency Contact *"
            value={form.emergencyContactName}
            placeholder="Full name"
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactName: v }))}
          />
          <Field
            label="Emergency Contact Number *"
            value={form.emergencyContactNumber}
            placeholder="+63 9XX XXX XXXX"
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactNumber: v }))}
          />
          <Field
            label="Team Name"
            value={form.teamName}
            placeholder="Optional"
            onChange={(v) => setForm((p) => ({ ...p, teamName: v }))}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-900">Category</label>
          <p className="text-xs text-slate-500">
            *The organizers reserve the right to merge categories with less than 10 participants.
          </p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f]"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
          <SelectField
            label="Discipline *"
            value={form.discipline}
            options={['Road Bike', 'Mountain Bike', 'Gravel Bike']}
            onChange={(v) => setForm((p) => ({ ...p, discipline: v }))}
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Birth Year *</label>
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f]"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <p className="text-xs text-slate-500">
            Age is based on your age on December 31st of the competition year.
          </p>
          <div className="flex flex-wrap gap-4">
            <p>Race Age: <span className="font-semibold text-slate-900">{raceAge}</span></p>
            <p>Category: <span className="font-semibold text-slate-900">{category}</span></p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-900">Event Shirt</label>
          <div className="flex flex-wrap gap-2">
            {shirtSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setShirtSize(size)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  shirtSize === size
                    ? 'border-[#cfae3f] bg-[#fff6d6] text-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60"
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f]"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}
