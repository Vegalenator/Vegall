/* История значений терминала.
   Снимки идут от старого к новому и создаются скриптом build/snapshot.py.
   Руками не правятся: расхождение снимка с данными означало бы, что экран
   «Что изменилось» показывает не то, что произошло. */
window.VG_HISTORY = [
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-19",
  "label": "первая сборка терминала",
  "method": 2,
  "index": {
   "overall": 38.5,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 8.3,
     "seen": 6,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 75,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok"
   },
   "cap-selffund": {
    "state": "watch"
   },
   "cap-fcf": {
    "state": "watch"
   },
   "cap-bonds": {
    "state": "watch"
   },
   "cap-privcredit": {
    "state": "nodata"
   },
   "cap-leases": {
    "state": "watch"
   },
   "semi-nvda-dc": {
    "state": "ok"
   },
   "semi-nvda-margin": {
    "state": "ok"
   },
   "semi-avgo-ai": {
    "state": "ok"
   },
   "semi-hbm": {
    "state": "watch"
   },
   "semi-asml": {
    "state": "ok"
   },
   "semi-tsmc-util": {
    "state": "ok"
   },
   "cloud-growth": {
    "state": "ok"
   },
   "cloud-margin": {
    "state": "ok"
   },
   "cloud-price": {
    "state": "nodata"
   },
   "cloud-util": {
    "state": "nodata"
   },
   "soft-seats": {
    "state": "ok"
   },
   "soft-tokens": {
    "state": "watch"
   },
   "soft-adoption": {
    "state": "watch"
   },
   "soft-depth": {
    "state": "stress"
   },
   "soft-firm": {
    "state": "nodata"
   },
   "soft-labour": {
    "state": "watch"
   },
   "energy-twh": {
    "state": "watch"
   },
   "energy-leadtime": {
    "state": "stress"
   },
   "energy-pue": {
    "state": "nodata"
   },
   "ru-adoption": {
    "state": "watch"
   },
   "ru-racks": {
    "state": "stress"
   },
   "ru-revenue": {
    "state": "watch"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capex": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 1,
    "known": 2,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 0,
   "partial": 0,
   "mismatch": 0,
   "unreachable": 0,
   "pending": 0,
   "total": 0
  },
  "rev": "64242c2",
  "seq": 1
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-19",
  "label": "исправления по внешнему разбору",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok"
   },
   "cap-selffund": {
    "state": "watch"
   },
   "cap-fcf": {
    "state": "watch"
   },
   "cap-bonds": {
    "state": "watch"
   },
   "cap-privcredit": {
    "state": "nodata"
   },
   "cap-leases": {
    "state": "watch"
   },
   "semi-nvda-dc": {
    "state": "ok"
   },
   "semi-nvda-margin": {
    "state": "ok"
   },
   "semi-avgo-ai": {
    "state": "ok"
   },
   "semi-hbm": {
    "state": "watch"
   },
   "semi-asml": {
    "state": "ok"
   },
   "semi-tsmc-util": {
    "state": "nodata"
   },
   "cloud-growth": {
    "state": "ok"
   },
   "cloud-margin": {
    "state": "ok"
   },
   "cloud-price": {
    "state": "nodata"
   },
   "cloud-util": {
    "state": "nodata"
   },
   "soft-seats": {
    "state": "ok"
   },
   "soft-tokens": {
    "state": "watch"
   },
   "soft-adoption": {
    "state": "watch"
   },
   "soft-depth": {
    "state": "stress"
   },
   "soft-firm": {
    "state": "nodata"
   },
   "soft-labour": {
    "state": "watch"
   },
   "energy-twh": {
    "state": "watch"
   },
   "energy-leadtime": {
    "state": "watch"
   },
   "energy-pue": {
    "state": "nodata"
   },
   "ru-adoption": {
    "state": "watch"
   },
   "ru-racks": {
    "state": "stress"
   },
   "ru-revenue": {
    "state": "watch"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 0,
   "partial": 0,
   "mismatch": 0,
   "unreachable": 0,
   "pending": 0,
   "total": 0
  },
  "rev": "4db8cf8",
  "seq": 2
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-20",
  "label": "сверка с первоисточниками",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 26,
   "partial": 5,
   "mismatch": 1,
   "unreachable": 10,
   "pending": 4,
   "total": 46
  },
  "seq": 3
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-20",
  "label": "первые подключения к первоисточникам",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 27,
   "partial": 5,
   "mismatch": 1,
   "unreachable": 10,
   "pending": 4,
   "total": 47
  },
  "seq": 4
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-29",
  "label": "календарь раскрытий",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 27,
   "partial": 5,
   "mismatch": 1,
   "unreachable": 10,
   "pending": 4,
   "total": 47
  },
  "seq": 5
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-09-30",
  "label": "круговые контуры: разбор рисков и сверка переоценки долей",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.6,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 40.2
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 29,
   "partial": 5,
   "mismatch": 1,
   "unreachable": 10,
   "pending": 4,
   "total": 49
  },
  "seq": 6
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-10-18",
  "label": "Закрыты Amazon, InvestAI и iKS; ASML и TSMC за III кв.; CoreWeave, Meta, Broadcom, Oracle сверены по SEC",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-10-18"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-10-18"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capex": 169,
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 31.1,
    "ocf": 31.9,
    "fcf": 0.8
   },
   "orcl": {
    "capex": 55.6,
    "ocf": 32,
    "fcf": -23.7,
    "rpo": 638
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.7,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 46.7
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 41,
   "partial": 5,
   "mismatch": 0,
   "unreachable": 3,
   "pending": 3,
   "total": 52
  },
  "seq": 7
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-10-25",
  "label": "III кв. Meta (капвложения $34,9 млрд, свободный поток −$2,1 млрд, прогноз сужен до $135-145 млрд), Oracle I кв. 2027 ф.г. (RPO $664 млрд, продажа акций на $20 млрд); сверка по XBRL: обязательства Meta",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-10-25"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-10-25"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-10-25"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-09-06"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-10-25"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 41,
    "ocf": 55.4,
    "fcf": 19.6
   },
   "googl": {
    "capex": 44.9,
    "ocf": 39.1,
    "fcf": -5.9
   },
   "amzn": {
    "capex": 169,
    "capexDelta": 66.1,
    "ocf": 161.4,
    "fcf": -7.6
   },
   "meta": {
    "capex": 34.9,
    "ocf": 32.8,
    "fcf": -2.1
   },
   "orcl": {
    "capex": 75.7,
    "ocf": 46.9,
    "fcf": -28.7,
    "rpo": 664
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.7,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 46.7
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 43,
   "partial": 6,
   "mismatch": 0,
   "unreachable": 3,
   "pending": 3,
   "total": 55
  },
  "seq": 8
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-11-01",
  "label": "III кв. 2026: Alphabet, Microsoft, Яндекс (28-29.10), Amazon по 10-Q (капвложения 12 мес. $215 млрд, III кв. $77 млрд); контуры: Alphabet прочий доход -$8,2 млрд, Amazon неоперационная строка -$1,2 млрд",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-10-25"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 45.2,
    "ocf": 58,
    "fcf": 18.6
   },
   "googl": {
    "capex": 51.4,
    "ocf": 42.3,
    "fcf": -9.1
   },
   "amzn": {
    "capex": 215.2,
    "ocf": 168.3,
    "fcf": -46.9
   },
   "meta": {
    "capex": 34.9,
    "ocf": 32.8,
    "fcf": -2.1
   },
   "orcl": {
    "capex": 75.7,
    "ocf": 46.9,
    "fcf": -28.7,
    "rpo": 664
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.7,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 46.7
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 51,
   "partial": 5,
   "mismatch": 0,
   "unreachable": 3,
   "pending": 3,
   "total": 62
  },
  "seq": 9
 },
 {
  "asOf": "2026-09-06",
  "builtAt": "2026-11-06",
  "label": "Котировки: тепловая карта рынка; Anthropic подал S-1; данные воскресной сборки 01.11",
  "method": 2,
  "index": {
   "overall": 34.6,
   "groups": {
    "capital": {
     "value": 40,
     "seen": 5,
     "all": 6
    },
    "semi": {
     "value": 10,
     "seen": 5,
     "all": 6
    },
    "cloud": {
     "value": 0,
     "seen": 2,
     "all": 4
    },
    "soft": {
     "value": 50,
     "seen": 5,
     "all": 6
    },
    "energy": {
     "value": 50,
     "seen": 2,
     "all": 3
    },
    "russia": {
     "value": 66.7,
     "seen": 3,
     "all": 3
    }
   }
  },
  "indicators": {
   "cap-capex-total": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cap-selffund": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "cap-fcf": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "cap-bonds": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "cap-privcredit": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cap-leases": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "semi-nvda-dc": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-nvda-margin": {
    "state": "ok",
    "checked": "2026-10-25"
   },
   "semi-avgo-ai": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-hbm": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "semi-asml": {
    "state": "ok",
    "checked": "2026-10-18"
   },
   "semi-tsmc-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "cloud-growth": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cloud-margin": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "cloud-price": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "cloud-util": {
    "state": "nodata",
    "checked": "2026-10-18"
   },
   "soft-seats": {
    "state": "ok",
    "checked": "2026-11-01"
   },
   "soft-tokens": {
    "state": "watch",
    "checked": "2026-11-01"
   },
   "soft-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "soft-depth": {
    "state": "stress",
    "checked": "2026-09-06"
   },
   "soft-firm": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "soft-labour": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-twh": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-leadtime": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "energy-pue": {
    "state": "nodata",
    "checked": "2026-09-06"
   },
   "ru-adoption": {
    "state": "watch",
    "checked": "2026-09-06"
   },
   "ru-racks": {
    "state": "stress",
    "checked": "2026-10-25"
   },
   "ru-revenue": {
    "state": "watch",
    "checked": "2026-09-06"
   }
  },
  "companies": {
   "msft": {
    "capex": 45.2,
    "ocf": 58,
    "fcf": 18.6
   },
   "googl": {
    "capex": 51.4,
    "ocf": 42.3,
    "fcf": -9.1
   },
   "amzn": {
    "capex": 215.2,
    "ocf": 168.3,
    "fcf": -46.9
   },
   "meta": {
    "capex": 34.9,
    "ocf": 32.8,
    "fcf": -2.1
   },
   "orcl": {
    "capex": 75.7,
    "ocf": 46.9,
    "fcf": -28.7,
    "rpo": 664
   },
   "crwv": {
    "capex": 14.1,
    "ocf": 3.7,
    "fcf": -10.5,
    "rpo": 103.7,
    "revenue": 2.6
   },
   "nvda": {
    "revenue": 96.2
   },
   "avgo": {
    "capex": 0.5,
    "fcf": 13.7
   },
   "tsmc": {
    "revenue": 46.7
   },
   "asml": {},
   "skhynix": {},
   "baba": {
    "capex": 10
   },
   "yndx": {},
   "sber": {}
  },
  "graph": {
   "nodes": 30,
   "edges": 48,
   "cycles": [
    "amzn + anthropic",
    "anthropic + googl",
    "crwv + nvda",
    "msft + openai"
   ]
  },
  "scenarios": {
   "base": {
    "prob": 55,
    "met": 0,
    "known": 1,
    "total": 4
   },
   "opt": {
    "prob": 20,
    "met": 0,
    "known": 3,
    "total": 3
   },
   "stress": {
    "prob": 25,
    "met": 0,
    "known": 1,
    "total": 5
   }
  },
  "cites": {
   "verified": 52,
   "partial": 6,
   "mismatch": 0,
   "unreachable": 3,
   "pending": 4,
   "total": 65
  },
  "seq": 10
 }
];
