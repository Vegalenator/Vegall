#!/usr/bin/env python3
"""Запуск подключений к первоисточникам.

    python3 build/connect.py --list           что подключено и в каком состоянии
    python3 build/connect.py --run nvda-quarter
    python3 build/connect.py --run-all
    python3 build/connect.py --apply nvda-quarter   перенести величины в данные
    python3 build/connect.py --selftest       проверить, что отказы срабатывают

Подключение само в данные не пишет. Оно кладёт предложение в build/proposals/
и обновляет terminal/data/feeds.js, где видно: что говорит источник, что стоит
в терминале и совпадают ли они. Перенос величины — отдельное решение человека.
"""
import datetime
import importlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "terminal" / "data"
PROPOSALS = ROOT / "build" / "proposals"
FEEDS = DATA / "feeds.js"
TODAY = datetime.date.today().isoformat()

sys.path.insert(0, str(ROOT / "build"))

CONNECTORS = ["nvda", "asml"]

# источники, для которых подключение объявлено, но не сделано, и почему
DECLARED = [
    {"source": "S4", "title": "IEA — энергопотребление ЦОД", "why": "iea.org отвечает 403 на запрос из среды сборки"},
    {"source": "S17", "title": "CoreWeave — форма 10-Q", "why": "sec.gov отвечает 403; нужен доступ с объявленным User-Agent по правилам SEC"},
    {"source": "S15", "title": "Amazon — квартальный релиз", "why": "ir.aboutamazon.com отвечает 403"},
    {"source": "S13", "title": "Broadcom — квартальный релиз", "why": "investors.broadcom.com отвечает 403"},
    {"source": "S14", "title": "Oracle — годовой релиз", "why": "investor.oracle.com отвечает 403"},
    {"source": "S18", "title": "TSMC — квартальные результаты", "why": "investor.tsmc.com отвечает 403"},
    {"source": "S16", "title": "Meta — квартальный релиз", "why": "investor.atmeta.com отвечает 403"},
    {"source": "—", "title": "Рыночный слой: котировки и кредитные спрэды",
     "why": "FRED не отвечает, Stooq отдаёт JS-заглушку, Yahoo — 429, AlphaVantage требует ключ. Слой A остаётся неподключённым"},
]


def load(name):
    return importlib.import_module(f"connectors.{name}")


def current_value(target):
    """Достать величину, которая сейчас стоит в данных терминала."""
    _, entity, field = target.split(".")
    src = (DATA / "companies.js").read_text(encoding="utf-8")
    m = re.search(r"id: '" + re.escape(entity) + r"'.*?\b" + re.escape(field) + r": ([\d.]+)", src, re.S)
    return float(m.group(1)) if m else None


def set_value(target, value):
    _, entity, field = target.split(".")
    path = DATA / "companies.js"
    src = path.read_text(encoding="utf-8")
    pat = re.compile(r"(id: '" + re.escape(entity) + r"'.*?\b" + re.escape(field) + r": )([\d.]+)", re.S)
    if not pat.search(src):
        return False
    src = pat.sub(lambda m: m.group(1) + ("%g" % value), src, count=1)
    path.write_text(src, encoding="utf-8")
    return True


def refresh_cites(spec, parsed):
    """Успешный запуск — это и есть сверка: обновить дату и цитату в реестре."""
    path = DATA / "citations.js"
    src = path.read_text(encoding="utf-8")
    n = 0
    for key, cite_id in (spec.get("cites") or {}).items():
        got = parsed.get(key) or {}
        quote = (got.get("quote") or "").replace("\\", "\\\\").replace("'", "\\'")
        if not quote:
            continue
        block = re.search(r"('" + re.escape(cite_id) + r"': \{.*?\},\n)", src, re.S)
        if not block:
            continue
        body = block.group(1)
        upd = re.sub(r"checked: '[^']*'", f"checked: '{TODAY}'", body)
        upd = re.sub(r"quote: '(?:[^'\\]|\\.)*'", f"quote: '{quote}'", upd)
        upd = re.sub(r"status: '[^']*'", "status: 'verified'", upd)
        if upd != body:
            src = src.replace(body, upd, 1)
            n += 1
    if n:
        path.write_text(src, encoding="utf-8")
    return n


