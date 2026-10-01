#!/usr/bin/env python3
"""Сборщик данных для терминала «Карта товарных потоков».

Слои данных:
  1. Структурный (UN Comtrade, годовые и месячные данные): кто экспортирует,
     доли, динамика к прошлому году, крупнейшие покупатели. Для стран, которые
     не сдают статистику в ООН (Россия, Иран, Венесуэла и др.), экспорт
     восстанавливается «зеркально» — по импорту стран-партнёров.
  2. Быстрый (EIA weekly, IMF IRFCL, GIE AGSI): еженедельный экспорт США,
     золото центробанков, заполненность газовых хранилищ ЕС.

Запуск: python3 flows/fetch/update.py
Переменные окружения (необязательно):
  COMTRADE_KEY — ключ UN Comtrade (бесплатная регистрация). Без ключа
                 используется открытый preview-доступ.
  GIE_API_KEY  — ключ AGSI (бесплатная регистрация на agsi.gie.eu).

Результат: flows/data/flows.json. Ответы источников кэшируются в
flows/data/cache, так что повторный запуск в тот же день почти бесплатен.
"""
import csv
import datetime as dt
import hashlib
import html
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CACHE = os.path.join(DATA, "cache")
OUT = os.path.join(DATA, "flows.json")
NOTES = os.path.join(DATA, "notes.json")

TODAY = dt.date.today()
COMTRADE_KEY = os.environ.get("COMTRADE_KEY", "").strip()
GIE_KEY = os.environ.get("GIE_API_KEY", "").strip()

# ---------------------------------------------------------------- рынки ---
# group: energy | metals | food | precious
COMMODITIES = [
    dict(id="crude", group="energy", name="Сырая нефть", hs="2709",
         unit_note="нефть сырая и газовый конденсат",
         pulse=["eia_crude"]),
    dict(id="products", group="energy", name="Дизель и мазут", hs="271019",
         unit_note="средние и тяжёлые дистилляты: дизель, газойль, мазут, масла. "
                   "Таможенная статистика не отделяет дизель от мазута на уровне 6 знаков",
         pulse=["eia_distillate"]),
    dict(id="lng", group="energy", name="СПГ", hs="271111",
         unit_note="природный газ сжиженный", pulse=["gie_storage"]),
    dict(id="pipegas", group="energy", name="Трубопроводный газ", hs="271121",
         unit_note="природный газ в газообразном состоянии, в основном трубопроводный. Хабы (Бельгия, Нидерланды) реэкспортируют в том числе регазифицированный СПГ: с карточкой СПГ не складывать", pulse=["gie_storage"]),
    dict(id="coal", group="energy", name="Уголь", hs="2701",
         unit_note="каменный уголь: энергетический и коксующийся"),
    dict(id="ironore", group="metals", name="Железная руда", hs="2601",
         unit_note="руды и концентраты железные"),
    dict(id="copper", group="metals", name="Медь рафинированная", hs="7403",
         unit_note="медь рафинированная и сплавы, необработанные"),
    dict(id="copperore", group="metals", name="Медная руда и концентрат", hs="2603",
         unit_note="руды и концентраты медные"),
    dict(id="aluminium", group="metals", name="Алюминий", hs="7601",
         unit_note="алюминий необработанный"),
    dict(id="nickel", group="metals", name="Никель", hs="7502",
         unit_note="никель необработанный"),
    dict(id="wheat", group="food", name="Пшеница", hs="1001",
         unit_note="пшеница и меслин"),
    dict(id="corn", group="food", name="Кукуруза", hs="1005", unit_note="кукуруза"),
    dict(id="soy", group="food", name="Соевые бобы", hs="1201", unit_note="соевые бобы"),
    dict(id="fert", group="food", name="Удобрения", hs="31",
         unit_note="все минеральные и химические удобрения (группа 31)"),
    dict(id="gold", group="precious", name="Золото: физическая торговля", hs="7108",
         unit_note="золото немонетарное: слитки, полуфабрикаты"),
]

# Страны, которые часто не сдают статистику или сдают с большой задержкой.
# Для них экспорт считается по импорту партнёров. M49-коды Comtrade.
MIRROR_CANDIDATES = [643, 364, 862, 368, 414, 634, 434, 566, 24, 12, 795, 112,
                     180, 324, 496, 398, 804, 784, 682, 32, 860, 894, 152, 604,
                     360, 36, 76, 124, 579, 458, 96, 512, 818, 710, 608, 178]
