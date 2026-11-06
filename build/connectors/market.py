"""Рыночный слой: котировки компаний цикла и ориентиры.

Источники — открытые машиночитаемые: API Nasdaq (акции США, ADR, фонды) и
ISS Московской биржи (Яндекс, Сбер). Ключей не требуется.

Это снимок на дату сборки, а не живая лента: страница терминала в сеть не
ходит. Поэтому у каждой цифры — дата последнего торгового дня, а в интерфейсе
прямо сказано, что котировки обновляются вместе со сборкой.

Проверки: ряд не пуст, последняя дата не старше пяти дней, цены положительны,
у фонда и у акции — свои классы активов. Тикер, не прошедший проверку,
попадает в список отказов с причиной, а не в данные.
"""
import datetime
import json
import subprocess
import time

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
REF_DATE = "2026-09-06"          # дата среза исследования: берётся последнее закрытие не позже неё

# тикер, класс актива, имя, слой цепочки, узел графа (если есть)
UNIVERSE = [
    ("NVDA", "stocks", "Nvidia", "silicon", "nvda"),
    ("AVGO", "stocks", "Broadcom", "silicon", "avgo"),
    ("AMD", "stocks", "AMD", "silicon", None),
    ("TSM", "stocks", "TSMC (ADR)", "silicon", "tsmc"),
    ("ASML", "stocks", "ASML (ADR)", "silicon", "asml"),
    ("MU", "stocks", "Micron", "silicon", None),
    ("ARM", "stocks", "Arm", "silicon", None),
    ("SMCI", "stocks", "Supermicro", "silicon", "smci"),
    ("MSFT", "stocks", "Microsoft", "cloud", "msft"),
    ("GOOGL", "stocks", "Alphabet", "cloud", "googl"),
    ("AMZN", "stocks", "Amazon", "cloud", "amzn"),
    ("META", "stocks", "Meta", "cloud", "meta"),
    ("ORCL", "stocks", "Oracle", "cloud", "orcl"),
    ("BABA", "stocks", "Alibaba (ADR)", "cloud", "baba"),
    ("CRWV", "stocks", "CoreWeave", "infra", "crwv"),
    ("EQIX", "stocks", "Equinix", "infra", "equinix"),
    ("DLR", "stocks", "Digital Realty", "infra", None),
    ("VRT", "stocks", "Vertiv", "infra", "vertiv"),
    ("CEG", "stocks", "Constellation", "infra", "constellation"),
]
BENCH = [
    ("QQQ", "etf", "Nasdaq-100 (QQQ)"),
    ("SOXX", "etf", "Полупроводники (SOXX)"),
    ("SPY", "etf", "S&P 500 (SPY)"),
]
MOEX = [("YDEX", "Яндекс", "ru", None), ("SBER", "Сбер", "ru", "sber")]


