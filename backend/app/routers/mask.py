from datetime import date as dt_date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.demo_service import compute_cloud_mask
from app.constants import SCENE_T1

router = APIRouter()


@router.get("/")
def get_mask(
    date: str = Query(SCENE_T1, description="Scene date YYYY-MM-DD"),
    tau: float = Query(0.60, ge=0.10, le=0.95, description="Cloud Score+ threshold"),
    method: str = Query("csp", description="'csp' | 'scl' | 'qa'"),
    live: Optional[bool] = Query(None, description="Force live GEE execution when true"),
):
    if date > dt_date.today().isoformat():
        raise HTTPException(status_code=400, detail="Future dates after today cannot be selected.")
    return compute_cloud_mask(date, tau, method, live=live)
