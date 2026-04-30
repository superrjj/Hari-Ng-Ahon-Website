import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

type Detector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>
}

type DetectorCtor = new (options?: { formats?: string[] }) => Detector

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

const detectorCtor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector

function labelForStatus(status: ScanResult['status']) {
  if (status === 'valid') return 'Valid Rider'
  if (status === 'duplicate') return 'Duplicate Scan'
  return 'Invalid Code'
}

export function AdminQrCheckIn() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.qrDashboard(), [reloadKey])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<Detector | null>(null)
  const scanLoopTimer = useRef<number | null>(null)
  const scanLockRef = useRef(false)
  const lastScanRef = useRef<string>('')
  const [isScannerOn, setIsScannerOn] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  const stopCamera = useCallback(() => {
    if (scanLoopTimer.current) {
      window.clearInterval(scanLoopTimer.current)
      scanLoopTimer.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScannerOn(false)
  }, [])

  const processCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim()
      if (!code || scanLockRef.current || code === lastScanRef.current) return
      scanLockRef.current = true
      lastScanRef.current = code
      setProcessing(true)
      try {
        const { data: duplicate } = await supabase
          .from('qr_checkins')
          .select('id')
          .eq('scanned_code', code)
          .limit(1)
          .maybeSingle()

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
        setTimeout(() => {
          scanLockRef.current = false
          lastScanRef.current = ''
        }, 1200)
        setProcessing(false)
      }
    },
    [],
  )

  const startCamera = useCallback(async () => {
    if (!detectorCtor) {
      toast.error('QR scanning is not supported in this browser. Use manual code input.')
      return
    }
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      detectorRef.current = new detectorCtor({ formats: ['qr_code'] })
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setIsScannerOn(true)

      scanLoopTimer.current = window.setInterval(() => {
        const activeVideo = videoRef.current
        const canvas = canvasRef.current
        const detector = detectorRef.current
        if (!activeVideo || !canvas || !detector) return
        if (activeVideo.readyState < 2) return
        const context = canvas.getContext('2d')
        if (!context) return
        canvas.width = activeVideo.videoWidth
        canvas.height = activeVideo.videoHeight
        context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height)
        void detector.detect(canvas).then((codes) => {
          const rawValue = codes[0]?.rawValue
          if (rawValue) void processCode(rawValue)
        })
      }, 500)
    } catch (cameraError) {
      toast.error((cameraError as Error).message || 'Unable to open camera.')
      stopCamera()
    }
  }, [facingMode, processCode, stopCamera])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    if (!isScannerOn) return
    void startCamera()
  }, [facingMode, isScannerOn, startCamera])

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
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-xs text-slate-200">
                <span>{processing ? 'Processing scan...' : 'Scan rider QR to claim race kit'}</span>
                <span>{isScannerOn ? 'Camera live' : 'Camera off'}</span>
              </div>
              <div className="relative aspect-video w-full">
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                {!isScannerOn ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">Start camera to scan QR code</div>
                ) : null}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={isScannerOn ? stopCamera : () => void startCamera()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isScannerOn ? 'Stop camera' : 'Start camera'}
              </button>
              <button
                type="button"
                onClick={() => setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Switch camera
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Enter QR code manually"
                className="min-w-52 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={() => void processCode(manualCode)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Validate
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Scan Result" subtitle="Shows rider status after each scan.">
          {!scanResult ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No scan yet. Start camera and scan a QR code.
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
