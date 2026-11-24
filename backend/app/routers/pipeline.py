from fastapi import APIRouter, Query
from app.services.demo_service import get_lulc, get_change_detection
from app.services.gee_service import get_latest_sentinel_scene
from app.constants import AOI

router = APIRouter()


@router.get("/lulc")
def lulc(
    date: str = Query("2025-01-18"),
    gated: bool = Query(True),
    tau: float = Query(0.60, ge=0.10, le=0.95),
):
    """LULC class distribution for a given scene date."""
    return get_lulc(date, gated, tau)


@router.get("/change")
def change(gated: bool = Query(True)):
    """Bitemporal change statistics between T1 and T2."""
    return get_change_detection(gated)


@router.get("/latest-pass")
def latest_pass():
    """Queries or returns the most recent Sentinel-2 overpass date."""
    return get_latest_sentinel_scene(AOI["bbox"])