def run(name):
    mod = load(name)
    spec = mod.SPEC
    from connectors import CheckError
    rec = {"id": spec["id"], "source": spec["source"], "title": spec["title"],
           "cadence": spec["cadence_days"], "url": spec["url"], "lastRun": TODAY, "fields": []}
    try:
        text = mod.fetch(spec["url"]) if hasattr(mod, "fetch") else __import__(
            "connectors", fromlist=["fetch"]).fetch(spec["url"])
        parsed = mod.parse(text)
        mod.check(text, parsed)
        rec["state"] = "ok"
        rec["period"] = parsed.get("_period") or ""
        rec["published"] = parsed.get("_published") or ""
        rec["citesRefreshed"] = refresh_cites(spec, parsed)
    except CheckError as e:
        rec["state"] = "failed"
        rec["error"] = str(e)
        print(f"  ОТКАЗ  {spec['id']}: {e}")
        return rec, {}
    except Exception as e:  # сеть, разбор документа
        rec["state"] = "failed"
        rec["error"] = f"{type(e).__name__}: {e}"
        print(f"  ОТКАЗ  {spec['id']}: {rec['error']}")
        return rec, {}

    proposal = {}
    for f in spec["fields"]:
        got = parsed[f["key"]]
        cur = current_value(f["target"])
        same = cur is not None and abs(cur - got["value"]) < 1e-9
        rec["fields"].append({
            "key": f["key"], "definition": f["definition"], "unit": f["unit"],
            "target": f["target"], "source_value": got["value"], "terminal_value": cur,
            "match": bool(same), "quote": got["quote"], "loc": got["loc"],
            "cite": spec.get("cites", {}).get(f["key"], ""),
        })
        if not same:
            proposal[f["target"]] = {"from": cur, "to": got["value"], "quote": got["quote"]}
        print(f"  {'=' if same else '≠'} {f['key']:14} источник {got['value']:<10} терминал {cur}")
    rec["divergent"] = len(proposal)
    if rec.get("citesRefreshed"):
        print(f"  сверка обновлена в реестре: {rec['citesRefreshed']} запис.")
    if proposal:
        PROPOSALS.mkdir(parents=True, exist_ok=True)
        (PROPOSALS / f"{spec['id']}.json").write_text(
            json.dumps(proposal, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  предложение записано: build/proposals/{spec['id']}.json")
    return rec, proposal


def write_feeds(records):
    old = {}
    if FEEDS.exists():
        m = re.search(r"window\.VG_FEEDS = (\{.*\});", FEEDS.read_text(encoding="utf-8"), re.S)
        if m:
            for r in json.loads(m.group(1)).get("connectors", []):
                old[r["id"]] = r
    for r in records:
        old[r["id"]] = r
    payload = {"updated": TODAY, "connectors": list(old.values()), "declared": DECLARED}
    head = ("/* Состояние подключений к первоисточникам.\n"
            "   Пишется скриптом build/connect.py. Руками не правится.\n"
            "   source_value — что сказал источник, terminal_value — что стоит в данных. */\n"
            "window.VG_FEEDS = ")
    FEEDS.write_text(head + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


def apply(name):
    mod = load(name)
    spec = mod.SPEC
    path = PROPOSALS / f"{spec['id']}.json"
    if not path.exists():
        sys.exit(f"предложения нет: сначала выполните --run {spec['id']}")
    proposal = json.loads(path.read_text(encoding="utf-8"))
    for target, ch in proposal.items():
        ok = set_value(target, ch["to"])
        print(f"  {'✓' if ok else '✕'} {target}: {ch['from']} → {ch['to']}")
    path.unlink()
    print("  предложение применено и удалено. Зафиксируйте снимок: python3 build/snapshot.py «…»")


def main():
    args = sys.argv[1:]
    if not args or "--list" in args:
        print("Подключения:")
        for n in CONNECTORS:
            s = load(n).SPEC
            print(f"  {s['id']:16} {s['title']:34} раз в {s['cadence_days']} дн.  {s['source']}")
        print("\nОбъявлены, но не подключены:")
        for d in DECLARED:
            print(f"  {d['source']:4} {d['title']:44} {d['why']}")
        return
    if "--selftest" in args:
        from connectors import selftest
        sys.exit(0 if selftest.run() else 1)
    if "--apply" in args:
        apply(args[args.index("--apply") + 1].replace("-quarter", ""))
        return
    names = CONNECTORS if "--run-all" in args else [args[args.index("--run") + 1]]
    records = []
    for n in names:
        key = n.replace("-quarter", "")
        print(f"\n{key}:")
        rec, _ = run(key)
        records.append(rec)
    write_feeds(records)
    print(f"\nterminal/data/feeds.js обновлён")


if __name__ == "__main__":
    main()
