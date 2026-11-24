import { useState } from 'react'
import type { AppState, PipelineStage } from '../App'
import { Download, Sparkles, Zap, CheckCircle2 } from 'lucide-react'
import {
  type MaskMethod,
  type ScenarioPreset,
  SCENARIO_PRESETS,
} from '../demoData'

interface Props {
  state: AppState
  patch: (p: Partial<AppState>) => void
  cloudCover: number
  onApplyPreset: (preset: ScenarioPreset) => void
}

const STAGES: { id: PipelineStage; label: string; icon: string }[] = [
  { id: 'rgb',       label: 'RGB Composite',      icon: '🛰️'  },
  { id: 'cloudmask', label: 'Cloud Mask',          icon: '☁️'  },
  { id: 'validgate', label: 'Valid-Pixel Gate',    icon: '✅'  },
  { id: 'lulc',      label: 'LULC Map',            icon: '🗺️'  },
  { id: 'change',    label: 'Change Detection',    icon: '🔄'  },
]

const MASK_METHODS: { id: MaskMethod; label: string }[] = [
  { id: 'csp', label: 'Cloud Score+'     },
  { id: 'scl', label: 'Sen2Cor SCL'      },
  { id: 'qa',  label: 'Landsat QA_PIXEL' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-2 pb-1 border-b"
        style={{ color: 'var(--teal)', borderColor: 'var(--border)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

export function LeftPanel({ state, patch, cloudCover, onApplyPreset }: Props) {
  const [fetchingLatest, setFetchingLatest] = useState(false)
  const [latestMsg, setLatestMsg] = useState<string | null>(null)

  const handleFetchLatest = async () => {
    setFetchingLatest(true)
    setLatestMsg(null)
    try {
      const res = await fetch('/api/pipeline/latest-pass')
      if (res.ok) {
        const data = await res.json()
        patch({ dateT1: data.date })
        setLatestMsg(`Pass found: ${data.date} (${data.cloud_pct}% cloud)`)
      } else {
        patch({ dateT1: '2025-01-18' })
        setLatestMsg('Using verified pass: 2025-01-18')
      }
    } catch {
      patch({ dateT1: '2025-01-18' })
      setLatestMsg('Using verified pass: 2025-01-18 (Demo)')
    } finally {
      setFetchingLatest(false)
      setTimeout(() => setLatestMsg(null), 4000)
    }
  }

  const handleExport = () => {
    const data = {
      aoi: 'Shahdara, East Delhi (5 km x 5 km)',
      center: [28.65, 77.30],
      date_t1: state.dateT1,
      date_t2: state.dateT2,
      threshold_tau: state.tau,
      mask_method: state.maskMethod,
      cloud_cover_pct: cloudCover,
      stage: state.stage,
      gated: state.gated,
      note: 'AI Satellite Image Processing Prototype — B.Tech Minor Project',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `shahdara_${state.dateT1}_tau${state.tau}.json`
    a.click()
    // Delay revocation to allow async downloads to finish reliably across browsers
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  return (
    <aside
      className="w-68 shrink-0 overflow-y-auto p-3 flex flex-col border-r"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      {/* ⭐ Evaluation / Viva Presets Card */}
      <div
        className="mb-4 p-2.5 rounded-lg border shadow-sm"
        style={{ background: 'rgba(15,118,110,0.15)', borderColor: 'var(--teal-dim)' }}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 mb-1.5 uppercase tracking-wide">
          <Sparkles size={13} className="text-teal-400" />
          <span>Evaluation Scenarios</span>
        </div>
        <p className="text-[11px] text-slate-300 mb-2 leading-snug">
          One-click scenarios to demonstrate key report conclusions to evaluators:
        </p>

        <div className="flex flex-col gap-1.5">
          {SCENARIO_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="text-left p-1.5 rounded text-xs bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 hover:border-teal-500/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between font-semibold text-white group-hover:text-teal-300">
                <span>{preset.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-900/80 text-teal-200 border border-teal-700/50">
                  {preset.badge}
                </span>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-2">
                {preset.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ---- ① Pipeline Stage ---- */}
      <Section title="① Pipeline Stage">
        <div className="flex flex-col gap-1">
          {STAGES.map(s => (
            <button
              key={s.id}
              onClick={() => patch({ stage: s.id })}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all cursor-pointer ${
                state.stage === s.id
                  ? 'font-semibold shadow'
                  : 'opacity-70 hover:opacity-100 hover:bg-slate-800'
              }`}
              style={
                state.stage === s.id
                  ? { background: 'var(--teal-dim)', color: '#fff' }
                  : { color: '#cbd5e1' }
              }
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Ungated / Gated toggle for LULC & Change */}
        {(state.stage === 'lulc' || state.stage === 'change') && (
          <div className="mt-2.5 p-1 rounded bg-slate-900/80 border border-slate-700">
            <div className="text-[10px] text-slate-400 mb-1 px-1 flex justify-between">
              <span>Cloud Gate (M_valid):</span>
              <span className={state.gated ? 'text-teal-400 font-bold' : 'text-amber-400 font-bold'}>
                {state.gated ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="flex rounded overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {(['ungated', 'gated'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => patch({ gated: g === 'gated' })}
                  className={`flex-1 py-1 text-xs font-medium transition-all cursor-pointer ${
                    (g === 'gated') === state.gated
                      ? 'bg-teal-700 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {g === 'ungated' ? '⚠️ Ungated' : '✅ Cloud-Gated'}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ---- ② Scene Dates ---- */}
      <Section title="② Sentinel-2 Dates">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">T1 (pre-event)</label>
          <button
            onClick={handleFetchLatest}
            disabled={fetchingLatest}
            className="flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded text-teal-300 hover:bg-teal-950 border border-teal-800/80 transition-all cursor-pointer"
            title="Fetch the most recent Sentinel-2 pass in Live Mode"
          >
            <Zap size={10} className="text-amber-400" />
            <span>{fetchingLatest ? 'Finding...' : 'Latest Pass'}</span>
          </button>
        </div>
        <input
          type="date"
          value={state.dateT1}
          onChange={e => patch({ dateT1: e.target.value })}
          className="w-full px-2 py-1 rounded text-xs mb-2 font-mono"
          style={{ background: 'var(--slate)', color: '#e2e8f0', border: '1px solid var(--border)' }}
        />

        <label className="text-xs text-slate-400 mb-0.5 block">T2 (post-event)</label>
        <input
          type="date"
          value={state.dateT2}
          onChange={e => patch({ dateT2: e.target.value })}
          className="w-full px-2 py-1 rounded text-xs font-mono"
          style={{ background: 'var(--slate)', color: '#e2e8f0', border: '1px solid var(--border)' }}
        />

        {latestMsg && (
          <div className="mt-1 text-[10px] text-teal-300 flex items-center gap-1 bg-teal-950/60 p-1 rounded border border-teal-800">
            <CheckCircle2 size={11} />
            <span>{latestMsg}</span>
          </div>
        )}

        <div className="mt-2 flex gap-1">
          <button
            onClick={() => patch({ dateT1: '2025-01-18', dateT2: '2025-04-15' })}
            className="text-[11px] w-full py-1 rounded border border-teal-600/50 hover:bg-teal-900/50 text-teal-200 transition-all cursor-pointer"
          >
            Verified Baseline: 18-Jan-2025
          </button>
        </div>
      </Section>

      {/* ---- ③ Cloud Score+ Threshold ---- */}
      <Section title="③ Cloud Score+ Threshold">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400 font-mono">τ = {state.tau.toFixed(2)}</span>
          <span className="font-semibold" style={{ color: 'var(--teal)' }}>☁ {cloudCover}% Cloud</span>
        </div>
        <input
          type="range"
          min={0.10} max={0.95} step={0.05}
          value={state.tau}
          onChange={e => patch({ tau: parseFloat(e.target.value) })}
          className="w-full cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>0.10 (Lenient)</span>
          <span className="text-teal-400 font-medium">Default: 0.60</span>
          <span>0.95 (Strict)</span>
        </div>
        <p className="text-[10.5px] mt-1 text-slate-400">
          Rule: <code className="text-teal-300 font-mono">cs_cdf &lt; τ</code> ⟹ flagged as cloud/shadow
        </p>
      </Section>

      {/* ---- ④ Reference Mask & Agreement ---- */}
      <Section title="④ Reference Mask Comparison">
        <div className="flex flex-col gap-1">
          {MASK_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => patch({ maskMethod: m.id })}
              className={`px-2 py-1.5 rounded text-xs text-left border transition-all cursor-pointer ${
                state.maskMethod === m.id
                  ? 'border-teal-500 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              style={state.maskMethod === m.id ? { background: 'rgba(45,212,191,0.12)' } : {}}
            >
              {m.id === 'csp' ? '🔵' : m.id === 'scl' ? '🟢' : '🟡'} {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => patch({ agreementMode: !state.agreementMode })}
          className={`mt-2 w-full px-2 py-1.5 rounded text-xs border transition-all cursor-pointer ${
            state.agreementMode
              ? 'border-purple-500 text-purple-200 font-semibold'
              : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          style={state.agreementMode ? { background: 'rgba(168,85,247,0.15)' } : {}}
        >
          🔀 Agreement Overlay {state.agreementMode ? 'ON' : 'OFF'}
        </button>
        {state.agreementMode && (
          <div className="mt-1.5 p-1.5 rounded bg-slate-900/80 border border-slate-700 text-[11px] space-y-1">
            <div className="flex items-center"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: '#22c55e' }}/>Both flag cloud (Agreement)</div>
            <div className="flex items-center"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: '#f472b6' }}/>Cloud Score+ only</div>
            <div className="flex items-center"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: '#60a5fa' }}/>Reference mask only</div>
          </div>
        )}
      </Section>

      {/* ---- Export ---- */}
      <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold transition-all hover:brightness-110 cursor-pointer shadow"
          style={{ background: 'var(--teal-dim)', color: '#fff' }}
        >
          <Download size={13} />
          Export Metadata Bundle (JSON)
        </button>
        <p className="text-[10px] text-center mt-1 text-slate-400">
          QGIS GeoTIFF streaming enabled in Live GEE Mode
        </p>
      </div>
    </aside>
  )
}
