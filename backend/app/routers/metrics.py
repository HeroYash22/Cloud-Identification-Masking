from fastapi import APIRouter, Query
from app.services.demo_service import compute_metrics, threshold_sensitivity
from app.constants import SCENE_T1

router = APIRouter()


@router.get("/")
def get_metrics(
    tau: float = Query(0.60, ge=0.10, le=0.95),
    date: str = Query(SCENE_T1, description="Scene date YYYY-MM-DD"),
):
    """Live KPI: Precision, Recall, F1, Kappa for the given τ and scene date."""
    return compute_metrics(tau, date=date)


@router.get("/sensitivity")
def get_sensitivity(
    tau_min: float = Query(0.50),
    tau_max: float = Query(0.90),
    steps: int = Query(9, ge=2, le=20),
    date: str = Query(SCENE_T1, description="Scene date YYYY-MM-DD"),
):
    """Threshold sensitivity series for the chart."""
    return threshold_sensitivity(tau_min, tau_max, steps, date=date)
