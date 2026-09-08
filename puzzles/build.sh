#!/bin/sh
# Собирает автономный index.html из artifact.html (тело страницы без обёртки).
set -e
d=$(dirname "$0")
{
  printf '%s\n' '<!DOCTYPE html>' '<html lang="ru">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' \
    '<meta name="description" content="15 логических головоломок для 10–13 лет с двумя героинями: Вегой и Наей.">' \
    '<meta name="theme-color" content="#8d2b2c">' \
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%238d2b2c%27/%3E%3Cpath d=%27M9 24 12 8l4 10 4-10 3 16%27 fill=%27none%27 stroke=%27%23f7f1e4%27 stroke-width=%272.4%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E">' \
    '<style>*{box-sizing:border-box}img{max-width:100%}[hidden]{display:none!important}body{margin:0}</style>' \
    '</head>' '<body>'
  cat "$d/artifact.html"
  printf '%s\n' '</body>' '</html>'
} > "$d/index.html"
echo "index.html собран"