FOCUS = 643          # Россия: всегда в фокусе, если присутствует на рынке
MONTHLY_MIRROR_MAX = 2   # для скольких «зеркальных» стран строить помесячный ряд
TOP_N = 12
BUYERS_FOR = 8

# Реэкспортные хабы: высокое место в рейтинге, но товар не свой.
HUBS = {528: "NL", 56: "BE", 702: "SG", 344: "HK", 784: "AE", 757: "CH", 458: "MY"}
SKIP_PARTNERS = {0, 97, 837, 838, 839, 899}

# ---------------------------------------------------------------- сеть ----
_last_call = [0.0]
FETCH_DATES = set()  # даты получения ответов Comtrade для текущего рынка
STATS = {"calls": 0, "cached": 0, "errors": 0}


def _cache_path(key):
    return os.path.join(CACHE, hashlib.sha1(key.encode()).hexdigest()[:20] + ".json")


def http_get(url, headers=None, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": "flows-terminal/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def cached(key, ttl_days, fn):
    """Возвращает закэшированный результат fn() не старше ttl_days."""
    p = _cache_path(key)
    if os.path.exists(p):
        try:
            with open(p) as f:
                obj = json.load(f)
            # Джиттер по ключу, чтобы кэш не истекал весь в один день.
            jitter = int(hashlib.sha1(key.encode()).hexdigest(), 16) % 3
            age = (TODAY - dt.date.fromisoformat(obj["fetched"])).days
            if age < ttl_days + jitter:
                STATS["cached"] += 1
                if key.startswith("ct:"):
                    FETCH_DATES.add(obj["fetched"])
                return obj["data"]
        except Exception:
            pass
    data = fn()
    if data is not None and key.startswith("ct:"):
        FETCH_DATES.add(TODAY.isoformat())
    if data is not None:
        os.makedirs(CACHE, exist_ok=True)
        with open(p, "w") as f:
            json.dump({"key": key, "fetched": TODAY.isoformat(), "data": data}, f, separators=(",", ":"))
    elif os.path.exists(p):  # сеть недоступна — берём устаревший кэш
        with open(p) as f:
            return json.load(f)["data"]
    return data


def comtrade(freq, period, flow, cmd, reporter=None, partner=None, ttl=7):
    """Один запрос к Comtrade. Возвращает список компактных строк."""
    q = {"period": period, "cmdCode": cmd, "flowCode": flow}
    if reporter is not None:
        q["reporterCode"] = reporter
    if partner is not None:
        q["partnerCode"] = partner
    if COMTRADE_KEY:
        base = f"https://comtradeapi.un.org/data/v1/get/C/{freq}/HS"
        q.update(customsCode="C00", motCode=0, partner2Code=0)
        headers = {"Ocp-Apim-Subscription-Key": COMTRADE_KEY}
    else:
        base = f"https://comtradeapi.un.org/public/v1/preview/C/{freq}/HS"
        headers = {}
    url = base + "?" + urllib.parse.urlencode(q)

    def fetch():
        for attempt in range(5):
            wait = 1.6 - (time.time() - _last_call[0])
            if wait > 0:
                time.sleep(wait)
            _last_call[0] = time.time()
            STATS["calls"] += 1
            try:
                d = json.loads(http_get(url, headers))
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    print(f"  http {e.code}, пауза", file=sys.stderr)
                    time.sleep(5 * 3 ** attempt)
                    continue
                STATS["errors"] += 1
                return None
            except Exception:
                time.sleep(5 * 2 ** attempt)
                continue
            if d.get("error"):
                if "rate" in d["error"].lower() or "limit" in d["error"].lower():
                    time.sleep(10 * 3 ** attempt)
                    continue
                STATS["errors"] += 1
                print("  comtrade error:", d["error"], url, file=sys.stderr)
                return None
            rows = []
            for x in d.get("data") or []:
                if x.get("motCode", 0) != 0 or x.get("partner2Code", 0) != 0:
                    continue
                if x.get("customsCode", "C00") != "C00":
                    continue
                rows.append([x["reporterCode"], x["partnerCode"], x["period"],
                             x.get("primaryValue") or 0, x.get("netWgt") or 0])
            return rows
        STATS["errors"] += 1
        return None

    return cached("ct:" + url, ttl, fetch)


# ------------------------------------------------------------ справочник ---
def load_areas():
    def fetch():
        d = json.loads(http_get("https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json"))
        out = {}
        for x in d["results"]:
            out[str(x["id"])] = [x.get("PartnerCodeIsoAlpha2") or "", x["text"],
                                 (x.get("PartnerCodeIsoAlpha3") or "").strip()]
        return out
    areas = cached("areas:v2", 30, fetch) or {}
    areas["490"] = ["TW", "Taiwan", "TWN"]
    return areas


AREAS = {}


def iso2(code):
    return (AREAS.get(str(code)) or ["", ""])[0]


def is_country(code):
    return code not in SKIP_PARTNERS and bool(iso2(code))


# ----------------------------------------------------------- Comtrade ------
def months_back(n_from, n_to):
    """Список периодов YYYYMM от (сегодня - n_to) до (сегодня - n_from) мес."""
    out = []
    y, m = TODAY.year, TODAY.month
    for k in range(n_to, n_from - 1, -1):
        yy, mm = y, m - k
        while mm <= 0:
            mm += 12
            yy -= 1
        out.append(f"{yy}{mm:02d}")
    return out


def mass(rows_by_partner, need=0.9):
    """Масса по набору партнёров или None. Масса 0 при ненулевой стоимости
    означает «не указана», а не «ноль тонн». Сумма засчитывается, только если
    партнёры с известной массой дают не меньше need стоимости."""
    vals = list(rows_by_partner)
    total = sum(v[0] for v in vals)
    known = [v for v in vals if v[1] and v[1] > 0]
    if not known or sum(v[0] for v in known) < need * total:
        return None
    return sum(v[1] for v in known)


def importers_active(cmd, year):
    """Страны, сдавшие в ООН импорт этого товара за год (из любых стран).
    Для них отсутствие строки «импорт из X» — настоящий ноль, а не пропуск."""
    rows = comtrade("A", year, "M", cmd, partner=0, ttl=7) or []
    return {r[0] for r in rows if is_country(r[0])}


def exports_reported(cmd, year):
    rows = comtrade("A", year, "X", cmd, partner=0, ttl=7) or []
    return {r[0]: (r[3], r[4]) for r in rows if is_country(r[0])}


def mirror(cmd, year, partner, ttl=7):
    """Импорт всех стран из partner → {импортёр: (usd, kg)}."""
    rows = comtrade("A", year, "M", cmd, partner=partner, ttl=ttl) or []
    return {r[0]: (r[3], r[4]) for r in rows if is_country(r[0])}


def build_market(c):
    cmd = c["hs"]
    print(f"• {c['name']} ({cmd})", file=sys.stderr)
    FETCH_DATES.clear()
    y_last = TODAY.year - 1
    rep = {y_last: exports_reported(cmd, y_last), y_last - 1: exports_reported(cmd, y_last - 1)}
    # Берём последний год, если по нему отчитались хотя бы 75% стран прошлого года.
    year = y_last if len(rep[y_last]) >= 0.75 * max(1, len(rep[y_last - 1])) else y_last - 1
    prev = year - 1
    if prev not in rep:
        rep[prev] = exports_reported(cmd, prev)
    cur, old = rep[year], rep[prev]

    # Кандидаты на зеркальную оценку: известные «молчуны» и крупные экспортёры
    # прошлого года, не отчитавшиеся за текущий.
    big_old = sorted(old, key=lambda k: -old[k][0])[:15]
    cands = [k for k in dict.fromkeys(MIRROR_CANDIDATES + big_old) if k not in cur]
    rows = {}
    for code, (usd, kg) in cur.items():
        rows[code] = dict(code=code, usd=usd, kg=kg if kg and kg > 0 else None, method="reported")
    mirrors = {}
    threshold = max([v[0] for v in cur.values()] + [1]) * 0.01
    for code in cands:
        m = mirror(cmd, year, code)
        usd = sum(v[0] for v in m.values())
        if usd < threshold:
            continue
        mirrors[code] = m
        rows[code] = dict(code=code, usd=usd, kg=mass(m.values()),
                          method="mirror", importers=len(m))

    total = sum(r["usd"] for r in rows.values()) or 1
    # Мировой тоннаж и доли по тоннам считаются, только если масса известна
    # у стран, дающих не меньше 85% стоимости. Иначе знаменатель — неполная
    # выборка (как у железной руды, где массу не дают Австралия и Бразилия).
    t_cov = sum(r["usd"] for r in rows.values() if r["kg"]) / total
    total_kg = sum(r["kg"] for r in rows.values() if r["kg"]) if t_cov >= 0.85 else None
    t_missing = [iso2(r["code"]) for r in sorted(rows.values(), key=lambda r: -r["usd"]) if not r["kg"]][:4]
    ranked = sorted(rows.values(), key=lambda r: -r["usd"])
    for i, r in enumerate(ranked, 1):
        r["rank"] = i
        r["share"] = r["usd"] / total
        r["share_kg"] = r["kg"] / total_kg if (r["kg"] and total_kg) else None

    # Динамика к прошлому году. Для зеркальных оценок сравниваем только по тем
    # импортёрам, которые отчитались за оба года, иначе неполнота исказит итог.
    for r in ranked[:TOP_N + 4]:
        code = r["code"]
        if r["method"] == "reported" and code in old and old[code][0]:
            r["yoy"] = r["usd"] / old[code][0] - 1
            if old[code][1] and r["kg"]:
                r["yoy_kg"] = r["kg"] / old[code][1] - 1
        elif r["method"] == "mirror":
            m_old = mirror(cmd, prev, code)
            # Панель: импортёры, сдавшие статистику по товару в оба года.
            # Если такой импортёр перестал покупать у страны — это настоящее падение.
            common = importers_active(cmd, year) & importers_active(cmd, prev)
            a = sum(mirrors[code].get(k, (0, 0))[0] for k in common)
            b = sum(m_old.get(k, (0, 0))[0] for k in common)
            if b:
                r["yoy"] = a / b - 1
            ak = mass(mirrors[code][k] for k in common if k in mirrors[code])
            bk = mass(m_old[k] for k in common if k in m_old)
            if bk and ak:
                r["yoy_kg"] = ak / bk - 1

    top = ranked[:TOP_N]
    focus_codes = [r["code"] for r in top[:BUYERS_FOR]]
    focus_row = next((r for r in ranked if r["code"] == FOCUS), None)
    if focus_row and FOCUS not in focus_codes:
        focus_codes.append(FOCUS)
        if focus_row not in top:
            top.append(focus_row)

    # Крупнейшие покупатели
    for r in top:
        if r["code"] not in focus_codes:
            continue
        pairs = []
        if r["method"] == "reported":
            got = comtrade("A", year, "X", cmd, reporter=r["code"], ttl=10) or []
            pairs = [(x[1], (x[3], x[4])) for x in got if is_country(x[1])]
            # Некоторые страны (например, Саудовская Аравия) раскрывают партнёров
            # лишь частично; тогда покупателей берём из статистики импортёров.
            # Код 490 («Прочая Азия») часто служит корзиной для засекреченных
            # партнёров: у Саудовской Аравии туда попадает 80% нефти.
            hidden = sum(v[0] for k, v in pairs if k == 490)
            if sum(v[0] for _, v in pairs) < 0.6 * r["usd"] or hidden > 0.3 * r["usd"]:
                pairs = []
        if not pairs:
            m = mirrors.get(r["code"]) or mirror(cmd, year, r["code"])
            pairs = list(m.items())
            r["buyers_mirror"] = True
        pairs = sorted(pairs, key=lambda kv: -kv[1][0])
        tot = sum(v[0] for _, v in pairs) or 1
        r["buyers"] = [[iso2(k), round(v[0] / tot, 4)] for k, v in pairs[:6]]

    # Помесячная динамика: один запрос на месяц покрывает всех отчитавшихся.
    months = months_back(2, 15)
    monthly = {}
    reporters_by_month = {}
    for p in months:
        got = comtrade("M", p, "X", cmd, partner=0, ttl=3 if p >= months[-4] else 20) or []
        reporters_by_month[p] = len(got)
        for x in got:
            monthly.setdefault(x[0], {})[p] = [x[3], x[4]]
    for r in top:
        if r["method"] == "reported" and r["code"] in monthly:
            r["monthly"] = [[p] + monthly[r["code"]][p] for p in months if p in monthly[r["code"]]]

    # Помесячная зеркальная оценка — только для фокусных «молчунов».
    # Помесячно отчитываются не все импортёры (Китай, например, нет), поэтому
    # берём устойчивый набор стран, сдающих данные почти каждый месяц, и
    # суммируем только их. Так ряд сопоставим месяц к месяцу; его доля в
    # годовом объёме показывается как «покрытие».
    mirror_monthly = [r for r in top if r["method"] == "mirror"]
    mirror_monthly.sort(key=lambda r: (r["code"] != FOCUS, -r["usd"]))
    for r in mirror_monthly[:MONTHLY_MIRROR_MAX]:
        base = mirrors[r["code"]]
        base_tot = sum(v[0] for v in base.values()) or 1
        by_month = {}
        for p in months:
            got = comtrade("M", p, "M", cmd, partner=r["code"], ttl=3 if p >= months[-4] else 20) or []
            by_month[p] = {x[0]: (x[3], x[4]) for x in got if is_country(x[0])}
        seen = {}
        for p, rows_m in by_month.items():
            for k in rows_m:
                seen[k] = seen.get(k, 0) + 1
        need = max(1, int(0.75 * sum(1 for v in by_month.values() if v)))
        stable = {k for k, n in seen.items() if n >= need}
        stable_base = sum(base.get(k, (0, 0))[0] for k in stable)
        if not stable or stable_base / base_tot < 0.2:
            continue
        ser = []
        for p in months:
            rows_m = by_month[p]
            have = sum(base.get(k, (0, 0))[0] for k in stable if k in rows_m)
            if have < 0.85 * stable_base:
                continue
            ser.append([p, sum(rows_m[k][0] for k in stable if k in rows_m),
                        mass(rows_m[k] for k in stable if k in rows_m) or 0])
        if len(ser) >= 3:
            r["monthly"] = ser
            r["monthly_cov"] = round(stable_base / base_tot, 3)
            r["monthly_by"] = [iso2(k) for k in sorted(stable, key=lambda k: -base.get(k, (0, 0))[0])[:4]]
            r["monthly_missing"] = [iso2(k) for k in sorted(base, key=lambda k: -base[k][0])
                                    if k not in stable][:3]

    # Крупнейшие импортёры мира
    imp = comtrade("A", year, "M", cmd, partner=0, ttl=7) or []
    imp = sorted([x for x in imp if is_country(x[0])], key=lambda x: -x[3])
    imp_tot = sum(x[3] for x in imp) or 1

    def clean(r):
        out = {"iso": iso2(r["code"]), "m49": r["code"], "rank": r["rank"],
               "usd": round(r["usd"]), "t": round(r["kg"] / 1000) if r["kg"] else None,
               "share": round(r["share"], 4), "method": r["method"]}
        for k in ("yoy", "yoy_kg"):
            if r.get(k) is not None:
                out[k] = round(r[k], 4)
        if r.get("share_kg") is not None:
            out["share_t"] = round(r["share_kg"], 4)
        if r["method"] == "mirror":
            out["importers"] = r["importers"]
        if r["code"] in HUBS:
            out["hub"] = True
        for k in ("buyers", "buyers_mirror", "monthly_cov", "monthly_by", "monthly_missing"):
            if k in r:
                out[k] = r[k]
        if "monthly" in r:
            out["monthly"] = [[m[0], round(m[1]), round(m[2] / 1000)] + m[3:] for m in r["monthly"]]
        return out

    write_export(c, year, ranked, total, total_kg, t_cov)
    top3 = sum(r["share"] for r in ranked[:3])
    hhi = sum((r["share"] * 100) ** 2 for r in ranked)
    history = build_history(cmd, year, prev, cur, old, ranked, mirrors, top)
    return {
        "id": c["id"], "group": c["group"], "name": c["name"], "hs": cmd,
        "unit_note": c["unit_note"], "year": year, "prev_year": prev,
        "reporters": len(cur), "total_usd": round(total),
        "total_t": round(total_kg / 1000) if total_kg else None,
        "t_cov": round(t_cov, 3), "t_missing": t_missing,
        "top3_share": round(top3, 4), "hhi": round(hhi),
        "exporters": [clean(r) for r in top],
        "importers": [[iso2(x[0]), round(x[3]), round(x[3] / imp_tot, 4)] for x in imp[:6]],
        "months_reporters": reporters_by_month,
        "pulse": c.get("pulse", []),
        "history": history,
        "source": "UN Comtrade",
        "mirrors_n": len(mirrors),
        "extracted": [min(FETCH_DATES), max(FETCH_DATES)] if FETCH_DATES else None,
    }


def write_export(c, year, ranked, total, total_kg, t_cov):
    """Полная таблица рынка (все страны мирового итога) в data/export/<id>.csv —
    чтобы любую долю можно было пересчитать вручную."""
    d = os.path.join(DATA, "export")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{c['id']}.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# рынок", c["name"], "HS", c["hs"], "год", year,
                    "выгрузка", f"{min(FETCH_DATES)}..{max(FETCH_DATES)}" if FETCH_DATES else ""])
        w.writerow(["# мировой итог, USD", round(total), "масса известна у доли стоимости", round(t_cov, 3),
                    "мировой тоннаж, т", round(total_kg / 1000) if total_kg else ""])
        w.writerow(["rank", "iso2", "m49", "method", "usd", "tonnes", "share_usd", "share_t",
                    "importers_used_for_mirror"])
        for r in ranked:
            w.writerow([r["rank"], iso2(r["code"]), r["code"], r["method"], round(r["usd"]),
                        round(r["kg"] / 1000) if r["kg"] else "", round(r["share"], 5),
                        round(r["share_kg"], 5) if r.get("share_kg") else "", r.get("importers", "")])


