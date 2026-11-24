import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { PipelineStage, BasemapMode } from '../App'
import { AOI_CENTER, AOI_BOUNDS, LULC_CLASSES, ungatedPct, type MaskMethod } from '../demoData'

let cachedLulcImage: HTMLImageElement | null = null

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface CloudCluster {
  cx: number
  cy: number
  lobes: Array<{ dx: number; dy: number; rMult: number }>
}

function hashDateSeed(dateStr: string): number {
  let h = 2166136261
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function getSceneCloudClusters(dateStr: string): CloudCluster[] {
  if (dateStr === '2025-05-10') {
    return [
      {
        cx: 375, cy: 255,
        lobes: [
          { dx: 0, dy: 0, rMult: 1.05 },
          { dx: 36, dy: -22, rMult: 0.85 },
          { dx: -32, dy: 26, rMult: 0.8 },
          { dx: 45, dy: 30, rMult: 0.7 },
          { dx: -45, dy: -15, rMult: 0.65 },
        ],
      },
      {
        cx: 165, cy: 145,
        lobes: [
          { dx: 0, dy: 0, rMult: 0.9 },
          { dx: 26, dy: 18, rMult: 0.75 },
          { dx: -22, dy: -16, rMult: 0.7 },
        ],
      },
      {
        cx: 255, cy: 395,
        lobes: [
          { dx: 0, dy: 0, rMult: 0.8 },
          { dx: 24, dy: -16, rMult: 0.65 },
        ],
      },
    ]
  }

  if (dateStr === '2025-01-23') {
    return [
      {
        cx: 130, cy: 220,
        lobes: [
          { dx: 0, dy: 0, rMult: 1.1 },
          { dx: 30, dy: 45, rMult: 0.95 },
          { dx: -25, dy: 50, rMult: 0.9 },
          { dx: 35, dy: -38, rMult: 0.85 },
        ],
      },
      {
        cx: 320, cy: 130,
        lobes: [
          { dx: 0, dy: 0, rMult: 0.95 },
          { dx: 44, dy: 18, rMult: 0.8 },
          { dx: -38, dy: 22, rMult: 0.75 },
        ],
      },
      {
        cx: 395, cy: 385,
        lobes: [
          { dx: 0, dy: 0, rMult: 0.75 },
          { dx: -28, dy: 20, rMult: 0.6 },
        ],
      },
    ]
  }

  const s = hashDateSeed(dateStr || '2025-05-10')
  const s2 = hashDateSeed(`${dateStr}-b`)
  const cx1 = 120 + Math.round(s * 270)
  const cy1 = 120 + Math.round(s2 * 270)
  const cx2 = 110 + Math.round(((s + 0.43) % 1) * 280)
  const cy2 = 110 + Math.round(((s2 + 0.61) % 1) * 280)
  return [
    {
      cx: cx1,
      cy: cy1,
      lobes: [
        { dx: 0, dy: 0, rMult: 1.0 },
        { dx: 32, dy: -18, rMult: 0.8 },
        { dx: -28, dy: 22, rMult: 0.72 },
      ],
    },
    {
      cx: cx2,
      cy: cy2,
      lobes: [
        { dx: 0, dy: 0, rMult: 0.85 },
        { dx: -25, dy: -16, rMult: 0.65 },
      ],
    },
  ]
}

interface StageOverlayProps {
  stage: PipelineStage
  dateT1: string
  dateT2: string
  tau: number
  gated: boolean
  agreementMode: boolean
  maskMethod: MaskMethod
  cloudCover: number
  cloudCoverT2: number
  liveTileUrl: string | null
}

function StageOverlay({
  stage,
  dateT1,
  dateT2,
  tau,
  gated,
  agreementMode,
  maskMethod,
  cloudCover,
  cloudCoverT2,
  liveTileUrl,
}: StageOverlayProps) {
  const map = useMap()
  const canvasRef = useRef<L.ImageOverlay | null>(null)
  const [lulcImageLoaded, setLulcImageLoaded] = useState<boolean>(!!cachedLulcImage)

  useEffect(() => {
    if (!cachedLulcImage) {
      const img = new Image()
      img.src = '/shahdara_lulc.png'
      img.onload = () => {
        cachedLulcImage = img
        setLulcImageLoaded(true)
      }
      img.onerror = (err) => console.error('Failed to load shahdara_lulc.png:', err)
    }
  }, [])

  useEffect(() => {
    if (liveTileUrl) {
      if (canvasRef.current) {
        map.removeLayer(canvasRef.current)
        canvasRef.current = null
      }
      return
    }

    const width = 512
    const height = 512
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, width, height)

    const clustersT1 = getSceneCloudClusters(dateT1)
    const clustersT2 = getSceneCloudClusters(dateT2)
    const isFullSatT1 = cloudCover >= 99.0
    const isFullSatT2 = cloudCoverT2 >= 99.0

    const baseRadiusT1 = isFullSatT1 ? 260 : 18 + Math.sqrt(Math.max(0.05, cloudCover)) * 22
    const baseRadiusT2 = isFullSatT2 ? 260 : 18 + Math.sqrt(Math.max(0.05, cloudCoverT2)) * 22

    const drawClusters = (
      clusters: CloudCluster[],
      baseR: number,
      coverPct: number,
      drawLobe: (x: number, y: number, r: number) => void,
      radiusMultiplier: number = 1.0,
      offsetX: number = 0,
      offsetY: number = 0
    ) => {
      if (coverPct <= 0.0) return
      for (const cluster of clusters) {
        for (const lobe of cluster.lobes) {
          const x = cluster.cx + lobe.dx + offsetX
          const y = cluster.cy + lobe.dy + offsetY
          const r = Math.max(10, baseR * lobe.rMult * radiusMultiplier)
          drawLobe(x, y, r)
        }
      }
    }

    if (stage === 'rgb') {
      if (dateT1 === '2025-01-23') {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.28)'
        ctx.fillRect(0, 0, width, height)
      } else if (dateT1 === '2025-05-10') {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.10)'
        ctx.fillRect(0, 0, width, height)
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.9)
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r * 0.9, 0, Math.PI * 2)
          ctx.fill()
        }, 0.9)
      } else {
        const hue = Math.round(hashDateSeed(dateT1) * 360)
        ctx.fillStyle = `hsla(${hue}, 40%, 60%, 0.16)`
        ctx.fillRect(0, 0, width, height)
      }

      ctx.strokeStyle = 'rgba(45, 212, 191, 0.9)'
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(36, 12); ctx.moveTo(12, 12); ctx.lineTo(12, 36); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(width - 12, 12); ctx.lineTo(width - 36, 12); ctx.moveTo(width - 12, 12); ctx.lineTo(width - 12, 36); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(12, height - 12); ctx.lineTo(36, height - 12); ctx.moveTo(12, height - 12); ctx.lineTo(12, height - 36); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(width - 12, height - 12); ctx.lineTo(width - 36, height - 12); ctx.moveTo(width - 12, height - 12); ctx.lineTo(width - 12, height - 36); ctx.stroke()

    } else if (stage === 'cloudmask') {
      if (isFullSatT1) {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.58)'
        ctx.fillRect(0, 0, width, height)
      } else if (agreementMode) {
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.1)
          grad.addColorStop(0, 'rgba(59, 130, 246, 0.70)')
          grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.45)')
          grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r * 1.1, 0, Math.PI * 2)
          ctx.fill()
        }, 1.1, -12, 8)

        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(236, 72, 153, 0.75)')
          grad.addColorStop(0.65, 'rgba(236, 72, 153, 0.52)')
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }, 1.0, 0, 0)

        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const coreR = r * 0.65
          const grad = ctx.createRadialGradient(x, y, 0, x, y, coreR)
          grad.addColorStop(0, 'rgba(34, 197, 94, 0.88)')
          grad.addColorStop(0.75, 'rgba(34, 197, 94, 0.62)')
          grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, coreR, 0, Math.PI * 2)
          ctx.fill()
        }, 0.7, -4, 3)

      } else {
        // Primary T1 cloud mask (Magenta)
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(236, 72, 153, 0.82)')
          grad.addColorStop(0.55, 'rgba(236, 72, 153, 0.56)')
          grad.addColorStop(0.85, 'rgba(236, 72, 153, 0.28)')
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        })

        // Secondary T2 comparison footprint (dashed cyan ring so changing T2 is visibly reflected on the map)
        if (dateT2 !== dateT1 && !isFullSatT2) {
          ctx.save()
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 4])
          drawClusters(clustersT2, baseRadiusT2, cloudCoverT2, (x, y, r) => {
            ctx.beginPath()
            ctx.arc(x, y, r * 0.85, 0, Math.PI * 2)
            ctx.stroke()
          }, 0.85)
          ctx.restore()
        }
      }

    } else if (stage === 'validgate') {
      if (isFullSatT1 || isFullSatT2) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fillRect(0, 0, width, height)
      } else {
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)')
          grad.addColorStop(0.75, 'rgba(15, 23, 42, 0.75)')
          grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        })
        if (dateT2 !== dateT1) {
          drawClusters(clustersT2, baseRadiusT2, cloudCoverT2, (x, y, r) => {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
            grad.addColorStop(0, 'rgba(30, 27, 75, 0.90)')
            grad.addColorStop(0.75, 'rgba(30, 27, 75, 0.72)')
            grad.addColorStop(1, 'rgba(30, 27, 75, 0.0)')
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fill()
          })
        }
      }

    } else if (stage === 'lulc') {
      if (cachedLulcImage && cachedLulcImage.complete) {
        ctx.globalAlpha = 0.82
        ctx.drawImage(cachedLulcImage, 0, 0, width, height)
        ctx.globalAlpha = 1.0
      } else {
        ctx.fillStyle = 'rgba(196, 40, 27, 0.70)'
        ctx.fillRect(0, 0, width, height)
      }

      if (gated) {
        if (isFullSatT1) {
          ctx.clearRect(0, 0, width, height)
        } else {
          ctx.save()
          ctx.globalCompositeOperation = 'destination-out'
          drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
            grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)')
            grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.95)')
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fill()
          })
          ctx.restore()
        }
      }

    } else if (stage === 'change') {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.75)'
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)'
      ctx.lineWidth = 1.5

      ctx.beginPath(); ctx.ellipse(330, 340, 36, 24, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(170, 220, 26, 18, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      if (gated) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        })
        if (dateT2 !== dateT1) {
          drawClusters(clustersT2, baseRadiusT2, cloudCoverT2, (x, y, r) => {
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
          })
        }
        ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.65)'
        drawClusters(clustersT1, baseRadiusT1, cloudCover, (x, y, r) => {
          ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.fill()
        }, 0.75, 6, 6)
        if (dateT2 !== dateT1) {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.60)'
          drawClusters(clustersT2, baseRadiusT2, cloudCoverT2, (x, y, r) => {
            ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.fill()
          }, 0.75, -6, -6)
        }
      }
    }

    const dataUrl = canvas.toDataURL()
    const overlay = L.imageOverlay(dataUrl, AOI_BOUNDS, { opacity: 0.78 })
    overlay.addTo(map)
    canvasRef.current = overlay

    return () => {
      if (canvasRef.current) {
        map.removeLayer(canvasRef.current)
        canvasRef.current = null
      }
    }
  }, [stage, dateT1, dateT2, tau, gated, agreementMode, maskMethod, cloudCover, cloudCoverT2, map, lulcImageLoaded, liveTileUrl])

  return null
}

