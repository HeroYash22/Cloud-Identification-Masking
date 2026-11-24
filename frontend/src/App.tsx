import { useState, useMemo, useEffect } from 'react'
import { MapPanel }        from './components/MapPanel'
import { LeftPanel }       from './components/LeftPanel'
import { RightPanel }      from './components/RightPanel'
import { TopBar }          from './components/TopBar'
import {
  interpolateCloudCover,
  interpolateMetrics,
  buildSensitivitySeries,
  getActiveSweep,
  type MaskMethod,
  type ScenarioPreset,
} from './demoData'

export type PipelineStage =
  | 'rgb'
  | 'cloudmask'
  | 'validgate'
  | 'lulc'
  | 'change'

export type AnalyticsTab = 'metrics' | 'sensitivity' | 'lulc' | 'impact'
export type BasemapMode = 'satellite' | 'street'

export interface LiveOverrideData {
  date: string
  sceneId?: string
  cloudCover: number
  precision: number
  recall: number
  f1: number
  kappa: number
}

export interface AppState {
  dateT1: string
  dateT2: string
  tau: number
  maskMethod: MaskMethod
  stage: PipelineStage
  gated: boolean
  agreementMode: boolean
  demoMode: boolean
  activeTab: AnalyticsTab
  basemap: BasemapMode
  showLabels: boolean
  liveTileUrl: string | null
  liveLoading: boolean
  liveError: string | null
  liveData: LiveOverrideData | null
  geeStatus: {
    available: boolean
    project: string
    message: string
  }
}

