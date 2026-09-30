# -*- coding: utf-8 -*-
"""Консенсус перед решениями ЦБ и публикациями данных — поле consensus.

consensus {asOf, short, items [{metric, prev, cons, range, actual, hit}], market, views, note,
           verdict {tone: match|above|below|hawk|dove, text}, sources [{name,url}]}
Запуск: python3 consensus.py <каталог для json> — пишет по файлу {"consensus": …} на событие.
"""
import json, os, sys

C = {
    "us-nfp-2026-10-02": {
        "asOf": "2026-09-29", "short": "конс. +90 тыс.",
        "items": [
            {"metric": "Новые рабочие места вне сельского хозяйства", "prev": "+162 тыс.", "cons": "+90 тыс.", "range": "Barclays ждёт +50 тыс., Comerica и Nationwide — +40–50 тыс."},
            {"metric": "Безработица", "prev": "4,1%", "cons": "4,1%"},
            {"metric": "Почасовая оплата, за год", "prev": "+3,1%", "cons": "—"},
        ],
        "market": "Отчёт — главный ориентир перед заседанием ФРС 28 октября. Фьючерсы на 29 сентября закладывают 77% вероятности повышения ставки.",
        "views": "Экономисты ждут замедления найма: увольнений мало, но компании не спешат расширять штат на фоне дорогой энергии и войны с Ираном.",
        "note": "Августовские плюс 162 тысячи оказались сильнее среднего за год — 31 тысячи в месяц. Возможен пересмотр.",
        "sources": [{"name": "Bloomberg: опрос экономистов", "url": "https://www.bloomberg.com/news/articles/2026-09-26/us-jobs-report-seen-showing-90-000-payrolls-4-1-unemployment-rate"},
                    {"name": "BLS: данные за август", "url": "https://www.bls.gov/news.release/empsit.nr0.htm"}],
    },
    "fomc-2026-10": {
        "asOf": "2026-09-29", "short": "рынок: +25 б.п., 77%",
        "items": [{"metric": "Диапазон ставки ФРС", "prev": "3,75–4,00%", "cons": "4,00–4,25%", "range": "повышение на 25 б.п. — 77% по CME FedWatch"}],
        "market": "CME FedWatch на 29 сентября: 76,9% за повышение на четверть пункта, остальное — за паузу. Ожидания выросли после выступлений членов ФРС на прошлой неделе.",
        "views": "Опрос экономистов выйдет ближе к заседанию. Президент ФРБ Нью-Йорка Уильямс назвал ещё одно повышение до конца года разумным ожиданием.",
        "note": "До решения выйдут занятость 2 октября и инфляция 14 октября — они могут развернуть ожидания.",
        "sources": [{"name": "CME FedWatch (через Beansprout)", "url": "https://growbeansprout.com/tools/fedwatch"},
                    {"name": "CNBC: Уильямс", "url": "https://www.cnbc.com/2026/09/24/feds-williams-another-rate-hike-by-year-end.html"}],
    },
    "ecb-2026-10": {
        "asOf": "2026-09-24", "short": "рынок делится",
        "items": [{"metric": "Депозитная ставка ЕЦБ", "prev": "2,50%", "cons": "2,50% или 2,75%", "range": "фьючерсы 24 сентября: около 60% за повышение; другие оценки — ниже"}],
        "market": "Оценки расходятся: по фьючерсам 24 сентября шансы повышения около 60%, по другим расчётам — меньше 40%. Единого консенсуса нет.",
        "views": "Goldman Sachs и UBS ждут повышения в декабре, а не в октябре. Danske Bank допускает шаг на обоих заседаниях. MUFG считает цикл завершённым.",
        "note": "2 октября — предварительная инфляция еврозоны за сентябрь. Решающий фактор — нефть около ста долларов и дорогой газ.",
        "sources": [{"name": "Admiral Markets: обзор ожиданий", "url": "https://admiralmarkets.com/analytics/traders-blog/ecb-meeting-october-2026"},
                    {"name": "Goldman Sachs", "url": "https://www.goldmansachs.com/insights/articles/why-the-ecb-is-unlikely-to-keep-rates-higher-than-3-percent"}],
    },
    "cbr-2026-10-23": {
        "asOf": "2026-09-29", "short": "ранний конс. 14%",
        "items": [
            {"metric": "Ключевая ставка", "prev": "14%", "cons": "14%", "range": "ранний ориентир, опросы выйдут за неделю до заседания"},
            {"metric": "Инфляция на конец 2026 года, макроопрос ЦБ", "prev": "прогноз ЦБ 6–7%", "cons": "6,6%"},
            {"metric": "Средняя ставка до конца 2026 года, макроопрос ЦБ", "prev": "—", "cons": "13,7%", "range": "то есть до декабря ждут одного снижения"},
        ],
        "views": "Большинство аналитиков ждут паузы. Главный интерес — новый среднесрочный прогноз ЦБ: какой будет средняя ставка в 2027 году. Ожидания рынка — от 10,5 до 12,5%.",
        "note": "Годовая инфляция на 21 сентября — 6,26%. Риски — бюджет-2027 с ростом налогов, топливный рынок и тарифы.",
        "sources": [{"name": "Макроопрос Банка России", "url": "https://cbr.ru/statistics/ddkp/mo_br/"},
                    {"name": "The Moscow Times: итоги макроопроса", "url": "https://ru.themoscowtimes.com/2026/09/02/analitiki-ozhidayut-klyuchevuyu-stavku-v-ostavshiesya-mesyatsy-26g-v-137-makroopros-tsbr-a205079"},
                    {"name": "Smart-lab: ожидания 23 октября", "url": "https://smart-lab.ru/blog/1354912.php"}],
    },
    "us-cpi-2026-10-14": {
        "asOf": "2026-09-29",
        "items": [
            {"metric": "Инфляция, за год", "prev": "3,4%", "cons": "—"},
            {"metric": "Инфляция, за месяц", "prev": "0,4%", "cons": "—"},
            {"metric": "Базовая инфляция, за год", "prev": "2,4%", "cons": "—"},
            {"metric": "Базовая инфляция, за месяц", "prev": "0,3%", "cons": "—"},
        ],
        "note": "Консенсус появится за неделю до публикации. В августе бензин разогнал общий индекс, а базовая инфляция за год опустилась до минимума с марта 2021 года.",
        "sources": [{"name": "BLS: инфляция за август", "url": "https://www.bls.gov/news.release/cpi.nr0.htm"},
                    {"name": "CNBC", "url": "https://www.cnbc.com/2026/09/11/cpi-inflation-report-august-2026.html"}],
    },
    "rosstat-cpi-weekly-2026-09-30": {
        "asOf": "2026-09-29",
        "items": [
            {"metric": "Рост цен за неделю", "prev": "0,06%", "cons": "—", "range": "15–21 сентября, максимум с конца июля"},
            {"metric": "Годовая инфляция", "prev": "6,26%", "cons": "—"},
            {"metric": "С начала года", "prev": "4,81%", "cons": "—"},
        ],
        "note": "По недельным данным консенсус-опросов не проводят. Ориентир — прогноз ЦБ на конец года, 6–7%.",
        "sources": [{"name": "Интерфакс", "url": "https://www.interfax.ru/business/1118032"},
                    {"name": "Коммерсантъ", "url": "https://www.kommersant.ru/doc/8973577"}],
    },
    "cbr-2026-09-11": {
        "asOf": "2026-09-07",
        "items": [{"metric": "Ключевая ставка", "prev": "14%", "cons": "14%", "range": "альтернатива — снижение до 13,75%", "actual": "14%", "hit": True}],
        "views": "Почти все аналитики ждали паузы: ускорение инфляции, топливный рынок, слабый рубль.",
        "verdict": {"tone": "match", "text": "ЦБ впервые за 15 месяцев не снизил ставку"},
        "sources": [{"name": "Коммерсантъ", "url": "https://www.kommersant.ru/doc/8937998"}],
    },
    "fomc-2026-09": {
        "asOf": "2026-09-08",
        "items": [{"metric": "Диапазон ставки ФРС", "prev": "3,50–3,75%", "cons": "3,75–4,00%", "range": "повышение — около 56% по CME FedWatch", "actual": "3,75–4,00%", "hit": True}],
        "market": "Накануне ожидания были на грани: FedWatch — около 56% за повышение, предсказательные рынки — меньше 50%. До выступления Уорша в Джексон-Хоуле почти 70% ставили на паузу.",
        "verdict": {"tone": "match", "text": "решение принято единогласно, 12 голосов из 12"},
        "sources": [{"name": "Yahoo Finance", "url": "https://finance.yahoo.com/economy/policy/articles/fomc-september-2026-odds-rate-201618784.html"}],
    },
    "ecb-2026-09": {
        "asOf": "2026-09-10",
        "items": [{"metric": "Депозитная ставка ЕЦБ", "prev": "2,25%", "cons": "2,50%", "actual": "2,50%", "hit": True}],
        "verdict": {"tone": "match", "text": "повышение ждали; вопросы — к дальнейшему курсу"},
        "sources": [{"name": "CNBC", "url": "https://www.cnbc.com/2026/09/10/ecb-interest-rate-hike-lagarde-iran.html"}],
    },
}

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for k, v in C.items():
        json.dump({"consensus": v}, open(os.path.join(out, k + ".json"), "w"), ensure_ascii=False)
    print(len(C))
