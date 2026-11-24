// Measured GEE threshold sweep data (10 m Sentinel-2 SR Harmonized + Cloud Score+ V1 vs. Sen2Cor SCL)
// Study area: Shahdara 5×5 km (28.65°N, 77.30°E), MGRS Tile T43RGM
// Primary cloud evaluation scene: 2025-05-10 (5.84% SCL cloud)
// Winter haze comparison scene: 2025-01-23 (2.02% SCL cloud)

export const AOI_CENTER: [number, number] = [28.65, 77.30]
export const AOI_HALF_DEG = 0.0225 // ~2.5 km

export const AOI_BOUNDS: [[number, number], [number, number]] = [
  [AOI_CENTER[0] - AOI_HALF_DEG, AOI_CENTER[1] - AOI_HALF_DEG],
  [AOI_CENTER[0] + AOI_HALF_DEG, AOI_CENTER[1] + AOI_HALF_DEG],
]

export interface SweepRow {
  tau: number
  tp: number
  fp: number
  fn: number
  tn: number
  precision: number
  recall: number
  f1: number
  kappa: number
  cspCloudPct: number
  sclCloudPct: number
}

export interface MeasuredSceneSweep {
  date: string
  sceneId: string
  label: string
  reference: string
  scaleM: number
  rows: SweepRow[]
}

export const MEASURED_SWEEP_2025_05_10: MeasuredSceneSweep = {
  date: '2025-05-10',
  sceneId: '20250510T053241_20250510T053240_T43RGM',
  label: '10-May-2025 (Convective Cloud · 5.84% SCL)',
  reference: 'Sen2Cor SCL classes 1,3,8,9,10',
  scaleM: 10,
  rows: [
  { tau: 0.10, tp: 156, fp: 0, fn: 12657, tn: 206698, precision: 1.0, recall: 0.0122, f1: 0.0241, kappa: 0.0227, cspCloudPct: 0.07, sclCloudPct: 5.84 },
  { tau: 0.20, tp: 362, fp: 0, fn: 12451, tn: 206698, precision: 1.0, recall: 0.0283, f1: 0.055, kappa: 0.0519, cspCloudPct: 0.16, sclCloudPct: 5.84 },
  { tau: 0.30, tp: 513, fp: 0, fn: 12299, tn: 206698, precision: 1.0, recall: 0.04, f1: 0.077, kappa: 0.0728, cspCloudPct: 0.23, sclCloudPct: 5.84 },
  { tau: 0.40, tp: 641, fp: 14, fn: 12171, tn: 206684, precision: 0.9786, recall: 0.05, f1: 0.0952, kappa: 0.09, cspCloudPct: 0.3, sclCloudPct: 5.84 },
  { tau: 0.50, tp: 852, fp: 60, fn: 11961, tn: 206638, precision: 0.9342, recall: 0.0665, f1: 0.1242, kappa: 0.1173, cspCloudPct: 0.42, sclCloudPct: 5.84 },
  { tau: 0.55, tp: 998, fp: 107, fn: 11815, tn: 206591, precision: 0.9032, recall: 0.0779, f1: 0.1434, kappa: 0.1354, cspCloudPct: 0.5, sclCloudPct: 5.84 },
  { tau: 0.60, tp: 1206, fp: 162, fn: 11607, tn: 206536, precision: 0.8816, recall: 0.0941, f1: 0.1701, kappa: 0.1606, cspCloudPct: 0.62, sclCloudPct: 5.84 },
  { tau: 0.65, tp: 2079, fp: 323, fn: 10733, tn: 206374, precision: 0.8655, recall: 0.1623, f1: 0.2733, kappa: 0.2597, cspCloudPct: 1.09, sclCloudPct: 5.84 },
  { tau: 0.70, tp: 3862, fp: 596, fn: 8951, tn: 206102, precision: 0.8663, recall: 0.3014, f1: 0.4472, kappa: 0.43, cspCloudPct: 2.03, sclCloudPct: 5.84 },
  { tau: 0.75, tp: 5936, fp: 1419, fn: 6877, tn: 205278, precision: 0.8071, recall: 0.4633, f1: 0.5887, kappa: 0.5704, cspCloudPct: 3.35, sclCloudPct: 5.84 },
  { tau: 0.80, tp: 10895, fp: 11249, fn: 1918, tn: 195449, precision: 0.492, recall: 0.8503, f1: 0.6233, kappa: 0.5933, cspCloudPct: 10.09, sclCloudPct: 5.84 },
  { tau: 0.85, tp: 12813, fp: 206698, fn: 0, tn: 0, precision: 0.0584, recall: 1.0, f1: 0.1103, kappa: 0.0, cspCloudPct: 100.0, sclCloudPct: 5.84 },
  { tau: 0.90, tp: 12813, fp: 206698, fn: 0, tn: 0, precision: 0.0584, recall: 1.0, f1: 0.1103, kappa: 0.0, cspCloudPct: 100.0, sclCloudPct: 5.84 },
  { tau: 0.95, tp: 12813, fp: 206698, fn: 0, tn: 0, precision: 0.0584, recall: 1.0, f1: 0.1103, kappa: 0.0, cspCloudPct: 100.0, sclCloudPct: 5.84 },
  ],
}

