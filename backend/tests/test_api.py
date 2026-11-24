"""
Unit tests for the FastAPI backend API endpoints.
Tests health, live-status, cloud masking, pipeline LULC, and metadata exports.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_live_status():
    res = client.get("/api/live-status")
    assert res.status_code == 200
    data = res.json()
    assert "mode" in data
    assert "aoi" in data
    assert data["aoi"]["center"] == [28.65, 77.30]

def test_cloud_mask():
    res = client.get("/api/mask/?date=2025-01-18&tau=0.60")
    assert res.status_code == 200
    data = res.json()
    assert data["tau"] == 0.60
    assert data["csp_cloud_pct"] == 0.5

def test_pipeline_lulc():
    res = client.get("/api/pipeline/lulc?date=2025-01-18&gated=true&tau=0.60")
    assert res.status_code == 200
    data = res.json()
    assert "distribution" in data
    assert data["distribution"]["Built Area"] == 78.0
    assert data["distribution"]["Water"] == 0.6
    # Sum to 100%
    total = sum(data["distribution"].values())
    assert round(total, 1) == 100.0

def test_export_metadata_json():
    res = client.get("/api/export/metadata?tau=0.60&fmt=json")
    assert res.status_code == 200
    data = res.json()
    assert data["threshold_tau"] == 0.60
    assert "cloud_mask" in data
    assert "accuracy_metrics" in data
