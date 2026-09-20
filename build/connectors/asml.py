"""ASML — квартальный пресс-релиз.

Особенность, ради которой подключение и нужно: величины в евро. Отдельная
проверка следит, чтобы они не попали в долларовые строки терминала.
"""
from . import fetch, grab, to_num, check_range, check_contains, CheckError

SPEC = {
    "id": "asml-quarter",
    "source": "S19",
    "title": "ASML — квартальный пресс-релиз",
    "cadence_days": 95,
    "url": "https://www.asml.com/en/news/press-releases/2026/q2-2026-financial-results",
    "url_pattern": "https://www.asml.com/en/news/press-releases/{year}/q{q}-{year}-financial-results",
    "fields": [
        {"key": "revenueEur", "target": "companies.asml.revenueEur",
         "definition": "Total net sales за квартал, МИЛЛИАРДЫ ЕВРО. Прямое сравнение с долларовыми строками терминала некорректно",
         "unit": "€ млрд", "range": [3, 30]},
        {"key": "grossMargin", "target": "companies.asml.grossMargin",
         "definition": "Валовая маржа за квартал, проценты. Не путать с прогнозным диапазоном на год",
         "unit": "%", "range": [30, 80]},
    ],
    "cites": {"revenueEur": "asml-q2", "grossMargin": "asml-margin"},
}


def parse(text):
    out = {}
    rev, q1 = grab(text, r"Q\d total net sales of €([\d.]+) billion")
    gm, q2 = grab(text, r"gross margin of ([\d.]+)%")
    guide, q3 = grab(text, r"total net sales to be between €(\d+) billion and €\d+ billion")
    out["revenueEur"] = {"value": to_num(rev), "quote": q1, "loc": "Пресс-релиз, сводка квартала"}
    out["grossMargin"] = {"value": to_num(gm), "quote": q2, "loc": "Пресс-релиз, сводка квартала"}
    out["_guide"] = {"value": to_num(guide), "quote": q3}
    return out


def check(text, parsed):
    check_contains(text, "total net sales", "это не страница квартального релиза")
    if "€" not in text:
        raise CheckError("в документе нет знака евро: проверка единицы измерения не пройдена")
    if "$" in (parsed["revenueEur"]["quote"] or ""):
        raise CheckError("выручка найдена в долларовой формулировке — единицы перепутаны")
    for f in SPEC["fields"]:
        v = parsed[f["key"]]["value"]
        check_range(f["key"], v, f["range"][0], f["range"][1], f["unit"])
    return True