export const MEASURED_SWEEP_2025_01_23: MeasuredSceneSweep = {
  date: '2025-01-23',
  sceneId: '20250123T053029_20250123T053836_T43RGM',
  label: '23-Jan-2025 (Winter Haze · 2.02% SCL)',
  reference: 'Sen2Cor SCL classes 1,3,8,9,10',
  scaleM: 10,
  rows: [
  { tau: 0.10, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.20, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.30, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.40, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.50, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.55, tp: 0, fp: 0, fn: 4440, tn: 215071, precision: 0.0, recall: 0.0, f1: 0.0, kappa: 0.0, cspCloudPct: 0.0, sclCloudPct: 2.02 },
  { tau: 0.60, tp: 7, fp: 37, fn: 4433, tn: 215034, precision: 0.1591, recall: 0.0016, f1: 0.0031, kappa: 0.0027, cspCloudPct: 0.02, sclCloudPct: 2.02 },
  { tau: 0.65, tp: 73, fp: 107, fn: 4367, tn: 214964, precision: 0.4056, recall: 0.0164, f1: 0.0316, kappa: 0.0301, cspCloudPct: 0.08, sclCloudPct: 2.02 },
  { tau: 0.70, tp: 335, fp: 183, fn: 4105, tn: 214888, precision: 0.6467, recall: 0.0755, f1: 0.1351, kappa: 0.1315, cspCloudPct: 0.24, sclCloudPct: 2.02 },
  { tau: 0.75, tp: 881, fp: 263, fn: 3559, tn: 214808, precision: 0.7701, recall: 0.1984, f1: 0.3155, kappa: 0.3098, cspCloudPct: 0.52, sclCloudPct: 2.02 },
  { tau: 0.80, tp: 1568, fp: 327, fn: 2872, tn: 214744, precision: 0.8274, recall: 0.3532, f1: 0.495, kappa: 0.4888, cspCloudPct: 0.86, sclCloudPct: 2.02 },
  { tau: 0.85, tp: 3807, fp: 1941, fn: 633, tn: 213129, precision: 0.6623, recall: 0.8574, f1: 0.7473, kappa: 0.7414, cspCloudPct: 2.62, sclCloudPct: 2.02 },
  { tau: 0.90, tp: 4440, fp: 215071, fn: 0, tn: 0, precision: 0.0202, recall: 1.0, f1: 0.0397, kappa: 0.0, cspCloudPct: 100.0, sclCloudPct: 2.02 },
  { tau: 0.95, tp: 4440, fp: 215071, fn: 0, tn: 0, precision: 0.0202, recall: 1.0, f1: 0.0397, kappa: 0.0, cspCloudPct: 100.0, sclCloudPct: 2.02 },
  ],
}

