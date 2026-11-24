import { Satellite, Globe } from 'lucide-react'

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
    <header className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#141415] border-b border-white/8 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-[#19191b] border border-white/10 flex items-center justify-center text-[#a1a1a6]">
          <Satellite size={15} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-[#ededed]">
              Sentinel-2 Multi-Spectral Analysis
            </span>
            <span className="font-mono text-[10px] text-[#71717a] border-l border-white/10 pl-2">
              Shahdara AOI · 5 km × 5 km (28.65°N, 77.30°E)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#71717a]">
          <Globe size={13} className="text-[#a1a1a6]" />
          <span>Esri World Imagery + Sentinel-2 L2A + Cloud Score+ v1</span>
        </div>

        {/* Demo / Live toggle button */}
        <button
          onClick={() => onToggleDemo(!demoMode)}
          title={geeStatus.message}
          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border border-white/10 bg-[#19191b] hover:bg-[#232325] text-[#ededed] transition-colors cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              demoMode ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span>{demoMode ? 'Demo Mode (Offline)' : 'Live GEE Streaming'}</span>
        </button>
      </div>
    </header>
  )
}
