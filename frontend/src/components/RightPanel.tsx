import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from 'recharts'
import type { PipelineStage, AnalyticsTab } from '../App'
import { LULC_CLASSES, FIELD_IMPACTS, ungatedPct, type MeasuredSceneSweep } from '../demoData'
import {
  ShieldCheck,
  AlertCircle,
  Building2,
  LandPlot,
  Trees,
  Droplets,
  Activity,
  AlertTriangle,
} from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  sub?: string
  focal?: boolean
}

function KPICard({ label, value, sub, focal = false }: KPICardProps) {
  return (
    <div className={`rounded-md p-2.5 flex flex-col border ${
      focal ? 'bg-[#19191b] border-white/20' : 'bg-[#19191b] border-white/8'
    }`}>
      <span className="text-[11px] text-[#71717a] mb-0.5">{label}</span>
      <span className={`text-xl font-mono tabular-nums font-medium ${
        focal ? 'text-[#10b981]' : 'text-[#ededed]'
      }`}>
        {value}
      </span>
      {sub && <span className="text-[10.5px] text-[#71717a] mt-0.5 font-mono">{sub}</span>}
    </div>
  )
}

function getFieldIcon(fieldName: string) {
  switch (fieldName) {
    case 'Urban Planning': return <Building2 size={13} className="text-[#a1a1a6]" />
    case 'Agriculture': return <LandPlot size={13} className="text-[#a1a1a6]" />
    case 'Disaster Response': return <AlertTriangle size={13} className="text-[#a1a1a6]" />
    case 'Forestry': return <Trees size={13} className="text-[#a1a1a6]" />
    case 'Water Management': return <Droplets size={13} className="text-[#a1a1a6]" />
    case 'Air Quality': return <Activity size={13} className="text-[#a1a1a6]" />
    default: return <Activity size={13} className="text-[#a1a1a6]" />
  }
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
  { id: 'lulc',        label: 'Land cover'   },
  { id: 'impact',      label: 'Impact'       },
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
    <aside className="w-80 shrink-0 overflow-y-auto p-3 flex flex-col bg-[#141415] border-l border-white/8">
      {/* Tab switcher */}
      <div className="flex rounded-md p-0.5 bg-[#19191b] border border-white/8 mb-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === t.id
                ? 'bg-[#27272a] text-[#ededed] shadow-sm'
                : 'text-[#71717a] hover:text-[#ededed]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== KPIs TAB ===== */}
      {activeTab === 'metrics' && (
        <div className="space-y-2">
          {/* Scene provenance banner */}
          <div className="rounded-md p-2.5 text-[11px] bg-[#19191b] border border-white/8">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#ededed]">Measured GEE sweep ({activeSweep.scaleM} m)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#27272a] text-[#a1a1a6]">
                {activeSweep.date}
              </span>
            </div>
            <div className="text-[10px] text-[#71717a] font-mono truncate mt-1" title={activeSweep.sceneId}>
              ID: {activeSweep.sceneId}
            </div>
          </div>

          {/* Valid-Pixel Gate / Change Detection Callout */}
          {(stage === 'change' || stage === 'validgate') && (
            <div className="p-2.5 rounded-md border border-white/10 bg-[#19191b] text-xs">
              <div className="flex items-center justify-between font-medium mb-1.5">
                <div className="flex items-center gap-1.5">
                  {gated ? (
                    <>
                      <ShieldCheck size={14} className="text-[#10b981]" />
                      <span className="text-[#ededed]">Valid-pixel gate (M_valid)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} className="text-amber-400" />
                      <span className="text-[#ededed]">Ungated baseline</span>
                    </>
                  )}
                </div>
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[#27272a] text-[#a1a1a6]">
                  {dateT1} → {dateT2}
                </span>
              </div>
              <p className="text-[11px] text-[#a1a1a6] leading-relaxed mb-2 font-mono">
                {gated
                  ? `M_valid excludes ${unionCloudPct}% cloud union across T1 (${cloudCover.toFixed(2)}%) & T2 (${cloudCoverT2.toFixed(2)}%).`
                  : `Ungated comparison: unmasked clouds on T1 (${cloudCover.toFixed(2)}%) & T2 (${cloudCoverT2.toFixed(2)}%) induce apparent drift.`}
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="p-1.5 rounded bg-[#202023] border border-white/5">
                  <div className="text-[#71717a] text-[10px]">Apparent change</div>
                  <div className={`font-mono font-medium text-sm ${gated ? 'text-[#10b981]' : 'text-amber-400'}`}>
                    {gated ? '7.4%' : '11.2%'}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-[#202023] border border-white/5">
                  <div className="text-[#71717a] text-[10px]">T1 ∪ T2 excluded</div>
                  <div className="font-mono font-medium text-sm text-[#ededed]">
                    {gated ? `${unionCloudPct}% masked` : '+3.8% drift'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <KPICard
            label={`Cloud cover in AOI (T1: ${dateT1})`}
            value={`${cloudCover.toFixed(2)}%`}
            sub={`τ = ${tau.toFixed(2)} · T2 (${dateT2}): ${cloudCoverT2.toFixed(2)}%`}
            focal
          />
          <KPICard
            label="Precision"
            value={metrics.precision.toFixed(4)}
            sub={`CS+ vs ${activeSweep.reference}`}
          />
          <KPICard
            label="Recall"
            value={metrics.recall.toFixed(4)}
            sub="SCL cloud pixels flagged by CS+"
          />
          <KPICard
            label="F1-Score"
            value={metrics.f1.toFixed(4)}
            sub={`Peak F1 = ${bestRow.f1.toFixed(4)} at τ = ${bestRow.tau.toFixed(2)}`}
          />
          <KPICard
            label="Cohen's Kappa (κ)"
            value={metrics.kappa.toFixed(4)}
            sub="Inter-mask agreement (CS+ vs. SCL)"
          />

          {/* Sentinel-2 6-Band Ingestion Reference */}
          <div className="rounded-md p-2.5 bg-[#19191b] border border-white/8 mt-1">
            <div className="text-xs font-medium text-[#ededed] mb-1.5">Sentinel-2 6-band ingestion (10 m)</div>
            {[
              ['B2', 'Blue',   '490 nm',  'Atmospheric aerosol'],
              ['B3', 'Green',  '560 nm',  'Vegetation peak'],
              ['B4', 'Red',    '665 nm',  'Chlorophyll absorption'],
              ['B8', 'NIR',    '842 nm',  'Biomass / water contrast'],
              ['B11','SWIR-1','1610 nm',  'Cloud / snow separation'],
              ['B12','SWIR-2','2190 nm',  'Built-up / soil contrast'],
            ].map(([b, name, wl, desc]) => (
              <div key={b} className="flex justify-between items-center text-[11px] text-[#71717a] py-0.5 border-b border-white/4 last:border-0 font-mono">
                <span className="text-[#a1a1a6] font-medium w-8">{b}</span>
                <span className="text-[#a1a1a6]">{name} ({wl})</span>
                <span className="text-[10px] text-[#71717a]">{desc}</span>
              </div>
            ))}
            <div className="text-[10px] text-[#71717a] mt-1.5 pt-1 border-t border-white/8 font-mono">
              Scaling: ρ = DN ÷ 10,000 (TOA/BOA surface reflectance)
            </div>
          </div>
        </div>
      )}

      {/* ===== SENSITIVITY TAB ===== */}
      {activeTab === 'sensitivity' && (
        <div>
          <div className="text-xs font-medium text-[#ededed] mb-2">
            Threshold sensitivity sweep ({activeSweep.date})
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={sensitivity} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis dataKey="tau" tick={{ fontSize: 9, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 9, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ background: '#141415', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 6, fontSize: 11, color: '#ededed' }}
                labelStyle={{ color: '#10b981', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Line type="monotone" dataKey="cloudPct" name="Cloud %" stroke="#10b981" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="f1"       name="F1"       stroke="#ededed" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="precision" name="Prec."   stroke="#a1a1a6" dot={false} strokeWidth={1} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="recall"   name="Recall"   stroke="#71717a" dot={false} strokeWidth={1} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>

          <div className="rounded-md p-2.5 mt-2 text-xs bg-[#19191b] border border-white/8">
            <div className="font-medium text-[#ededed] mb-1">
              Measured 10 m pixel counts ({activeSweep.date})
            </div>
            <div className="text-[10px] text-[#71717a] font-mono truncate mb-2" title={activeSweep.sceneId}>
              {activeSweep.sceneId}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[#71717a] text-[11px] font-mono tabular-nums">
              <span>CS+ @ τ=0.60:</span>  <span className="text-[#ededed]">{row60.cspCloudPct.toFixed(2)}%</span>
              <span>CS+ @ τ=0.80:</span>  <span className="text-[#ededed]">{row80.cspCloudPct.toFixed(2)}%</span>
              <span>Sen2Cor SCL:</span>    <span className="text-[#ededed]">{row60.sclCloudPct.toFixed(2)}%</span>
              <span>P / R @ τ=0.60:</span><span className="text-[#ededed]">{row60.precision.toFixed(4)} / {row60.recall.toFixed(4)}</span>
              <span>F1 @ τ=0.60:</span>   <span className="text-[#ededed]">{row60.f1.toFixed(4)}</span>
              <span>Peak F1:</span>       <span className="text-[#10b981]">{bestRow.f1.toFixed(4)} @ τ={bestRow.tau.toFixed(2)}</span>
              <span>κ @ τ=0.60:</span>    <span className="text-[#ededed]">{row60.kappa.toFixed(4)}</span>
            </div>
            <div className="text-[10px] text-[#71717a] mt-2 pt-1 border-t border-white/8 font-mono">
              Note: At τ ≥ {activeSweep.date === '2025-05-10' ? '0.85' : '0.90'}, CS+ flags 100% AOI.
            </div>
          </div>
        </div>
      )}

      {/* ===== LULC TAB ===== */}
      {activeTab === 'lulc' && (
        <div>
          <div className="text-xs font-medium mb-2 flex justify-between text-[#ededed]">
            <span>9-Class land cover (%)</span>
            <span className={`font-mono text-[11px] ${gated ? 'text-[#10b981]' : 'text-amber-400'}`}>
              {gated ? 'Cloud-gated' : 'Ungated'}
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
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#71717a' }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#a1a1a6' }} width={50} />
              <Tooltip
                contentStyle={{ background: '#141415', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 6, fontSize: 11, color: '#ededed' }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Bar dataKey="T1" name={`T1 (${dateT1})`} radius={[0, 2, 2, 0]} opacity={0.85}>
                {LULC_CLASSES.map(c => <Cell key={c.id} fill={c.color} />)}
              </Bar>
              <Bar dataKey="T2" name={`T2 (${dateT2})`} radius={[0, 2, 2, 0]} opacity={0.50}>
                {LULC_CLASSES.map(c => <Cell key={c.id} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="text-[10px] text-[#71717a] mt-1 font-mono">
            Dynamic World 9-class · 10 m raster (ungated drift illustrative)
          </div>
        </div>
      )}

      {/* ===== MULTI-FIELD IMPACT TAB ===== */}
      {activeTab === 'impact' && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#ededed] mb-1">
            Civil infrastructure & environmental impact
          </div>
          <p className="text-[11px] text-[#71717a] mb-2 leading-relaxed">
            Deployment use-cases enabled by deterministic cloud gating and atmospheric validation:
          </p>
          {FIELD_IMPACTS.map(fi => (
            <div
              key={fi.field}
              className="rounded-md p-2.5 bg-[#19191b] border border-white/8 transition-colors hover:border-white/15"
            >
              <div className="flex items-center gap-1.5 font-medium text-xs text-[#ededed] mb-1">
                {getFieldIcon(fi.field)}
                <span>{fi.field}</span>
              </div>
              <p className="text-[11px] text-[#a1a1a6] leading-relaxed">{fi.text}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
