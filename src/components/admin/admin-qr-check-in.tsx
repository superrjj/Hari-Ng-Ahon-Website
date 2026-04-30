import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

type ScannerControls = {
  stop: () => void
  switchTorch?: (on: boolean) => Promise<void> | void
}

type ScanResult = {
  status: 'valid' | 'invalid' | 'duplicate'
  message: string
  code: string
  riderName?: string
  category?: string
  bibNumber?: string
  eventTitle?: string
  registrationId?: string
  scannedAt: string
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

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    readerRef.current = null
    setTorchOn(false)
  }, [])

  const processCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code || scanLockRef.current || code === lastScanRef.current) return
    scanLockRef.current = true
    lastScanRef.current = code
    setProcessing(true)
    try {
      const { data: duplicate } = await supabase.from('qr_checkins').select('id').eq('scanned_code', code).limit(1).maybeSingle()

      if (duplicate?.id) {
        setScanResult({
          status: 'duplicate',
          message: 'This code has already been checked in.',
          code,
          scannedAt: new Date().toISOString(),
        })
        return
      }

      const { data: registration, error: regError } = await supabase
        .from('registration_forms')
        .select('id, bib_number, status, event_id')
        .or(`id.eq.${code},bib_number.eq.${code}`)
        .limit(1)
        .maybeSingle()
      if (regError) throw regError

      if (!registration?.id) {
        setScanResult({
          status: 'invalid',
          message: 'No rider matched this QR code.',
          code,
          scannedAt: new Date().toISOString(),
        })
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

      const { error: insertError } = await supabase.from('qr_checkins').insert({
        registration_id: registration.id,
        scanned_code: code,
        scan_status: 'valid',
        scanned_at: new Date().toISOString(),
        device_label: navigator.userAgent.includes('Mobile') ? 'Mobile Scanner' : 'Web Scanner',
      })
      if (insertError) throw insertError

      setScanResult({
        status: 'valid',
        message: 'Ready to claim race kit.',
        code,
        riderName,
        category: rider?.age_category ?? 'Uncategorized',
        bibNumber,
        eventTitle: event?.title ?? 'Current event',
        registrationId: registration.id,
        scannedAt: new Date().toISOString(),
      })
      setReloadKey((value) => value + 1)
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

  const invalidOrDuplicate = useMemo(() => {
    return (data?.scans ?? []).filter((row) => {
      const status = String(row.scan_status ?? '').toLowerCase()
      return status === 'invalid' || status === 'duplicate'
    }).length
  }, [data?.scans])

  return (
    <ModuleShell loading={loading} error={error}>
      <style>{`
        @keyframes qr-scan-sweep {
          0% { transform: translateY(-120px); opacity: 0.15; }
          15% { opacity: 0.95; }
          50% { opacity: 0.75; }
          85% { opacity: 0.95; }
          100% { transform: translateY(120px); opacity: 0.15; }
        }
      `}</style>
      <StatGrid
        items={[
          { label: 'Scanned today', value: data?.stats.scans ?? 0 },
          { label: 'Valid check-ins', value: data?.stats.valid ?? 0 },
          { label: 'Invalid / duplicate', value: invalidOrDuplicate },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="QR Scanner" subtitle="Point the camera at the rider QR code to validate check-in.">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg">
              <div className="flex items-center justify-between px-3 py-3 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                >
                  {torchOn ? 'Flash Off' : 'Flash On'}
                </button>
                <p className="text-center text-sm font-medium text-slate-100">Scan rider QR to claim race kit</p>
                <button
                  type="button"
                  onClick={() => setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))}
                  className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                >
                  Switch Camera
                </button>
              </div>

              <div className="relative aspect-[4/3] w-full bg-slate-900">
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-10 top-10 h-10 w-10 border-l-4 border-t-4 border-white/95 animate-pulse" />
                  <div className="absolute right-10 top-10 h-10 w-10 border-r-4 border-t-4 border-white/95 animate-pulse" />
                  <div className="absolute bottom-10 left-10 h-10 w-10 border-b-4 border-l-4 border-white/95 animate-pulse" />
                  <div className="absolute bottom-10 right-10 h-10 w-10 border-b-4 border-r-4 border-white/95 animate-pulse" />
                  <div className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-cyan-300/90 shadow-[0_0_18px_rgba(34,211,238,0.95)]" style={{ animation: 'qr-scan-sweep 2.2s ease-in-out infinite' }} />
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-200">
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

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-700">Recent Scans</h3>
            <div className="mt-2 space-y-2">
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
