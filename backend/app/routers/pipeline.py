from datetime import date as dt_date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.demo_service import get_lulc, get_change_detection
from app.services.gee_service import (
    get_latest_sentinel_scene,
    compute_live_rgb,
    compute_live_valid_gate,
    compute_live_change,
    init_gee,
    get_gee_status,
)
from app.constants import AOI, SCENE_T1, SCENE_T2

router = APIRouter()


def _reject_future_date(date_str: str) -> None:
    if date_str > dt_date.today().isoformat():
        raise HTTPException(status_code=400, detail="Future dates after today cannot be selected.")


@router.get("/rgb")
def rgb(
    date: str = Query(SCENE_T1),
    live: Optional[bool] = Query(True),
):
    _reject_future_date(date)
    if live:
        if init_gee():
            try:
                return compute_live_rgb(date)
            except Exception as exc:
                return {"date": date, "tile_url": None, "demo_mode": True, "live_error": str(exc)}
        return {
            "date": date,
            "tile_url": None,
            "demo_mode": True,
            "live_error": get_gee_status().get("error") or "GEE not initialized",
        }
    return {"date": date, "tile_url": None, "demo_mode": True}


@router.get("/valid-gate")
def valid_gate(
    t1: str = Query(SCENE_T1),
    t2: str = Query(SCENE_T2),
    tau: float = Query(0.60, ge=0.10, le=0.95),
    live: Optional[bool] = Query(True),
):
    _reject_future_date(t1)
    _reject_future_date(t2)
    if live and init_gee():
        try:
            return compute_live_valid_gate(t1, t2, tau)
        except Exception as exc:
            return {"t1": t1, "t2": t2, "tile_url": None, "demo_mode": True, "live_error": str(exc)}
    return {"t1": t1, "t2": t2, "tile_url": None, "demo_mode": True}


@router.get("/lulc")
def lulc(
    date: str = Query(SCENE_T1),
    gated: bool = Query(True),
    tau: float = Query(0.60, ge=0.10, le=0.95),
    live: Optional[bool] = Query(None),
):
    _reject_future_date(date)
    return get_lulc(date, gated, tau, live=live)


@router.get("/change")
def change(
    t1: str = Query(SCENE_T1),
    t2: str = Query(SCENE_T2),
    tau: float = Query(0.60, ge=0.10, le=0.95),
    gated: bool = Query(True),
    live: Optional[bool] = Query(False),
):
    _reject_future_date(t1)
    _reject_future_date(t2)
    if live and init_gee():
        try:
            return compute_live_change(t1, t2, tau=tau, gated=gated)
        except Exception as exc:
            res = get_change_detection(gated)
            res["live_error"] = str(exc)
            return res
    return get_change_detection(gated)


@router.get("/latest-pass")
def latest_pass():
    return get_latest_sentinel_scene(AOI["bbox"])
