import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { registrationService } from '../../services/registrationService'

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'waiver' as const,
    title: 'Accident Waiver and Release of Liability',
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        <p>
          I understand and agree that I am voluntarily participating in the{' '}
          <strong>HARI NG AHON</strong> and all of its activities including but
          not limited to training for and participating in any of its events. I
          acknowledge that this athletic event is an extreme test of a person's
          physical and mental limits and carries with it a potential for property
          loss, serious injury and death.
        </p>
        <p>
          The risks include, but are not limited to those caused by terrain,
          facilities, temperature, weather, condition of athletes, equipment,
          actions of other people including but not limited to participants,
          volunteers, spectators, coaches, event officials, and event monitors,
          and/or producers of the event. These risks are not only inherent to
          athletes, but are also present on the part of the persons or entities
          being released, from dangerous or defective equipment or property
          owned, maintained or controlled by them or because of their possible
          liability without fault.
        </p>
        <p>
          I certify that I am physically fit, have sufficiently trained for
          participation in the event and have not been advised otherwise by a
          qualified medical person to not participate in such activities.
        </p>
        <p>
          I understand that at this event or related activities, I may be
          photographed. I agree to allow my photo, video or film to be used for
          any legitimate purpose by the event holders, producers, sponsors,
          organizers and/or assigns.
        </p>
        <p>
          I acknowledge that this Accident Waiver and Release of Liability form
          will be used by the event holders, sponsors and organizers for the
          event in which I participate and that it will cover my actions and
          responsibilities at said events.
        </p>
        <p>
          I, in consideration of and as a condition of acceptance of this entry
          for myself, my executors, administrators, heirs, next of kin,
          successors and assigns hereby waive, release and discharge the event
          organizers, sponsors, or volunteers from all claims, actions or
          damages that the former may have against the latter however caused,
          arising out of or in any way connected with my participation in this
          event.
        </p>
        <p>
          This AWRL shall be construed broadly to provide a waiver to the
          maximum extent permissible under applicable law.
        </p>
        <p>
          By submitting this registration form, I confirm that I am at least 18
          years old or have obtained permission from my parents or legal guardian
          to participate in this event.
        </p>
      </div>
    ),
  },
 {
    key: 'rules' as const,
    title: 'Race Rules',
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          These rules are intended to promote sportsmanship, equality, and fair
          play, while prioritizing the safety of all participants. Any
          participant who gains an unfair advantage, violates these rules, or
          compromises safety may be penalized or disqualified.
        </p>

        <hr className="border-slate-200" />

        {/* A) General Conduct */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">A) General Conduct</p>
          <p>All participants:</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Must practice good sportsmanship at all times and be responsible for their own safety and that of others.</li>
            <li>Should know, understand, and follow all published Race Rules.</li>
            <li>Must obey the instructions of race officials, marshals, and law enforcement.</li>
            <li>The race route may be closed to traffic, but riders must remain alert, especially in technical sections, sharp turns, and descents.</li>
            <li>Must treat fellow participants, officials, volunteers, and spectators with respect and courtesy.</li>
            <li>Must avoid using abusive or offensive language.</li>
            <li>Must inform a race official immediately if withdrawing from the race.</li>
            <li>Must complete the <strong>entire official race route</strong> without receiving outside assistance except from authorized race personnel.</li>
            <li>Must allow faster riders to pass without obstruction.</li>
            <li>Glass containers are not permitted on or near the course.</li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* B) Equipment */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">B) Equipment</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Only <strong>human-powered bicycles</strong> in safe and working condition are allowed.</li>
            <li>All bicycles must have functional <strong>front and rear brakes</strong>.</li>
            <li>Minimum tire width for mountain bikes is <strong>1.90 inches</strong> (if applicable).</li>
            <li>Riders must wear an <strong>approved helmet</strong> at all times while on the course. Failure to do so will result in immediate disqualification.</li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* C) Health & Safety */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">C) Health &amp; Safety</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Participants acknowledge that cycling events are physically demanding and must be in good health to participate.</li>
            <li>By registering, participants declare that they are physically capable of completing the event.</li>
            <li>A pre-event health check is strongly encouraged, especially for competitive races.</li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* D) Eligibility */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">D) Eligibility</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Age category is determined by the participant's age on <strong>December 31</strong> of the race year.
              <ul className="mt-1 list-[circle] space-y-1 pl-6">
                <li>Example: Race Year – Birth Year = Age Category</li>
              </ul>
            </li>
            <li>Minors must submit <strong>parent/guardian consent</strong>.</li>
            <li>Entering a category outside your correct age group will result in disqualification.</li>
            <li>Race registrations are <strong>non-transferable</strong>. Anyone caught using another person's registration will be disqualified and may be banned from future events.</li>
            <li>Any misrepresentation of identity or details will result in <strong>immediate disqualification</strong> and forfeiture of awards/titles.</li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* E) Race Kit Claiming */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">E) Race Kit Claiming</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>A <strong>valid ID or Birth Certificate</strong> is required to claim a race kit.</li>
            <li>Participants must claim their own kits at the designated place and time.</li>
            <li>
              Authorized representatives must present:
              <ul className="mt-1 list-[circle] space-y-1 pl-6">
                <li>The participant's valid ID</li>
                <li>Signed authorization letter from the participant</li>
                <li>Representative's valid ID</li>
              </ul>
            </li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* F) Prohibited Equipment */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">F) Prohibited Equipment</p>
          <p>The following are <strong>not allowed</strong> during the race:</p>
          <ul className="list-[circle] space-y-1 pl-6">
            <li>Headphones, headsets, or any listening devices</li>
            <li>Aerobars / Tri-bars (unless explicitly allowed)</li>
          </ul>
        </div>

        <hr className="border-slate-200" />

        {/* G) Outside Assistance */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">G) Outside Assistance</p>
          <p>No outside assistance is allowed except from official race personnel or aid stations.</p>
        </div>

        <hr className="border-slate-200" />

        {/* H) Protests */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">H) Protests</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Protests on eligibility must be made to the Race Organizer <strong>on the day of the event</strong>.</li>
            <li>Protests on results/timing must be submitted <strong>in writing within three (3) days</strong> after the race.</li>
            <li>A protest must be accompanied by a <strong>₱2,000 deposit</strong>, refundable if upheld. If denied, the deposit is forfeited.</li>
            <li>
              Protests must include:
              <ul className="mt-1 list-[circle] space-y-1 pl-6">
                <li>The alleged rule violation</li>
                <li>Location &amp; time of incident</li>
                <li>Names of persons involved</li>
                <li>Statement or diagram of the incident</li>
                <li>Names of witnesses (if any)</li>
                <li>Proof or supporting documents (photos/videos if available)</li>
              </ul>
            </li>
          </ol>
        </div>

        <hr className="border-slate-200" />

        {/* I) Event Changes, Cancellation, and Refunds */}
        <div className="space-y-2">
          <p className="font-bold text-slate-900">I) Event Changes, Cancellation, and Refunds</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>The Organizer may, at its sole discretion, modify, postpone, or cancel the event at any time.</li>
            <li>Changes may include, but are not limited to, adjustments to the race route, distance, schedule, categories, rules, or other event details.</li>
            <li>Such changes may be made without prior notice and may occur due to safety concerns, adverse weather, government regulations, force majeure, or other circumstances beyond the Organizer's control.</li>
            <li>In the event of modification, postponement, or cancellation, the Organizer shall not be liable for any loss, cost, or expense incurred by participants.</li>
            <li>All entry fees are <strong>non-refundable</strong>, and no credits or transfers will be issued, unless the Organizer decides otherwise at its sole discretion.</li>
          </ol>
        </div>
      </div>
    ),
  },
]