function App() {
  const [state, setState] = useState<AppState>({
    dateT1: '2025-05-10',
    dateT2: '2025-01-23',
    tau: 0.60,
    maskMethod: 'csp',
    stage: 'cloudmask',
    gated: true,
    agreementMode: false,
    demoMode: true,
    activeTab: 'metrics',
    basemap: 'satellite',
    showLabels: true,
    liveTileUrl: null,
    liveLoading: false,
    liveError: null,
    liveData: null,
    geeStatus: {
      available: false,
      project: '',
      message: 'Checking GEE live status...',
    },
  })

  useEffect(() => {
    fetch('/api/live-status')
      .then(res => res.json())
      .then(data => {
        setState(prev => ({
          ...prev,
          demoMode: data.mode !== 'live',
          geeStatus: {
            available: !!data.gee_available,
            project: data.gee_project || '',
            message: data.error || (data.gee_available ? 'Connected to Earth Engine' : 'Offline / Demo Mode active'),
          },
        }))
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          demoMode: true,
          geeStatus: {
            available: false,
            project: '',
            message: 'Backend running in local Demo Mode',
          },
        }))
      })
  }, [])

  // Query live Earth Engine endpoints whenever Live GEE Mode is ON or T1/T2/tau/stage changes
  useEffect(() => {
    if (state.demoMode) {
      setState(prev => ({
        ...prev,
        liveTileUrl: null,
        liveLoading: false,
        liveError: null,
        liveData: null,
      }))
      return
    }

    const controller = new AbortController()
    setState(prev => ({ ...prev, liveLoading: true, liveError: null }))

    const maskUrl = `/api/mask/?date=${state.dateT1}&tau=${state.tau}&method=${state.maskMethod}&live=true`
    const stageUrl =
      state.stage === 'rgb'
        ? `/api/pipeline/rgb?date=${state.dateT1}&live=true`
        : state.stage === 'validgate'
        ? `/api/pipeline/valid-gate?t1=${state.dateT1}&t2=${state.dateT2}&tau=${state.tau}&live=true`
        : state.stage === 'lulc'
        ? `/api/pipeline/lulc?date=${state.dateT1}&gated=${state.gated}&tau=${state.tau}&live=true`
        : state.stage === 'change'
        ? `/api/pipeline/change?t1=${state.dateT1}&t2=${state.dateT2}&tau=${state.tau}&gated=${state.gated}&live=true`
        : null

    Promise.all([
      fetch(maskUrl, { signal: controller.signal }).then(r => (r.ok ? r.json() : null)),
      stageUrl ? fetch(stageUrl, { signal: controller.signal }).then(r => (r.ok ? r.json() : null)) : Promise.resolve(null),
    ])
      .then(([maskRes, stageRes]) => {
        if (!maskRes) {
          setState(prev => ({
            ...prev,
            liveLoading: false,
            liveError: 'Backend unreachable on port 8000 — start uvicorn first.',
          }))
          return
        }

        const err = stageRes?.live_error || maskRes?.live_error || null
        const tileUrl = stageRes?.tile_url ?? maskRes?.tile_url ?? null

        setState(prev => ({
          ...prev,
          liveLoading: false,
          liveError: err,
          liveTileUrl: tileUrl,
          liveData: maskRes.live_gee
            ? {
                date: maskRes.date,
                sceneId: maskRes.scene_id,
                cloudCover: maskRes.csp_cloud_pct,
                precision: maskRes.precision,
                recall: maskRes.recall,
                f1: maskRes.f1,
                kappa: maskRes.kappa,
              }
            : null,
        }))
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            liveLoading: false,
            liveError: 'Failed to reach FastAPI backend for Live GEE query.',
          }))
        }
      })

    return () => controller.abort()
  }, [state.demoMode, state.dateT1, state.dateT2, state.tau, state.maskMethod, state.stage, state.gated])

  const patch = (partial: Partial<AppState>) =>
    setState(prev => ({ ...prev, ...partial }))

  const handleApplyPreset = (preset: ScenarioPreset) => {
    patch({
      stage: preset.stage,
      tau: preset.tau,
      gated: preset.gated,
      activeTab: preset.tab,
      dateT1: preset.dateT1,
      dateT2: preset.dateT2,
    })
  }

  const activeSweep   = useMemo(() => getActiveSweep(state.dateT1),                  [state.dateT1])
  const demoCloud     = useMemo(() => interpolateCloudCover(state.tau, state.dateT1), [state.tau, state.dateT1])
  const cloudCoverT2  = useMemo(() => interpolateCloudCover(state.tau, state.dateT2), [state.tau, state.dateT2])
  const demoMetrics   = useMemo(() => interpolateMetrics(state.tau, state.dateT1),    [state.tau, state.dateT1])
  const sensitivity   = useMemo(() => buildSensitivitySeries(state.dateT1),           [state.dateT1])

  const cloudCover = state.liveData ? state.liveData.cloudCover : demoCloud
  const metrics = state.liveData
    ? {
        precision: state.liveData.precision,
        recall: state.liveData.recall,
        f1: state.liveData.f1,
        kappa: state.liveData.kappa,
      }
    : demoMetrics

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden"
         style={{ background: 'var(--navy)', color: '#e2e8f0' }}>
      <TopBar
        demoMode={state.demoMode}
        onToggleDemo={v => patch({ demoMode: v })}
        geeStatus={state.geeStatus}
      />

      {/* Live GEE Status / Error Banner */}
      {!state.demoMode && (state.liveLoading || state.liveError || state.liveData) && (
        <div
          className={`px-4 py-1 text-xs flex items-center justify-between border-b ${
            state.liveError
              ? 'bg-red-950/80 border-red-700 text-red-200'
              : state.liveLoading
              ? 'bg-teal-950/80 border-teal-700 text-teal-200'
              : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
          }`}
        >
          <span>
            {state.liveLoading
              ? `🛰️ Querying Google Earth Engine for T1=${state.dateT1}, T2=${state.dateT2} (τ = ${state.tau.toFixed(2)})...`
              : state.liveError
              ? `⚠️ Live GEE Mode unavailable (${state.liveError}) — showing fallback sweep.`
              : `✅ Live GEE Streaming: ${state.liveData?.date} (${state.liveData?.sceneId}) · CS+ Cloud = ${state.liveData?.cloudCover}%`}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          state={state}
          patch={patch}
          cloudCover={cloudCover}
          activeSweep={activeSweep}
          onApplyPreset={handleApplyPreset}
        />

        <main className="flex-1 relative overflow-hidden">
          <MapPanel
            stage={state.stage}
            dateT1={state.dateT1}
            dateT2={state.dateT2}
            tau={state.tau}
            maskMethod={state.maskMethod}
            agreementMode={state.agreementMode}
            gated={state.gated}
            cloudCover={cloudCover}
            cloudCoverT2={cloudCoverT2}
            basemap={state.basemap}
            showLabels={state.showLabels}
            liveTileUrl={state.liveTileUrl}
            demoMode={state.demoMode}
            onToggleBasemap={bm => patch({ basemap: bm })}
            onToggleLabels={lbl => patch({ showLabels: lbl })}
          />
        </main>

        <RightPanel
          tau={state.tau}
          dateT1={state.dateT1}
          dateT2={state.dateT2}
          cloudCover={cloudCover}
          cloudCoverT2={cloudCoverT2}
          metrics={metrics}
          sensitivity={sensitivity}
          activeSweep={activeSweep}
          stage={state.stage}
          gated={state.gated}
          activeTab={state.activeTab}
          onTabChange={tab => patch({ activeTab: tab })}
        />
      </div>
    </div>
  )
}

export default App
