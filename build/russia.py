#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу russia/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "russia" / "terminal.artifact.html"
OUT = ROOT / "russia" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Терминал российской экономики: ВВП и его структура, отрасли, внешняя торговля, ставка и инфляция, бюджет, налоги, регионы и прогноз.">
<meta name="theme-color" content="#0e141b">
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
