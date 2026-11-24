"""
Demo-mode service: replays measured GEE pixel confusion counts from backend/data/
for the Shahdara, East Delhi study area (primary scene 2025-05-10; winter haze scene 2025-01-23).

When live=True (or GEE_MODE=live), queries Google Earth Engine via gee_service.py.
"""
import json
import math
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.constants import BASELINE_METRICS, AOI, LULC_CLASSES, SCENE_T1, SCENE_T2

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_MEASURED_PATH = _DATA_DIR / "measured_sweep.json"
_measured_cache = None
_scene_cache: Dict[str, Optional[Dict[str, Any]]] = {}


def _load_sweep_file(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        data["rows"] = sorted(data["rows"], key=lambda r: r["tau"])
        return data
    except Exception:
        return None


def _measured_payload(date: Optional[str] = None) -> Optional[Dict[str, Any]]:
    global _measured_cache
    if date:
        if date not in _scene_cache:
            date_file = _DATA_DIR / f"sweep_{date}.json"
            _scene_cache[date] = _load_sweep_file(date_file) if date_file.exists() else None
        if _scene_cache[date] is not None:
            return _scene_cache[date]

    if _measured_cache is None:
        _measured_cache = _load_sweep_file(_MEASURED_PATH) or {}
    return _measured_cache or None


def _measured_rows(date: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
    payload = _measured_payload(date)
    if not payload or not payload.get("rows"):
        return None
    return payload["rows"]


def _interp_measured(tau: float, key: str, date: Optional[str] = None):
    rows = _measured_rows(date)
    if not rows or tau < rows[0]["tau"] or tau > rows[-1]["tau"]:
        return None
    for a, b in zip(rows, rows[1:]):
        if a["tau"] <= tau <= b["tau"]:
            w = 0.0 if b["tau"] == a["tau"] else (tau - a["tau"]) / (b["tau"] - a["tau"])
            return a[key] + w * (b[key] - a[key])
    return rows[-1][key]


def _is_live(live_override: Optional[bool] = None) -> bool:
    if live_override is not None:
        return live_override
    return os.getenv("GEE_MODE", "demo").lower() == "live"


def compute_cloud_mask(date: str, tau: float, method: str = "csp", live: Optional[bool] = None) -> Dict[str, Any]:
    live_error = None
    if _is_live(live):
        from app.services.gee_service import compute_live_cloud_mask, init_gee, get_gee_status
        if init_gee():
            try:
                return compute_live_cloud_mask(date, tau, method)
            except Exception as exc:
                live_error = str(exc)
        else:
            live_error = get_gee_status().get("error") or "GEE not initialized"

    base = BASELINE_METRICS
    payload = _measured_payload(date)

    t_clamped = max(0.10, min(0.95, tau))
    if t_clamped <= 0.60:
        norm = (t_clamped - 0.10) / 0.50
        csp_cover = 0.07 + 0.55 * (norm ** 2.2)
    elif t_clamped <= 0.80:
        norm = (t_clamped - 0.60) / 0.20
        s_curve = norm * norm * (3 - 2 * norm)
        csp_cover = 0.62 + 9.47 * s_curve
    else:
        norm = (t_clamped - 0.80) / 0.15
        csp_cover = 10.09 + 89.91 * (1.0 - math.exp(-3.0 * norm))

    measured_cover = _interp_measured(tau, "csp_cloud_pct", date)
    measured_scl = _interp_measured(tau, "scl_cloud_pct", date)
    if measured_cover is not None:
        csp_cover = measured_cover
    scl_cover = measured_scl if measured_scl is not None else base["cloud_cover_scl"]

    metrics = compute_metrics(tau, date=date)

    return {
        "date": payload["date"] if payload else date,
        "requested_date": date,
        "scene_id": payload.get("scene_id") if payload else base["scene_id"],
        "tau": tau,
        "method": method,
        "csp_cloud_pct": round(csp_cover, 2),
        "scl_cloud_pct": round(scl_cover, 2),
        "qa_cloud_pct": None,
        "valid_pixel_pct": round(100 - csp_cover, 2),
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1": metrics["f1"],
        "kappa": metrics["kappa"],
        "tile_url": None,
        "demo_mode": True,
        "live_error": live_error,
        "source": "measured" if measured_cover is not None else "interpolated_formula",
    }


def compute_metrics(tau: float, date: Optional[str] = None) -> Dict[str, Any]:
    measured = {k: _interp_measured(tau, k, date) for k in ("precision", "recall", "f1", "kappa")}
    if all(v is not None for v in measured.values()):
        return {
            "tau": tau,
            **{k: round(v, 4) for k, v in measured.items()},
            "demo_mode": True,
            "source": "measured",
        }

    b = BASELINE_METRICS
    f1_base = b["f1"]
    delta = tau - 0.60
    f1 = max(0.05, f1_base - 0.6 * delta**2)
    precision = min(0.99, max(0.01, b["precision"] - 0.4 * delta))
    recall = max(0.01, min(1.0, b["recall"] + 0.8 * delta))
    kappa = max(0.01, b["kappa"] * (f1 / f1_base))

    return {
        "tau": tau,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "kappa": round(kappa, 4),
        "demo_mode": True,
        "source": "interpolated_formula",
    }


def threshold_sensitivity(
    tau_min: float = 0.50,
    tau_max: float = 0.90,
    steps: int = 9,
    date: str = SCENE_T1,
) -> List[Dict[str, Any]]:
    series = []
    for i in range(steps):
        tau = round(tau_min + i * (tau_max - tau_min) / (steps - 1), 2)
        m = compute_metrics(tau, date=date)
        c = compute_cloud_mask(date, tau, live=False)
        series.append({
            "tau": tau,
            "cloud_pct": c["csp_cloud_pct"],
            "f1": m["f1"],
            "precision": m["precision"],
            "recall": m["recall"],
        })
    return series


DEMO_LULC_T1 = {c["name"]: c["baseline_pct"] for c in LULC_CLASSES}
DEMO_LULC_T2 = {
    c["name"]: round(c["baseline_pct"] * (1.008 if c["name"] == "Built Area" else 0.96), 1)
    if c["baseline_pct"] > 0 else 0.0
    for c in LULC_CLASSES
}

LULC_UNGATED_DRIFT = {
    "Water": 0.8,
    "Trees": -1.5,
    "Grass": -1.6,
    "Flooded Veg.": 0.0,
    "Crops": 0.0,
    "Shrub & Scrub": 0.0,
    "Built Area": 1.5,
    "Bare Ground": 0.8,
    "Snow & Ice": 0.0,
}


def get_lulc(date: str, gated: bool = True, tau: float = 0.60, live: Optional[bool] = None) -> Dict[str, Any]:
    live_error = None
    if _is_live(live):
        from app.services.gee_service import compute_live_dynamic_world, init_gee, get_gee_status
        if init_gee():
            try:
                return compute_live_dynamic_world(date, gated=gated, tau=tau)
            except Exception as exc:
                live_error = str(exc)
        else:
            live_error = get_gee_status().get("error") or "GEE not initialized"

    base_dist = dict(DEMO_LULC_T1 if date == SCENE_T1 else DEMO_LULC_T2)
    if not gated:
        dist = {
            k: round(max(0.0, v + LULC_UNGATED_DRIFT.get(k, 0.0)), 1)
            for k, v in base_dist.items()
        }
    else:
        dist = base_dist
    return {
        "date": date,
        "gated": gated,
        "distribution": dist,
        "tile_url": None,
        "demo_mode": True,
        "live_error": live_error,
        "source": "measured_raster" if gated else "illustrative_ungated_drift",
    }


def get_change_detection(gated: bool = True) -> Dict[str, Any]:
    changed_pct = 7.4 if gated else 11.2
    false_alarms_pct = 0.0 if gated else 3.8
    stable_pct = 100 - changed_pct
    return {
        "t1": SCENE_T1,
        "t2": SCENE_T2,
        "gated": gated,
        "changed_pct": changed_pct,
        "stable_pct": stable_pct,
        "false_alarms_pct": false_alarms_pct,
        "demo_mode": True,
        "source": "illustrative",
    }
