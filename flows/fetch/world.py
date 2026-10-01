#!/usr/bin/env python3
"""Готовит контурную карту мира для терминала: flows/data/world.json.

Берёт world-atlas 110m (Natural Earth), проецирует в равнопромежуточную
проекцию 1000×394 (широты от 84° с.ш. до 58° ю.ш., без Антарктиды) и
сохраняет SVG-контуры стран и их «центры» (центроид крупнейшего полигона)
с ключом ISO-2. Запускается один раз: границы на карте меняются редко.
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "world.json")
SRC = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"
AREAS = "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json"

W, LAT_N, LAT_S = 1000, 84.0, -58.0
H = round(W * (LAT_N - LAT_S) / 360)

# Коды, где ISO 3166 расходится с M49-кодами Comtrade.
ISO_FIX = {"840": "US", "250": "FR", "356": "IN", "756": "CH", "578": "NO",
           "158": "TW", "-99": "", "010": ""}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "flows-terminal/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    topo = get(SRC)
    iso = {}
    for x in get(AREAS)["results"]:
        if x.get("PartnerCodeIsoAlpha2"):
            iso[str(x["id"]).zfill(3)] = x["PartnerCodeIsoAlpha2"]
    iso.update({k: v for k, v in ISO_FIX.items()})

    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            lon, lat = x * sx + tx, y * sy + ty
            pts.append(((lon + 180) / 360 * W, (LAT_N - max(LAT_S, min(LAT_N, lat))) / (LAT_N - LAT_S) * H))
        arcs.append(pts)

    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        # Контур, пересекающий 180-й меридиан (Чукотка), «разворачиваем»,
        # чтобы он не тянулся через всю карту; хвост за краем обрежется.
        out, shift = [], 0.0
        for k, (x, y) in enumerate(pts):
            if k:
                px = pts[k - 1][0]
                if x - px > W / 2:
                    shift -= W
                elif px - x > W / 2:
                    shift += W
            out.append((x + shift, y))
        return out

    def area_centroid(pts):
        a = cx = cy = 0.0
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            f = x0 * y1 - x1 * y0
            a += f
            cx += (x0 + x1) * f
            cy += (y0 + y1) * f
        if not a:
            return 0, pts[0]
        return abs(a) / 2, (cx / (3 * a), cy / (3 * a))

    countries, centers = {}, {}
    for g in topo["objects"]["countries"]["geometries"]:
        code = iso.get(str(g.get("id", "")).zfill(3), "")
        if not code or g["type"] not in ("Polygon", "MultiPolygon"):
            continue
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        d, best = [], (0, None)
        for poly in polys:
            for k, r in enumerate(poly):
                pts = ring(r)
                if len(pts) < 3:
                    continue
                d.append("M" + "L".join(f"{x:.0f},{y:.0f}" for x, y in pts) + "Z")
                if k == 0:
                    ar, c = area_centroid(pts)
                    if ar > best[0]:
                        best = (ar, c)
        countries[code] = "".join(d)
        if best[1]:
            centers[code] = [round(best[1][0], 1), round(best[1][1], 1)]
    # Хабы и мелкие страны, которых нет в 110m.
    def pt(lon, lat):
        return [round((lon + 180) / 360 * W, 1), round((LAT_N - lat) / (LAT_N - LAT_S) * H, 1)]
    # Россия пересекает 180-й меридиан, её центроид уезжает за край карты.
    centers["RU"] = pt(95, 62)
    centers.update({k: pt(*v) for k, v in {
        "SG": (103.8, 1.35), "HK": (114.2, 22.3), "BH": (50.6, 26.1), "MT": (14.4, 35.9),
        "LU": (6.1, 49.6), "MU": (57.6, -20.3), "BN": (114.7, 4.5), "QA": (51.2, 25.3),
    }.items() if k not in centers})
    with open(OUT, "w") as f:
        json.dump({"w": W, "h": H, "countries": countries, "centers": centers}, f, separators=(",", ":"))
    print("world.json:", round(os.path.getsize(OUT) / 1024), "KB,", len(countries), "стран")


if __name__ == "__main__":
    main()
