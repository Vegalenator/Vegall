#!/usr/bin/env python3
"""Собирает однофайловые сборки из исходников.

  dist/quest.html     — самодостаточная страница (открывается двойным кликом)
  dist/artifact.html  — то же без обёртки <html>/<head>/<body>, для публикации
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()

def build():
    html = read('index.html')

    css = read('assets/css/main.css')
    html = html.replace(
        '<link rel="stylesheet" href="assets/css/main.css">',
        '<style>\n' + css + '\n</style>')

    for name in ('data', 'audio', 'fx', 'chambers', 'app'):
        tag = '<script src="assets/js/%s.js"></script>' % name
        js = read('assets/js/%s.js' % name)
        html = html.replace(tag, '<script>\n' + js + '\n</script>')

    assert 'assets/' not in html, 'остались несведённые ссылки на assets/'

    out = os.path.join(ROOT, 'dist')
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'quest.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    # версия для Artifact: тело страницы без внешней обёртки,
    # но с собственными <title>, шрифтами и стилями наверху
    m = re.search(r'<body>(.*)</body>', html, re.S)
    body = m.group(1).strip()
    title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
    fonts = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis[^>]*>', html).group(0)
    style = re.search(r'<style>.*?</style>', html, re.S).group(0)
    art = '<title>%s</title>\n%s\n%s\n\n%s\n' % (title, fonts, style, body)
    with open(os.path.join(out, 'artifact.html'), 'w', encoding='utf-8') as f:
        f.write(art)

    for n in ('quest.html', 'artifact.html'):
        size = os.path.getsize(os.path.join(out, n))
        print('%-16s %6.1f КБ' % (n, size / 1024))

if __name__ == '__main__':
    build()