export const MEASURED_SCENES: Record<string, MeasuredSceneSweep> = {
  '2025-05-10': MEASURED_SWEEP_2025_05_10,
  '2025-01-23': MEASURED_SWEEP_2025_01_23,
}

export function getActiveSweep(date?: string): MeasuredSceneSweep {
  if (date && MEASURED_SCENES[date]) {
    return MEASURED_SCENES[date]
  }
  return MEASURED_SWEEP_2025_05_10
}

export const BASELINE = {
  date: '2025-05-10',
  sceneId: '20250510T053241_20250510T053240_T43RGM',
  tau: 0.60,
  cloudCoverCSP: 0.62,
  cloudCoverCSP80: 10.09,
  cloudCoverSCL: 5.84,
  precision: 0.8816,
  recall: 0.0941,
  f1: 0.1701,
  kappa: 0.1606,
  bestTau: 0.80,
  bestF1: 0.6233,
}

export type MaskMethod = 'csp' | 'scl' | 'qa'

export interface LulcClass {
  id: number
  name: string
  color: string
  t1: number
  t2: number
}

export const LULC_CLASSES: LulcClass[] = [
  { id: 0, name: 'Water',         color: '#419bdf', t1: 0.6,  t2: 0.5  },
  { id: 1, name: 'Trees',         color: '#397d49', t1: 4.3,  t2: 4.0  },
  { id: 2, name: 'Grass',         color: '#88b053', t1: 9.3,  t2: 8.9  },
  { id: 3, name: 'Flooded Veg.',  color: '#7a87c6', t1: 0.0,  t2: 0.0  },
  { id: 4, name: 'Crops',         color: '#e49635', t1: 0.0,  t2: 0.0  },
  { id: 5, name: 'Shrub & Scrub', color: '#dfc35a', t1: 0.0,  t2: 0.0  },
  { id: 6, name: 'Built Area',    color: '#c4281b', t1: 78.0, t2: 78.6 },
  { id: 7, name: 'Bare Ground',   color: '#a59b8f', t1: 7.8,  t2: 8.0  },
  { id: 8, name: 'Snow & Ice',    color: '#b39fe1', t1: 0.0,  t2: 0.0  },
]

// Illustrative cloud-misclassification drift mapping when ungated (not computed live)
const UNGATED_DRIFT: Record<number, number> = {
  0: 0.8,  // Water: +0.8%
  1: -1.5, // Trees: -1.5%
  2: -1.6, // Grass: -1.6%
  3: 0.0,
  4: 0.0,
  5: 0.0,
  6: 1.5,  // Built Area: +1.5%
  7: 0.8,  // Bare Ground: +0.8%
  8: 0.0,
}

export function ungatedPct(cls: { id: number; t1: number; t2?: number }, key: 't1' | 't2' = 't1'): number {
  const baseVal = key === 't1' ? cls.t1 : (cls.t2 ?? cls.t1)
  const drift = UNGATED_DRIFT[cls.id] ?? 0
  const adjusted = Math.max(0, baseVal + drift)
  return Math.round(adjusted * 10) / 10
}

function interpSweepKey(tau: number, key: keyof SweepRow, date?: string): number {
  const rows = getActiveSweep(date).rows
  if (tau <= rows[0].tau) return Number(rows[0][key])
  if (tau >= rows[rows.length - 1].tau) return Number(rows[rows.length - 1][key])
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (tau >= a.tau && tau <= b.tau) {
      const w = b.tau === a.tau ? 0 : (tau - a.tau) / (b.tau - a.tau)
      return Number(a[key]) + w * (Number(b[key]) - Number(a[key]))
    }
  }
  return Number(rows[rows.length - 1][key])
}

/** Linearly interpolates measured Cloud Score+ cloud cover (%) between measured τ points */
export function interpolateCloudCover(tau: number, date?: string): number {
  const val = interpSweepKey(tau, 'cspCloudPct', date)
  return Math.round(val * 100) / 100
}

