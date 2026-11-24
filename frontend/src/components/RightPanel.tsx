import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from 'recharts'
import type { PipelineStage, AnalyticsTab } from '../App'
import { LULC_CLASSES, FIELD_IMPACTS, ungatedPct, type MeasuredSceneSweep } from '../demoData'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

interface KPICardProps { label: string; value: string; sub?: string; color?: string }
function KPICard({ label, value, sub, color = '#2dd4bf' }: KPICardProps) {
  return (
    <div className="rounded-lg p-2.5 flex flex-col" style={{ background: '#0d1b2a', border: '1px solid var(--border)' }}>
      <span className="text-xs text-slate-400 mb-0.5">{label}</span>
      <span className="text-xl font-bold font-mono" style={{ color }}>{value}</span>
      {sub && <span className="text-xs text-slate-500 mt-0.5">{sub}</span>}
    </div>
  )
}

interface Props {
  tau: number
  dateT1: string
  dateT2: string
  cloudCover: number
  cloudCoverT2: number
  metrics: { precision: number; recall: number; f1: number; kappa: number }
  sensitivity: Array<{ tau: number; cloudPct: number; f1: number; precision: number; recall: number }>
  activeSweep: MeasuredSceneSweep
  stage: PipelineStage
  gated: boolean
  activeTab: AnalyticsTab
  onTabChange: (tab: AnalyticsTab) => void
}

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'metrics',     label: 'KPIs'         },
  { id: 'sensitivity', label: 'Sensitivity'  },
  { id: 'lulc',        label: 'LULC'         },
  { id: 'impact',      label: 'Multi-Field'  },
]

