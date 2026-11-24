"""
FastAPI application entry point.
Runs in DEMO mode by default; set GEE_MODE=live in .env to hit GEE.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import mask, metrics, pipeline, export  # noqa: E402
from app.services.gee_service import get_gee_status        # noqa: E402

app = FastAPI(
    title="Shahdara Satellite Image Processing API",
    description=(
        "AI-Based Satellite Image Processing for Land Cover, "
        "Change Detection & Automatic Cloud Masking — Study Area: Shahdara, East Delhi"
    ),
    version="1.1.0",
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mask.router, prefix="/api/mask", tags=["Cloud Masking"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Analytics"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/api/health")
def health():
    gee_mode = os.getenv("GEE_MODE", "demo")
    return {"status": "ok", "gee_mode": gee_mode}


@app.get("/api/live-status")
def live_status():
    """Returns dynamic Google Earth Engine status, credentials state, and study area metadata."""
    return get_gee_status()
