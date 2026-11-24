import { useState } from 'react'
import type { AppState, PipelineStage } from '../App'
import {
  Download,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  Layers,
  Cloud,
  ShieldCheck,
  Map,
  GitCompare,
} from 'lucide-react'
import {
  type MaskMethod,
  type ScenarioPreset,
  type MeasuredSceneSweep,
  SCENARIO_PRESETS,
} from '../demoData'

interface Props {
  state: AppState
  patch: (p: Partial<AppState>) => void
  cloudCover: number
  activeSweep: MeasuredSceneSweep
  onApplyPreset: (preset: ScenarioPreset) => void
}

const STAGES: { id: PipelineStage; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'rgb',       label: 'RGB composite',      icon: Layers },
  { id: 'cloudmask', label: 'Cloud mask',         icon: Cloud },
  { id: 'validgate', label: 'Valid-pixel gate',   icon: ShieldCheck },
  { id: 'lulc',      label: 'LULC classification',icon: Map },
  { id: 'change',    label: 'Bitemporal change',  icon: GitCompare },
]

const MASK_METHODS: { id: MaskMethod; label: string; dotColor: string }[] = [
  { id: 'csp', label: 'Cloud Score+',     dotColor: '#38bdf8' },
  { id: 'scl', label: 'Sen2Cor SCL',      dotColor: '#34d399' },
  { id: 'qa',  label: 'Landsat QA_PIXEL', dotColor: '#fbbf24' },
]

function getLocalTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function clampToToday(dateStr: string, todayISO: string): string {
  if (!dateStr) return todayISO
  return dateStr > todayISO ? todayISO : dateStr
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-medium text-[#a1a1a6] mb-2 pb-1 border-b border-white/8">
        {title}
      </div>
      {children}
    </div>
  )
}

