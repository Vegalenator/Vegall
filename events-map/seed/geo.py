# -*- coding: utf-8 -*-
"""Координаты мест проведения для карты в карточке — поле geo {lat, lon, place}.

place — подпись под картой: город и страна. Для выборов — столица страны.
geo = null — событие без места (онлайн); карта показывает «онлайн».
"""
import json, sys

MSK = {"lat": 55.75, "lon": 37.62, "place": "Москва, Россия"}
BRU = {"lat": 50.85, "lon": 4.35, "place": "Брюссель, Бельгия"}
WAS = {"lat": 38.9, "lon": -77.04, "place": "Вашингтон, США"}
FRA = {"lat": 50.11, "lon": 8.68, "place": "Франкфурт, Германия"}
NYC = {"lat": 40.71, "lon": -74.0, "place": "Нью-Йорк, США"}

GEO = {
    "eu-fac-2026-09-28": BRU,
    "euco-2026-10": BRU,
    "euco-2026-12": BRU,
    "ep-lagarde-2026-09-28": BRU,
    "valdai-2026": {"lat": 55.75, "lon": 37.62, "place": "Подмосковье, Россия"},
    "duma-first-session-2026": MSK,
    "duma-budget-first-reading-2026": MSK,
    "budget-2027-submission": MSK,
    "gov-budget-approval-2026-09-24": MSK,
    "putin-year-end-2026": MSK,
    "russia-calling-2026": MSK,
    "ren-2026": MSK,
    "rosstat-cpi-weekly-2026-09-30": MSK,
    "rosstat-cpi-sep-2026": MSK,
    "rosstat-gdp-q3-2026": MSK,
    "cbr-2026-09-11": MSK,
    "cbr-2026-10-23": MSK,
    "cbr-2026-12-18": MSK,
    "sber-ifrs-9m-2026": MSK,
    "duma-elections-2026": {"lat": 55.75, "lon": 37.62, "place": "Россия"},
    "us-nfp-2026-10-02": WAS,
    "us-cpi-2026-10-14": WAS,
    "fomc-2026-09": WAS,
    "fomc-2026-10": WAS,
    "fomc-2026-12": WAS,
    "us-cr-deadline-2026-12-11": WAS,
    "us-midterms-2026": {"lat": 38.9, "lon": -77.04, "place": "США"},
    "ecb-2026-09": FRA,
    "ecb-2026-10": FRA,
    "ecb-2026-12": FRA,
    "jpm-q3-2026": NYC,
    "nvda-q3fy27": {"lat": 37.35, "lon": -121.95, "place": "Санта-Клара, США"},
    "latvia-saeima-2026": {"lat": 56.95, "lon": 24.11, "place": "Латвия"},
    "brazil-general-2026": {"lat": -15.79, "lon": -47.88, "place": "Бразилия"},
    "brazil-runoff-2026": {"lat": -15.79, "lon": -47.88, "place": "Бразилия"},
    "bih-general-2026": {"lat": 43.86, "lon": 18.41, "place": "Босния и Герцеговина"},
    "bulgaria-president-2026": {"lat": 42.7, "lon": 23.32, "place": "Болгария"},
    "israel-knesset-2026": {"lat": 31.77, "lon": 35.21, "place": "Израиль"},
    "nz-general-2026": {"lat": -41.29, "lon": 174.78, "place": "Новая Зеландия"},
    "bahrain-2026": {"lat": 26.23, "lon": 50.59, "place": "Бахрейн"},
    "nicaragua-2026": {"lat": 12.11, "lon": -86.24, "place": "Никарагуа"},
    "cabo-verde-2026": {"lat": 14.93, "lon": -23.51, "place": "Кабо-Верде"},
    "gambia-president-2026": {"lat": 13.45, "lon": -16.58, "place": "Гамбия"},
    "haiti-2026": {"lat": 18.54, "lon": -72.34, "place": "Гаити"},
    "south-sudan-2026": {"lat": 4.85, "lon": 31.58, "place": "Южный Судан"},
    "cis-summit-2026": {"lat": 40.03, "lon": 52.97, "place": "Туркменбаши, Туркмения"},
    "imf-wb-annual-2026": {"lat": 13.76, "lon": 100.5, "place": "Бангкок, Таиланд"},
    "apec-2026": {"lat": 22.54, "lon": 114.06, "place": "Шэньчжэнь, Китай"},
    "g20-2026": {"lat": 25.82, "lon": -80.36, "place": "Майами, США"},
    "cop31-2026": {"lat": 36.9, "lon": 30.7, "place": "Анталья, Турция"},
    "opec-plus-2026-09-06": None,
    "opec-plus-2026-10-04": None,
}


def main(iv_path):
    iv = json.load(open(iv_path))
    assert set(iv) == set(GEO), set(iv) ^ set(GEO)
    print(json.dumps([{"op": "update", "collection": "events", "doc_id": i, "data": {"geo": GEO[i]}, "if_version": v} for i, v in sorted(iv.items())], ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
