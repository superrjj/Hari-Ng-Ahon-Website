import QRCode from 'qrcode'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
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
  const { session, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(Boolean(registrationId))
  const [error, setError] = useState<string | null>(null)
  const [certificateData, setCertificateData] = useState<RegistrationCertificateData | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null)
  const [autoEmailMessage, setAutoEmailMessage] = useState<string | null>(null)
  const [needsLoginToFinalize, setNeedsLoginToFinalize] = useState(false)

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
      gradient.addColorStop(0, '#eff6ff')
      gradient.addColorStop(1, '#ffffff')
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
      ctx.fillStyle = '#1a2e6e'
      ctx.fillRect(0, canvas.height - 22, canvas.width, 22)

      ctx.fillStyle = '#F59E0B'
      ctx.beginPath()
      ctx.moveTo(canvas.width - 100, 0)
      ctx.lineTo(canvas.width, 0)
      ctx.lineTo(canvas.width, 72)
      ctx.closePath()
      ctx.fill()

      const leftColX = 56
      const leftColWidth = Math.round(canvas.width * 0.6) - leftColX
      const logoStartX = leftColX
      const logoY = 44
      const logoHeight = 56
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

      const riderUpper = certificateData.riderName.toUpperCase()
      const eventUpper = certificateData.eventTitle.toUpperCase()

      let y = logoY + logoHeight + 16
      ctx.fillStyle = '#64748b'
      ctx.font = '700 11px Arial'
      ctx.letterSpacing = '0.15em'
      ctx.fillText('QR CODE · RACE CLAIM KIT', leftColX, y)
      ctx.letterSpacing = '0'

      y += 22
      ctx.fillStyle = '#1d4ed8'
      ctx.font = '700 13px Arial'
      const eventMaxW = leftColWidth - 8
      ctx.fillText(eventUpper, leftColX, y, eventMaxW)

      y += 24
      ctx.fillStyle = '#64748b'
      ctx.font = '700 11px Arial'
      ctx.fillText('RIDER NAME', leftColX, y)

      y += 52
      ctx.fillStyle = '#111827'
      ctx.font = '800 56px Arial'
      ctx.fillText(riderUpper, leftColX, y, eventMaxW)

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

      const bibBoxTop = y + 36
      drawRoundedRect(ctx, leftColX, bibBoxTop, 360, 120, 18)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#475569'
      ctx.font = '700 16px Arial'
      ctx.fillText('BIB NUMBER', leftColX + 22, bibBoxTop + 36)
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 64px Arial'
      ctx.fillText(certificateData.bibNumber, leftColX + 20, bibBoxTop + 96)
      ctx.fillStyle = '#475569'
      ctx.font = '700 14px Arial'
      ctx.fillText('CATEGORY CODE', leftColX + 220, bibBoxTop + 34)
      ctx.fillStyle = '#0f172a'
      ctx.font = '800 32px Arial'
      ctx.fillText(certificateData.categoryCode, leftColX + 220, bibBoxTop + 72)

      const metaY = bibBoxTop + 120 + 32
      drawLabelValue('CATEGORY', certificateData.category, leftColX, metaY, '700 32px Arial', 420)
      drawLabelValue('DISCIPLINE', certificateData.discipline, 540, metaY, '700 32px Arial', 220)
      drawLabelValue('EVENT TYPE', certificateData.eventType, leftColX, metaY + 52, '700 28px Arial', 640)

      const qrSize = 192
      const qrCardWidth = Math.round(canvas.width * 0.4) - 48
      const qrCardX = leftColX + leftColWidth + 8
      const qrCardY = 96
      const qrPad = 24
      const qrInnerTop = qrCardY + qrPad
      const qrImgY = qrInnerTop
      const qrImgX = qrCardX + (qrCardWidth - qrSize) / 2
      const qrTextTop = qrImgY + qrSize + 20
      const qrCardHeight = qrTextTop - qrCardY + 72

      const qrDataUrl = await QRCode.toDataURL(certificateData.qrValue, {
        width: qrSize,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
      })
      const qrImage = await loadImage(qrDataUrl)

      ctx.save()
      drawRoundedRect(ctx, qrCardX, qrCardY, qrCardWidth, qrCardHeight, 24)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.shadowColor = 'rgba(2, 6, 23, 0.12)'
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 4
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.95)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()

      ctx.drawImage(qrImage, qrImgX, qrImgY, qrSize, qrSize)

      ctx.fillStyle = '#111827'
      ctx.font = '900 40px Arial'
      const bibWidth = ctx.measureText(certificateData.bibNumber).width
      ctx.fillText(certificateData.bibNumber, qrCardX + (qrCardWidth - bibWidth) / 2, qrTextTop + 28)

      ctx.fillStyle = '#64748b'
      ctx.font = '600 15px Arial'
      const regWidth = ctx.measureText(certificateData.verificationId).width
      ctx.fillText(certificateData.verificationId, qrCardX + (qrCardWidth - regWidth) / 2, qrTextTop + 56)

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
      if (authLoading) return

      if (!session?.access_token) {
        setNeedsLoginToFinalize(true)
        await fetchCertificateData()
        return
      }

      setNeedsLoginToFinalize(false)
      try {
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
  }, [authLoading, fetchCertificateData, registrationId, session?.access_token])

  const handleDownload = useCallback(
    async (mimeType: 'image/png' | 'image/jpeg') => {
      if (!certificateData) return
      const url = await createCertificateDataUrl(mimeType)
      const a = document.createElement('a')
      const extension = mimeType === 'image/png' ? 'png' : 'jpg'
      a.href = url
      const bibSlug = certificateData.bibNumber?.trim() || certificateData.verificationId.replace(/[^a-zA-Z0-9-]/g, '')
      a.download = `hari-ng-ahon-certificate-${bibSlug}.${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    [certificateData, createCertificateDataUrl],
  )

  const refreshPaymentStatus = useCallback(async () => {
    setCheckingStatus(true)
    setError(null)
    try {
      if (registrationId && session?.access_token) {
        try {
          await registrationService.markRegistrationAsPaidAfterPaymongoRedirect(registrationId)
        } catch (e) {
          setError((e as Error).message || 'Failed to finalize payment.')
        }
      }
      await fetchCertificateData()
    } finally {
      setCheckingStatus(false)
    }
  }, [fetchCertificateData, registrationId, session?.access_token])

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
              {checkingStatus ? 'Refreshing...' : 'Refresh / assign bib'}
            </button>
          </div>

          {needsLoginToFinalize && registrationId ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Log in to assign your race bib</p>
              <p className="mt-1 text-amber-900">
                Payment can be confirmed in PayMongo before your bib is written. Finalizing requires the same account you
                used to register (the Edge Function verifies your identity).
              </p>
              <Link
                to={`/auth?redirect=${encodeURIComponent(`/register/payment-success?registrationId=${encodeURIComponent(registrationId)}`)}`}
                className="mt-3 inline-flex rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Log in to complete bib assignment
              </Link>
            </div>
          ) : null}

          {certificateData?.isPaid && !certificateData?.bibNumber?.trim() && session?.access_token ? (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <p>
                Bib not showing yet? Payment may still be syncing.{' '}
                <button
                  type="button"
                  className="font-semibold text-sky-800 underline hover:text-sky-950"
                  onClick={() => void refreshPaymentStatus()}
                  disabled={checkingStatus}
                >
                  Tap to retry finalize
                </button>
              </p>
            </div>
          ) : null}

          {loading ? <p className="mt-3 text-sm text-slate-600">Loading registration and payment details...</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {certificateData ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  Rider: <span className="font-semibold text-slate-900">{certificateData.riderName}</span>
                </p>
                <p>
                  Bib:{' '}
                  <span className="font-semibold text-slate-900">
                    {certificateData.bibNumber?.trim() ? certificateData.bibNumber : '— (assign after login / refresh)'}
                  </span>
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

