import requests

url = "https://overpass-api.de/api/interpreter"
q = """[out:json][timeout:25];
(
  way["natural"="water"](28.6275,77.2745,28.6725,77.3255);
  way["waterway"](28.6275,77.2745,28.6725,77.3255);
  way["leisure"="park"](28.6275,77.2745,28.6725,77.3255);
  way["leisure"="sports_centre"](28.6275,77.2745,28.6725,77.3255);
  way["landuse"="railway"](28.6275,77.2745,28.6725,77.3255);
);
out geom;
"""
try:
    r = requests.post(url, data={"data": q}, headers={"User-Agent": "ShahdaraSatProject/1.0"}, timeout=30)
    print("Status:", r.status_code)
    if r.status_code == 200:
        elements = r.json().get("elements", [])
        print("Elements count:", len(elements))
        tags_seen = set()
        for el in elements[:10]:
            print("Type:", el.get("type"), "Tags:", el.get("tags", {}).get("name"), el.get("tags", {}).get("leisure") or el.get("tags", {}).get("waterway") or el.get("tags", {}).get("natural") or el.get("tags", {}).get("landuse"))
    else:
        print("Response body:", r.text[:300])
except Exception as e:
    print("Error:", e)
