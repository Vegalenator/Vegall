#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу terminal/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "terminal" / "terminal.artifact.html"
OUT = ROOT / "terminal" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Терминал вечернего эфира: шесть экономических процессов, которые не видны в котировках.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%230f2530'/%3E%3Cpath d='M4 10h24' stroke='%238aa3ac' stroke-width='1.6'/%3E%3Cpath d='M6 16l5 4 5-6 5 8 5-4' fill='none' stroke='%23e8905a' stroke-width='2'/%3E%3C/svg%3E">
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
