import argparse
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.constants import AOI  # noqa: E402
from app.services.gee_service import init_gee  # noqa: E402

SCL_NAMES = {0: "no data", 1: "saturated/defective", 2: "dark area", 3: "cloud shadow",
             4: "vegetation", 5: "bare soil", 6: "water", 7: "unclassified",
             8: "cloud medium", 9: "cloud high", 10: "thin cirrus", 11: "snow/ice"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="2025-01-18")
    args = ap.parse_args()

    if not init_gee():
        raise SystemExit("GEE not initialised - run earthengine authenticate and set GEE_PROJECT_ID")
    import ee

    geom = ee.Geometry.Rectangle(AOI["bbox"])
    end = (datetime.strptime(args.date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
           .filterBounds(geom).filterDate(args.date, end))
    n = col.size().getInfo()
    print(f"{n} Sentinel-2 scene(s) intersect the AOI on {args.date}\n")

    for img in col.toList(n).getInfo():
        sid = img["properties"]["system:index"]
        props = img["properties"]
        image = ee.Image(f"COPERNICUS/S2_SR_HARMONIZED/{sid}")

        coverage = image.select("B2").mask().reduceRegion(ee.Reducer.mean(), geom, 10, maxPixels=1e7).getInfo()
        scl_hist = image.select("SCL").reduceRegion(ee.Reducer.frequencyHistogram(), geom, 10, maxPixels=1e7).getInfo()
        scl_hist = scl_hist.get("SCL") or {}
        total = sum(scl_hist.values()) or 1

        print(f"--- {sid}")
        print(f"    tile={props.get('MGRS_TILE')}  orbit={props.get('SENSING_ORBIT_NUMBER')}  "
              f"CLOUDY_PIXEL_PERCENTAGE={props.get('CLOUDY_PIXEL_PERCENTAGE')}")
        print(f"    AOI covered by valid pixels: {100 * (coverage.get('B2') or 0):.1f}%")
        print("    SCL classes in AOI:")
        for k, v in sorted(scl_hist.items(), key=lambda kv: float(kv[0])):
            print(f"      {int(float(k)):2d} {SCL_NAMES.get(int(float(k)), '?'):22s} {100 * v / total:6.2f}%")

        cs_col = (ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")
                  .filter(ee.Filter.eq("system:index", sid)))
        if cs_col.size().getInfo() == 0:
            print("    Cloud Score+: NO matching image for this system:index\n")
            continue
        cs = ee.Image(cs_col.first()).select("cs_cdf")
        pct = cs.reduceRegion(ee.Reducer.percentile([1, 5, 25, 50, 75, 95, 99]), geom, 10, maxPixels=1e7).getInfo()
        print("    cs_cdf percentiles in AOI: " +
              "  ".join(f"p{k.split('_p')[-1]}={v:.3f}" for k, v in sorted(pct.items(), key=lambda kv: float(kv[0].split('_p')[-1]))))
        print()


if __name__ == "__main__":
    main()