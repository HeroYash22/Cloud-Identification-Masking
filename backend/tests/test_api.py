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


def test_metrics_from_counts_matches_report_baseline():
    """Counts consistent with the report's tau=0.60 numbers reproduce P/R/F1/kappa."""
    from scripts.export_threshold_sweep import metrics_from_counts
    total = 250_000
    tp, fp, fn = 780, 470, 3970          # CS+ 0.5%, SCL 1.9% of 250k px
    m = metrics_from_counts(tp, fp, fn, total - tp - fp - fn)
    assert abs(m["precision"] - 0.6249) < 0.005
    assert abs(m["recall"] - 0.1618) < 0.01
    assert abs(m["kappa"] - 0.2511) < 0.01


def test_measured_replay_overrides_formula(tmp_path, monkeypatch):
    import json
    from app.services import demo_service as d
    f = tmp_path / "m.json"
    f.write_text(json.dumps({"rows": [
        {"tau": 0.5, "precision": 0.5, "recall": 0.2, "f1": 0.3, "kappa": 0.3, "csp_cloud_pct": 1.0},
        {"tau": 0.7, "precision": 0.7, "recall": 0.4, "f1": 0.5, "kappa": 0.5, "csp_cloud_pct": 3.0},
    ]}))
    monkeypatch.setattr(d, "_MEASURED_PATH", f)
    monkeypatch.setattr(d, "_measured_cache", None)
    m = d.compute_metrics(0.6)
    assert m["source"] == "measured" and abs(m["precision"] - 0.6) < 1e-9
    assert d.compute_cloud_mask("2025-01-18", 0.6)["csp_cloud_pct"] == 2.0
    assert d.compute_metrics(0.9)["source"] == "interpolated_formula"   # outside measured range
