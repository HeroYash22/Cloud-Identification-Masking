"""
Accurate real pixel-aligned classification of Esri World Imagery for Shahdara AOI:
- Strictly ZERO hardcoded lines, shapes, or artificial straight drain stripes.
- Water: Only genuine dark water pixels (ponds, retention basins, and Sanjay Lake park water).
- Built Area: All residential and commercial blocks (including all areas previously under the artificial diagonal stripe).
- Trees / Grass: Real vegetation (Excess Green & VARI indices + OSM park boundaries).
- Bare Ground: Anand Vihar railway yard and Ghazipur open ground.
"""
import math
import os
import io
import json
import requests
import numpy as np
from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
geojson_path = os.path.join(PROJECT_ROOT, "frontend", "public", "shahdara_lulc.geojson")
out_png = os.path.join(PROJECT_ROOT, "frontend", "public", "shahdara_lulc.png")

AOI_SOUTH = 28.6275
AOI_NORTH = 28.6725
AOI_WEST = 77.2745
AOI_EAST = 77.3255
ZOOM = 14

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = (lon_deg + 180.0) / 360.0 * n
    ytile = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return (xtile, ytile)

x_min_f, y_min_f = deg2num(AOI_NORTH, AOI_WEST, ZOOM)
x_max_f, y_max_f = deg2num(AOI_SOUTH, AOI_EAST, ZOOM)

x_start = int(math.floor(x_min_f))
x_end = int(math.floor(x_max_f))
y_start = int(math.floor(y_min_f))
y_end = int(math.floor(y_max_f))

tile_w = 256
tile_h = 256

num_tiles_x = (x_end - x_start + 1)
num_tiles_y = (y_end - y_start + 1)
stitched_img = Image.new('RGB', (num_tiles_x * tile_w, num_tiles_y * tile_h))
headers = {'User-Agent': 'ShahdaraSatProject/1.0 (academic minor project)'}
failed_tiles = []

with requests.Session() as session:
    session.headers.update(headers)
    for xi in range(x_start, x_end + 1):
        for yi in range(y_start, y_end + 1):
            url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{ZOOM}/{yi}/{xi}"
            try:
                r = session.get(url, timeout=10)
                r.raise_for_status()
                t_img = Image.open(io.BytesIO(r.content)).convert('RGB')
                pos_x = (xi - x_start) * tile_w
                pos_y = (yi - y_start) * tile_h
                stitched_img.paste(t_img, (pos_x, pos_y))
            except Exception as e:
                failed_tiles.append((ZOOM, yi, xi, str(e)))

if failed_tiles:
    raise RuntimeError(
        f"Failed to fetch {len(failed_tiles)} tile(s): {failed_tiles}. "
        "Aborting to avoid classifying unrendered black canvas as water."
    )

crop_x1 = int(round((x_min_f - x_start) * tile_w))
crop_y1 = int(round((y_min_f - y_start) * tile_h))
crop_x2 = int(round((x_max_f - x_start) * tile_w))
crop_y2 = int(round((y_max_f - y_start) * tile_h))

aoi_satellite = stitched_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
width, height = aoi_satellite.size
print(f"AOI Satellite dimensions: {width}x{height}")

sat_arr = np.array(aoi_satellite, dtype=np.float32)
R = sat_arr[:, :, 0]
G = sat_arr[:, :, 1]
B = sat_arr[:, :, 2]

# Spectral calculations
# Excess Green Index (ExG = 2*G - R - B)
exg = 2.0 * G - R - B
# Intensity / Brightness
intensity = (R + G + B) / 3.0
# Saturation
rgb_max = np.maximum(np.maximum(R, G), B)
rgb_min = np.minimum(np.minimum(R, G), B)
saturation = np.zeros_like(intensity)
valid_mask = rgb_max > 0
saturation[valid_mask] = (rgb_max[valid_mask] - rgb_min[valid_mask]) / rgb_max[valid_mask]

# Load OSM features (excluding any artificial linear drain lines)
park_mask = np.zeros((height, width), dtype=bool)
bare_mask = np.zeros((height, width), dtype=bool)

def coords_to_pixels(rings):
    px_rings = []
    for ring in rings:
        px_ring = []
        for pt in ring:
            lon, lat = pt[0], pt[1]
            px = int(round(((lon - AOI_WEST) / (AOI_EAST - AOI_WEST)) * width))
            py = int(round(((AOI_NORTH - lat) / (AOI_NORTH - AOI_SOUTH)) * height))
            px_ring.append((px, py))
        px_rings.append(px_ring)
    return px_rings

