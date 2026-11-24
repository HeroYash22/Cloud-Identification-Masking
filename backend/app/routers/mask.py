from fastapi import APIRouter, Query
from app.services.demo_service import compute_cloud_mask

router = APIRouter()


@router.get("/")
def get_mask(
    date: str = Query("2025-01-18", description="Scene date YYYY-MM-DD"),
    tau: float = Query(0.60, ge=0.10, le=0.95, description="Cloud Score+ threshold"),
    method: str = Query("csp", description="'csp' | 'scl' | 'qa'"),
):
    """
    Returns cloud/shadow mask statistics for a given date and threshold.
    In demo mode: pre-computed interpolated values.
    In live mode: runs Cloud Score+ and SCL on GEE.
    """
    return compute_cloud_mask(date, tau, method)
