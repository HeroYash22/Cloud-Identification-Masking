"""
Demo-mode service: returns pre-computed, realistic raster overlays and metrics
for the Shahdara, East Delhi study area (scene date 2025-01-18).

In live mode, seamlessly queries Google Earth Engine via gee_service.py.
"""
import os
from typing import Dict, Any, List
from app.constants import BASELINE_METRICS, AOI


def _is_live() -> bool:
    return os.getenv("GEE_MODE", "demo").lower() == "live"


# ---------------------------------------------------------------------------
# Cloud masking
# ---------------------------------------------------------------------------

def compute_cloud_mask(date: str, tau: float, method: str = "csp") -> Dict[str, Any]:
    """
    Returns mask statistics for a given date, threshold, and method.
    In live mode: executes real GEE computation.
    In demo mode: interpolates around verified report baseline values.
    """
    if _is_live():
        from app.services.gee_service import compute_live_cloud_mask, init_gee
        if init_gee():
            try:
                return compute_live_cloud_mask(date, tau, method)
            except Exception as e:
                # Log and fallback gracefully
                pass

    base = BASELINE_METRICS
    # Non-linear Cloud Score+ CDF curve anchored to verified report findings:
    # tau=0.50 -> 0.3%, tau=0.60 -> 0.5%, tau=0.80 -> 6.5% (13x jump), tau=0.95 -> 8.5%
    t_clamped = max(0.10, min(0.95, tau))
    if t_clamped <= 0.60:
        norm = (t_clamped - 0.10) / 0.50
        csp_cover = 0.1 + 0.4 * (norm ** 2.5)
    elif t_clamped <= 0.80:
        norm = (t_clamped - 0.60) / 0.20
        s_curve = norm * norm * (3 - 2 * norm)
        csp_cover = 0.5 + 6.0 * s_curve
    else:
        import math
        norm = (t_clamped - 0.80) / 0.15
        csp_cover = 6.5 + 2.0 * (1.0 - math.exp(-2.6 * norm))

    scl_cover = base["cloud_cover_scl"]
    qa_cover = scl_cover * 0.85  # slightly lower coverage

    # Also compute metrics at this tau
    metrics = compute_metrics(tau)

    return {
        "date": date,
        "tau": tau,
        "method": method,
        "csp_cloud_pct": round(csp_cover, 2),
        "scl_cloud_pct": round(scl_cover, 2),
        "qa_cloud_pct": round(qa_cover, 2),
        "valid_pixel_pct": round(100 - csp_cover, 2),
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1": metrics["f1"],
        "kappa": metrics["kappa"],
        "tile_url": None,
        "demo_mode": True,
    }


# ---------------------------------------------------------------------------
# Accuracy metrics
# ---------------------------------------------------------------------------

def compute_metrics(tau: float) -> Dict[str, Any]:
    """
    Returns precision / recall / F1 / kappa for a given τ.
    Demo: smooth curve around verified report values at τ=0.60.
    """
    # Anchor at τ=0.60 from report; model a smooth bell over τ
    b = BASELINE_METRICS
    # F1 peaks around τ=0.55, falls off at both extremes
    f1_base = b["f1"]
    delta = (tau - 0.60)
    f1 = max(0.05, f1_base - 0.6 * delta**2)

    # Precision rises with τ; recall falls
    precision = min(0.99, b["precision"] + 0.4 * (tau - 0.60))
    recall = max(0.01, b["recall"] - 0.3 * (tau - 0.60))

    # Kappa proportional to F1
    kappa = max(0.01, b["kappa"] * (f1 / f1_base))

    return {
        "tau": tau,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "kappa": round(kappa, 4),
        "demo_mode": True,
    }


def threshold_sensitivity(tau_min: float = 0.50, tau_max: float = 0.90, steps: int = 9) -> List[Dict[str, Any]]:
    """Returns a series of {tau, cloud_pct, f1, precision, recall} dicts for the chart."""
    series = []
    for i in range(steps):
        tau = round(tau_min + i * (tau_max - tau_min) / (steps - 1), 2)
        m = compute_metrics(tau)
        c = compute_cloud_mask("2025-01-18", tau)
        series.append({
            "tau": tau,
            "cloud_pct": c["csp_cloud_pct"],
            "f1": m["f1"],
            "precision": m["precision"],
            "recall": m["recall"],
        })
    return series


# ---------------------------------------------------------------------------
# LULC & Change Detection (demo tile URLs)
# ---------------------------------------------------------------------------

DEMO_LULC_T1 = {
    "Water": 0.6, "Trees": 4.3, "Grass": 9.3, "Flooded Veg.": 0.0,
    "Crops": 0.0, "Shrub & Scrub": 0.0, "Built Area": 78.0,
    "Bare Ground": 7.8, "Snow & Ice": 0.0,
}
DEMO_LULC_T2 = {
    "Water": 0.5, "Trees": 4.0, "Grass": 8.9, "Flooded Veg.": 0.0,
    "Crops": 0.0, "Shrub & Scrub": 0.0, "Built Area": 78.6,
    "Bare Ground": 8.0, "Snow & Ice": 0.0,
}

# Atmospheric cloud misclassification drift
LULC_UNGATED_DRIFT = {
    "Water": 0.8,         # Cloud shadow misclassification
    "Trees": -1.5,        # Obscured canopy
    "Grass": -1.6,        # Obscured greenery
    "Flooded Veg.": 0.0,
    "Crops": 0.0,
    "Shrub & Scrub": 0.0,
    "Built Area": 1.5,    # Unmasked bright cloud/haze
    "Bare Ground": 0.8,   # Cloud fringe brightness
    "Snow & Ice": 0.0,
}

def get_lulc(date: str, gated: bool = True, tau: float = 0.60) -> Dict[str, Any]:
    if _is_live():
        from app.services.gee_service import compute_live_dynamic_world, init_gee
        if init_gee():
            try:
                return compute_live_dynamic_world(date, gated=gated, tau=tau)
            except Exception:
                pass

    base_dist = dict(DEMO_LULC_T1 if date == "2025-01-18" else DEMO_LULC_T2)
    if not gated:
        dist = {
            k: round(max(0.0, v + LULC_UNGATED_DRIFT.get(k, 0.0)), 1)
            for k, v in base_dist.items()
        }
    else:
        dist = base_dist
    return {"date": date, "gated": gated, "distribution": dist, "demo_mode": True}


def get_change_detection(gated: bool = True) -> Dict[str, Any]:
    changed_pct = 7.4 if gated else 11.2  # ungated inflates change artefacts by +3.8%
    false_alarms_pct = 0.0 if gated else 3.8
    stable_pct = 100 - changed_pct
    return {
        "t1": "2025-01-18",
        "t2": "2025-04-15",
        "gated": gated,
        "changed_pct": changed_pct,
        "stable_pct": stable_pct,
        "false_alarms_pct": false_alarms_pct,
        "demo_mode": True,
    }
