/* Состояние подключений к первоисточникам.
   Пишется скриптом build/connect.py. Руками не правится.
   source_value — что сказал источник, terminal_value — что стоит в данных. */
window.VG_FEEDS = {
 "updated": "2026-09-20",
 "connectors": [
  {
   "id": "nvda-quarter",
   "source": "S12",
   "title": "Nvidia — квартальный пресс-релиз",
   "cadence": 95,
   "url": "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027",
   "lastRun": "2026-09-20",
   "fields": [
    {
     "key": "revenue",
     "definition": "Общая выручка за квартал, GAAP, млрд долларов США. Не годовая и не выручка сегмента",
     "unit": "$ млрд",
     "target": "companies.nvda.revenue",
     "source_value": 96.2,
     "terminal_value": 96.2,
     "match": true,
     "quote": "Revenue of $96.2 billion, up 106% from a year ago",
     "loc": "Пресс-релиз, подзаголовок",
     "cite": "nvda-rev"
    },
    {
     "key": "dcRevenue",
     "definition": "Выручка сегмента Data Center за тот же квартал, млрд долларов США",
     "unit": "$ млрд",
     "target": "companies.nvda.dcRevenue",
     "source_value": 89.0,
     "terminal_value": 89.0,
     "match": true,
     "quote": "Data Center revenue of $89.0 billion, up 117% from a year ago",
     "loc": "Пресс-релиз, подзаголовок",
     "cite": "nvda-dc"
    },
    {
     "key": "grossMargin",
     "definition": "Валовая маржа за квартал. В релизе GAAP и non-GAAP совпадают; берётся GAAP",
     "unit": "%",
     "target": "companies.nvda.grossMargin",
     "source_value": 75.0,
     "terminal_value": 75.0,
     "match": true,
     "quote": "gross margins were both 75.0%",
     "loc": "Пресс-релиз, раздел результатов квартала",
     "cite": "nvda-margin"
    }
   ],
   "state": "ok",
   "period": "Second Quarter Fiscal 2027",
   "published": "August 26, 2026",
   "citesRefreshed": 3,
   "divergent": 0
  },
  {
   "id": "asml-quarter",
   "source": "S19",
   "title": "ASML — квартальный пресс-релиз",
   "cadence": 95,
   "url": "https://www.asml.com/en/news/press-releases/2026/q2-2026-financial-results",
   "lastRun": "2026-09-20",
   "fields": [
    {
     "key": "revenueEur",
     "definition": "Total net sales за квартал, МИЛЛИАРДЫ ЕВРО. Прямое сравнение с долларовыми строками терминала некорректно",
     "unit": "€ млрд",
     "target": "companies.asml.revenueEur",
     "source_value": 9.3,
     "terminal_value": 9.3,
     "match": true,
     "quote": "Q2 total net sales of €9.3 billion",
     "loc": "Пресс-релиз, сводка квартала",
     "cite": "asml-q2"
    },
    {
     "key": "grossMargin",
     "definition": "Валовая маржа за квартал, проценты. Не путать с прогнозным диапазоном на год",
     "unit": "%",
     "target": "companies.asml.grossMargin",
     "source_value": 54.0,
     "terminal_value": 54.0,
     "match": true,
     "quote": "gross margin of 54.0%",
     "loc": "Пресс-релиз, сводка квартала",
     "cite": "asml-margin"
    }
   ],
   "state": "ok",
   "period": "",
   "published": "",
   "citesRefreshed": 0,
   "divergent": 0
  }
 ],
 "declared": [
  {
   "source": "S4",
   "title": "IEA — энергопотребление ЦОД",
   "why": "iea.org отвечает 403 на запрос из среды сборки"
  },
  {
   "source": "S17",
   "title": "CoreWeave — форма 10-Q",
   "why": "sec.gov отвечает 403; нужен доступ с объявленным User-Agent по правилам SEC"
  },
  {
   "source": "S15",
   "title": "Amazon — квартальный релиз",
   "why": "ir.aboutamazon.com отвечает 403"
  },
  {
   "source": "S13",
   "title": "Broadcom — квартальный релиз",
   "why": "investors.broadcom.com отвечает 403"
  },
  {
   "source": "S14",
   "title": "Oracle — годовой релиз",
   "why": "investor.oracle.com отвечает 403"
  },
  {
   "source": "S18",
   "title": "TSMC — квартальные результаты",
   "why": "investor.tsmc.com отвечает 403"
  },
  {
   "source": "S16",
   "title": "Meta — квартальный релиз",
   "why": "investor.atmeta.com отвечает 403"
  },
  {
   "source": "—",
   "title": "Рыночный слой: котировки и кредитные спрэды",
   "why": "FRED не отвечает, Stooq отдаёт JS-заглушку, Yahoo — 429, AlphaVantage требует ключ. Слой A остаётся неподключённым"
  }
 ]
};
