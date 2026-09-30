#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу efir/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "efir" / "efir.artifact.html"
OUT = ROOT / "efir" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Сюжетная игра для знатоков музыки 80-х и 90-х: ночная смена на петербургской радиостанции 31 декабря 1999 года.">
<meta name="theme-color" content="#16111a">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2316111a'/%3E%3Crect x='5' y='9' width='22' height='14' rx='2' fill='none' stroke='%23ffb23e' stroke-width='1.6'/%3E%3Ccircle cx='11.5' cy='16' r='2.4' fill='%23ffb23e'/%3E%3Ccircle cx='20.5' cy='16' r='2.4' fill='%23ffb23e'/%3E%3C/svg%3E">
<style>*{box-sizing:border-box}html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
FOOT = """
</body>
</html>
"""

OUT.write_text(HEAD + SRC.read_text(encoding="utf-8") + FOOT, encoding="utf-8")
print(f"собрано: {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} КБ)")
