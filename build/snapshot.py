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
FILES = ["meta", "layers", "companies", "network", "indicators", "scenarios", "russia"]

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
  scenarios: window.VG_SCENARIOS
}, {label});
process.stdout.write(JSON.stringify(snap));
"""


def read_sources(rev: str | None) -> dict:
    out = {}
    for name in FILES:
        rel = f"terminal/data/{name}.js"
        if rev:
            out[name] = subprocess.run(
                ["git", "show", f"{rev}:{rel}"], cwd=ROOT,
                capture_output=True, text=True, check=True).stdout
        else:
            out[name] = (ROOT / rel).read_text(encoding="utf-8")
    return out


def current_id_map() -> dict:
    src = (DATA / "indicators.js").read_text(encoding="utf-8")
    ids = re.findall(r"\{ id: '([^']+)', checked:.*?name: '((?:[^'\\]|\\.)*)'", src, re.S)
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
            print(f"{s['builtAt']}  индекс {s['index']['overall']:>5}  {s['label']}")
        return

    rev = None
    if "--rev" in args:
        i = args.index("--rev")
        rev = args[i + 1]
        del args[i:i + 2]
    label = args[0] if args else "обновление данных"

    snap = make(rev, label)
    items = load_history()
    # снимок за ту же дату сборки с той же меткой заменяется, а не дублируется
    items = [s for s in items if not (s["builtAt"] == snap["builtAt"] and s["label"] == snap["label"])]
    items.append(snap)
    items.sort(key=lambda s: (s["builtAt"], s["label"]))
    save_history(items)
    print(f"снимок {snap['builtAt']} · индекс {snap['index']['overall']} · "
          f"контуров {len(snap['graph']['cycles'])} · «{label}»")
    print(f"всего снимков: {len(items)}")


if __name__ == "__main__":
    main()
