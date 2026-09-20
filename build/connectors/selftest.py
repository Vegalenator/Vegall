"""Самопроверка каркаса: подключение обязано отказываться, а не записывать мусор.

    python3 build/connect.py --selftest

Проверяются четыре случая, каждый из которых однажды испортил бы данные:
страница несуществующего релиза (отвечает 200), подмена документа, величина
сегмента больше общей и величина вне физически осмысленного диапазона.
"""
from . import fetch, CheckError
from . import nvda, asml

CASES = [
    ("несуществующий релиз отвечает 200",
     lambda: ("https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-third-quarter-fiscal-2027", nvda, None)),
    ("документ другого эмитента",
     lambda: (asml.SPEC["url"], nvda, None)),
    ("выручка сегмента больше общей",
     lambda: (nvda.SPEC["url"], nvda, ("dcRevenue", 999.0))),
    ("маржа вне диапазона",
     lambda: (nvda.SPEC["url"], nvda, ("grossMargin", 5.0))),
]


def run():
    ok = 0
    for name, make in CASES:
        url, mod, spoil = make()
        text = fetch(url)
        parsed = mod.parse(text)
        if spoil:
            parsed[spoil[0]]["value"] = spoil[1]
        try:
            mod.check(text, parsed)
            print(f"  ПРОПУЩЕНО  {name} — проверка не сработала")
        except CheckError as e:
            print(f"  отказ      {name}: {e}")
            ok += 1
    print(f"\nсработало проверок: {ok} из {len(CASES)}")
    return ok == len(CASES)
