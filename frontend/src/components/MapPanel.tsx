import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { PipelineStage, BasemapMode } from '../App'
import { AOI_CENTER, AOI_BOUNDS, LULC_CLASSES, ungatedPct, type MaskMethod } from '../demoData'

// Module-level cached LULC raster image so it only loads once
let cachedLulcImage: HTMLImageElement | null = null

// Fix leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface StageOverlayProps {
  stage: PipelineStage
  tau: number
  gated: boolean
  agreementMode: boolean
  maskMethod: MaskMethod
  cloudCover: number
  liveTileUrl: string | null
}

/** Paints a fast canvas overlay using direct pixel buffers simulating the current stage */
function StageOverlay({ stage, tau, gated, agreementMode, maskMethod, cloudCover }: StageOverlayProps) {
  const map = useMap()
  const canvasRef = useRef<L.ImageOverlay | null>(null)
  const [lulcImageLoaded, setLulcImageLoaded] = useState<boolean>(!!cachedLulcImage)

  // Preload real pixel-aligned LULC raster (/shahdara_lulc.png)
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
    const width = 512
    const height = 512
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, width, height)

    // Cloud cluster centers over the Shahdara AOI
    // Multi-lobed organic cloud formations (Anand Vihar edge, NW corridor, Surajmal Vihar)
    const cloudClusters = [
      {
        cx: 370, cy: 260, // Main East-Central plume (Anand Vihar / Karkardooma)
        lobes: [
          { dx: 0, dy: 0, rMult: 1.0 },
          { dx: 35, dy: -20, rMult: 0.8 },
          { dx: -30, dy: 25, rMult: 0.75 },
          { dx: 45, dy: 30, rMult: 0.65 },
          { dx: -45, dy: -15, rMult: 0.6 },
          { dx: 15, dy: 50, rMult: 0.5 },
        ],
      },
      {
        cx: 170, cy: 150, // North-West cluster (towards Yamuna corridor)
        lobes: [
          { dx: 0, dy: 0, rMult: 0.85 },
          { dx: 25, dy: 18, rMult: 0.7 },
          { dx: -20, dy: -15, rMult: 0.65 },
          { dx: -35, dy: 20, rMult: 0.5 },
        ],
      },
      {
        cx: 260, cy: 390, // South cluster
        lobes: [
          { dx: 0, dy: 0, rMult: 0.75 },
          { dx: 22, dy: -16, rMult: 0.6 },
          { dx: -24, dy: 18, rMult: 0.55 },
        ],
      },
    ]

    // Base radius dynamically scales from tight dense cores (0.5% at tau=0.60)
    // to wide, prominent plumes (6.5% at tau=0.80) up to 8.5%
    // Zero stride or diagonal wave math - 100% smooth canvas radial gradients
    const baseRadius = 14 + (Math.max(0.1, cloudCover) - 0.5) * 8.2

    const drawMultiLobedClouds = (
      drawLobe: (x: number, y: number, r: number) => void,
      radiusMultiplier: number = 1.0,
      offsetX: number = 0,
      offsetY: number = 0
    ) => {
      for (const cluster of cloudClusters) {
        for (const lobe of cluster.lobes) {
          const x = cluster.cx + lobe.dx + offsetX
          const y = cluster.cy + lobe.dy + offsetY
          const r = Math.max(8, baseRadius * lobe.rMult * radiusMultiplier)
          drawLobe(x, y, r)
        }
      }
    }

    if (stage === 'rgb') {
      // Stage 1: Clean Sentinel-2 true-color view with subtle cyan corner reticles
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.75)'
      ctx.lineWidth = 2
      // Top-left reticle
      ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(36, 12); ctx.moveTo(12, 12); ctx.lineTo(12, 36); ctx.stroke()
      // Top-right reticle
      ctx.beginPath(); ctx.moveTo(width - 12, 12); ctx.lineTo(width - 36, 12); ctx.moveTo(width - 12, 12); ctx.lineTo(width - 12, 36); ctx.stroke()
      // Bottom-left reticle
      ctx.beginPath(); ctx.moveTo(12, height - 12); ctx.lineTo(36, height - 12); ctx.moveTo(12, height - 12); ctx.lineTo(12, height - 36); ctx.stroke()
      // Bottom-right reticle
      ctx.beginPath(); ctx.moveTo(width - 12, height - 12); ctx.lineTo(width - 36, height - 12); ctx.moveTo(width - 12, height - 12); ctx.lineTo(width - 12, height - 36); ctx.stroke()

    } else if (stage === 'cloudmask') {
      if (agreementMode) {
        // Multi-mask agreement overlay:
        // 1. Reference mask only (Blue #3b82f6) - slight offset
        drawMultiLobedClouds((x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.1)
          grad.addColorStop(0, 'rgba(59, 130, 246, 0.65)')
          grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.45)')
          grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r * 1.1, 0, Math.PI * 2)
          ctx.fill()
        }, 1.1, -12, 8)

        // 2. Cloud Score+ only (Bright Pink/Magenta #ec4899)
        drawMultiLobedClouds((x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(236, 72, 153, 0.70)')
          grad.addColorStop(0.65, 'rgba(236, 72, 153, 0.50)')
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }, 1.0, 0, 0)

        // 3. Both agree (Green #22c55e core)
        drawMultiLobedClouds((x, y, r) => {
          const coreR = r * 0.65
          const grad = ctx.createRadialGradient(x, y, 0, x, y, coreR)
          grad.addColorStop(0, 'rgba(34, 197, 94, 0.85)')
          grad.addColorStop(0.75, 'rgba(34, 197, 94, 0.60)')
          grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, coreR, 0, Math.PI * 2)
          ctx.fill()
        }, 0.7, -4, 3)

      } else {
        // Standard Cloud Score+ mask in prominent bright pink/magenta (rgba(236, 72, 153, 0.50))
        // Smooth organic multi-lobed cloud patches clearly visible over satellite basemap
        drawMultiLobedClouds((x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(236, 72, 153, 0.75)')
          grad.addColorStop(0.55, 'rgba(236, 72, 153, 0.50)')
          grad.addColorStop(0.85, 'rgba(236, 72, 153, 0.25)')
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        })
      }

    } else if (stage === 'validgate') {
      // M_valid = NOT(M_T1 ∪ M_T2). Obscured cloud pixels are masked in dark slate (rgba(15, 23, 42, 0.80))
      // Clear valid pixels remain 100% transparent so high-res satellite view shines through
      drawMultiLobedClouds((x, y, r) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)')
        grad.addColorStop(0.75, 'rgba(15, 23, 42, 0.75)')
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })

    } else if (stage === 'lulc') {
      // Stage 4a: Dynamic World LULC Map
      // Render real pixel-aligned satellite classification raster (/shahdara_lulc.png)
      if (cachedLulcImage && cachedLulcImage.complete) {
        ctx.globalAlpha = 0.82
        ctx.drawImage(cachedLulcImage, 0, 0, width, height)
        ctx.globalAlpha = 1.0
      } else {
        // Fallback: Built Area fill while image is finishing load
        ctx.fillStyle = 'rgba(196, 40, 27, 0.70)'
        ctx.fillRect(0, 0, width, height)
      }

      // When Cloud-Gated (M_valid) is active, punch clean transparent cutouts where clouds are detected
      // Demonstrates live valid-pixel gating: cloud-obscured pixels are excluded from the LULC map!
      if (gated) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        drawMultiLobedClouds((x, y, r) => {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)') // punch out completely
          grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.95)')
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

    } else if (stage === 'change') {
      // Genuine bitemporal infrastructure change (Amber #fbbf24)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.75)'
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)'
      ctx.lineWidth = 1.5

      // Anand Vihar railway redevelopment corridor
      ctx.beginPath(); ctx.ellipse(330, 340, 36, 24, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      // East Delhi construction parcel near Karkardooma flyover
      ctx.beginPath(); ctx.ellipse(170, 220, 26, 18, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // If UNGATED: unmasked cloud shadows produce fake change alarms!
      if (!gated) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.65)'
        drawMultiLobedClouds((x, y, r) => {
          const fakeR = r * 0.7
          ctx.beginPath()
          ctx.arc(x, y, fakeR, 0, Math.PI * 2)
          ctx.fill()
        }, 0.7, 8, 8)
      }
    }

    const dataUrl = canvas.toDataURL()
    const overlay = L.imageOverlay(dataUrl, AOI_BOUNDS, { opacity: 0.75 })
    overlay.addTo(map)
    canvasRef.current = overlay

    return () => {
      if (canvasRef.current) {
        map.removeLayer(canvasRef.current)
        canvasRef.current = null
      }
    }
  }, [stage, tau, gated, agreementMode, maskMethod, cloudCover, map, lulcImageLoaded])

  return null
}