# ---------------------------------------------------------- история ------
def build_history(cmd, year, prev, cur, old, ranked, mirrors, top):
    """Как рынок менялся за 4 года. Число отчитавшихся стран год от года
    разное, поэтому всё считается по сопоставимому кругу:
    - экспортёры — только те, у кого есть данные за каждый год;
    - для зеркальных оценок — один и тот же круг импортёров во всех четырёх
      годах, иначе выпавший из статистики покупатель выглядел бы как падение."""
    years = [year - 3, year - 2, prev, year]
    mirror_codes = [r["code"] for r in ranked if r["method"] == "mirror"]
    series = {}
    for y in years:
        rep = cur if y == year else (old if y == prev else exports_reported(cmd, y))
        for k, (usd, kg) in rep.items():
            if k not in mirror_codes:
                series.setdefault(k, {})[y] = (usd, kg if kg and kg > 0 else None)
    mirror_cov = {}
    # Панель импортёров, сдававших статистику по товару во все четыре года:
    # отсутствие у них строки «импорт из X» — реальный ноль, а страна, не
    # сдавшая данные в какой-то год, исключается из сравнения целиком.
    panel = set.intersection(*(importers_active(cmd, y) for y in years))
    for k in mirror_codes:
        by_year = {y: (mirrors[k] if y == year else mirror(cmd, y, k, ttl=30)) for y in years}
        cur_tot = sum(v[0] for v in by_year[year].values()) or 1
        cov = sum(v[0] for i, v in by_year[year].items() if i in panel) / cur_tot
        if cov < 0.3:
            continue
        mirror_cov[iso2(k)] = round(cov, 3)
        for y in years:
            sub = [by_year[y][i] for i in panel if i in by_year[y]]
            series.setdefault(k, {})[y] = (sum(v[0] for v in sub), mass(sub))
    matched = [k for k, v in series.items() if all(v.get(y, (0, 0))[0] > 0 for y in years)]
    if not matched:
        return None
    usd = [sum(series[k][y][0] for k in matched) for y in years]
    cur_total = sum(r["usd"] for r in ranked) or 1
    # Тоннаж — только по странам, указавшим массу во все годы.
    matched_t = [k for k in matched if all(series[k][y][1] for y in years)]
    t = [sum(series[k][y][1] for k in matched_t) / 1000 for y in years]
    last_usd = sum(series[k][year][0] for k in matched) or 1
    focus = [r["code"] for r in top[:8]]
    if FOCUS in series and FOCUS not in focus:
        focus.append(FOCUS)
    shares = {}
    for k in focus:
        if k in matched:
            shares[iso2(k)] = [round(series[k][y][0] / usd[i], 4) for i, y in enumerate(years)]
    # Кто сильнее всех нарастил и потерял долю (среди заметных игроков).
    moves = []
    for k in matched:
        a = series[k][years[0]][0] / usd[0]
        b = series[k][years[-1]][0] / usd[-1]
        if max(a, b) >= 0.02:
            moves.append((b - a, iso2(k), round(a, 4), round(b, 4)))
    moves.sort()
    return {
        "years": years, "usd": [round(v) for v in usd], "t": [round(v) for v in t],
        "cov": round(last_usd / cur_total, 3),
        # доля стоимости сопоставимого круга, по которой известна масса
        "cov_t": round(sum(series[k][year][0] for k in matched_t) / last_usd, 3),
        "n": len(matched), "shares": shares, "mirror_cov": mirror_cov,
        "gainers": [list(m[1:]) for m in moves[::-1][:3] if m[0] > 0.003],
        "losers": [list(m[1:]) for m in moves[:3] if m[0] < -0.003],
    }


