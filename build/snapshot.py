#!/usr/bin/env python3
"""Фиксирует снимок состояния терминала в terminal/data/history.js.

    python3 build/snapshot.py "что обновили"           # снимок текущих данных
    python3 build/snapshot.py --rev 64242c2 "метка"    # снимок данных из коммита
    python3 build/snapshot.py --list                   # что уже записано

Снимок считается тем же кодом, что и показания на экране (assets/metrics.js),
поэтому история и интерфейс не могут разойтись. Показатели сопоставляются по
устойчивому идентификатору; для ранних сборок, где идентификаторов ещё не было,
работает сопоставление по названию.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "terminal" / "data"
HISTORY = DATA / "history.js"
FILES = ["meta", "layers", "companies", "network", "indicators", "scenarios", "russia", "citations"]

NODE_TEMPLATE = """
globalThis.window = globalThis;   // объявить до require: metrics.js ищет window
const M = require({metrics});
const src = {sources};
for (const k of Object.keys(src)) { (0, eval)(src[k]); }

// сопоставление показателей ранних сборок по названию
const idByName = {idmap};
window.VG_INDICATORS.forEach(function (i) {
  if (!i.id) i.id = idByName[i.name] || ('noid:' + i.name);
});

const snap = M.snapshot({
  meta: window.VG_META,
  groups: window.VG_GROUPS,
  indicators: window.VG_INDICATORS,
  companies: window.VG_COMPANIES,
  nodes: window.VG_NODES,
  edges: window.VG_EDGES,
  scenarios: window.VG_SCENARIOS,
  cites: window.VG_CITES || {}
}, {label});
process.stdout.write(JSON.stringify(snap));
"""


def read_sources(rev: str | None) -> dict:
    out = {}
    for name in FILES:
        rel = f"terminal/data/{name}.js"
        if rev:
            res = subprocess.run(["git", "show", f"{rev}:{rel}"], cwd=ROOT,
                                 capture_output=True, text=True)
            # файла могло не быть в ранней сборке — это нормально
            out[name] = res.stdout if res.returncode == 0 else ""
        else:
            path = ROOT / rel
            out[name] = path.read_text(encoding="utf-8") if path.exists() else ""
    return out


def current_id_map() -> dict:
    src = (DATA / "indicators.js").read_text(encoding="utf-8")
    # поля между id и name меняются со временем, поэтому разбор к их порядку не привязан
    ids = re.findall(r"\{ id: '([^']+)',[^{}]*?name: '((?:[^'\\]|\\.)*)'", src, re.S)
    return {name.replace("\\'", "'"): key for key, name in ids}


def load_history() -> list:
    if not HISTORY.exists():
        return []
    text = HISTORY.read_text(encoding="utf-8")
    m = re.search(r"window\.VG_HISTORY = (\[.*\]);", text, re.S)
    return json.loads(m.group(1)) if m else []


def save_history(items: list) -> None:
    head = (
        "/* История значений терминала.\n"
        "   Снимки идут от старого к новому и создаются скриптом build/snapshot.py.\n"
        "   Руками не правятся: расхождение снимка с данными означало бы, что экран\n"
        "   «Что изменилось» показывает не то, что произошло. */\n"
        "window.VG_HISTORY = "
    )
    body = json.dumps(items, ensure_ascii=False, indent=1)
    HISTORY.write_text(head + body + ";\n", encoding="utf-8")


def make(rev: str | None, label: str) -> dict:
    script = NODE_TEMPLATE
    for key, value in {
        "{metrics}": json.dumps(str(ROOT / "terminal" / "assets" / "metrics.js")),
        "{sources}": json.dumps(read_sources(rev), ensure_ascii=False),
        "{idmap}": json.dumps(current_id_map(), ensure_ascii=False),
        "{label}": json.dumps(label, ensure_ascii=False),
    }.items():
        script = script.replace(key, value)
    res = subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True)
    if res.returncode:
        sys.exit("node: " + res.stderr.strip())
    return json.loads(res.stdout)


def main() -> None:
    args = sys.argv[1:]
    if "--list" in args:
        for s in load_history():
            print(f"{s.get('seq', 0):>2}  {s['builtAt']}  индекс {s['index']['overall']:>5}  "
                  f"сверено {s.get('cites', {}).get('verified', 0):>2}/{s.get('cites', {}).get('total', 0):<2}  {s['label']}")
        return

    rev = None
    if "--rev" in args:
        i = args.index("--rev")
        rev = args[i + 1]
        del args[i:i + 2]
    label = args[0] if args else "обновление данных"

    snap = make(rev, label)
    if rev:
        snap["rev"] = subprocess.run(["git", "rev-parse", "--short", rev], cwd=ROOT,
                                     capture_output=True, text=True).stdout.strip()
    items = load_history()
    # снимок с той же датой сборки и меткой заменяется, а не дублируется;
    # порядок держится на seq: две сборки одного дня иначе встали бы по алфавиту
    old = [s for s in items if s["builtAt"] == snap["builtAt"] and s["label"] == snap["label"]]
    snap["seq"] = old[0]["seq"] if old and "seq" in old[0] else (
        max([s.get("seq", 0) for s in items], default=0) + 1)
    items = [s for s in items if not (s["builtAt"] == snap["builtAt"] and s["label"] == snap["label"])]
    items.append(snap)
    items.sort(key=lambda s: s.get("seq", 0))
    save_history(items)
    print(f"снимок {snap['builtAt']} · индекс {snap['index']['overall']} · "
          f"контуров {len(snap['graph']['cycles'])} · «{label}»")
    print(f"всего снимков: {len(items)}")


if __name__ == "__main__":
    main()
