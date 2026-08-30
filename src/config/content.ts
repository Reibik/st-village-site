export const locations = [
  { code: "NL", name: "Нидерланды", region: "Западная Европа" },
  { code: "DE", name: "Германия", region: "Центральная Европа" },
  { code: "FI", name: "Финляндия", region: "Северная Европа" },
  { code: "PL", name: "Польша", region: "Центральная Европа" },
  { code: "SE", name: "Швеция", region: "Северная Европа" },
] as const;

export const homeFaqs = [
  { question: "Что входит в пробный период?", answer: "Пробный период действует 1 день, включает 5 ГБ трафика и подключение 1 устройства. Доступны локации Германии, Польши и Швеции. Белые списки доступны только после перехода на платный тариф." },
  { question: "На каких устройствах работает сервис?", answer: "Инструкции предусмотрены для iPhone и iPad, Android, Windows, macOS, Linux и Android TV." },
  { question: "Где находится личный кабинет?", answer: "Кабинет работает отдельно на cabinet.stvillage.top и связан с Telegram-ботом ST VILLAGE. Сайт ведёт туда напрямую." },
  { question: "Как узнать о технических работах?", answer: "Фактическое состояние локаций и уведомления о плановых работах публикуются на отдельной странице статуса." },
  { question: "Можно ли перейти сразу в Telegram-бота?", answer: "Да. Ссылки на официального бота размещены в первом экране, разделе поддержки и нижнем блоке сайта." },
] as const;

export const platforms = ["iPhone / iPad", "Android", "Windows", "macOS", "Linux", "Android TV"] as const;
