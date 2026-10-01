#!/usr/bin/env python3
"""Собирает flows/dist/flows.html — один файл с вшитыми данными.

Его можно открыть двойным кликом, переслать или опубликовать как артефакт.
"""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(ROOT, "data", "flows.json"), encoding="utf-8"))
data.pop("stats", None)
# Редакционные слои подмешиваются при сборке, чтобы правка текста не требовала нового сбора данных.
for key, name in (("insights", "insights.json"), ("notes", "notes.json"), ("countries", "countries.json"), ("segments", "segments.json")):
    path = os.path.join(ROOT, "data", name)
    if os.path.exists(path):
        data[key] = json.load(open(path, encoding="utf-8"))
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
marker = '<script id="flows-data" type="application/json">null</script>'
assert marker in src
out = src.replace(marker, '<script id="flows-data" type="application/json">' + payload + "</script>")
world = json.dumps(json.load(open(os.path.join(ROOT, "data", "world.json"))), separators=(",", ":"))
wmarker = '<script id="world-data" type="application/json">null</script>'
assert wmarker in out
out = out.replace(wmarker, '<script id="world-data" type="application/json">' + world + "</script>")
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
with open(os.path.join(ROOT, "dist", "flows.html"), "w", encoding="utf-8") as f:
    f.write(out)
# Версия для артефакта: без doctype/html — их добавляет платформа.
art = out.replace('<!doctype html>\n<html lang="ru">\n', "", 1)
with open(os.path.join(ROOT, "dist", "flows.artifact.html"), "w", encoding="utf-8") as f:
    f.write(art)
print("dist/flows.html:", round(len(out.encode()) / 1024), "KB")
