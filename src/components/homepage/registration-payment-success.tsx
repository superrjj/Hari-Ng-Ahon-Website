import QRCode from 'qrcode'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { registrationService, type RegistrationCertificateData } from '../../services/registrationService'

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Unable to render image asset.'))
    img.src = src
  })
}

export function RegistrationPaymentSuccess() {
  const [params] = useSearchParams()
  const registrationId = params.get('registrationId')
  const [loading, setLoading] = useState(Boolean(registrationId))
  const [error, setError] = useState<string | null>(null)
  const [certificateData, setCertificateData] = useState<RegistrationCertificateData | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null)

  const statusLabel = useMemo(() => {
    if (!certificateData) return null
    if (certificateData.isPaid) return 'Paid'
    return `Pending (${certificateData.paymentStatus})`
  }, [certificateData])

  const createCertificateDataUrl = useCallback(
    async (mimeType: 'image/png' | 'image/jpeg') => {
      if (!certificateData) throw new Error('Certificate data is not ready yet.')
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Unable to initialize certificate canvas.')

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(1, '#e2e8f0')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, 96)
      ctx.fillRect(0, canvas.height - 72, canvas.width, 72)

      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(0, 0, 220, 16)
      ctx.fillRect(canvas.width - 260, 0, 260, 16)
      ctx.fillRect(canvas.width - 180, canvas.height - 16, 180, 16)

      ctx.fillStyle = '#ffffff'
      ctx.font = '700 36px Arial'
      ctx.fillText('HARI NG AHON', 56, 58)
      ctx.font = '500 20px Arial'
      ctx.fillText('RACE CERTIFICATE', 56, 86)

      ctx.fillStyle = '#0f172a'
      ctx.font = '700 44px Arial'
      ctx.fillText(certificateData.riderName, 56, 188)

      ctx.font = '600 22px Arial'
      ctx.fillStyle = '#334155'
      ctx.fillText(certificateData.eventTitle, 56, 228)

      ctx.fillStyle = '#1e293b'
      ctx.font = '700 20px Arial'
      ctx.fillText('BIB NUMBER', 56, 290)
      ctx.fillText('CATEGORY', 56, 356)
      ctx.fillText('DISCIPLINE', 56, 422)
      ctx.fillText('EVENT TYPE', 56, 488)

      ctx.fillStyle = '#0f172a'
      ctx.font = '700 42px Arial'
      ctx.fillText(certificateData.bibNumber, 56, 332)
      ctx.font = '700 36px Arial'
      ctx.fillText(certificateData.category, 56, 396)
      ctx.fillText(certificateData.discipline, 56, 462)
      ctx.font = '600 24px Arial'
      ctx.fillText(certificateData.eventType, 56, 526)

      const qrDataUrl = await QRCode.toDataURL(certificateData.qrValue, {
        width: 300,
        margin: 1,
        color: { dark: '#0b1220', light: '#ffffff' },
      })
      const qrImage = await loadImage(qrDataUrl)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.fillRect(860, 150, 340, 390)
      ctx.strokeRect(860, 150, 340, 390)
      ctx.drawImage(qrImage, 900, 190, 260, 260)

      ctx.fillStyle = '#0f172a'
      ctx.font = '700 24px Arial'
      ctx.fillText(certificateData.bibNumber, 930, 490)
      ctx.font = '500 18px Arial'
      ctx.fillStyle = '#475569'
      ctx.fillText('QR Verification Code', 935, 520)

      const fileType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
      return canvas.toDataURL(fileType, 0.92)
    },
    [certificateData],
  )

  const fetchCertificateData = useCallback(async () => {
    if (!registrationId) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data = await registrationService.getRegistrationCertificateData(registrationId)
      if (!data) throw new Error('Registration record not found.')
      setCertificateData(data)
    } catch (e) {
      setError((e as Error).message || 'Unable to load payment status.')
    } finally {
      setLoading(false)
    }
  }, [registrationId])

  useEffect(() => {
    let mounted = true
    async function init() {
      if (!registrationId) {
        await fetchCertificateData()
        return
      }
      try {
        // Business choice: trust PayMongo success redirect and mark as paid immediately.
        await registrationService.markRegistrationAsPaidAfterPaymongoRedirect(registrationId)
      } catch (e) {
        if (mounted) {
          setError((e as Error).message || 'Failed to sync payment status.')
        }
      } finally {
        if (mounted) await fetchCertificateData()
      }
    }
    void init()
    return () => {
      mounted = false
    }
  }, [fetchCertificateData, registrationId])

  const handleDownload = useCallback(
    async (mimeType: 'image/png' | 'image/jpeg') => {
      if (!certificateData) return
      const url = await createCertificateDataUrl(mimeType)
      const a = document.createElement('a')
      const extension = mimeType === 'image/png' ? 'png' : 'jpg'
      a.href = url
      a.download = `hari-ng-ahon-certificate-${certificateData.bibNumber}.${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    [certificateData, createCertificateDataUrl],
  )

  const refreshPaymentStatus = useCallback(async () => {
    setCheckingStatus(true)
    try {
      await fetchCertificateData()
    } finally {
      setCheckingStatus(false)
    }
  }, [fetchCertificateData])

  useEffect(() => {
    let mounted = true
    async function buildPreview() {
      if (!certificateData) {
        setCertificatePreviewUrl(null)
        return
      }
      try {
        const url = await createCertificateDataUrl('image/png')
        if (mounted) setCertificatePreviewUrl(url)
      } catch {
        if (mounted) setCertificatePreviewUrl(null)
      }
    }
    void buildPreview()
    return () => {
      mounted = false
    }
  }, [certificateData, createCertificateDataUrl])

  return (
    <section className="bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-[760px] space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payment successful</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-900 sm:text-3xl">
            Registration payment received
          </h1>
          <p className="mt-2 text-sm text-emerald-800">
            Thank you! Your payment was submitted to PayMongo successfully. Your registration is finalized immediately
            and your race certificate is now available.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">What happens next?</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Payment is marked as paid in your registration record.</li>
            <li>Your QR race certificate is generated from your rider information.</li>
            <li>You can preview and download your QR certificate.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Digital Race Certificate</h2>
            <button
              type="button"
              onClick={() => void refreshPaymentStatus()}
              disabled={checkingStatus}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {checkingStatus ? 'Refreshing...' : 'Refresh Payment Status'}
            </button>
          </div>

          {loading ? <p className="mt-3 text-sm text-slate-600">Loading registration and payment details...</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {certificateData ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  Rider: <span className="font-semibold text-slate-900">{certificateData.riderName}</span>
                </p>
                <p>
                  Bib: <span className="font-semibold text-slate-900">{certificateData.bibNumber}</span>
                </p>
                <p>
                  Category: <span className="font-semibold text-slate-900">{certificateData.category}</span>
                </p>
                <p>
                  Discipline: <span className="font-semibold text-slate-900">{certificateData.discipline}</span>
                </p>
                <p>
                  Payment: <span className={`font-semibold ${certificateData.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>{statusLabel}</span>
                </p>
                <p>
                  Event Type: <span className="font-semibold text-slate-900">{certificateData.eventType}</span>
                </p>
              </div>

              {certificatePreviewUrl ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <img src={certificatePreviewUrl} alt="QR Certificate Preview" className="w-full rounded-md" />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload('image/png')}
                  className="inline-flex items-center rounded-md bg-[#cfae3f] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#dab852]"
                >
                  Download QR Certificate
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852]"
          >
            Back to home
          </Link>
          <Link
            to={registrationId ? `/register/payment?registrationId=${encodeURIComponent(registrationId)}` : '/register/payment'}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View payment page
          </Link>
        </div>
      </div>
    </section>
  )
}

