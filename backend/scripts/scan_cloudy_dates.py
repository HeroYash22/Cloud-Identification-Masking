import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.constants import AOI  # noqa: E402
from app.services.gee_service import init_gee  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2024-06-01")
    ap.add_argument("--end", default="2025-06-30")
    ap.add_argument("--min-cloud", type=float, default=0.5, help="hide scenes below this SCL cloud %% in AOI")
    args = ap.parse_args()

    if not init_gee():
        raise SystemExit("GEE not initialised - run earthengine authenticate and set GEE_PROJECT_ID")
    import ee

    geom = ee.Geometry.Rectangle(AOI["bbox"])
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
           .filterBounds(geom).filterDate(args.start, args.end))

    def stats(img):
        scl = img.select("SCL")
        cloud = scl.eq(1).Or(scl.eq(3)).Or(scl.eq(8)).Or(scl.eq(9)).Or(scl.eq(10)).rename("cloud")
        valid = scl.neq(0).rename("valid")
        d = ee.Image.cat([cloud, valid]).reduceRegion(ee.Reducer.mean(), geom, 10, maxPixels=1e7)
        return ee.Feature(None, {
            "date": img.date().format("YYYY-MM-dd"),
            "id": img.get("system:index"),
            "tile": img.get("MGRS_TILE"),
            "cloud": d.get("cloud"),
            "valid": d.get("valid"),
        })

    print(f"Scanning {col.size().getInfo()} scenes {args.start} .. {args.end} (this can take a few minutes)...")
    rows = [f["properties"] for f in col.map(stats).getInfo()["features"]]
    rows = [r for r in rows if r.get("cloud") is not None and (r.get("valid") or 0) > 0.95]
    rows.sort(key=lambda r: r["cloud"], reverse=True)

    print(f"\n{'date':12s} {'tile':7s} {'SCL cloud % in AOI':>20s}   scene id")
    for r in rows:
        pct = 100 * r["cloud"]
        if pct >= args.min_cloud:
            print(f"{r['date']:12s} {str(r['tile']):7s} {pct:20.2f}   {r['id']}")
    print(f"\n{sum(1 for r in rows if 100 * r['cloud'] >= args.min_cloud)} scene(s) with >= {args.min_cloud}% cloud "
          f"out of {len(rows)} fully covering the AOI.")


if __name__ == "__main__":
    main()