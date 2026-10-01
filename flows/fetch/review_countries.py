#!/usr/bin/env python3
"""Проверка и обновление профилей стран (flows/data/countries.json).

Для каждого профиля старше REVIEW_DAYS дней Claude с веб-поиском сверяет текст
со свежими новостями (последние ~3 месяца) и возвращает обновлённую версию.
Изменения пишутся в countries.json (поле reviewed = сегодня), а краткий
журнал правок — в countries_log.json, чтобы редакция видела, что поменялось.

Запуск:
  python3 flows/fetch/review_countries.py            # профили старше 30 дней, не больше 20 за прогон
  python3 flows/fetch/review_countries.py RU NO      # только выбранные страны
  python3 flows/fetch/review_countries.py --all      # все профили

Нужен ANTHROPIC_API_KEY (или другой способ авторизации Anthropic SDK).
"""
import datetime as dt
import json
import os
import re
import sys

import anthropic

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "countries.json")
LOG = os.path.join(ROOT, "data", "countries_log.json")
REVIEW_DAYS = 30
MAX_PER_RUN = 20
MODEL = "claude-opus-5-5"
FIELDS = ("role", "partners", "strengths", "weaknesses", "outlook")

SYSTEM = """Ты аналитик сырьевых рынков в редакции делового радио. Ты поддерживаешь
короткие политико-экономические профили стран для терминала «Карта товарных потоков».
Профиль описывает положение страны на мировых сырьевых рынках, ключевых партнёров,
сильные и слабые стороны и перспективы.

Правила:
- Проверь профиль по свежим новостям через веб-поиск: санкции, пошлины, экспортные
  запреты, сделки, аварии, смена политики, новые проекты за последние три месяца.
- Меняй только то, что устарело или стало неточным. Если всё верно, верни текст как есть.
- Каждое поле — одно-два коротких предложения по-русски, без канцелярита, без оценочных
  эпитетов. Конкретные факты важнее общих слов. Не придумывай цифры.
- Ответ заверши одним JSON-объектом в блоке ```json с ключами:
  role, partners, strengths, weaknesses, outlook, changes.
  changes — одно предложение о том, что изменилось, или пустая строка."""


def load():
    with open(PATH, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def extract_json(text):
    blocks = re.findall(r"```json\s*(\{.*?\})\s*```", text, re.S)
    raw = blocks[-1] if blocks else text[text.find("{"): text.rfind("}") + 1]
    obj = json.loads(raw)
    for k in FIELDS:
        if not isinstance(obj.get(k), str) or not obj[k].strip():
            raise ValueError(f"нет поля {k}")
    return obj


def review(client, iso, profile, today):
    current = {k: profile.get(k, "") for k in FIELDS}
    messages = [{
        "role": "user",
        "content": f"Сегодня {today}. Страна: {iso} (код ISO-2).\n"
                   f"Текущий профиль (проверен {profile.get('reviewed', 'никогда')}):\n"
                   f"{json.dumps(current, ensure_ascii=False, indent=1)}",
    }]
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 6}]
    for _ in range(5):  # продолжения после pause_turn
        resp = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM,
            messages=messages,
            tools=tools,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        if resp.stop_reason == "refusal":
            raise RuntimeError("модель отказалась отвечать")
        if resp.stop_reason != "pause_turn":
            break
        messages = messages[:1] + [{"role": "assistant", "content": resp.content}]
    text = "".join(b.text for b in resp.content if b.type == "text")
    return extract_json(text)


def main():
    args = sys.argv[1:]
    data = load()
    today = dt.date.today()
    keys = [k for k in data if not k.startswith("_")]
    if args and args != ["--all"]:
        todo = [k for k in args if k in data]
    elif args == ["--all"]:
        todo = keys
    else:
        def age(k):
            r = data[k].get("reviewed")
            return (today - dt.date.fromisoformat(r)).days if r else 10 ** 6
        todo = sorted([k for k in keys if age(k) >= REVIEW_DAYS], key=age, reverse=True)[:MAX_PER_RUN]
    if not todo:
        print("все профили свежие")
        return

    client = anthropic.Anthropic()
    log = []
    if os.path.exists(LOG):
        with open(LOG, encoding="utf-8") as f:
            log = json.load(f)
    for iso in todo:
        try:
            new = review(client, iso, data[iso], today.isoformat())
        except (anthropic.RateLimitError, anthropic.APIConnectionError) as e:
            print(f"  {iso}: временная ошибка, пропуск до следующего прогона ({e})", file=sys.stderr)
            continue
        except anthropic.APIStatusError as e:
            print(f"  {iso}: ошибка API {e.status_code}", file=sys.stderr)
            continue
        except (ValueError, RuntimeError) as e:
            print(f"  {iso}: ответ не принят ({e})", file=sys.stderr)
            continue
        changed = any(new[k].strip() != data[iso].get(k, "").strip() for k in FIELDS)
        for k in FIELDS:
            data[iso][k] = new[k].strip()
        data[iso]["reviewed"] = today.isoformat()
        if changed:
            log.append({"date": today.isoformat(), "iso": iso, "changes": new.get("changes", "").strip()})
        print(f"  {iso}: {'обновлён' if changed else 'без изменений'}")
        save(data)  # сохраняем после каждой страны, чтобы сбой не терял работу
    with open(LOG, "w", encoding="utf-8") as f:
        json.dump(log[-500:], f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