// ─── Modal ────────────────────────────────────────────────────────────────────

interface StepModalProps {
  step: (typeof STEPS)[number]
  stepNumber: number
  totalSteps: number
  onAgree: () => void
  onClose: () => void
}

function StepModal({ step, stepNumber, totalSteps, onAgree, onClose }: StepModalProps) {
  const [canAgree, setCanAgree] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (canAgree) return
    const el = bodyRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setCanAgree(true)
    }
  }

  const isLastStep = stepNumber === totalSteps

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="mb-0.5 text-xs text-slate-400">Step {stepNumber} of {totalSteps}</p>
            <h2 className="text-base font-semibold text-slate-900">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {step.content}
          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-400">
            {canAgree ? '✓ You have read this document.' : 'Scroll to the bottom to continue.'}
          </p>
          <button
            type="button"
            onClick={onAgree}
            disabled={!canAgree}
            className="rounded-md bg-[#cfae3f] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? 'I agree to both' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationPayment() {
  const [params] = useSearchParams()
  const registrationId = params.get('registrationId')

  // null = closed, 0 = waiver modal, 1 = rules modal
  const [modalStep, setModalStep] = useState<number | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const merchantReference = useMemo(
    () => `HNA-${registrationId ?? 'NA'}-${Date.now()}`,
    [registrationId],
  )

  const handleCheckboxClick = () => {
    if (agreed) {
      setAgreed(false)
    } else {
      setModalStep(0)
    }
  }

  const handleStepAgree = () => {
    const nextStep = (modalStep ?? 0) + 1
    if (nextStep < STEPS.length) {
      setModalStep(nextStep)
    } else {
      setModalStep(null)
      setAgreed(true)
    }
  }

  const onSubmit = async () => {
    setError(null)
    if (!registrationId) {
      setError('Missing registrationId.')
      return
    }
    if (!agreed) {
      setError('Please accept the Agreement and Liability Waiver and Race Rules.')
      return
    }
    setSubmitting(true)
    try {
      const payment = await registrationService.createPaymentOrder({
        registrationId,
        amount: 1000,
        merchantReference,
        acceptLiability: true,
        acceptRules: true,
      })
      if (!payment.checkoutUrl) throw new Error('Missing checkout URL from payment provider.')
      window.location.assign(payment.checkoutUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="bg-white px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-760px space-y-6">
          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Payment</h1>
            <p className="text-sm text-slate-600">Complete payment to confirm your registration.</p>
          </div>

          {/* Fee summary */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-slate-600">Registration fee</p>
              <p className="font-medium">₱1,000.00 (Early registration)</p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-slate-600">Total</p>
              <p className="text-lg font-semibold text-slate-900">₱1,000.00</p>
            </div>
          </div>

          {/* Checkout info */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Secure checkout</h2>
            <p className="text-sm text-slate-600">
              You will be redirected to PayMongo to complete payment. Your
              registration stays pending until webhook confirmation marks the
              payment as paid.
            </p>
          </div>

          {/* Agree row — matches original design exactly */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">
              Please read{' '}
              <button
                type="button"
                onClick={() => setModalStep(0)}
                className="text-green-700 underline underline-offset-2 hover:text-green-900"
              >
                Agreement and Liability Waiver
              </button>
              , as well as the{' '}
              <button
                type="button"
                onClick={() => setModalStep(1)}
                className="text-green-700 underline underline-offset-2 hover:text-green-900"
              >
                Race Rules
              </button>
              . <span className="text-rose-500">*</span>
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 transition hover:border-slate-300">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-green-600"
                checked={agreed}
                onChange={handleCheckboxClick}
              />
              <span>I have read and agree to the Agreement and Liability Waiver and Race Rules.</span>
            </label>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {/* Submit */}
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Redirecting…' : 'Proceed to PayMongo'}
          </button>
        </div>
      </section>

      {/* Sequential step modals */}
      {modalStep !== null && (
        <StepModal
          key={modalStep}
          step={STEPS[modalStep]}
          stepNumber={modalStep + 1}
          totalSteps={STEPS.length}
          onAgree={handleStepAgree}
          onClose={() => setModalStep(null)}
        />
      )}
    </>
  )
}