"""
Run a REAL Cloud Score+ threshold sweep on Google Earth Engine and save the results.

Usage (from backend/):
    earthengine authenticate --auth_mode=notebook
    set GEE_PROJECT_ID=your-project     (or export on Linux/macOS)
    python -m scripts.export_threshold_sweep --date 2025-01-18

Output: backend/data/measured_sweep.json
Each row holds raw confusion counts (TP/FP/FN/TN) plus precision, recall, F1, kappa and
CS+/SCL cloud cover computed from them, so every number in the report can be traced to pixels.
The demo mode replays this file (linear interpolation BETWEEN measured taus only).
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.gee_service import live_confusion_counts  # noqa: E402

DEFAULT_TAUS = [0.10, 0.20, 0.30, 0.40, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]


def metrics_from_counts(tp: int, fp: int, fn: int, tn: int) -> dict:
    total = tp + fp + fn + tn
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    po = (tp + tn) / total if total else 0.0
    pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (total * total) if total else 0.0
    kappa = (po - pe) / (1 - pe) if (1 - pe) else 0.0
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "kappa": round(kappa, 4),
        "csp_cloud_pct": round(100 * (tp + fp) / total, 2) if total else 0.0,
        "scl_cloud_pct": round(100 * (tp + fn) / total, 2) if total else 0.0,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="2025-01-18")
    ap.add_argument("--taus", type=float, nargs="*", default=DEFAULT_TAUS)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "measured_sweep.json"))
    args = ap.parse_args()

    rows, scene_id = [], None
    for tau in args.taus:
        c = live_confusion_counts(args.date, tau)
        scene_id = c.pop("scene_id")
        row = {**c, **metrics_from_counts(c["tp"], c["fp"], c["fn"], c['tn'])}
        if c["tp"] + c["fn"] == 0:
            raise SystemExit(
                f"The SCL reference has NO cloud pixels in the AOI on {args.date} (scene {scene_id}), "
                "so precision/recall/F1/kappa are undefined. Pick a date with clouds: "
                "python -m scripts.scan_cloudy_dates"
                )
        rows.append(row)
        print(f"tau={tau:.2f}  CS+={row['csp_cloud_pct']:5.2f}%  P={row['precision']:.4f}  "
              f"R={row['recall']:.4f}  F1={row['f1']:.4f}  kappa={row['kappa']:.4f}")

    out = {
        "date": args.date,
        "scene_id": scene_id,
        "reference": "Sen2Cor SCL classes 1,3,8,9,10",
        "scale_m": 10,
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": rows,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Saved {len(rows)} measured thresholds -> {os.path.abspath(args.out)}")


if __name__ == "__main__":
    main()
