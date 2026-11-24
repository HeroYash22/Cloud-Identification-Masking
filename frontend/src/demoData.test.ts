import { describe, it, expect } from 'vitest'
import {
  interpolateMetrics,
  interpolateCloudCover,
  buildSensitivitySeries,
  BASELINE,
  SCENARIO_PRESETS,
  ungatedPct,
  LULC_CLASSES,
} from './demoData'

describe('Measured Sweep & Demo Data Validation', () => {
  it('matches measured 2025-05-10 GEE counts at tau=0.60 exactly', () => {
    const metrics = interpolateMetrics(0.60, '2025-05-10')
    expect(metrics.precision).toBe(BASELINE.precision) // 0.8816
    expect(metrics.recall).toBe(BASELINE.recall)       // 0.0941
    expect(metrics.f1).toBe(BASELINE.f1)               // 0.1701
    expect(metrics.kappa).toBe(BASELINE.kappa)         // 0.1606
    expect(interpolateCloudCover(0.60, '2025-05-10')).toBe(0.62)
  })

  it('matches measured 2025-05-10 peak F1 at tau=0.80 and saturation at tau=0.85', () => {
    const m80 = interpolateMetrics(0.80, '2025-05-10')
    expect(m80.f1).toBe(0.6233)
    expect(interpolateCloudCover(0.80, '2025-05-10')).toBe(10.09)
    expect(interpolateCloudCover(0.85, '2025-05-10')).toBe(100.0)
  })

  it('matches measured 2025-01-23 winter haze sweep', () => {
    const m85 = interpolateMetrics(0.85, '2025-01-23')
    expect(m85.f1).toBe(0.7473)
    expect(interpolateCloudCover(0.60, '2025-01-23')).toBe(0.02)
    expect(interpolateCloudCover(0.80, '2025-01-23')).toBe(0.86)
  })

  it('builds 14-point measured sensitivity series cleanly', () => {
    const series = buildSensitivitySeries('2025-05-10')
    expect(series).toHaveLength(14)
    for (const row of series) {
      expect(Number.isFinite(row.precision)).toBe(true)
      expect(Number.isFinite(row.recall)).toBe(true)
      expect(Number.isFinite(row.f1)).toBe(true)
      expect(Number.isFinite(row.cloudPct)).toBe(true)
    }
  })

  it('includes 3 valid scenario presets', () => {
    expect(SCENARIO_PRESETS).toHaveLength(3)
    expect(SCENARIO_PRESETS[0].id).toBe('convective_jump')
    expect(SCENARIO_PRESETS[1].id).toBe('winter_haze')
    expect(SCENARIO_PRESETS[2].id).toBe('false_alarm')
  })

  it('calculates ungated LULC percentages consistently and sums to 100%', () => {
    const builtClass = LULC_CLASSES.find(c => c.id === 6)!
    const waterClass = LULC_CLASSES.find(c => c.id === 0)!

    expect(builtClass.t1).toBe(78.0)
    expect(waterClass.t1).toBe(0.6)

    expect(ungatedPct(builtClass, 't1')).toBe(79.5)
    expect(ungatedPct(waterClass, 't1')).toBe(1.4)

    const sumT1 = LULC_CLASSES.reduce((acc, c) => acc + c.t1, 0)
    expect(Math.round(sumT1 * 10) / 10).toBe(100.0)

    const sumUngated = LULC_CLASSES.reduce((acc, c) => acc + ungatedPct(c, 't1'), 0)
    expect(Math.round(sumUngated * 10) / 10).toBe(100.0)
  })
})