function MapLegend({ stage, gated, dateT1, dateT2 }: { stage: PipelineStage; gated: boolean; dateT1: string; dateT2: string }) {
  if (stage === 'lulc') {
    return (
      <div
        className="absolute bottom-4 right-4 z-[1000] rounded-lg p-2.5 text-xs shadow-lg backdrop-blur"
        style={{ background: 'rgba(13,27,42,0.92)', border: '1px solid var(--border)' }}
      >
        <div className="font-semibold mb-1 text-white">LULC Classes {gated ? '(Cloud-Gated)' : '(⚠️ Ungated)'}</div>
        {LULC_CLASSES.map(c => (
          <div key={c.id} className="flex items-center gap-1.5 mb-0.5">
            <span className="w-3 h-3 rounded-sm inline-block shadow-sm" style={{ background: c.color }} />
            <span className="text-slate-300">{c.name}</span>
            <span className="ml-auto text-slate-400 font-mono text-[11px]">
              {(gated ? c.t1 : ungatedPct(c, 't1')).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (stage === 'change') {
    return (
      <div
        className="absolute bottom-4 right-4 z-[1000] rounded-lg p-2.5 text-xs shadow-lg backdrop-blur"
        style={{ background: 'rgba(13,27,42,0.92)', border: '1px solid var(--border)' }}
      >
        <div className="font-semibold mb-1 text-white">Change ({dateT1} → {dateT2})</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#fbbf24' }} /> Changed Area ({gated ? '7.4' : '11.2'}% · Illustr.)</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} /> T1 Cloud Drift / Loss</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#f97316' }} /> T2 Cloud Drift / Gain</div>
        <div className="mt-2 pt-1 border-t border-slate-700 text-[10px] text-teal-300">
          {gated ? '✅ M_valid = NOT(M_T1 ∪ M_T2) Active' : '⚠️ Ungated T1/T2 Cloud Artifacts'}
        </div>
      </div>
    )
  }
  if (stage === 'validgate') {
    return (
      <div
        className="absolute bottom-4 right-4 z-[1000] rounded-lg p-2.5 text-xs shadow-lg backdrop-blur"
        style={{ background: 'rgba(13,27,42,0.92)', border: '1px solid var(--border)' }}
      >
        <div className="font-semibold mb-1 text-white">Valid-Pixel Gate Union</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#0f172a', border: '1px solid #475569' }} /> Masked on T1 ({dateT1})</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#1e1b4b', border: '1px solid #6366f1' }} /> Masked on T2 ({dateT2})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'transparent', border: '1px dashed #2dd4bf' }} /> Valid Intersection M_valid</div>
      </div>
    )
  }
  if (stage === 'cloudmask') {
    return (
      <div
        className="absolute bottom-4 right-4 z-[1000] rounded-lg p-2.5 text-xs shadow-lg backdrop-blur"
        style={{ background: 'rgba(13,27,42,0.92)', border: '1px solid var(--border)' }}
      >
        <div className="font-semibold mb-1 text-white">Cloud Mask Overlay</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#ec4899', border: '1px solid #f472b6' }} /> T1 Mask ({dateT1})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'transparent', border: '1px dashed #38bdf8' }} /> T2 Footprint ({dateT2})</div>
      </div>
    )
  }
  return null
}

export interface MapPanelProps {
  stage: PipelineStage
  dateT1: string
  dateT2: string
  tau: number
  maskMethod: MaskMethod
  agreementMode: boolean
  gated: boolean
  cloudCover: number
  cloudCoverT2: number
  basemap: BasemapMode
  showLabels: boolean
  liveTileUrl: string | null
  demoMode: boolean
  onToggleBasemap: (bm: BasemapMode) => void
  onToggleLabels: (lbl: boolean) => void
}

export function MapPanel({
  stage,
  dateT1,
  dateT2,
  tau,
  maskMethod,
  agreementMode,
  gated,
  cloudCover,
  cloudCoverT2,
  basemap,
  showLabels,
  liveTileUrl,
  demoMode,
  onToggleBasemap,
  onToggleLabels,
}: MapPanelProps) {
  const modeTag = !demoMode && liveTileUrl ? 'LIVE GEE' : 'DEMO'
  const stageLabel: Record<PipelineStage, string> = {
    rgb: `🛰️ [${modeTag}] True-Colour Sentinel-2 L2A (${dateT1} · 10m Alignment)`,
    cloudmask: `☁️ [${modeTag}] Cloud Mask — ${maskMethod.toUpperCase()} (${dateT1} · τ=${tau.toFixed(2)})`,
    validgate: `✅ [${modeTag}] Valid-Pixel Gate M_valid = NOT(${dateT1} ∪ ${dateT2})`,
    lulc: `🗺️ [${modeTag}] Dynamic World 9-Class LULC (${gated ? 'Cloud-Gated' : '⚠️ Ungated'})`,
    change: `🔄 [${modeTag}] Bitemporal Change (${dateT1} → ${dateT2} · ${gated ? 'Gated' : 'Ungated'})`,
  }

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur border"
        style={{ background: 'rgba(13,27,42,0.92)', borderColor: 'var(--border)', color: '#e2e8f0' }}
      >
        {stageLabel[stage]}
      </div>

      <div
        className="absolute top-3 right-3 z-[1000] flex items-center gap-1 p-1 rounded-lg shadow-md backdrop-blur border text-xs"
        style={{ background: 'rgba(13,27,42,0.92)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => onToggleBasemap('satellite')}
          className={`px-2.5 py-1 rounded transition-all font-medium ${basemap === 'satellite'
            ? 'bg-teal-700 text-white shadow'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          🛰️ Esri Satellite
        </button>
        <button
          onClick={() => onToggleBasemap('street')}
          className={`px-2.5 py-1 rounded transition-all font-medium ${basemap === 'street'
            ? 'bg-teal-700 text-white shadow'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          🗺️ OSM Streets
        </button>
        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={() => onToggleLabels(!showLabels)}
          className={`px-2 py-1 rounded transition-all font-medium ${showLabels
            ? 'text-teal-300 bg-slate-800'
            : 'text-slate-500 hover:text-slate-300'
            }`}
          title="Toggle Roads & Place Labels"
        >
          🏷️ Labels
        </button>
      </div>

      <MapContainer
        center={AOI_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {basemap === 'satellite' ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            opacity={0.8}
          />
        )}

        {showLabels && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
            opacity={0.85}
          />
        )}

        {liveTileUrl && (
          <TileLayer key={liveTileUrl} url={liveTileUrl} opacity={0.85} zIndex={450} />
        )}

        <Rectangle
          bounds={AOI_BOUNDS}
          pathOptions={{
            color: '#2dd4bf',
            weight: 2.5,
            fillOpacity: 0,
            dashArray: '6 4',
          }}
        />

        <StageOverlay
          stage={stage}
          dateT1={dateT1}
          dateT2={dateT2}
          tau={tau}
          gated={gated}
          agreementMode={agreementMode}
          maskMethod={maskMethod}
          cloudCover={cloudCover}
          cloudCoverT2={cloudCoverT2}
          liveTileUrl={liveTileUrl}
        />
      </MapContainer>

      <MapLegend stage={stage} gated={gated} dateT1={dateT1} dateT2={dateT2} />

      <div
        className="absolute bottom-4 left-3 z-[1000] px-2.5 py-1.5 rounded-lg text-xs backdrop-blur border shadow-md"
        style={{ background: 'rgba(13,27,42,0.92)', borderColor: 'var(--border)', color: '#94a3b8' }}
      >
        <span className="font-semibold text-white">AOI:</span> 5 km × 5 km · <span className="text-teal-300 font-mono">T1:{dateT1}</span> · <span className="text-indigo-300 font-mono">T2:{dateT2}</span> · <span className="font-semibold text-amber-300">{modeTag}</span>
      </div>
    </div>
  )
}
