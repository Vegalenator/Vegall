#!/usr/bin/env python3
"""Оборачивает тело артефакта в самостоятельную страницу atlas/index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "atlas" / "atlas.artifact.html"
OUT = ROOT / "atlas" / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Горизонтальная схема связей героев, событий и артефактов всех семи книг о Гарри Поттере.">
<meta name="theme-color" content="#0a0c10">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230a0c10'/%3E%3Cg fill='none' stroke='%23c9a24e' stroke-width='1.6'%3E%3Ccircle cx='16' cy='16' r='6'/%3E%3Ccircle cx='16' cy='16' r='2'/%3E%3Cpath d='M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l3 3M21.5 21.5l3 3M24.5 7.5l-3 3M10.5 21.5l-3 3'/%3E%3C/g%3E%3C/svg%3E">
<style>*{box-sizing:border-box}html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
FOOT = "\n</body>\n</html>\n"

OUT.write_text(HEAD + SRC.read_text(encoding="utf-8") + FOOT, encoding="utf-8")
print(f"собрано: {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} КБ)")