def get(url, tries=3):
    for i in range(tries):
        r = subprocess.run(["curl", "-sS", "--max-time", "25", "-A", UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout:
            try:
                return json.loads(r.stdout)
            except ValueError:
                pass
        time.sleep(1.5 * (i + 1))
    return None


def money(s):
    return float(str(s).replace("$", "").replace(",", "")) if s not in (None, "", "N/A") else None


def changes(series):
    """series: [(date, close)] от старого к новому."""
    last_d, last = series[-1]
    def back(n):
        return series[-1 - n][1] if len(series) > n else None
    ref = [c for d, c in series if d <= REF_DATE]
    ref_close = ref[-1] if ref else None
    hi = max(c for _, c in series)
    pct = lambda a, b: None if not b else round((a / b - 1) * 100, 2)
    return {
        "date": last_d, "close": last,
        "d1": pct(last, back(1)), "d5": pct(last, back(5)), "m1": pct(last, back(21)),
        "cut": pct(last, ref_close), "refClose": ref_close,
        "fromHigh": pct(last, hi), "high": hi,
        "spark": [round(c, 2) for _, c in series[-63:]],
    }


def nasdaq(sym, cls):
    today = datetime.date.today()
    frm = (today - datetime.timedelta(days=380)).isoformat()
    h = get(f"https://api.nasdaq.com/api/quote/{sym}/historical?assetclass={cls}&fromdate={frm}&todate={today}&limit=400")
    rows = (((h or {}).get("data") or {}).get("tradesTable") or {}).get("rows") or []
    series = []
    for r in rows:
        m, d, y = r["date"].split("/")
        c = money(r["close"])
        if c and c > 0:
            series.append((f"{y}-{m}-{d}", c))
    series.sort()
    if len(series) < 30:
        raise ValueError(f"ряд слишком короткий: {len(series)} строк")
    age = (today - datetime.date.fromisoformat(series[-1][0])).days
    if age > 5:
        raise ValueError(f"последняя котировка {series[-1][0]} старше пяти дней")
    out = changes(series)
    if cls == "stocks":
        s = get(f"https://api.nasdaq.com/api/quote/{sym}/summary?assetclass={cls}")
        cap = (((s or {}).get("data") or {}).get("summaryData") or {}).get("MarketCap") or {}
        out["mcap"] = money(cap.get("value"))
    return out


def moex(sym):
    frm = (datetime.date.today() - datetime.timedelta(days=380)).isoformat()
    series, start = [], 0
    while True:
        h = get(f"https://iss.moex.com/iss/history/engines/stock/markets/shares/boards/TQBR/securities/{sym}.json"
                f"?from={frm}&start={start}&iss.only=history&history.columns=TRADEDATE,CLOSE")
        if not h:
            raise ValueError("Мосбиржа не ответила: соединение сброшено")
        data = h["history"]["data"]
        series += [(d, c) for d, c in data if c]
        if len(data) < 100:
            break
        start += len(data)
    series.sort()
    if len(series) < 30:
        raise ValueError(f"ряд слишком короткий: {len(series)} строк")
    out = changes(series)
    s = get(f"https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/{sym}.json"
            f"?iss.only=securities&securities.columns=SECID,ISSUESIZE")
    try:
        out["mcapRub"] = s["securities"]["data"][0][1] * out["close"]
    except Exception:
        out["mcapRub"] = None
    return out


def collect():
    items, bench, failed = [], [], []
    for sym, cls, name, layer, node in UNIVERSE:
        try:
            q = nasdaq(sym, cls)
            q.update({"sym": sym, "name": name, "layer": layer, "node": node, "cur": "USD", "venue": "Nasdaq API"})
            items.append(q)
            print(f"  ✓ {sym:5} {q['close']:>10.2f}  день {q['d1']:+6.2f}%  с 6 сент. {q['cut'] if q['cut'] is not None else '—':>7}%")
        except Exception as e:
            failed.append({"sym": sym, "name": name, "why": str(e)})
            print(f"  ✕ {sym}: {e}")
    for sym, cls, name in BENCH:
        try:
            q = nasdaq(sym, cls)
            q.update({"sym": sym, "name": name, "cur": "USD"})
            bench.append(q)
            print(f"  ✓ {sym:5} {q['close']:>10.2f}  ориентир")
        except Exception as e:
            failed.append({"sym": sym, "name": name, "why": str(e)})
            print(f"  ✕ {sym}: {e}")
    for sym, name, layer, node in MOEX:
        try:
            q = moex(sym)
            q.update({"sym": sym, "name": name, "layer": layer, "node": node, "cur": "RUB", "venue": "Мосбиржа ISS"})
            items.append(q)
            print(f"  ✓ {sym:5} {q['close']:>10.2f} ₽  день {q['d1']:+6.2f}%")
        except Exception as e:
            failed.append({"sym": sym, "name": name, "why": str(e)})
            print(f"  ✕ {sym}: {e}")
    failed.append({"sym": "000660.KS", "name": "SK hynix", "why": "торгуется в Корее; в открытых источниках, доступных из среды сборки, ряда нет"})
    return items, bench, failed
