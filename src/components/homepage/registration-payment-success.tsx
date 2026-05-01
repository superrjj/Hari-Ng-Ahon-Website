import QRCode from 'qrcode'
import { useCallback, useEffect, useState } from 'react'
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function RegistrationPaymentSuccess() {
  const [params] = useSearchParams()
  const registrationId = params.get('registrationId')
  const [loading, setLoading] = useState(Boolean(registrationId))
  const [error, setError] = useState<string | null>(null)
  const [certificateData, setCertificateData] = useState<RegistrationCertificateData | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null)
  const [autoEmailMessage, setAutoEmailMessage] = useState<string | null>(null)

  const createCertificateDataUrl = useCallback(
    async (mimeType: 'image/png' | 'image/jpeg') => {
      if (!certificateData) throw new Error('Certificate data is not ready yet.')
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Unable to initialize certificate canvas.')
      const [allOutLogo, hnaLogo] = await Promise.all([
        loadImage('/all_out_multisports_1.png').catch(() => null),
        loadImage('/hna-logo.png').catch(() => null),
      ])

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(1, '#e8eef8')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const leftShape = ctx.createLinearGradient(0, 0, 500, 300)
      leftShape.addColorStop(0, 'rgba(11, 94, 215, 0.15)')
      leftShape.addColorStop(1, 'rgba(0, 27, 68, 0.03)')
      ctx.fillStyle = leftShape
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(500, 0)
      ctx.lineTo(0, 330)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(148, 163, 184, 0.1)'
      ctx.beginPath()
      ctx.arc(470, 380, 220, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#001B44'
      ctx.fillRect(0, 0, canvas.width, 22)
      ctx.fillStyle = '#0B5ED7'
      ctx.fillRect(0, canvas.height - 22, canvas.width, 22)

      ctx.fillStyle = '#F59E0B'
      ctx.beginPath()
      ctx.moveTo(canvas.width - 220, 0)
      ctx.lineTo(canvas.width, 0)
      ctx.lineTo(canvas.width, 140)
      ctx.closePath()
      ctx.fill()

      const logoStartX = 56
      const logoY = 42
      const logoHeight = 32
      let cursorX = logoStartX
      if (allOutLogo) {
        const allOutWidth = Math.round((allOutLogo.width / Math.max(allOutLogo.height, 1)) * logoHeight)
        ctx.drawImage(allOutLogo, cursorX, logoY, allOutWidth, logoHeight)
        cursorX += allOutWidth + 12
      }
      if (hnaLogo) {
        const hnaWidth = Math.round((hnaLogo.width / Math.max(hnaLogo.height, 1)) * logoHeight)
        ctx.drawImage(hnaLogo, cursorX, logoY, hnaWidth, logoHeight)
      }

      ctx.fillStyle = '#334155'
      ctx.font = '600 24px Arial'
      ctx.fillText('RACE CERTIFICATE', 56, 112)

      ctx.fillStyle = '#64748b'
      ctx.font = '700 15px Arial'
      ctx.fillText('RIDER NAME', 58, 236)
      ctx.fillStyle = '#111827'
      ctx.font = '700 58px Arial'
      ctx.fillText(certificateData.riderName, 58, 292)

      ctx.fillStyle = '#1e3a8a'
      ctx.font = '700 30px Arial'
      ctx.fillText(certificateData.eventTitle, 58, 344)

      const drawLabelValue = (
        label: string,
        value: string,
        x: number,
        y: number,
        valueFont = '700 36px Arial',
        maxWidth?: number,
      ) => {
        ctx.fillStyle = '#475569'
        ctx.font = '700 15px Arial'
        ctx.fillText(label, x, y)
        ctx.fillStyle = '#0f172a'
        ctx.font = valueFont
        if (typeof maxWidth === 'number') {
          ctx.fillText(value, x, y + 42, maxWidth)
        } else {
          ctx.fillText(value, x, y + 42)
        }
      }

      // Dedicated bib-number block for stronger hierarchy and cleaner spacing.
      drawRoundedRect(ctx, 56, 392, 360, 128, 18)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#475569'
      ctx.font = '700 18px Arial'
      ctx.fillText('BIB NUMBER', 78, 432)
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 74px Arial'
      ctx.fillText(certificateData.bibNumber, 76, 495)
      ctx.fillStyle = '#475569'
      ctx.font = '700 15px Arial'
      ctx.fillText('CATEGORY CODE', 248, 432)
      ctx.fillStyle = '#0f172a'
      ctx.font = '800 36px Arial'
      ctx.fillText(certificateData.categoryCode, 248, 472)
      drawLabelValue('CATEGORY', certificateData.category, 58, 542, '700 34px Arial', 480)
      drawLabelValue('DISCIPLINE', certificateData.discipline, 560, 542, '700 34px Arial', 230)
      drawLabelValue('EVENT TYPE', certificateData.eventType, 58, 592, '700 30px Arial', 680)

      const qrDataUrl = await QRCode.toDataURL(certificateData.qrValue, {
        width: 360,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
      })
      const qrImage = await loadImage(qrDataUrl)
      const qrCardX = 820
      const qrCardY = 110
      const qrCardWidth = 392
      const qrCardHeight = 520

      ctx.save()
      drawRoundedRect(ctx, qrCardX, qrCardY, qrCardWidth, qrCardHeight, 28)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
      ctx.fill()
      ctx.shadowColor = 'rgba(2, 6, 23, 0.2)'
      ctx.shadowBlur = 20
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.95)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()

      ctx.drawImage(qrImage, qrCardX + 32, qrCardY + 44, 328, 328)
      ctx.fillStyle = '#111827'
      ctx.font = '800 36px Arial'
      const bibWidth = ctx.measureText(certificateData.bibNumber).width
      ctx.fillText(certificateData.bibNumber, qrCardX + (qrCardWidth - bibWidth) / 2, qrCardY + 424)
      ctx.fillStyle = '#475569'
      ctx.font = '600 18px Arial'
      const regWidth = ctx.measureText(certificateData.verificationId).width
      ctx.fillText(certificateData.verificationId, qrCardX + (qrCardWidth - regWidth) / 2, qrCardY + 454)

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

  useEffect(() => {
    let active = true
    async function queueAutoEmail() {
      if (!certificateData?.isPaid || !certificateData.registrantEmail) return
      const dedupeKey = `cert-email-queued:${certificateData.registrationId}`
      if (window.localStorage.getItem(dedupeKey) === '1') return
      try {
        const result = await registrationService.queueCertificateEmail({
          registrationId: certificateData.registrationId,
          recipient: certificateData.registrantEmail,
          subject: `Your Hari ng Ahon QR Certificate (${certificateData.bibNumber})`,
        })
        if (!active) return
        window.localStorage.setItem(dedupeKey, '1')
        setAutoEmailMessage(result.queued ? 'A copy was automatically queued to your email.' : 'Certificate email is already queued.')
      } catch {
        if (!active) return
        setAutoEmailMessage('Auto email queue failed. Please contact support if email is not received.')
      }
    }
    void queueAutoEmail()
    return () => {
      active = false
    }
  }, [certificateData])

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
                  Event Type: <span className="font-semibold text-slate-900">{certificateData.eventType}</span>
                </p>
              </div>

              {certificatePreviewUrl ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <img src={certificatePreviewUrl} alt="QR Certificate Preview" className="w-full rounded-md" />
                </div>
              ) : null}

              {autoEmailMessage ? <p className="text-sm text-slate-600">{autoEmailMessage}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleDownload('image/png')}
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852]"
          >
            Download PNG
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}

