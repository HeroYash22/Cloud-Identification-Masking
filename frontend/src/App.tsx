import { useState, useMemo, useEffect } from 'react'
import { MapPanel }        from './components/MapPanel'
import { LeftPanel }       from './components/LeftPanel'
import { RightPanel }      from './components/RightPanel'
import { TopBar }          from './components/TopBar'
import {
  interpolateCloudCover,
  interpolateMetrics,
  buildSensitivitySeries,
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
  geeStatus: {
    available: boolean
    project: string
    message: string
  }
}

function App() {
  const [state, setState] = useState<AppState>({
    dateT1: '2025-01-18',
    dateT2: '2025-04-15',
    tau: 0.60,
    maskMethod: 'csp',
    stage: 'rgb',
    gated: true,
    agreementMode: false,
    demoMode: true,
    activeTab: 'metrics',
    basemap: 'satellite',
    showLabels: true,
    liveTileUrl: null,
    geeStatus: {
      available: false,
      project: '',
      message: 'Checking GEE live status...',
    },
  })

  // Poll or check GEE status on load
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

  const cloudCover   = useMemo(() => interpolateCloudCover(state.tau), [state.tau])
  const metrics      = useMemo(() => interpolateMetrics(state.tau),    [state.tau])
  // Dependency array is intentionally empty: series is built from module constants only
  const sensitivity  = useMemo(() => buildSensitivitySeries(9),        [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden"
         style={{ background: 'var(--navy)', color: '#e2e8f0' }}>
      <TopBar
        demoMode={state.demoMode}
        onToggleDemo={v => patch({ demoMode: v })}
        geeStatus={state.geeStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left control panel */}
        <LeftPanel
          state={state}
          patch={patch}
          cloudCover={cloudCover}
          onApplyPreset={handleApplyPreset}
        />

        {/* Central map with real satellite basemap */}
        <main className="flex-1 relative overflow-hidden">
          <MapPanel
            stage={state.stage}
            tau={state.tau}
            maskMethod={state.maskMethod}
            agreementMode={state.agreementMode}
            gated={state.gated}
            cloudCover={cloudCover}
            basemap={state.basemap}
            showLabels={state.showLabels}
            liveTileUrl={state.liveTileUrl}
            onToggleBasemap={bm => patch({ basemap: bm })}
            onToggleLabels={lbl => patch({ showLabels: lbl })}
          />
        </main>

        {/* Right analytics panel with False Alarms Prevented card */}
        <RightPanel
          tau={state.tau}
          cloudCover={cloudCover}
          metrics={metrics}
          sensitivity={sensitivity}
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
