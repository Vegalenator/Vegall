/* Метаданные терминала и реестр первичных источников.
   Каждая цифра в терминале ссылается на код источника S1-S30. */
window.VG_META = {
  title: 'Терминал ИИ-цикла',
  asOf: '2026-09-06',              // дата среза исследования
  builtAt: '2026-09-19',           // дата сборки терминала
  basis: 'Глубокое исследование «ИИ как инвестиционный и финансовый цикл», 6 сентября 2026',
  // Типы утверждений — бейдж рядом с каждой цифрой
  kinds: {
    fact:     { label: 'факт',      hint: 'Раскрытие компании или наблюдение статистического ведомства' },
    estimate: { label: 'оценка',    hint: 'Расчёт международной организации или расчёт терминала' },
    forecast: { label: 'прогноз',   hint: 'Сценарная модель; зависит от допущений' },
    claim:    { label: 'заявление', hint: 'Сообщено руководством компании без раскрытой независимой методики' },
    expert:   { label: 'шкала',     hint: 'Экспертная оцифровка качественной таблицы исследования' },
    calc:     { label: 'расчёт',    hint: 'Вычислено терминалом из раскрытых компанией величин' },
    unverified: { label: 'не сверено', hint: 'Величина из внешней проверки, не сверенная с первоисточником в этой сборке' }
  },
  mode: {
    current: 'ручное обновление',
    note: 'Все данные записаны в файлах и обновляются вручную. Автоматических подключений к источникам в этой сборке нет. Истории значений тоже нет, поэтому терминал отвечает на вопрос «как сейчас», но пока не на вопрос «что изменилось с прошлого раза».',
    planned: [
      'Слой A — котировки, капитализация, кредитные спрэды. Планируется: обновление по расписанию.',
      'Слой B — капвложения, потоки, выручка сегментов. Планируется: импорт из машиночитаемых раскрытий.',
      'Слой C — IEA, BIS, Census, Банк России, iKS, связи графа. Останется ручным: эти организации не отдают данные машиночитаемо.'
    ]
  },
  disclaimer: 'Панель проверки, а не торговая рекомендация. Финансовые годы компаний не совпадают с календарными; суммирование разных периодов не даёт точного календарного итога.',
  sources: {
    S1:  { org: 'BIS', title: 'Annual Economic Report 2026', date: '2026-06-28', url: 'https://www.bis.org/publications/aer-2026/progress-peril' },
    S2:  { org: 'BIS', title: 'Quarterly Review, март 2026 — финансирование ИИ-инфраструктуры', date: '2026-03', url: 'https://www.bis.org/publications/financing-ai-infrastructure-boom-on-and-off-balance-sheet-borrowing' },
    S3:  { org: 'BIS', title: 'Bulletin 120 — от денежного потока к долгу', date: '2026', url: 'https://www.bis.org/publications/bulletin-120-financing-ai-boom-cash-flows-debt.pdf' },
    S4:  { org: 'IEA', title: 'Key Questions on Energy and AI', date: '2026', url: 'https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary' },
    S5:  { org: 'OECD', title: 'Macroeconomic productivity gains from AI in G7', date: '2025-06-30', url: 'https://www.oecd.org/en/publications/macroeconomic-productivity-gains-from-artificial-intelligence-in-g7-economies_a5319ab5-en.html' },
    S6:  { org: 'US Census Bureau', title: 'CES WP 26-25 — внедрение ИИ по фирмам', date: '2026', url: 'https://www.census.gov/library/working-papers/2026/adrm/CES-WP-26-25.html' },
    S7:  { org: 'NBER', title: 'Generative AI at Work', date: '2023', url: 'https://www.nber.org/papers/w31161' },
    S8:  { org: 'Organization Science / HBS', title: 'Неровная граница возможностей ИИ', date: '2026-03-11', url: 'https://doi.org/10.1287/orsc.2025.21838' },
    S9:  { org: 'IMF', title: 'Global Financial Stability Report, апрель 2026', date: '2026-04', url: 'https://www.imf.org/-/media/files/publications/gfsr/2026/april/english/ch1.pdf' },
    S10: { org: 'Microsoft', title: 'FY2026 Q4', date: '2026-07-29', url: 'https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4' },
    S11: { org: 'Alphabet', title: 'Q2 2026', date: '2026-07', url: 'https://s206.q4cdn.com/479360582/files/doc_financials/2026/q2/2026q2-alphabet-earnings-release.pdf' },
    S12: { org: 'Nvidia', title: 'Q2 FY2027', date: '2026-08-26', url: 'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027' },
    S13: { org: 'Broadcom', title: 'Q3 FY2026', date: '2026-09-02', url: 'https://investors.broadcom.com/news-releases/news-release-details/broadcom-inc-announces-third-quarter-fiscal-year-2026-financial' },
    S14: { org: 'Oracle', title: 'FY2026', date: '2026-06', url: 'https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Record-Q4-and-FY-2026-Results-Driven-by-Cloud-Infrastructure--Cloud-Applications/default.aspx' },
    S15: { org: 'Amazon', title: 'Q2 2026', date: '2026-07', url: 'https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Second-Quarter-Results/' },
    S16: { org: 'Meta', title: 'Q2 2026', date: '2026-07', url: 'https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Second-Quarter-2026-Results/default.aspx' },
    S17: { org: 'CoreWeave', title: 'Форма 10-Q', date: '2026-08-11', url: 'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm' },
    S18: { org: 'TSMC', title: 'Q2 2026 и 20-F 2025', date: '2026-07', url: 'https://investor.tsmc.com/english/quarterly-results/2026/q2', generic: true },
    S19: { org: 'ASML', title: 'Q2 2026', date: '2026-07-15', url: 'https://www.asml.com/en/news/press-releases/2026/q2-2026-financial-results' },
    S20: { org: 'Alibaba', title: 'Результаты и размещение акций, август 2026', date: '2026-08', url: 'https://www.alibabagroup.com/en-US/document-2027233133950140416' },
    S21: { org: 'Банк России', title: 'Применение ИИ на финансовом рынке', date: '2025-11-20', url: 'https://www.cbr.ru/Content/Document/File/185193/Consultation_Paper_20112025.pdf' },
    S22: { org: 'Аналитический центр при Правительстве РФ', title: 'Вклад ИИ в ВВП к 2030 году', date: '2025-11-20', url: 'https://ac.gov.ru/news/page/vklad-ii-v-vvp-strany-k-2030-godu-dolzen-prevysit-11-trln-rublej-28260' },
    S23: { org: 'Сбер', title: 'Результаты по МСФО за 2025 год', date: '2026-02', url: 'https://www.sberbank.com/investor-relations/groupresults/ifrs_february26_reporting_for_the_4th_quarter' },
    S24: { org: 'Яндекс', title: 'Результаты за II квартал 2026 года', date: '2026-07-29', url: 'https://ir.yandex.ru/press-releases?id=29-07-2026&year=2026', generic: true },
    S25: { org: 'BIS США (Bureau of Industry and Security)', title: 'EAR §746.8 — ограничения для России и Беларуси', date: '2026', url: 'https://www.bis.gov/regulations/ear/746', generic: true },
    S26: { org: 'Европейская комиссия', title: 'InvestAI и гигафабрики ИИ', date: '2026', url: 'https://digital-strategy.ec.europa.eu/en/policies/build-leadership-ai', generic: true },
    S27: { org: 'Constellation', title: 'Договор с Microsoft, Crane Clean Energy Center', date: '2024-09-20', url: 'https://www.constellationenergy.com/news/2024/Constellation-to-Launch-Crane-Clean-Energy-Center-Restoring-Jobs-and-Carbon-Free-Power-to-The-Grid.html' },
    S28: { org: 'SK hynix', title: 'Корпоративные результаты и HBM4', date: '2026', url: 'https://news.skhynix.com', generic: true },
    S29: { org: 'Совет ЕС', title: 'Ограничения экспорта передовых технологий в Россию', date: '2026', url: 'https://www.consilium.europa.eu/en/policies/sanctions-against-russia-explained/', generic: true },
    S30: { org: 'iKS-Consulting', title: 'Рынок коммерческих ЦОД России 2025', date: '2025', url: 'https://survey.iksconsulting.ru/', generic: true }
  },
  limits: [
    'Все прогнозы — энергопотребление, производительность, вклад в ВВП — отделены от наблюдаемых фактов.',
    'Корпоративные заявления об экономическом эффекте считаются оценкой руководства, если нет раскрытой независимой методики.',
    'Сравнение капвложений проводится только вместе с определением показателя и периодом.',
    'Портфель обязательств и долгий договор подтверждают контракт, но не заменяют наблюдение фактической загрузки и платежа внешнего клиента.',
    'Ссылка на источник не равна полной проверяемости: часть ссылок ведёт на общие страницы организаций, такие помечены отдельно.',
    'Выводы по России ограничены фрагментарностью открытой статистики по ускорителям, загрузке кластеров и энергетической мощности именно ИИ-нагрузок.'
  ]
};
