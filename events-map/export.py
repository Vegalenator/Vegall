# -*- coding: utf-8 -*-
"""Выгрузка базы терминала в статический снимок для зеркала (GitHub Pages).

Использование: python3 export.py <каталог с выгрузкой ArtifactData (out_dir)> <docs-каталог>
Ожидает подкаталоги events/, briefs/, meta/ с файлами <id>.json.
Пишет <docs>/data/snapshot.json и копирует index.html в <docs>/index.html.
"""
import json, os, sys, datetime

def load(dirpath):
    out = {}
    if os.path.isdir(dirpath):
        for f in sorted(os.listdir(dirpath)):
            if f.endswith('.json'):
                out[f[:-5]] = json.load(open(os.path.join(dirpath, f), encoding='utf-8'))
    return out

def main(src, docs):
    snap = {'events': load(os.path.join(src, 'events')), 'briefs': load(os.path.join(src, 'briefs')),
            'meta': load(os.path.join(src, 'meta')),
            'exportedAt': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).isoformat(timespec='minutes')}
    if not snap['events']:
        sys.exit('нет событий — выгрузка не записана')
    os.makedirs(os.path.join(docs, 'data'), exist_ok=True)
    json.dump(snap, open(os.path.join(docs, 'data', 'snapshot.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    page = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'), encoding='utf-8').read()
    if not page.lstrip().lower().startswith('<!doctype'):
        page = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n' + page + '\n</body>\n</html>\n')
    open(os.path.join(docs, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(docs, '.nojekyll'), 'w').close()
    print(len(snap['events']), 'событий,', len(snap['briefs']), 'брифов')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