# ------------------------------------------------------------- EIA -------
EIA_SERIES = {
    "eia_crude": ("WCREXUS2", "США: экспорт сырой нефти"),
    "eia_distillate": ("WDIEXUS2", "США: экспорт дистиллятов (дизель)"),
}


def eia_weekly(sid):
    def fetch():
        raw = http_get(f"https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s={sid}&f=W").decode("latin-1")
        out = []
        for row in re.findall(r"<tr>(.*?)</tr>", raw, re.S):
            ym = re.search(r"class='B6'>\s*(?:&nbsp;)*\s*(\d{4})-(\w{3})", row)
            if not ym:
                continue
            year = int(ym.group(1))
            month = dt.datetime.strptime(ym.group(2), "%b").month
            cells = re.findall(r"class='B5'>([\d/]+)&nbsp;</td>\s*<td class='B3'>([\d,]+)", row)
            for md, val in cells:
                mm, dd = map(int, md.split("/"))
                yy = year + (1 if mm < month else 0)
                out.append([dt.date(yy, mm, dd).isoformat(), int(val.replace(",", ""))])
        return out[-104:] or None
    return cached("eia:" + sid, 1, fetch)


# ------------------------------------------------------------- IMF -------
def imf_gold():
    """Золото в резервах (тройские унции) по IRFCL, все страны, помесячно."""
    start = f"{TODAY.year - 3}-01"

    def fetch():
        url = ("https://api.imf.org/external/sdmx/2.1/data/IMF.STA,IRFCL/"
               ".IRFCLDT1_IRFCL56V_FTO..M?startPeriod=" + start)
        raw = http_get(url, {"Accept": "application/vnd.sdmx.data+csv;version=1.0.0"}, timeout=180)
        series = {}
        for x in csv.DictReader(io.StringIO(raw.decode("utf-8"))):
            if x["SECTOR"] not in ("S1XS1311", "S1X"):
                continue
            try:
                v = float(x["OBS_VALUE"])
            except ValueError:
                continue
            p = x["TIME_PERIOD"].replace("-M", "")
            key = x["COUNTRY"]
            # Предпочитаем сектор «органы управления + ЦБ», если он есть.
            s = series.setdefault(key, {"sector": x["SECTOR"], "obs": {}})
            if s["sector"] != x["SECTOR"]:
                if x["SECTOR"] != "S1XS1311":
                    continue
                s["sector"], s["obs"] = x["SECTOR"], {}
            s["obs"][p] = v
        return {k: sorted(v["obs"].items()) for k, v in series.items()}

    data = cached("imf:gold:" + start, 1, fetch)
    if not data:
        return None
    OZ_T = 31.1034768 / 1e6  # унция → тонна
    ISO3_TO_2 = {v[2]: v[0] for v in AREAS.values() if len(v) > 2 and v[0]}
    ISO3_TO_2.update(CHE="CH", FRA="FR", USA="US", IND="IN", NOR="NO")
    countries = []
    for iso3, obs in data.items():
        # Агрегаты IMF (G163, EZB и т.п.) отбрасываем: только страны.
        if not obs or not re.fullmatch(r"[A-Z]{3}", iso3) or iso3 in ("EZB", "WBG"):
            continue
        # Часть стран периодически сдаёт ряд в других единицах (у Бразилии и
        # Анголы встречаются скачки в тысячи раз). Отбрасываем точки, которые
        # отличаются от медианы ряда больше чем в 3 раза, и заведомо
        # невозможные значения (больше резервов США).
        vals = sorted(v for _, v in obs)
        med = vals[len(vals) // 2]
        obs = [(p, v) for p, v in obs if med and med / 3 <= v <= med * 3 and v * OZ_T < 8200]
        if not obs:
            continue
        last_p, last_v = obs[-1]
        d = dict(obs)

        def ago(n):
            y, m = int(last_p[:4]), int(last_p[4:])
            m -= n
            while m <= 0:
                m += 12
                y -= 1
            return d.get(f"{y}{m:02d}")
        v12 = ago(12)
        countries.append({
            "iso": ISO3_TO_2.get(iso3, ""), "iso3": iso3, "period": last_p, "t": round(last_v * OZ_T, 1),
            "d1": None if ago(1) is None else round((last_v - ago(1)) * OZ_T, 1),
            "d12": None if v12 is None else round((last_v - v12) * OZ_T, 1),
            "monthly": [[p, round(v * OZ_T, 1)] for p, v in obs[-25:]],
        })
    # Отсекаем агрегаты и мелочь; оставляем держателей от 1 т.
    countries = [c for c in countries if c["t"] >= 1]
    countries.sort(key=lambda c: -c["t"])
    latest = max(c["period"] for c in countries)
    return {"id": "cbgold", "group": "precious", "name": "Золото центробанков",
            "source": "IMF IRFCL", "latest": latest, "countries": countries[:60]}


# ------------------------------------------------------------- GIE -------
def gie_storage():
    if not GIE_KEY:
        return None

    def fetch():
        raw = http_get("https://agsi.gie.eu/api?type=eu&size=400", {"x-key": GIE_KEY})
        d = json.loads(raw)
        return [[x["gasDayStart"], float(x["full"]), float(x.get("gasInStorage") or 0)]
                for x in d.get("data", []) if x.get("full") not in (None, "-")][::-1]
    return cached("gie:eu", 1, fetch)


# ------------------------------------------------------------- main ------
def main():
    global AREAS
    os.makedirs(DATA, exist_ok=True)
    AREAS = load_areas()
    prev = {}
    if os.path.exists(OUT):
        with open(OUT) as f:
            prev = {m["id"]: m for m in json.load(f).get("markets", [])}

    only = set(sys.argv[1:])
    markets = []
    for c in COMMODITIES:
        if only and c["id"] not in only:
            if c["id"] in prev:
                markets.append(prev[c["id"]])
            continue
        try:
            m = build_market(c)
            if not m["exporters"] and c["id"] in prev:
                m = prev[c["id"]]
        except Exception as e:  # один сломанный рынок не должен валить остальные
            print(f"  ! {c['id']}: {e}", file=sys.stderr)
            m = prev.get(c["id"])
        if m:
            m["fetched"] = m.get("fetched") if m is prev.get(c["id"]) else TODAY.isoformat()
            markets.append(m)

    pulses = {}
    for key, (sid, label) in EIA_SERIES.items():
        try:
            s = eia_weekly(sid)
            if s:
                pulses[key] = {"label": label, "unit": "тыс. барр./сут", "freq": "неделя",
                               "source": "EIA", "url": f"https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s={sid}&f=W",
                               "series": s}
        except Exception as e:
            print(f"  ! EIA {sid}: {e}", file=sys.stderr)
    try:
        g = gie_storage()
        if g:
            pulses["gie_storage"] = {"label": "ЕС: заполненность газовых хранилищ", "unit": "%",
                                     "freq": "сутки", "source": "GIE AGSI", "url": "https://agsi.gie.eu/",
                                     "series": g}
    except Exception as e:
        print(f"  ! GIE: {e}", file=sys.stderr)

    gold = None
    try:
        gold = imf_gold()
    except Exception as e:
        print(f"  ! IMF: {e}", file=sys.stderr)

    insights = {}
    ipath = os.path.join(DATA, "insights.json")
    if os.path.exists(ipath):
        with open(ipath) as f:
            insights = json.load(f)
    countries = {}
    cpath = os.path.join(DATA, "countries.json")
    if os.path.exists(cpath):
        with open(cpath) as f:
            countries = json.load(f)
    notes = {}
    if os.path.exists(NOTES):
        with open(NOTES) as f:
            notes = json.load(f)

    out = {
        "updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "markets": markets, "pulses": pulses, "cbgold": gold, "notes": notes, "insights": insights, "countries": countries,
        "stats": STATS,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"готово: {len(markets)} рынков, запросов {STATS['calls']}, из кэша {STATS['cached']}, "
          f"ошибок {STATS['errors']}", file=sys.stderr)


if __name__ == "__main__":
    main()
