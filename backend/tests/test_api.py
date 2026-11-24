"""
Unit tests for the FastAPI backend API endpoints.
Tests health, live-status, measured cloud masking sweep replay, pipeline LULC, and metadata exports.
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


def test_cloud_mask_measured_default():
    res = client.get("/api/mask/?date=2025-05-10&tau=0.60")
    assert res.status_code == 200
    data = res.json()
    assert data["tau"] == 0.60
    assert data["source"] == "measured"
    assert data["csp_cloud_pct"] == 0.62
    assert data["scl_cloud_pct"] == 5.84
    assert data["precision"] == 0.8816
    assert data["recall"] == 0.0941


def test_cloud_mask_measured_winter_haze():
    res = client.get("/api/mask/?date=2025-01-23&tau=0.85")
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "measured"
    assert data["f1"] == 0.7473
    assert data["csp_cloud_pct"] == 2.62


def test_pipeline_lulc():
    res = client.get("/api/pipeline/lulc?date=2025-05-10&gated=true&tau=0.60")
    assert res.status_code == 200
    data = res.json()
    assert "distribution" in data
    assert data["distribution"]["Built Area"] == 78.0
    assert data["distribution"]["Water"] == 0.6
    total = sum(data["distribution"].values())
    assert round(total, 1) == 100.0


def test_export_metadata_json():
    res = client.get("/api/export/metadata?date=2025-05-10&tau=0.60&fmt=json")
    assert res.status_code == 200
    data = res.json()
    assert data["scene_date"] == "2025-05-10"
    assert data["threshold_tau"] == 0.60
    assert "cloud_mask" in data
    assert "accuracy_metrics" in data


def test_metrics_from_counts_matches_measured_row():
    """Counts from 2025-05-10 at tau=0.60 reproduce P/R/F1/kappa."""
    from scripts.export_threshold_sweep import metrics_from_counts
    m = metrics_from_counts(1206, 162, 11607, 206536)
    assert m["precision"] == 0.8816
    assert m["recall"] == 0.0941
    assert m["f1"] == 0.1701
    assert m["kappa"] == 0.1606


def test_measured_replay_overrides_formula(tmp_path, monkeypatch):
    import json
    from app.services import demo_service as d
    f = tmp_path / "m.json"
    f.write_text(json.dumps({"date": "2025-05-10", "scene_id": "test", "rows": [
        {"tau": 0.5, "precision": 0.5, "recall": 0.2, "f1": 0.3, "kappa": 0.3, "csp_cloud_pct": 1.0, "scl_cloud_pct": 5.0},
        {"tau": 0.7, "precision": 0.7, "recall": 0.4, "f1": 0.5, "kappa": 0.5, "csp_cloud_pct": 3.0, "scl_cloud_pct": 5.0},
    ]}))
    monkeypatch.setattr(d, "_MEASURED_PATH", f)
    monkeypatch.setattr(d, "_measured_cache", None)
    monkeypatch.setattr(d, "_scene_cache", {})
    m = d.compute_metrics(0.6)
    assert m["source"] == "measured" and abs(m["precision"] - 0.6) < 1e-9
    assert d.compute_cloud_mask("2025-05-10", 0.6)["csp_cloud_pct"] == 2.0
    assert d.compute_metrics(0.9)["source"] == "interpolated_formula"