export function RightPanel({
  tau,
  dateT1,
  dateT2,
  cloudCover,
  cloudCoverT2,
  metrics,
  sensitivity,
  activeSweep,
  stage,
  gated,
  activeTab,
  onTabChange,
}: Props) {
  const row60 = activeSweep.rows.find(r => r.tau === 0.6) ?? activeSweep.rows[0]
  const row80 = activeSweep.rows.find(r => r.tau === 0.8) ?? activeSweep.rows[0]
  const bestRow = activeSweep.rows.reduce((best, cur) => (cur.f1 > best.f1 ? cur : best), activeSweep.rows[0])
  const unionCloudPct = Math.min(100, Math.round((cloudCover + cloudCoverT2) * 100) / 100)

  return (
    <aside
      className="w-76 shrink-0 overflow-y-auto p-3 flex flex-col border-l"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      {/* Tab switcher */}
      <div className="flex rounded overflow-hidden border mb-3" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex-1 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === t.id ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
            style={activeTab === t.id ? { background: 'var(--teal-dim)' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== KPIs TAB ===== */}
      {activeTab === 'metrics' && (
        <div className="space-y-2">
          {/* Scene provenance banner */}
          <div
            className="rounded-lg p-2 text-[11px]"
            style={{ background: '#0d1b2a', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-teal-300">Measured GEE Sweep ({activeSweep.scaleM} m)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-200 border border-teal-800">
                {activeSweep.date}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={activeSweep.sceneId}>
              ID: {activeSweep.sceneId}
            </div>
          </div>

          {/* Valid-Pixel Gate / Change Detection Callout */}
          {(stage === 'change' || stage === 'validgate') && (
            <div
              className={`p-2.5 rounded-lg border text-xs ${
                gated
                  ? 'bg-teal-950/40 border-teal-500/80 text-teal-100'
                  : 'bg-amber-950/40 border-amber-500/80 text-amber-100'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <div className="flex items-center gap-1.5">
                  {gated ? (
                    <>
                      <ShieldCheck size={16} className="text-teal-400" />
                      <span className="text-teal-300">Valid-Pixel Gate (M_valid)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-amber-400" />
                      <span className="text-amber-300">Ungated Baseline</span>
                    </>
                  )}
                </div>
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  {dateT1} → {dateT2}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                {gated
                  ? `M_valid = NOT(M_${dateT1} ∪ M_${dateT2}) excludes ${unionCloudPct}% combined cloud pixels across T1 (${cloudCover.toFixed(2)}%) & T2 (${cloudCoverT2.toFixed(2)}%).`
                  : `Ungated comparison: unmasked clouds on T1 (${cloudCover.toFixed(2)}%) & T2 (${cloudCoverT2.toFixed(2)}%) inflate apparent change.`}
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-700">
                  <div className="text-slate-400 text-[10px]">Illustrative Change</div>
                  <div className={`font-bold font-mono text-sm ${gated ? 'text-teal-300' : 'text-amber-300'}`}>
                    {gated ? '7.4%' : '11.2%'}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-700">
                  <div className="text-slate-400 text-[10px]">T1 ∪ T2 Excluded</div>
                  <div className="font-bold font-mono text-sm text-teal-400">
                    {gated ? `${unionCloudPct}% Masked` : '+3.8% Drift'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <KPICard
            label={`☁ Cloud Cover in AOI (T1: ${dateT1})`}
            value={`${cloudCover.toFixed(2)}%`}
            sub={`τ = ${tau.toFixed(2)} · T2 (${dateT2}) = ${cloudCoverT2.toFixed(2)}%`}
            color="#f59e0b"
          />
          <KPICard
            label="🎯 Precision"
            value={metrics.precision.toFixed(4)}
            sub={`CS+ vs ${activeSweep.reference}`}
          />
          <KPICard
            label="📡 Recall"
            value={metrics.recall.toFixed(4)}
            sub="SCL cloud pixels flagged by CS+"
          />
          <KPICard
            label="⚖ F1-Score"
            value={metrics.f1.toFixed(4)}
            sub={`Peak F1 = ${bestRow.f1.toFixed(4)} at τ = ${bestRow.tau.toFixed(2)}`}
            color="#a78bfa"
          />
          <KPICard
            label="κ Cohen's Kappa"
            value={metrics.kappa.toFixed(4)}
            sub="Inter-mask agreement (CS+ vs. SCL)"
            color="#34d399"
          />

          {/* Sentinel-2 6-Band Ingestion Reference */}
          <div
            className="rounded-lg p-2.5 mt-1"
            style={{ background: '#0d1b2a', border: '1px solid var(--border)' }}
          >
            <div className="text-xs font-semibold text-teal-400 mb-1">Sentinel-2 6-Band Ingestion (10 m)</div>
            {[
              ['B2', 'Blue',   '490 nm',  'Atmospheric Aerosol'],
              ['B3', 'Green',  '560 nm',  'Vegetation Peak'],
              ['B4', 'Red',    '665 nm',  'Chlorophyll Absorption'],
              ['B8', 'NIR',    '842 nm',  'Biomass / Water Contrast'],
              ['B11','SWIR-1','1610 nm',  'Cloud / Snow Separation'],
              ['B12','SWIR-2','2190 nm',  'Built-up / Soil Contrast'],
            ].map(([b, name, wl, desc]) => (
              <div key={b} className="flex justify-between items-center text-xs text-slate-400 mb-0.5">
                <span className="font-mono text-teal-300 font-bold">{b}</span>
                <span>{name} ({wl})</span>
                <span className="text-[10px] text-slate-500">{desc}</span>
              </div>
            ))}
            <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
              Reflectance Scaling: <code className="text-teal-300 font-mono">ρ = DN ÷ 10 000</code>
            </div>
          </div>
        </div>
      )}

      {/* ===== SENSITIVITY TAB ===== */}
      {activeTab === 'sensitivity' && (
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--teal)' }}>
            Measured Threshold Sweep ({activeSweep.date})
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={sensitivity} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a4a" />
              <XAxis dataKey="tau" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#0d1b2a', border: '1px solid #1e3a4a', fontSize: 11 }}
                labelStyle={{ color: '#2dd4bf' }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="cloudPct" name="Cloud %" stroke="#f59e0b" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="f1"       name="F1"       stroke="#a78bfa" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="precision" name="Prec."   stroke="#2dd4bf" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="recall"   name="Recall"   stroke="#f87171" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>

          <div
            className="rounded-lg p-2.5 mt-2 text-xs"
            style={{ background: '#0d1b2a', border: '1px solid var(--border)' }}
          >
            <div className="font-semibold text-teal-400 mb-1">
              Measured 10 m Pixel Counts ({activeSweep.date})
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate mb-1.5" title={activeSweep.sceneId}>
              {activeSweep.sceneId}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-400 text-[11px]">
              <span>CS+ @ τ=0.60:</span>  <span className="text-white font-mono">{row60.cspCloudPct.toFixed(2)}%</span>
              <span>CS+ @ τ=0.80:</span>  <span className="text-white font-mono">{row80.cspCloudPct.toFixed(2)}%</span>
              <span>Sen2Cor SCL:</span>    <span className="text-white font-mono">{row60.sclCloudPct.toFixed(2)}%</span>
              <span>P / R @ τ=0.60:</span><span className="text-white font-mono">{row60.precision.toFixed(4)} / {row60.recall.toFixed(4)}</span>
              <span>F1 @ τ=0.60:</span>   <span className="text-white font-mono">{row60.f1.toFixed(4)}</span>
              <span>Peak F1:</span>       <span className="text-white font-mono">{bestRow.f1.toFixed(4)} @ τ={bestRow.tau.toFixed(2)}</span>
              <span>κ @ τ=0.60:</span>    <span className="text-white font-mono">{row60.kappa.toFixed(4)}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-800">
              Note: At τ ≥ {activeSweep.date === '2025-05-10' ? '0.85' : '0.90'}, CS+ saturates (100% AOI flagged).
            </div>
          </div>
        </div>
      )}

      {/* ===== LULC TAB ===== */}
      {activeTab === 'lulc' && (
        <div>
          <div className="text-xs font-semibold mb-2 flex justify-between" style={{ color: 'var(--teal)' }}>
            <span>9-Class Land Cover (%)</span>
            <span className={gated ? 'text-teal-400 font-bold' : 'text-amber-400 font-bold'}>
              {gated ? '✅ Cloud-Gated' : '⚠️ Ungated (Illustrative)'}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={LULC_CLASSES.map(c => ({
                name: c.name,
                T1: gated ? c.t1 : ungatedPct(c, 't1'),
                T2: gated ? c.t2 : ungatedPct(c, 't2'),
                color: c.color,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 4, left: 52 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a4a" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
              <Tooltip
                contentStyle={{ background: '#0d1b2a', border: '1px solid #1e3a4a', fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="T1" name={`T1 (${dateT1})`} radius={[0,2,2,0]} opacity={0.85}>
                {LULC_CLASSES.map(c => <Cell key={c.id} fill={c.color} />)}
              </Bar>
              <Bar dataKey="T2" name={`T2 (${dateT2})`} radius={[0,2,2,0]} opacity={0.55}>
                {LULC_CLASSES.map(c => <Cell key={c.id} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="text-[10px] text-slate-500 mt-1">
            Dynamic World 9-class · 10 m raster (ungated drift is illustrative)
          </div>
        </div>
      )}

      {/* ===== MULTI-FIELD IMPACT TAB ===== */}
      {activeTab === 'impact' && (
        <div className="space-y-2">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--teal)' }}>
            Real-World Engineering & Public Policy Impact
          </div>
          <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
            Concrete deployment use-cases enabled by masking clouds and transient atmospheric noise:
          </p>
          {FIELD_IMPACTS.map(fi => (
            <div
              key={fi.field}
              className="rounded-lg p-2.5 transition-all hover:border-teal-500/50"
              style={{ background: '#0d1b2a', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white mb-1">
                <span>{fi.icon}</span> <span>{fi.field}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{fi.text}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
