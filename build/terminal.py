#!/usr/bin/env python3
"""Собирает однофайловую версию терминала.

    python3 build/terminal.py

terminal/index.html + assets/* + data/*  ->  terminal/dist/artifact.html

В артефакте нет обёрток <!doctype>/<html>/<head>/<body>: платформа добавляет их
сама. Все стили, скрипты и данные встроены, поэтому файл открывается где угодно,
в том числе без сети (подгружаются только шрифты Google Fonts).
"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "terminal"
OUT = SRC / "dist" / "artifact.html"


def read(rel: str) -> str:
    return (SRC / rel).read_text(encoding="utf-8")


def main() -> None:
    html = read("index.html")

    def inline_css(m):
        href = m.group(1)
        if href.startswith("http"):
            return m.group(0)
        return "<style>\n" + read(href) + "\n</style>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html = re.sub(
        r'<script src="([^"]+)"></script>',
        lambda m: "<script>\n" + read(m.group(1)) + "\n</script>",
        html,
    )

    # вырезать содержимое между <head> и </body>, убрав служебные мета-теги
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*', "", head)
    head = re.sub(r'<meta name="viewport"[^>]*>\s*', "", head)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} — {OUT.stat().st_size / 1024:.0f} КБ")


if __name__ == "__main__":
    main()
