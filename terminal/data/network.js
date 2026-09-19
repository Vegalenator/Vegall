/* Граф связей: капитал, поставки, контракты.
   ВАЖНО: стрелка показывает направление ДЕНЕГ. Встречный поток (оборудование,
   вычисления, энергия) описан в поле back.
   inReport: 'yes'       — связь прямо описана в исследовании, есть код источника
             'mechanism' — механизм описан в исследовании (тезис 8), но компании не названы
             'no'        — общеизвестное корпоративное раскрытие вне исследования */
window.VG_NODES = [
  { id: 'asml', name: 'ASML', layer: 'fab', country: 'Нидерланды', note: 'Литография EUV; редкий поставщик' },
  { id: 'tsmc', name: 'TSMC', layer: 'fab', country: 'Тайвань', note: 'Передовые техпроцессы и упаковка CoWoS' },
  { id: 'skhynix', name: 'SK hynix', layer: 'memory', country: 'Южная Корея', note: 'HBM4; спрос 2026 во многом законтрактован' },
  { id: 'nvda', name: 'Nvidia', layer: 'chip', country: 'США', note: 'Ускорители и программная платформа' },
  { id: 'avgo', name: 'Broadcom', layer: 'chip', country: 'США', note: 'Сети и заказные процессоры; фаблесс' },
  { id: 'smci', name: 'Сборщики', full: 'Сборщики серверов', layer: 'chip', country: 'США / Азия', note: 'Supermicro, Dell, ODM — низкая маржа' },
  { id: 'vertiv', name: 'Охлаждение', layer: 'dc', country: 'США / ЕС', note: 'Vertiv, Schneider Electric' },
  { id: 'msft', name: 'Microsoft', layer: 'cloud', country: 'США', note: 'Azure свыше $100 млрд в год' },
  { id: 'googl', name: 'Alphabet', layer: 'cloud', country: 'США', note: 'Google Cloud $24,8 млрд за квартал' },
  { id: 'amzn', name: 'Amazon', layer: 'cloud', country: 'США', note: 'AWS $42,2 млрд за квартал' },
  { id: 'meta', name: 'Meta', layer: 'cloud', country: 'США', note: 'Капвложения без отдельной ИИ-выручки' },
  { id: 'orcl', name: 'Oracle', layer: 'cloud', country: 'США', note: 'Портфель обязательств $638 млрд' },
  { id: 'baba', name: 'Alibaba', layer: 'cloud', country: 'Китай', note: 'Облако $7,1 млрд за квартал' },
  { id: 'crwv', name: 'CoreWeave', layer: 'speccloud', country: 'США', note: 'RPO $103,7 млрд; 72% выручки от трёх клиентов' },
  { id: 'equinix', name: 'Операторы ЦОД', full: 'Операторы ЦОД', layer: 'dc', country: 'Мир', note: 'Equinix, Digital Realty, региональные операторы' },
  { id: 'yndx', name: 'Яндекс', layer: 'cloud', country: 'Россия', note: 'B2B Tech 15,3 млрд руб. за квартал' },
  { id: 'sber', name: 'Сбер', layer: 'cloud', country: 'Россия', note: 'Заявленный эффект ИИ свыше 450 млрд руб.' },
  { id: 'openai', name: 'OpenAI', layer: 'model', country: 'США', note: 'Разработчик моделей; капитал и облачные кредиты' },
  { id: 'anthropic', name: 'Anthropic', layer: 'model', country: 'США', note: 'Разработчик моделей; капитал и облачные кредиты' },
  { id: 'constellation', name: 'Constellation', layer: 'energy', country: 'США', note: 'Перезапуск Crane Clean Energy Center, 835 МВт' },
  { id: 'grid', name: 'Сеть', full: 'Сеть и генерация', layer: 'energy', country: 'Мир', note: 'Очередь на подключение — реальный ограничитель ввода' },
  { id: 'bonds', name: 'Облигации', full: 'Облигационный рынок', layer: 'capital', country: 'Мир', note: 'Более $100 млрд валового выпуска гипермасштабных компаний в 2025' },
  { id: 'privcredit', name: 'Частный кредит', full: 'Частный кредит и SPV', layer: 'capital', country: 'Мир', note: 'Проектные структуры, залог серверов и договоров' },
  { id: 'vc', name: 'Венчур', full: 'Венчурный капитал', layer: 'capital', country: 'Мир', note: 'Финансирует разработчиков моделей и приложений' },
  { id: 'equity', name: 'Рынок акций', layer: 'capital', country: 'Мир', note: 'Размещения акций финансируют вычисления' },
  { id: 'states', name: 'Государства', full: 'Государства: субсидии и промполитика', layer: 'capital', country: 'США, ЕС, КНР, Япония, Корея', note: 'Снижают стоимость капитала, создают риск дублирования' },
  { id: 'eu', name: 'ЕС InvestAI', full: 'Европейская комиссия: InvestAI', layer: 'capital', country: 'ЕС', note: 'План мобилизации €200 млрд; до семи гигафабрик ИИ' },
  { id: 'sovereign', name: 'Суверенные фонды', layer: 'capital', country: 'Ближний Восток', note: 'Дешёвая энергия и капитал' },
  { id: 'crwv3', name: 'Клиенты CoreWeave', full: 'Три крупнейших клиента CoreWeave', layer: 'demand', country: 'США', note: '72% квартальной выручки; в отчётности не раскрыты поимённо' },
  { id: 'enterprises', name: 'Конечные клиенты', layer: 'demand', country: 'Мир', note: 'Единственный источник внешнего денежного потока всей цепочки' }
];