export function LeftPanel({ state, patch, cloudCover, activeSweep, onApplyPreset }: Props) {
  const [fetchingLatest, setFetchingLatest] = useState(false)
  const [latestMsg, setLatestMsg] = useState<string | null>(null)
  const todayISO = getLocalTodayISO()

  const handleDateChange = (field: 'dateT1' | 'dateT2', rawValue: string) => {
    if (!rawValue) return
    const clamped = clampToToday(rawValue, todayISO)
    patch({ [field]: clamped })
  }

  const handleFetchLatest = async () => {
    setFetchingLatest(true)
    setLatestMsg(null)
    try {
      const res = await fetch('/api/pipeline/latest-pass')
      if (res.ok) {
        const data = await res.json()
        const safeDate = clampToToday(data.date, todayISO)
        patch({ dateT1: safeDate })
        setLatestMsg(`Pass found: ${safeDate} (${data.cloud_pct}% cloud)`)
      } else {
        patch({ dateT1: '2025-05-10' })
        setLatestMsg('Using measured pass: 2025-05-10 (5.84% SCL)')
      }
    } catch {
      patch({ dateT1: '2025-05-10' })
      setLatestMsg('Using measured pass: 2025-05-10 (5.84% SCL)')
    } finally {
      setFetchingLatest(false)
      setTimeout(() => setLatestMsg(null), 4000)
    }
  }

  const handleExport = () => {
    const data = {
      aoi: 'Shahdara, East Delhi (5 km x 5 km)',
      center: [28.65, 77.30],
      active_measured_scene: {
        date: activeSweep.date,
        scene_id: activeSweep.sceneId,
        reference: activeSweep.reference,
        scale_m: activeSweep.scaleM,
      },
      date_t1: state.dateT1,
      date_t2: state.dateT2,
      threshold_tau: state.tau,
      mask_method: state.maskMethod,
      cloud_cover_pct: cloudCover,
      stage: state.stage,
      gated: state.gated,
      note: 'Satellite Image Processing Pipeline (10 m GEE Pixel Sweep)',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `shahdara_${activeSweep.date}_tau${state.tau}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto p-3 flex flex-col bg-[#141415] border-r border-white/8">
      {/* Evaluation Presets Card */}
      <div className="mb-4 p-2.5 rounded-lg bg-[#19191b] border border-white/8">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#ededed] mb-1">
          <SlidersHorizontal size={13} className="text-[#a1a1a6]" />
          <span>Evaluation scenarios</span>
        </div>
        <p className="text-[11px] text-[#71717a] mb-2 leading-snug">
          One-click scenarios calibrated with 10 m GEE pixel sweeps:
        </p>

        <div className="flex flex-col gap-1.5">
          {SCENARIO_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="text-left p-2 rounded-md text-xs bg-[#202023] hover:bg-[#27272a] border border-white/5 hover:border-white/15 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between font-medium text-[#ededed] group-hover:text-white">
                <span>{preset.title}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#2c2c30] text-[#a1a1a6]">
                  {preset.badge}
                </span>
              </div>
              <div className="text-[10.5px] text-[#71717a] mt-0.5 line-clamp-2">
                {preset.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Stage */}
      <Section title="Pipeline stage">
        <div className="flex flex-col gap-1">
          {STAGES.map(s => {
            const Icon = s.icon
            const active = state.stage === s.id
            return (
              <button
                key={s.id}
                onClick={() => patch({ stage: s.id })}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#232325] text-white border border-white/12 font-medium shadow-sm'
                    : 'text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#1a1a1c]'
                }`}
              >
                <Icon size={14} className={active ? 'text-[#10b981]' : 'text-[#71717a]'} />
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>

        {/* Ungated / Gated toggle for LULC & Change */}
        {(state.stage === 'lulc' || state.stage === 'change') && (
          <div className="mt-2.5 p-2 rounded-md bg-[#19191b] border border-white/8">
            <div className="text-[10px] text-[#71717a] mb-1.5 flex justify-between">
              <span>Cloud gate (M_valid):</span>
              <span className={`font-mono font-medium ${state.gated ? 'text-[#10b981]' : 'text-amber-400'}`}>
                {state.gated ? 'Active' : 'Bypassed'}
              </span>
            </div>
            <div className="flex rounded-md overflow-hidden p-0.5 bg-[#202023] border border-white/5">
              {(['ungated', 'gated'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => patch({ gated: g === 'gated' })}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    (g === 'gated') === state.gated
                      ? 'bg-[#2c2c30] text-[#ededed] shadow-sm'
                      : 'text-[#71717a] hover:text-[#ededed]'
                  }`}
                >
                  {g === 'ungated' ? 'Ungated baseline' : 'Cloud-gated'}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Sentinel-2 Scenes */}
      <Section title="Sentinel-2 scenes">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-[#71717a]">T1 (evaluation scene)</label>
          <button
            onClick={handleFetchLatest}
            disabled={fetchingLatest}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded text-[#a1a1a6] hover:text-[#ededed] bg-[#19191b] hover:bg-[#232325] border border-white/8 transition-colors cursor-pointer"
            title="Fetch the most recent Sentinel-2 pass up to today"
          >
            <RefreshCw size={10} className={fetchingLatest ? 'animate-spin' : ''} />
            <span>{fetchingLatest ? 'Finding...' : 'Latest pass'}</span>
          </button>
        </div>
        <input
          type="date"
          min="2015-06-23"
          max={todayISO}
          value={state.dateT1}
          onChange={e => handleDateChange('dateT1', e.target.value)}
          className="w-full px-2.5 py-1 rounded-md text-xs mb-2 font-mono bg-[#19191b] border border-white/10 text-[#ededed] focus:outline-none focus:border-white/20"
        />

        <label className="text-[11px] text-[#71717a] mb-0.5 block">T2 (comparison scene)</label>
        <input
          type="date"
          min="2015-06-23"
          max={todayISO}
          value={state.dateT2}
          onChange={e => handleDateChange('dateT2', e.target.value)}
          className="w-full px-2.5 py-1 rounded-md text-xs font-mono bg-[#19191b] border border-white/10 text-[#ededed] focus:outline-none focus:border-white/20"
        />

        {latestMsg && (
          <div className="mt-1 text-[10px] text-[#10b981] flex items-center gap-1 bg-[#121c17] p-1.5 rounded border border-emerald-500/20">
            <CheckCircle2 size={11} />
            <span>{latestMsg}</span>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-1">
          <button
            onClick={() => patch({ dateT1: '2025-05-10', dateT2: '2025-01-23' })}
            className={`text-[11px] w-full py-1 px-2 rounded-md border transition-colors cursor-pointer text-left flex justify-between items-center ${
              state.dateT1 === '2025-05-10'
                ? 'border-white/20 bg-[#232325] text-white font-medium'
                : 'border-white/5 bg-[#19191b] hover:bg-[#202023] text-[#a1a1a6]'
            }`}
          >
            <span>Primary: 10-May-2025</span>
            <span className="text-[10px] font-mono text-[#71717a]">5.84% SCL</span>
          </button>
          <button
            onClick={() => patch({ dateT1: '2025-01-23', dateT2: '2025-05-10' })}
            className={`text-[11px] w-full py-1 px-2 rounded-md border transition-colors cursor-pointer text-left flex justify-between items-center ${
              state.dateT1 === '2025-01-23'
                ? 'border-white/20 bg-[#232325] text-white font-medium'
                : 'border-white/5 bg-[#19191b] hover:bg-[#202023] text-[#a1a1a6]'
            }`}
          >
            <span>Haze: 23-Jan-2025</span>
            <span className="text-[10px] font-mono text-[#71717a]">2.02% SCL</span>
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-[#71717a] font-mono truncate" title={activeSweep.sceneId}>
          Granule: {activeSweep.sceneId}
        </div>
      </Section>

      {/* Cloud Score+ Threshold */}
      <Section title="Cloud Score+ threshold">
        <div className="flex justify-between text-xs mb-1 font-mono">
          <span className="text-[#a1a1a6]">τ = {state.tau.toFixed(2)}</span>
          <span className="text-[#10b981] font-medium">{cloudCover.toFixed(2)}% cloud</span>
        </div>
        <input
          type="range"
          min={0.10} max={0.95} step={0.05}
          value={state.tau}
          onChange={e => patch({ tau: parseFloat(e.target.value) })}
          className="w-full cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#71717a] mt-0.5 font-mono">
          <span>0.10 (Lenient)</span>
          <span className="text-[#a1a1a6]">Default: 0.60</span>
          <span>0.95 (Strict)</span>
        </div>
        <p className="text-[10.5px] mt-1.5 text-[#71717a] font-mono leading-tight">
          Rule: cs_cdf &lt; τ ⟹ flagged as cloud/shadow
        </p>
      </Section>

      {/* Reference Mask Comparison */}
      <Section title="Reference mask comparison">
        <div className="flex flex-col gap-1">
          {MASK_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => patch({ maskMethod: m.id })}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left border transition-colors cursor-pointer ${
                state.maskMethod === m.id
                  ? 'border-white/20 bg-[#232325] text-white font-medium'
                  : 'border-transparent text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#1a1a1c]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dotColor }} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => patch({ agreementMode: !state.agreementMode })}
          className={`mt-2 w-full px-2.5 py-1.5 rounded-md text-xs border transition-colors cursor-pointer text-left flex justify-between items-center ${
            state.agreementMode
              ? 'border-white/20 bg-[#232325] text-white font-medium'
              : 'border-white/8 text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#1a1a1c]'
          }`}
        >
          <span>Agreement overlay</span>
          <span className="font-mono text-[10px] text-[#71717a]">{state.agreementMode ? 'ON' : 'OFF'}</span>
        </button>
        {state.agreementMode && (
          <div className="mt-1.5 p-2 rounded-md bg-[#19191b] border border-white/8 text-[11px] space-y-1">
            <div className="flex items-center text-[#a1a1a6]">
              <span className="inline-block w-2 h-2 rounded-sm mr-2 bg-emerald-500" />
              <span>Both flag cloud (Agreement)</span>
            </div>
            <div className="flex items-center text-[#a1a1a6]">
              <span className="inline-block w-2 h-2 rounded-sm mr-2 bg-pink-500" />
              <span>Cloud Score+ only</span>
            </div>
            <div className="flex items-center text-[#a1a1a6]">
              <span className="inline-block w-2 h-2 rounded-sm mr-2 bg-blue-500" />
              <span>Reference mask only</span>
            </div>
          </div>
        )}
      </Section>

      {/* Export */}
      <div className="mt-auto pt-3 border-t border-white/8">
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium bg-[#ededed] text-[#0f0f10] hover:bg-white transition-colors cursor-pointer shadow-sm"
        >
          <Download size={13} />
          <span>Export metadata bundle</span>
        </button>
        <p className="text-[10px] text-center mt-1.5 text-[#71717a]">
          QGIS GeoTIFF streaming enabled in Live GEE mode
        </p>
      </div>
    </aside>
  )
}