if os.path.exists(geojson_path):
    with open(geojson_path, "r", encoding="utf-8") as f:
        geo_data = json.load(f)
    
    for feat in geo_data.get("features", []):
        cat = feat.get("properties", {}).get("category")
        name = feat.get("properties", {}).get("name", "")
        # Explicitly ignore any drain/canal features
        if "drain" in name.lower() or "canal" in name.lower():
            continue
            
        geom = feat.get("geometry", {})
        poly_img = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(poly_img)

        if geom.get("type") == "Polygon":
            rings = coords_to_pixels(geom.get("coordinates", []))
            for r in rings:
                if len(r) >= 3:
                    draw.polygon(r, fill=255)
        elif geom.get("type") == "MultiPolygon":
            for poly in geom.get("coordinates", []):
                for r in coords_to_pixels(poly):
                    if len(r) >= 3:
                        draw.polygon(r, fill=255)
        
        mask_arr = np.array(poly_img) > 128
        if cat in ["trees", "grass"]:
            park_mask |= mask_arr
        elif cat in ["bare_ground", "shrub"]:
            bare_mask |= mask_arr

# Dynamic World palette RGBA (with alpha ~ 190 / 0.75):
COLOR_BUILT = [196, 40, 27, 190]      # Built Area #c4281b
COLOR_TREES = [57, 125, 73, 215]      # Trees #397d49
COLOR_GRASS = [136, 176, 83, 205]     # Grass #88b053
COLOR_BARE  = [165, 155, 143, 205]    # Bare Ground #a59b8f
COLOR_WATER = [65, 155, 223, 225]     # Water #419bdf

# Precise Classification Rules:
# 1. Water: Strictly genuine dark water bodies (ponds, retention basins, Sanjay Lake water)
# Spectral signature: low red (R < 55), low green (G < 65), low intensity (intensity < 60), non-vegetative (ExG < 15)
is_water = (R < 55) & (G < 65) & (intensity < 60) & (exg < 15)

# 2. Trees: Canopy cover inside parks (or dense stand with ExG > 35 and G > 1.15*R)
is_trees = (~is_water) & (
    (park_mask & (G > R * 1.06) & (exg > 20)) |
    ((exg > 38) & (G > R * 1.18) & (G > B * 1.08))
)

# 3. Grass: Sports lawns, park lawns, road medians (park_mask or ExG > 28)
is_grass = (~is_water) & (~is_trees) & (
    (park_mask & (G >= R) & (exg > 10)) |
    ((exg > 28) & (G > R * 1.10) & (G > B))
)

# 4. Bare Ground: Anand Vihar railway yard corridor, Ghazipur bare soil
is_bare = (~is_water) & (~is_trees) & (~is_grass) & (
    bare_mask | 
    ((intensity > 135) & (saturation < 0.12) & (exg < 12))
)

# 5. Built Area: Everything else (concrete buildings, asphalt streets, high-density residential fabric)
# Includes ALL neighborhoods previously cut across by the diagonal line!
is_built = (~is_water) & (~is_trees) & (~is_grass) & (~is_bare)

# Construct final RGBA image
lulc_rgba = np.zeros((height, width, 4), dtype=np.uint8)
lulc_rgba[is_built] = COLOR_BUILT
lulc_rgba[is_bare]  = COLOR_BARE
lulc_rgba[is_trees] = COLOR_TREES
lulc_rgba[is_grass] = COLOR_GRASS
lulc_rgba[is_water] = COLOR_WATER

# Statistics
total_pixels = width * height
cnt_water = int(np.sum(is_water))
cnt_trees = int(np.sum(is_trees))
cnt_grass = int(np.sum(is_grass))
cnt_bare  = int(np.sum(is_bare))
cnt_built = int(np.sum(is_built))

pct_water = round((cnt_water / total_pixels) * 100.0, 1)
pct_trees = round((cnt_trees / total_pixels) * 100.0, 1)
pct_grass = round((cnt_grass / total_pixels) * 100.0, 1)
pct_bare  = round((cnt_bare / total_pixels) * 100.0, 1)
# Ensure built area takes remainder to sum to exactly 100.0
pct_built = round(100.0 - (pct_water + pct_trees + pct_grass + pct_bare), 1)

print("\n--- REAL PIXEL-ALIGNED LULC STATISTICS (WITHOUT HARDCODED STRIPES) ---")
print(f"Total Pixels: {total_pixels} ({width} x {height})")
print(f"Water      : {cnt_water:7d} ({pct_water:5.1f}%)")
print(f"Trees      : {cnt_trees:7d} ({pct_trees:5.1f}%)")
print(f"Grass      : {cnt_grass:7d} ({pct_grass:5.1f}%)")
print(f"Bare Ground: {cnt_bare:7d} ({pct_bare:5.1f}%)")
print(f"Built Area : {cnt_built:7d} ({pct_built:5.1f}%)")
print(f"Sum        : {pct_water + pct_trees + pct_grass + pct_bare + pct_built:5.1f}%")

# Save PNG with alpha
out_img = Image.fromarray(lulc_rgba, mode='RGBA')
out_img.save(out_png, optimize=True)
print(f"\nSuccessfully saved updated raster to {out_png}")
