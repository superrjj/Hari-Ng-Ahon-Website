import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { RefreshCw, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, formatDate, useModuleLoader } from './admin-module-shared'

type ScannerControls = {
  stop: () => void
  switchTorch?: (on: boolean) => Promise<void> | void
}

type ScanResult = {
  status: 'valid' | 'invalid' | 'duplicate'
  message: string
  code: string
  qrFields: Array<{ label: string; value: string }>
  riderName?: string
  category?: string
  bibNumber?: string
  eventTitle?: string
  registrationId?: string
  scannedAt: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function extractBibFromCode(code: string) {
  const trimmed = code.trim()
  const match = trimmed.match(/BIB:([^|]+)/i)
  if (match?.[1]) return match[1].trim()
  return trimmed
}

function parseQrFields(code: string): Array<{ label: string; value: string }> {
  const chunks = code
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  const fields = chunks
    .map((chunk) => {
      const [rawKey, ...rawValue] = chunk.split(':')
      if (!rawKey || rawValue.length === 0) return null
      const key = rawKey.trim()
      const value = rawValue.join(':').trim()
      if (!key || !value) return null
      return {
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        value,
      }
    })
    .filter(Boolean) as Array<{ label: string; value: string }>
  return fields.length > 0 ? fields : [{ label: 'Code', value: code }]
}

function labelForStatus(status: ScanResult['status']) {
  if (status === 'valid') return 'Valid Rider'
  if (status === 'duplicate') return 'Duplicate Scan'
  return 'Invalid Code'
}

export function AdminQrCheckIn() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.qrDashboard(), [reloadKey])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<ScannerControls | null>(null)
  const scanLockRef = useRef(false)
  const lastScanRef = useRef<string>('')
  const [processing, setProcessing] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [claimingKit, setClaimingKit] = useState(false)

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    readerRef.current = null
    setTorchOn(false)
  }, [])

  const processCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim()
    const lookupCode = extractBibFromCode(code)
    if (!code || scanLockRef.current || code === lastScanRef.current) return
    scanLockRef.current = true
    lastScanRef.current = code
    setProcessing(true)
    try {
      const { data: duplicate } = await supabase.from('qr_checkins').select('id').eq('scanned_code', lookupCode).limit(1).maybeSingle()

      if (duplicate?.id) {
        setScanResult({
          status: 'duplicate',
          message: 'This code has already been checked in.',
          code,
          qrFields: parseQrFields(code),
          scannedAt: new Date().toISOString(),
        })
        setClaimDialogOpen(false)
        return
      }

      let registrationQuery = supabase
        .from('registration_forms')
        .select('id, bib_number, status, event_id')
        .eq('bib_number', lookupCode)
        .limit(1)
      if (isUuid(lookupCode)) {
        registrationQuery = supabase
          .from('registration_forms')
          .select('id, bib_number, status, event_id')
          .or(`id.eq.${lookupCode},bib_number.eq.${lookupCode}`)
          .limit(1)
      }
      const { data: registration, error: regError } = await registrationQuery.maybeSingle()
      if (regError) throw regError

      if (!registration?.id) {
        setScanResult({
          status: 'invalid',
          message: 'No rider matched this QR code.',
          code,
          qrFields: parseQrFields(code),
          scannedAt: new Date().toISOString(),
        })
        setClaimDialogOpen(false)
        return
      }

      const [{ data: rider }, { data: event }] = await Promise.all([
        supabase
          .from('registration_rider_details')
          .select('first_name, last_name, age_category')
          .eq('registration_id', registration.id)
          .limit(1)
          .maybeSingle(),
        supabase.from('events').select('title').eq('id', String(registration.event_id ?? '')).limit(1).maybeSingle(),
      ])

      const riderName = [rider?.first_name, rider?.last_name].filter(Boolean).join(' ').trim() || 'Registered rider'
      const bibNumber = registration.bib_number ? String(registration.bib_number) : code

      setScanResult({
        status: 'valid',
        message: 'Ready to claim race kit.',
        code: lookupCode,
        qrFields: parseQrFields(code),
        riderName,
        category: rider?.age_category ?? 'Uncategorized',
        bibNumber,
        eventTitle: event?.title ?? 'Current event',
        registrationId: registration.id,
        scannedAt: new Date().toISOString(),
      })
      setClaimDialogOpen(true)
    } catch (scanError) {
      toast.error((scanError as Error).message || 'Failed to process QR scan.')
    } finally {
      window.setTimeout(() => {
        scanLockRef.current = false
        lastScanRef.current = ''
      }, 1200)
      setProcessing(false)
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      stopCamera()
      const videoElement = videoRef.current
      if (!videoElement) return

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader
      setCameraError(null)

      const controls = (await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        videoElement,
        (result, decodeError) => {
          if (result) void processCode(result.getText())
          if (decodeError && !(decodeError instanceof NotFoundException)) {
            console.error(decodeError)
          }
        },
      )) as ScannerControls

      controlsRef.current = controls
    } catch (scannerError) {
      const message = (scannerError as Error).message || 'Unable to open camera.'
      setCameraError(message)
      toast.error(message)
      stopCamera()
    }
  }, [facingMode, processCode, stopCamera])

  const toggleTorch = useCallback(async () => {
    try {
      if (!controlsRef.current?.switchTorch) {
        toast.error('Flash control is not available on this camera.')
        return
      }
      const next = !torchOn
      await controlsRef.current.switchTorch(next)
      setTorchOn(next)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to toggle flash.')
    }
  }, [torchOn])

  useEffect(() => {
    void startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const recentScans = useMemo(() => {
    return (data?.scans ?? []).slice(0, 5)
  }, [data?.scans])

  const handleClaimKit = useCallback(async () => {
    if (!scanResult || scanResult.status !== 'valid' || !scanResult.registrationId) return
    setClaimingKit(true)
    try {
      const { error: insertError } = await supabase.from('qr_checkins').insert({
        registration_id: scanResult.registrationId,
        scanned_code: scanResult.code,
        scan_status: 'valid',
        scanned_at: new Date().toISOString(),
        device_label: navigator.userAgent.includes('Mobile') ? 'Mobile Scanner' : 'Web Scanner',
      })
      if (insertError) throw insertError

      toast.success('Race kit successfully claimed.')
      setClaimDialogOpen(false)
      setScanResult(null)
      setReloadKey((value) => value + 1)
    } catch (claimError) {
      toast.error((claimError as Error).message || 'Failed to claim race kit.')
    } finally {
      setClaimingKit(false)
    }
  }, [scanResult])

  return (
    <ModuleShell loading={loading} error={error}>
      {claimDialogOpen && scanResult?.status === 'valid' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white shadow-2xl">
            <div className="rounded-t-2xl border-b border-emerald-200 bg-emerald-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Valid rider</p>
              <p className="text-sm text-emerald-900">Ready to claim race kit.</p>
            </div>
            <div className="space-y-2 px-5 py-4">
              {scanResult.qrFields.map((field) => (
                <div key={`${field.label}-${field.value}`} className="flex items-center justify-between gap-3 text-sm">
                  <p className="text-slate-500">{field.label}</p>
                  <p className="font-semibold text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => void handleClaimKit()}
                disabled={claimingKit}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {claimingKit ? 'Claiming...' : 'Claim Kit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setClaimDialogOpen(false)
                  setScanResult(null)
                }}
                disabled={claimingKit}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SectionCard title="QR Scanner" subtitle="Point the camera at the rider QR code to validate check-in.">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg">
            <div className="flex items-center justify-between px-3 py-3 text-xs text-slate-200">
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-label={torchOn ? 'Turn flash off' : 'Turn flash on'}
                title={torchOn ? 'Flash Off' : 'Flash On'}
                className="rounded-full bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
              >
                <Zap className={`h-4 w-4 ${torchOn ? 'text-amber-300' : 'text-slate-200'}`} />
              </button>
              <p className="text-center text-sm font-medium text-slate-100">Scan rider QR to claim race kit</p>
              <button
                type="button"
                onClick={() => setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))}
                aria-label="Switch camera"
                title="Switch Camera"
                className="rounded-full bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 text-slate-200" />
              </button>
            </div>

            <div className="relative h-[380px] w-full bg-slate-900 md:h-[460px]">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-10 top-10 h-10 w-10 border-l-4 border-t-4 border-white/95" />
                <div className="absolute right-10 top-10 h-10 w-10 border-r-4 border-t-4 border-white/95" />
                <div className="absolute bottom-10 left-10 h-10 w-10 border-b-4 border-l-4 border-white/95" />
                <div className="absolute bottom-10 right-10 h-10 w-10 border-b-4 border-r-4 border-white/95" />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-200">
                  Align QR code within the frame to scan
                </div>
              </div>

              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-5 text-center text-sm text-rose-200">
                  {cameraError}
                </div>
              ) : null}
              {processing ? (
                <div className="absolute right-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
                  Processing...
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">Ensure proper lighting and hold QR code steady for best results.</p>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Scan Result" subtitle="Shows rider status after each scan.">
          {!scanResult ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              Waiting for QR scan...
            </p>
          ) : (
            <div
              className={`rounded-xl border p-4 ${
                scanResult.status === 'valid'
                  ? 'border-emerald-200 bg-emerald-50'
                  : scanResult.status === 'duplicate'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-rose-200 bg-rose-50'
              }`}
            >
              <p className="text-base font-semibold text-slate-900">{labelForStatus(scanResult.status)}</p>
              <p className="mt-1 text-sm text-slate-600">{scanResult.message}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Code</dt>
                  <dd className="font-medium text-slate-800">{scanResult.code}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-800">{scanResult.riderName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-medium text-slate-800">{scanResult.category ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Bib number</dt>
                  <dd className="font-medium text-slate-800">{scanResult.bibNumber ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Event</dt>
                  <dd className="font-medium text-slate-800">{scanResult.eventTitle ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Registration ID</dt>
                  <dd className="font-medium text-slate-800">{scanResult.registrationId ?? '—'}</dd>
                </div>
              </dl>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Scans" subtitle="Latest scan activity from this venue.">
          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <p className="text-sm text-slate-500">No recent scans yet.</p>
            ) : (
              recentScans.map((scan, index) => (
                <div key={String(scan.id ?? index)} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{String(scan.scanned_code ?? '—')}</p>
                  <p className="text-xs text-slate-500">
                    {String(scan.scan_status ?? 'unknown')} · {formatDate(scan.scanned_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="QR Scan History" subtitle="Venue scans, validation result, and operator device context.">
        <DataTable
          rows={data?.scans ?? []}
          columns={[
            { key: 'scanned_code', label: 'Code' },
            { key: 'scan_status', label: 'Status' },
            { key: 'device_label', label: 'Device' },
            { key: 'scanned_at', label: 'Scanned At', render: (row) => formatDate(row.scanned_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
