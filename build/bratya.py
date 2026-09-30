#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу bratya/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "bratya" / "game.artifact.html"
OUT = ROOT / "bratya" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Кооперативная браузерная игра для двух братьев: боец и волшебник защищают дом от Хаоса.">
<meta name="theme-color" content="#131726">
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