window.VG_EDGES = [
  // --- Оплата поставок (деньги идут покупатель → поставщик) ---
  { from: 'tsmc', to: 'asml', type: 'supply', back: 'литография EUV', label: 'Оплата оборудования', src: 'S19', inReport: 'yes' },
  { from: 'nvda', to: 'tsmc', type: 'supply', back: 'кристаллы и упаковка CoWoS', label: 'Оплата фабрики', src: 'S18', inReport: 'yes' },
  { from: 'avgo', to: 'tsmc', type: 'supply', back: 'кристаллы заказных процессоров', label: 'Оплата фабрики', src: 'S13', inReport: 'yes' },
  { from: 'nvda', to: 'skhynix', type: 'supply', back: 'память HBM4', src: 'S28', label: 'Оплата HBM', inReport: 'yes' },
  { from: 'msft', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S12', inReport: 'yes' },
  { from: 'googl', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S12', inReport: 'yes' },
  { from: 'amzn', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S12', inReport: 'yes' },
  { from: 'meta', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S12', inReport: 'yes' },
  { from: 'orcl', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S12', inReport: 'yes' },
  { from: 'baba', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Закупка ускорителей', src: 'S20', inReport: 'yes' },
  { from: 'crwv', to: 'nvda', type: 'supply', back: 'ускорители', label: 'Все установленные процессоры — Nvidia', weight: 3, src: 'S17', inReport: 'yes' },
  { from: 'googl', to: 'avgo', type: 'supply', back: 'заказные процессоры и сети', label: 'Заказные процессоры', src: 'S13', inReport: 'no' },
  { from: 'meta', to: 'avgo', type: 'supply', back: 'заказные процессоры и сети', label: 'Заказные процессоры', src: 'S13', inReport: 'no' },
  { from: 'msft', to: 'smci', type: 'supply', back: 'серверы и стойки', label: 'Закупка серверов', inReport: 'mechanism' },
  { from: 'crwv', to: 'smci', type: 'supply', back: 'серверы и стойки', label: 'Закупка серверов', inReport: 'mechanism' },
  { from: 'equinix', to: 'vertiv', type: 'supply', back: 'охлаждение и энергооборудование', label: 'Закупка систем охлаждения', inReport: 'mechanism' },
  { from: 'equinix', to: 'grid', type: 'supply', back: 'подключение и энергия', label: 'Плата за мощность', src: 'S4', inReport: 'yes' },
  { from: 'crwv', to: 'equinix', type: 'supply', back: 'машинные залы и МВт', label: 'Аренда мощности', inReport: 'mechanism' },

  // --- Доли в капитале (инвестор → объект) ---
  { from: 'nvda', to: 'crwv', type: 'equity', amount: '$2 млрд', label: 'Стратегическая инвестиция, январь 2026', weight: 3, src: 'S17', inReport: 'yes', circular: true },
  { from: 'vc', to: 'openai', type: 'equity', label: 'Венчурный и стратегический капитал', src: 'S3', inReport: 'yes' },
  { from: 'vc', to: 'anthropic', type: 'equity', label: 'Венчурный и стратегический капитал', src: 'S3', inReport: 'yes' },
  { from: 'msft', to: 'openai', type: 'equity', label: 'Доля и облачные кредиты', inReport: 'no', circular: true },
  { from: 'amzn', to: 'anthropic', type: 'equity', label: 'Доля и облачные кредиты', inReport: 'no', circular: true },
  { from: 'googl', to: 'anthropic', type: 'equity', label: 'Доля и облачные кредиты', inReport: 'no', circular: true },
  { from: 'equity', to: 'baba', type: 'equity', amount: 'HK$80 млрд', label: 'Размещение акций, около 60% средств — на вычисления', src: 'S20', inReport: 'yes' },
  { from: 'states', to: 'tsmc', type: 'equity', label: 'Субсидии фабрикам по регионам', src: 'S18', inReport: 'yes' },
  { from: 'eu', to: 'equinix', type: 'equity', amount: '>€30 млрд', label: 'До семи гигафабрик ИИ в рамках InvestAI', src: 'S26', inReport: 'yes' },
  { from: 'sovereign', to: 'equinix', type: 'equity', label: 'Инфраструктурный капитал', src: 'S3', inReport: 'mechanism' },

  // --- Долг, аренда, проектные структуры ---
  { from: 'bonds', to: 'msft', type: 'debt', label: 'Облигации и финансовая аренда', src: 'S2', inReport: 'yes' },
  { from: 'bonds', to: 'googl', type: 'debt', label: 'Облигации', src: 'S2', inReport: 'yes' },
  { from: 'bonds', to: 'amzn', type: 'debt', label: 'Облигации', src: 'S2', inReport: 'yes' },
  { from: 'bonds', to: 'meta', type: 'debt', label: 'Облигации', src: 'S2', inReport: 'yes' },
  { from: 'bonds', to: 'orcl', type: 'debt', label: 'Облигации', src: 'S2', inReport: 'yes' },
  { from: 'privcredit', to: 'crwv', type: 'debt', label: 'Долг под залог договоров и оборудования', weight: 2, src: 'S17', inReport: 'yes' },
  { from: 'privcredit', to: 'equinix', type: 'debt', label: 'Проектное финансирование и SPV', src: 'S2', inReport: 'yes' },
  { from: 'privcredit', to: 'grid', type: 'debt', label: 'Проектный долг энергообъектов', src: 'S3', inReport: 'mechanism' },

  // --- Долгосрочные договоры и гарантии закупки ---
  { from: 'msft', to: 'constellation', type: 'contract', amount: '835 МВт', label: 'Двадцатилетний договор купли электроэнергии', weight: 3, src: 'S27', inReport: 'yes' },
  { from: 'openai', to: 'msft', type: 'contract', back: 'вычисления', label: 'Многолетний договор с облаком', weight: 2, inReport: 'mechanism', circular: true },
  { from: 'anthropic', to: 'amzn', type: 'contract', back: 'вычисления', label: 'Многолетний договор с облаком', inReport: 'no', circular: true },
  { from: 'anthropic', to: 'googl', type: 'contract', back: 'вычисления', label: 'Многолетний договор с облаком', inReport: 'no', circular: true },
  { from: 'crwv3', to: 'crwv', type: 'contract', amount: '72% выручки', label: 'Концентрация клиентов', weight: 3, src: 'S17', inReport: 'yes' },
  { from: 'enterprises', to: 'orcl', type: 'contract', amount: 'RPO $638 млрд', label: 'Портфель обязательств', weight: 2, src: 'S14', inReport: 'yes' },

  // --- Внешний денежный поток: единственная проверка всей цепочки ---
  { from: 'enterprises', to: 'msft', type: 'external', label: 'Подписки и потребление', src: 'S10', inReport: 'yes' },
  { from: 'enterprises', to: 'googl', type: 'external', label: 'Облачная выручка', src: 'S11', inReport: 'yes' },
  { from: 'enterprises', to: 'amzn', type: 'external', label: 'Облачная выручка', src: 'S15', inReport: 'yes' },
  { from: 'enterprises', to: 'baba', type: 'external', label: 'Облачная выручка', src: 'S20', inReport: 'yes' },
  { from: 'enterprises', to: 'yndx', type: 'external', label: 'B2B-выручка и токены', src: 'S24', inReport: 'yes' },
  { from: 'enterprises', to: 'sber', type: 'external', label: 'Банковские и платформенные сервисы', src: 'S23', inReport: 'yes' }
];

window.VG_EDGE_TYPES = {
  supply:   { label: 'Оплата поставки', hint: 'Деньги за оборудование, мощность или энергию' },
  equity:   { label: 'Доля в капитале', hint: 'Инвестиция в капитал получателя' },
  debt:     { label: 'Долг, аренда, SPV', hint: 'Заёмное и проектное финансирование' },
  contract: { label: 'Долгосрочный договор', hint: 'Гарантия закупки, PPA, портфель обязательств' },
  external: { label: 'Внешний клиент', hint: 'Платёж конечного клиента — единственный поток, приходящий в цепочку извне' }
};

window.VG_LAYER_LABELS = {
  fab: 'Фабрики и литография', memory: 'Память', chip: 'Кремний и железо',
  cloud: 'Облако', speccloud: 'Специализированное облако', model: 'Модели',
  dc: 'ЦОД и охлаждение', energy: 'Энергетика', capital: 'Капитал', demand: 'Спрос'
};
