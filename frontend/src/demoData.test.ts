import { describe, it, expect } from 'vitest'
import {
  interpolateMetrics,
  interpolateCloudCover,
  BASELINE,
  SCENARIO_PRESETS,
  ungatedPct,
  LULC_CLASSES,
} from './demoData'

describe('Demo Data & Metrics Validation', () => {
  it('matches verified report baseline at tau=0.60 exactly', () => {
    const metrics = interpolateMetrics(0.60)
    expect(metrics.precision).toBe(BASELINE.precision) // 0.6249
    expect(metrics.recall).toBe(BASELINE.recall)       // 0.1618
    expect(metrics.f1).toBe(BASELINE.f1)               // 0.2570
    expect(metrics.kappa).toBe(BASELINE.kappa)         // 0.2511
  })

  it('interpolates cloud cover correctly at tau=0.50 anchor', () => {
    expect(interpolateCloudCover(0.50)).toBe(0.3)
  })

  it('remains non-negative for low tau values (tau=0.10)', () => {
    const cloudCover = interpolateCloudCover(0.10)
    expect(cloudCover).toBeGreaterThanOrEqual(0)
  })

  it('computes valid non-negative metrics across extreme tau values (tau=0.95)', () => {
    const metrics = interpolateMetrics(0.95)
    expect(metrics.precision).toBeGreaterThan(0)
    expect(metrics.recall).toBeGreaterThan(0)
    expect(metrics.f1).toBeGreaterThan(0)
    expect(metrics.kappa).toBeGreaterThan(0)
  })

  it('returns valid sensitivity series without NaN or invalid fields', () => {
    const metricsLow = interpolateMetrics(0.10)
    expect(Number.isFinite(metricsLow.precision)).toBe(true)
    expect(Number.isFinite(metricsLow.recall)).toBe(true)
    expect(Number.isFinite(metricsLow.f1)).toBe(true)
    expect(Number.isFinite(metricsLow.kappa)).toBe(true)
  })

  it('includes 3 valid scenario presets for teacher evaluation', () => {
    expect(SCENARIO_PRESETS).toHaveLength(3)
    expect(SCENARIO_PRESETS[0].id).toBe('winter_smog')
    expect(SCENARIO_PRESETS[1].id).toBe('false_alarm')
    expect(SCENARIO_PRESETS[2].id).toBe('multi_impact')
  })

  it('calculates ungated LULC percentages consistently and sums to 100%', () => {
    const builtClass = LULC_CLASSES.find(c => c.id === 6)!
    const waterClass = LULC_CLASSES.find(c => c.id === 0)!
    
    // Baseline checks: Built Area 78.0%, Water 0.6% (calculated from real Shahdara raster pixel counts)
    expect(builtClass.t1).toBe(78.0)
    expect(waterClass.t1).toBe(0.6)
    
    // Atmospheric drift: bright unmasked cloud/haze inflates Built Area (+1.5%)
    // Cloud shadows falsely inflate Water (+0.8%)
    expect(ungatedPct(builtClass, 't1')).toBe(79.5)
    expect(ungatedPct(waterClass, 't1')).toBe(1.4)

    // Verify baseline T1 sums to 100.0%
    const sumT1 = LULC_CLASSES.reduce((acc, c) => acc + c.t1, 0)
    expect(Math.round(sumT1 * 10) / 10).toBe(100.0)

    // Verify ungated T1 sums to 100.0%
    const sumUngated = LULC_CLASSES.reduce((acc, c) => acc + ungatedPct(c, 't1'), 0)
    expect(Math.round(sumUngated * 10) / 10).toBe(100.0)
  })
})
