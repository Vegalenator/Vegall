#!/usr/bin/env python3
"""Собирает «Свет и Тень» в один файл.

  dist/svet-i-ten.html           — самодостаточная страница: скрипты, арт и музыка внутри
  dist/svet-i-ten.artifact.html  — то же без обёртки <html>/<head>/<body>, для публикации
"""
import base64, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'svet-i-ten')

def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read()

def data_uri(rel, mime='image/webp'):
    with open(os.path.join(SRC, rel), 'rb') as f:
        return 'data:%s;base64,' % mime + base64.b64encode(f.read()).decode()

def build():
    html = read('index.html')
    for name in ('levels', 'game'):
        tag = '<script src="%s.js"></script>' % name
        assert tag in html, tag
        html = html.replace(tag, '<script>\n' + read(name + '.js') + '\n</script>')
    for img in ('key', 'luma', 'nox', 'train'):
        html = html.replace('art/%s.webp' % img, data_uri('art/%s.webp' % img))
    html = html.replace('music/luma-and-nox.mp3', data_uri('music/luma-and-nox.mp3', 'audio/mpeg'))
    assert 'art/' not in html and 'music/' not in html and '.js"></script>' not in html, 'остались внешние ссылки'

    out = os.path.join(ROOT, 'dist')
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'svet-i-ten.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    body = re.search(r'<body>(.*)</body>', html, re.S).group(1).strip()
    title = re.search(r'<title>.*?</title>', html, re.S).group(0)
    fonts = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis[^>]*>', html).group(0)
    style = re.search(r'<style>.*?</style>', html, re.S).group(0)
    with open(os.path.join(out, 'svet-i-ten.artifact.html'), 'w', encoding='utf-8') as f:
        f.write('%s\n%s\n%s\n\n%s\n' % (title, fonts, style, body))

    for n in ('svet-i-ten.html', 'svet-i-ten.artifact.html'):
        print('%-26s %7.1f КБ' % (n, os.path.getsize(os.path.join(out, n)) / 1024))

if __name__ == '__main__':
    build()
