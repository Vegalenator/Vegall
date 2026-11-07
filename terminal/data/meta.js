/* Метаданные терминала и реестр первичных источников.
   Каждая цифра в терминале ссылается на код источника S1-S37. */
window.VG_META = {
  title: 'Терминал ИИ-цикла',
  asOf: '2026-09-06',              // дата среза исследования
  builtAt: '2026-11-07',           // дата сборки терминала
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
    current: 'ручное обновление; одно подключение (Nvidia) работает в режиме предложения, второе (ASML) получает отказ 403',
    note: 'Данные записаны в файлах и обновляются вручную. Первые подключения к первоисточникам сделаны, но они не пишут в данные: подключение забирает документ, проверяет определения и кладёт предложение, а перенос величины остаётся решением человека. Истории значений тоже нет, поэтому терминал отвечает на вопрос «как сейчас», но пока не на вопрос «что изменилось с прошлого раза».',
    planned: [
      'Слой A — котировки, капитализация, кредитные спрэды. Не подключён: доступных машиночитаемых каналов из среды сборки нет.',
      'Слой B — капвложения, потоки, выручка сегментов. Работает подключение Nvidia; подключение ASML есть, но asml.com отвечает 403. Сайты остальных эмитентов тоже отвечают отказом, но их релизы открываются на sec.gov — следующий кандидат на подключение.',
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
    S10: { org: 'Microsoft', title: 'FY2027 Q1 (и FY2026 Q4)', date: '2026-10-28', url: 'https://www.microsoft.com/en-us/investor/events/fy-2027/earnings-fy-2027-q1' },
    S11: { org: 'Alphabet', title: 'Q3 2026 (и Q2 2026)', date: '2026-10-28', url: 'https://s206.q4cdn.com/479360582/files/doc_financials/2026/q3/2026q3-alphabet-earnings-release.pdf' },
    S12: { org: 'Nvidia', title: 'Q2 FY2027', date: '2026-08-26', url: 'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027' },
    S13: { org: 'Broadcom', title: 'Q3 FY2026', date: '2026-09-02', url: 'https://www.sec.gov/Archives/edgar/data/1730168/000173016826000076/avgo-08022026x8kxex99.htm' },
    S14: { org: 'Oracle', title: 'Q1 FY2027 (и FY2026)', date: '2026-09-10', url: 'https://www.sec.gov/Archives/edgar/data/1341439/000119312526387905/orcl-ex99_1.htm' },
    S15: { org: 'Amazon', title: 'Q2 2026', date: '2026-07', url: 'https://www.sec.gov/Archives/edgar/data/1018724/000101872426000024/amzn-20260630xex991.htm' },
    S16: { org: 'Meta', title: 'Q3 2026 (и Q2 2026)', date: '2026-10-21', url: 'https://www.sec.gov/Archives/edgar/data/1326801/000162828026066700/meta-09302026xexhibit991.htm' },
    S17: { org: 'CoreWeave', title: 'Форма 10-Q', date: '2026-08-11', url: 'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm' },
    S18: { org: 'TSMC', title: 'Q3 2026, пресс-релиз (форма 6-K)', date: '2026-10-15', url: 'https://www.sec.gov/Archives/edgar/data/1046179/000104617926000726/a3q26e_withguidancexfinal.htm' },
    S19: { org: 'ASML', title: 'Q3 2026, пресс-релиз (форма 6-K)', date: '2026-10-14', url: 'https://www.sec.gov/Archives/edgar/data/937966/000162828026065813/pressreleasefinancialresul.htm' },
    S20: { org: 'Alibaba', title: 'Результаты и размещение акций, август 2026', date: '2026-08', url: 'https://www.alibabagroup.com/en-US/document-2027233133950140416' },
    S21: { org: 'Банк России', title: 'Применение ИИ на финансовом рынке', date: '2025-11-20', url: 'https://www.cbr.ru/Content/Document/File/185193/Consultation_Paper_20112025.pdf' },
    S22: { org: 'Аналитический центр при Правительстве РФ', title: 'Вклад ИИ в ВВП к 2030 году', date: '2025-11-20', url: 'https://ac.gov.ru/news/page/vklad-ii-v-vvp-strany-k-2030-godu-dolzen-prevysit-11-trln-rublej-28260' },
    S23: { org: 'Сбер', title: 'Результаты по МСФО за 2025 год', date: '2026-02', url: 'https://www.sberbank.com/investor-relations/groupresults/ifrs_february26_reporting_for_the_4th_quarter' },
    S24: { org: 'Яндекс', title: 'Результаты за III квартал 2026 года', date: '2026-10-29', url: 'https://ir.yandex.ru/press-releases?year=2026&id=29-10-2026-01' },
    S25: { org: 'BIS США (Bureau of Industry and Security)', title: 'EAR §746.8 — ограничения для России и Беларуси', date: '2026', url: 'https://www.bis.gov/regulations/ear/746', generic: true },
    S26: { org: 'Европейская комиссия', title: 'InvestAI (11.02.2025) и гигафабрики ИИ', date: '2025-02-11', url: 'https://digital-strategy.ec.europa.eu/en/news/eu-launches-investai-initiative-mobilise-eu200-billion-investment-artificial-intelligence' },
    S27: { org: 'Constellation', title: 'Договор с Microsoft, Crane Clean Energy Center', date: '2024-09-20', url: 'https://www.constellationenergy.com/news/2024/Constellation-to-Launch-Crane-Clean-Energy-Center-Restoring-Jobs-and-Carbon-Free-Power-to-The-Grid.html' },
    S28: { org: 'SK hynix', title: 'Корпоративные результаты и HBM4', date: '2026', url: 'https://news.skhynix.com', generic: true },
    S29: { org: 'Совет ЕС', title: 'Ограничения экспорта передовых технологий в Россию', date: '2026', url: 'https://www.consilium.europa.eu/en/policies/sanctions-against-russia-explained/', generic: true },
    S30: { org: 'iKS-Consulting', title: 'Рынок коммерческих ЦОД России 2025', date: '2025', url: 'https://survey.iksconsulting.ru/', generic: true },
    S31: { org: 'Anthropic', title: 'Подача формы S-1 для IPO', date: '2026-10-26', url: 'https://www.anthropic.com/news/s1-sec' },
    S32: { org: 'Anthropic (SEC EDGAR)', title: 'Форма S-1/A, поправка № 1', date: '2026-11-02', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002130357&type=S-1' },
    S33: { org: 'Microsoft', title: 'Следующая глава партнёрства Microsoft и OpenAI', date: '2025-10-28', url: 'https://blogs.microsoft.com/blog/2025/10/28/the-next-chapter-of-the-microsoft-openai-partnership/' },
    S34: { org: 'Anthropic', title: 'Партнёрства с Microsoft и NVIDIA: Azure и вложения', date: '2025-11-18', url: 'https://www.anthropic.com/news/microsoft-nvidia-anthropic-announce-strategic-partnerships' },
    S35: { org: 'Anthropic', title: 'Расширение использования Google Cloud TPU', date: '2025-10-23', url: 'https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services' },
    S36: { org: 'Anthropic', title: 'Расширение сотрудничества с AWS', date: '2024-11-22', url: 'https://www.anthropic.com/news/anthropic-amazon-trainium' },
    S37: { org: 'Anthropic', title: 'Раунд Series H: $65 млрд при оценке $965 млрд', date: '2026-05-28', url: 'https://www.anthropic.com/news/series-h' }
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
