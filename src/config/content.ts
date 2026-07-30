export const plans = [
  { id: "monthly", kicker: "Гибкий старт", name: "1 месяц", description: "Короткий период для знакомства с сервисом без долгих обязательств.", highlighted: false },
  { id: "half-year", kicker: "Баланс", name: "6 месяцев", description: "Комфортный период для регулярного использования на выбранных устройствах.", highlighted: true },
  { id: "annual", kicker: "Долгий период", name: "12 месяцев", description: "Длительный формат с единым циклом управления подпиской.", highlighted: false },
] as const;

export const locations = [
  { code: "NL", name: "Нидерланды", region: "Западная Европа" },
  { code: "DE", name: "Германия", region: "Центральная Европа" },
  { code: "FI", name: "Финляндия", region: "Северная Европа" },
] as const;

export const homeFaqs = [
  { question: "На каких устройствах работает сервис?", answer: "Инструкции предусмотрены для iPhone и iPad, Android, Windows, macOS, Linux и Android TV." },
  { question: "Где появится ссылка подключения?", answer: "После оформления она будет доступна в защищённом личном кабинете. Там же можно управлять устройствами и периодом подписки." },
  { question: "Как узнать о технических работах?", answer: "Фактическое состояние локаций и уведомления о плановых работах публикуются на отдельной странице статуса." },
  { question: "Можно ли обратиться за помощью с настройкой?", answer: "Да. В разделе поддержки доступны пошаговые материалы, популярные ответы и путь к обращению через личный кабинет." },
] as const;

export const platforms = ["iPhone / iPad", "Android", "Windows", "macOS", "Linux", "Android TV"] as const;