/** Linearly interpolates measured confusion-matrix KPIs between measured τ points */
export function interpolateMetrics(tau: number, date?: string) {
  return {
    precision: Math.round(interpSweepKey(tau, 'precision', date) * 10000) / 10000,
    recall:    Math.round(interpSweepKey(tau, 'recall', date)    * 10000) / 10000,
    f1:        Math.round(interpSweepKey(tau, 'f1', date)        * 10000) / 10000,
    kappa:     Math.round(interpSweepKey(tau, 'kappa', date)     * 10000) / 10000,
  }
}

/** Returns the measured 14-point threshold sweep series for the sensitivity chart */
export function buildSensitivitySeries(date?: string) {
  return getActiveSweep(date).rows.map(r => ({
    tau: r.tau,
    cloudPct: r.cspCloudPct,
    f1: r.f1,
    precision: r.precision,
    recall: r.recall,
  }))
}

export const FIELD_IMPACTS = [
  { field: 'Urban Planning', icon: '🏙️', text: 'Cloud-masked LULC tracks impervious surface expansion in Shahdara — input for DDA land-use reviews and new township proposals.' },
  { field: 'Agriculture',    icon: '🌾', text: 'Clean NDVI time-series (Kharif / Rabi cycles) flags stressed crop pixels for state agricultural advisories.' },
  { field: 'Disaster Response', icon: '🚨', text: 'Post-event valid-pixel gate isolates flood inundation and debris area; exports GeoTIFF for NDMA rapid damage maps.' },
  { field: 'Forestry',       icon: '🌲', text: 'Multi-year cloud-gated NDVI detects tree canopy loss and afforestation progress under the Delhi Green Cover mission.' },
  { field: 'Water Management', icon: '💧', text: 'SWIR-1 / SWIR-2 ratio inside the M_valid gate delineates the Yamuna floodplain and seasonal wetland dynamics.' },
  { field: 'Air Quality',    icon: '🌫️', text: 'Dense aerosol events (high SCL class 10) correlate masking frequency with CPCB PM2.5 exceedance periods.' },
]

export interface ScenarioPreset {
  id: string
  title: string
  subtitle: string
  badge: string
  stage: 'rgb' | 'cloudmask' | 'validgate' | 'lulc' | 'change'
  tau: number
  gated: boolean
  tab: 'metrics' | 'sensitivity' | 'lulc' | 'impact'
  dateT1: string
  dateT2: string
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'convective_jump',
    title: '1. Threshold Cliff (10-May-2025)',
    subtitle: 'Measured 16× jump from τ=0.60 (0.62%) to τ=0.80 (10.09%, peak F1=0.6233), then full-AOI saturation at τ≥0.85.',
    badge: 'Measured · 16× Jump',
    stage: 'cloudmask',
    tau: 0.60,
    gated: true,
    tab: 'sensitivity',
    dateT1: '2025-05-10',
    dateT2: '2025-01-23',
  },
  {
    id: 'winter_haze',
    title: '2. Winter Haze Case (23-Jan-2025)',
    subtitle: 'Heavy Delhi winter haze (2.02% SCL): CS+ flags 0.02% at τ=0.60 and peaks at τ=0.85 (F1=0.7473) before cliffing at τ=0.90.',
    badge: 'Measured · Winter Haze',
    stage: 'cloudmask',
    tau: 0.85,
    gated: true,
    tab: 'metrics',
    dateT1: '2025-01-23',
    dateT2: '2025-05-10',
  },
  {
    id: 'false_alarm',
    title: '3. False Change Gate (Illustrative)',
    subtitle: 'Illustrative comparison: unmasked transient clouds (+3.8% drift) vs. deterministic M_valid = NOT(M_T1 ∪ M_T2).',
    badge: 'Illustrative Gate',
    stage: 'change',
    tau: 0.60,
    gated: true,
    tab: 'metrics',
    dateT1: '2025-05-10',
    dateT2: '2025-01-23',
  },
]
