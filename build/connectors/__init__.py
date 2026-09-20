"""Каркас подключений к первоисточникам.

Подключение никогда не пишет в данные молча. Оно делает три вещи:
  1. забирает документ,
  2. разбирает величины вместе с дословной цитатой,
  3. проверяет определения — единицу, период, диапазон и то, что документ
     вообще является тем релизом, за которым пришли.

Результат — предложение. Что делать с расхождением, решает человек:
`python3 build/connect.py --apply <id>`.

Почему так. Страница несуществующего релиза Nvidia отвечает кодом 200 и молча
уводит в архив новостей. Подключение, доверяющее коду ответа, записало бы в
терминал пустоту. Поэтому источник считается подтверждённым только при
совпадении содержимого.
"""
import html
import re
import subprocess

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def fetch(url: str, timeout: int = 40) -> str:
    """Забрать документ и привести к плоскому тексту."""
    res = subprocess.run(["curl", "-sS", "-L", "--max-time", str(timeout), "-A", UA, url],
                         capture_output=True)
    raw = res.stdout
    if raw[:4] == b"%PDF":
        from pypdf import PdfReader
        import io
        return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
    s = raw.decode("utf-8", "ignore")
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s)))


def grab(text: str, pattern: str, group: int = 1):
    """Вернуть величину и дословную цитату вокруг неё."""
    m = re.search(pattern, text, re.I)
    if not m:
        return None, None
    quote = text[max(0, m.start()):m.end()].strip()
    return m.group(group), quote


def to_num(s):
    if s is None:
        return None
    return float(str(s).replace(",", "").replace(" ", ""))


class CheckError(Exception):
    pass


def check_range(name, value, lo, hi, unit):
    if value is None:
        raise CheckError(f"{name}: величина не найдена в документе")
    if not (lo <= value <= hi):
        raise CheckError(f"{name}: {value} {unit} вне допустимого диапазона {lo}-{hi} {unit}")
    return True


def check_contains(text, needle, why):
    if needle.lower() not in text.lower():
        raise CheckError(f"документ не содержит «{needle}» — {why}")
    return True
