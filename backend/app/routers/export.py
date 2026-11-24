from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from app.constants import AOI, BASELINE_METRICS, LULC_CLASSES
from app.services.demo_service import compute_metrics, compute_cloud_mask

router = APIRouter()


@router.get("/metadata")
def export_metadata(
    tau: float = Query(0.60, ge=0.10, le=0.95, description="Cloud Score+ threshold"),
    date: str = Query("2025-01-18", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Scene date YYYY-MM-DD"),
    fmt: str = Query("json", description="'json' | 'csv'"),
):
    """
    Download mask/LULC metadata as JSON or CSV.
    GeoTIFF: in live mode, rasterio writes the mask to a temp file and streams it.
    """
    mask_data = compute_cloud_mask(date, tau)
    metrics_data = compute_metrics(tau)

    payload = {
        "aoi": AOI,
        "scene_date": date,
        "threshold_tau": tau,
        "cloud_mask": mask_data,
        "accuracy_metrics": metrics_data,
        "lulc_classes": LULC_CLASSES,
        "note": (
            "Demo mode data. In live mode this endpoint streams a georeferenced GeoTIFF. "
            "Open the PNG + .wld worldfile in QGIS for a spatial reference."
        ),
    }

    if fmt == "csv":
        lines = ["field,value"]
        for k, v in {**mask_data, **metrics_data}.items():
            lines.append(f"{k},{v}")
        return JSONResponse(
            content="\n".join(lines),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=shahdara_{date}_tau{tau}.csv"},
        )

    return JSONResponse(content=payload)
