import { Satellite, FlaskConical, Globe } from 'lucide-react'

interface Props {
  demoMode: boolean
  onToggleDemo: (v: boolean) => void
  geeStatus: {
    available: boolean
    project: string
    message: string
  }
}

export function TopBar({ demoMode, onToggleDemo, geeStatus }: Props) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2 shrink-0 border-b"
      style={{ background: 'var(--slate)', borderColor: 'var(--border)', zIndex: 100 }}
    >
      <div className="flex items-center gap-2">
        <Satellite size={20} style={{ color: 'var(--teal)' }} />
        <div>
          <span className="font-bold text-sm text-white tracking-wide">
            AI Satellite Image Processing
          </span>
          <span className="ml-2 text-xs" style={{ color: '#94a3b8' }}>
            Shahdara, East Delhi · 5 km × 5 km AOI · USAR, GGSIPU (28.65°N, 77.30°E)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
          <Globe size={13} className="text-teal-400" />
          <span>Esri World Imagery + Sentinel-2 L2A + Cloud Score+</span>
        </div>

        {/* Demo / Live toggle */}
        <button
          onClick={() => onToggleDemo(!demoMode)}
          title={geeStatus.message}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            demoMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
              : 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
          }`}
        >
          <FlaskConical size={12} />
          {demoMode ? 'Demo Mode (Offline)' : 'Live GEE Mode'}
        </button>
      </div>
    </header>
  )
}
