"""
Shared constants for the Shahdara AOI project.
Study area: 5 km × 5 km centred on USAR, GGSIPU (28.65°N, 77.30°E).
"""

# AOI bounding box (EPSG:4326)
AOI = {
    "center_lat": 28.65,
    "center_lon": 77.30,
    "half_deg": 0.0225,  # ~2.5 km at this latitude
}
AOI["bbox"] = [
    AOI["center_lon"] - AOI["half_deg"],  # west
    AOI["center_lat"] - AOI["half_deg"],  # south
    AOI["center_lon"] + AOI["half_deg"],  # east
    AOI["center_lat"] + AOI["half_deg"],  # north
]

# Sentinel-2 bands used
S2_BANDS = ["B2", "B3", "B4", "B8", "B11", "B12"]
REFLECTANCE_SCALE = 10000

# Measured evaluation dates (Sentinel-2 SR Harmonized + Cloud Score+ V1, MGRS Tile T43RGM)
SCENE_T1 = "2025-05-10"
SCENE_T2 = "2025-01-23"
SCENE_ID_T1 = "20250510T053241_20250510T053240_T43RGM"
SCENE_ID_T2 = "20250123T053029_20250123T053836_T43RGM"

# Measured baseline metrics at τ = 0.60 on 2025-05-10 (10 m pixel counts vs. Sen2Cor SCL)
BASELINE_METRICS = {
    "date": "2025-05-10",
    "scene_id": SCENE_ID_T1,
    "tau": 0.60,
    "cloud_cover_csp": 0.62,      # Cloud Score+ at τ=0.60 (%)
    "cloud_cover_csp_t80": 10.09, # Cloud Score+ at τ=0.80 (%)
    "cloud_cover_scl": 5.84,      # Sen2Cor SCL classes 1,3,8,9,10 (%)
    "precision": 0.8816,
    "recall": 0.0941,
    "f1": 0.1701,
    "kappa": 0.1606,
}

# Dynamic World LULC classes (Shahdara / East Delhi baseline percentages from real pixel-aligned satellite classification)
# Note: Frontend counterpart with t1/t2 distribution coverage lives in frontend/src/demoData.ts
LULC_CLASSES = [
    {"id": 0, "name": "Water",           "color": "#419bdf", "baseline_pct": 0.6},
    {"id": 1, "name": "Trees",           "color": "#397d49", "baseline_pct": 4.3},
    {"id": 2, "name": "Grass",           "color": "#88b053", "baseline_pct": 9.3},
    {"id": 3, "name": "Flooded Veg.",    "color": "#7a87c6", "baseline_pct": 0.0},
    {"id": 4, "name": "Crops",           "color": "#e49635", "baseline_pct": 0.0},
    {"id": 5, "name": "Shrub & Scrub",   "color": "#dfc35a", "baseline_pct": 0.0},
    {"id": 6, "name": "Built Area",      "color": "#c4281b", "baseline_pct": 78.0},
    {"id": 7, "name": "Bare Ground",     "color": "#a59b8f", "baseline_pct": 7.8},
    {"id": 8, "name": "Snow & Ice",      "color": "#b39fe1", "baseline_pct": 0.0},
]
