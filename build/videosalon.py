#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу videosalon/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "videosalon" / "peremotka.artifact.html"
OUT = ROOT / "videosalon" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Квест про западное кино 80-х и 90-х: видеосалон «Космос», 1991 год, пропавший дядя Гоша и видик, который мотает время.">
<meta name="theme-color" content="#1b120c">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%231c1c1e'/%3E%3Crect x='4' y='9' width='24' height='14' rx='2' fill='%23efe6cc'/%3E%3Ccircle cx='11' cy='16' r='3' fill='%231c1c1e'/%3E%3Ccircle cx='21' cy='16' r='3' fill='%231c1c1e'/%3E%3C/svg%3E">
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