/** Legend panel inside the map */
function MapLegend({ stage, gated }: { stage: PipelineStage; gated: boolean }) {
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
        <div className="font-semibold mb-1 text-white">Change Detection (T1 → T2)</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#fbbf24' }} /> Changed Area ({gated ? '7.4' : '11.2'}%)</div>
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} /> Canopy / Water Loss</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} /> Vegetation Gain</div>
        <div className="mt-2 pt-1 border-t border-slate-700 text-[10px] text-teal-300">
          {gated ? '✅ Cloud Alarms Filtered: 0%' : '⚠️ False Alarms Present: +3.8%'}
        </div>
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
        <div className="flex items-center gap-1.5 mb-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#ec4899', border: '1px solid #f472b6' }} /> Cloud Score+ Flagged (Magenta)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'transparent', border: '1px dashed #2dd4bf' }} /> Clear Ground (10 m)</div>
      </div>
    )
  }
  return null
}

export interface MapPanelProps {
  stage: PipelineStage
  tau: number
  maskMethod: MaskMethod
  agreementMode: boolean
  gated: boolean
  cloudCover: number
  basemap: BasemapMode
  showLabels: boolean
  liveTileUrl: string | null
  onToggleBasemap: (bm: BasemapMode) => void
  onToggleLabels: (lbl: boolean) => void
}

