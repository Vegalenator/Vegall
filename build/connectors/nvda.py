"""Nvidia — квартальный пресс-релиз о результатах.

Определения фиксируются здесь и показываются в терминале рядом с величиной:
без этого автоматическое обновление однажды подменит одно понятие другим.
"""
import re
from . import fetch, grab, to_num, check_range, check_contains, CheckError

SPEC = {
    "id": "nvda-quarter",
    "source": "S12",
    "title": "Nvidia — квартальный пресс-релиз",
    "cadence_days": 95,
    "url": "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027",
    # адрес строится по образцу, а не ищется в списке новостей: список собирается скриптами
    "url_pattern": "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-{ordinal}-quarter-fiscal-{fy}",
    "fields": [
        {"key": "revenue", "target": "companies.nvda.revenue",
         "definition": "Общая выручка за квартал, GAAP, млрд долларов США. Не годовая и не выручка сегмента",
         "unit": "$ млрд", "range": [10, 500]},
        {"key": "dcRevenue", "target": "companies.nvda.dcRevenue",
         "definition": "Выручка сегмента Data Center за тот же квартал, млрд долларов США",
         "unit": "$ млрд", "range": [5, 500]},
        {"key": "grossMargin", "target": "companies.nvda.grossMargin",
         "definition": "Валовая маржа за квартал. В релизе GAAP и non-GAAP совпадают; берётся GAAP",
         "unit": "%", "range": [30, 95]},
    ],
    "cites": {"revenue": "nvda-rev", "dcRevenue": "nvda-dc", "grossMargin": "nvda-margin"},
}


def parse(text):
    out = {}
    rev, q1 = grab(text, r"Revenue of \$([\d.]+) billion, up \d+% from a year ago")
    dc, q2 = grab(text, r"Data Center revenue of \$([\d.]+) billion, up \d+% from a year ago")
    gm, q3 = grab(text, r"gross margins? (?:were|was) (?:both )?([\d.]+)%")
    out["revenue"] = {"value": to_num(rev), "quote": q1, "loc": "Пресс-релиз, подзаголовок"}
    out["dcRevenue"] = {"value": to_num(dc), "quote": q2, "loc": "Пресс-релиз, подзаголовок"}
    out["grossMargin"] = {"value": to_num(gm), "quote": q3, "loc": "Пресс-релиз, раздел результатов квартала"}
    per, _ = grab(text, r"(Second|First|Third|Fourth) Quarter Fiscal (\d{4})", 0)
    out["_period"] = per
    d, _ = grab(text, r"((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})")
    out["_published"] = d
    return out


def check(text, parsed):
    """Проверки определений. Любая ошибка означает отказ, а не запись частичных данных."""
    check_contains(text, "Announces Financial Results", "это не страница релиза о результатах")
    if not parsed.get("_period"):
        raise CheckError("в документе не найден период — релиз мог быть не опубликован")
    if not parsed.get("_published"):
        raise CheckError("в документе нет даты публикации")
    for f in SPEC["fields"]:
        v = parsed[f["key"]]["value"]
        check_range(f["key"], v, f["range"][0], f["range"][1], f["unit"])
    if parsed["dcRevenue"]["value"] > parsed["revenue"]["value"]:
        raise CheckError("выручка сегмента больше общей выручки: определения перепутаны")
    return True