export function MapPanel({
  stage,
  tau,
  maskMethod,
  agreementMode,
  gated,
  cloudCover,
  basemap,
  showLabels,
  liveTileUrl,
  onToggleBasemap,
  onToggleLabels,
}: MapPanelProps) {
  const stageLabel: Record<PipelineStage, string> = {
    rgb: '🛰️ True-Colour Sentinel-2 L2A (B4-B3-B2, 10m Alignment)',
    cloudmask: `☁️ Cloud Mask — ${maskMethod.toUpperCase()} (τ=${tau.toFixed(2)})`,
    validgate: '✅ Valid-Pixel Gate M_valid = NOT(M_T1 ∪ M_T2)',
    lulc: `🗺️ Dynamic World 9-Class LULC (${gated ? 'Cloud-Gated' : '⚠️ Ungated'})`,
    change: `🔄 Bitemporal Change Detection (${gated ? 'Cloud-Gated' : '⚠️ Ungated'})`,
  }

  return (
    <div className="relative w-full h-full">
      {/* Top stage pill */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur border"
        style={{ background: 'rgba(13,27,42,0.92)', borderColor: 'var(--border)', color: '#e2e8f0' }}
      >
        {stageLabel[stage]}
      </div>

      {/* Basemap & Layer Switcher (Top Right on Map) */}
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
        {/* Real Satellite Basemap (Default: Esri World Imagery) */}
        {basemap === 'satellite' ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            opacity={0.8}
          />
        )}

        {/* Optional Roads & Place Labels Reference Overlay */}
        {showLabels && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
            opacity={0.85}
          />
        )}

        {/* Real GEE Tile Layer if available in Live Mode */}
        {liveTileUrl && (
          <TileLayer url={liveTileUrl} opacity={0.7} />
        )}

        {/* AOI Bounding Box: 5 km × 5 km centred at USAR, GGSIPU */}
        <Rectangle
          bounds={AOI_BOUNDS}
          pathOptions={{
            color: '#2dd4bf',
            weight: 2.5,
            fillOpacity: 0,
            dashArray: '6 4',
          }}
        />

        {/* Dynamic stage overlay */}
        <StageOverlay
          stage={stage}
          tau={tau}
          gated={gated}
          agreementMode={agreementMode}
          maskMethod={maskMethod}
          cloudCover={cloudCover}
          liveTileUrl={liveTileUrl}
        />
      </MapContainer>

      {/* Legend */}
      <MapLegend stage={stage} gated={gated} />

      {/* AOI Info Badge */}
      <div
        className="absolute bottom-4 left-3 z-[1000] px-2.5 py-1.5 rounded-lg text-xs backdrop-blur border shadow-md"
        style={{ background: 'rgba(13,27,42,0.92)', borderColor: 'var(--border)', color: '#94a3b8' }}
      >
        <span className="font-semibold text-white">AOI:</span> 5 km × 5 km (2500 ha) · USAR (28.65°N, 77.30°E)
      </div>
    </div>
  )
}
