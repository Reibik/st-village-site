# Фирменная орбита

Goal: выразительный и компактный лендинг, реализующий утверждённый пользователем макет.

Architecture: существующие React/Vinext API и клиентские каталоги; CSS главной ограничен `.orbital-home`; данные мониторинга и ленты нормализуются отдельно от представления.

Tech stack: TypeScript, React 19, CSS, Node test, Playwright.

Spec: выбранный макет «Фирменная орбита» и аудит 2026-10-03. Маскот, графит/голубой, один основной CTA; 1 день / 5 ГБ / 1 устройство / DE PL SE; кабинет, три шага, реальные тарифы, мониторинг, две новости, FAQ, финальный CTA.

Global constraints: только dev, без изменения main, платежей, токенов, защищённости стенда и полной страницы новостей. Светлая тема, клавиатура, reduced motion. Не придумывать состояние серверов или отзывы.

Review focus: 320px; инцидент при онлайн-серверах; устаревшие данные; авто-маршрут не является страной; компактная лента не растёт при обновлении.

## Task 1: достоверные данные
- [x] Базовая сборка и tests/rendered-html.test.mjs.
- [x] Регрессии для инцидентов, стран и ограничения ленты; сначала красный результат, потом исправление.
- [x] Исправить live-status.ts, home-network-showcase.tsx, telegram-news-feed.tsx и флаги, сохранив контракты API.

## Task 2: главная страница
- [x] app/page.tsx: утверждённый первый экран, компактный пробный доступ, кабинет, шаги, сохранённые купоны, тарифы и FAQ.
- [x] app/orbital-home.css: изолированные стили, desktop/mobile/light, без навязчивой анимации.
- [x] Компактный анонс новостей без изменения полных публикаций.
- [x] Проверить lint, typecheck, performance budget, visual desktop/mobile и 320px.

## Task 3: проверка и dev
- [x] Обновить только намеренно изменённые visual snapshots.
- [x] Независимый read-only code review и необходимые исправления.
- [ ] Commit/push dev, проверить автоматический деплой по SHA и health. Main не менять.

## Evidence
Результаты проверок и развёртывания дополняются по завершении.

2026-10-03: release:check — lint/typecheck/performance/build, 30 server tests + 11 unit tests passed. Playwright — 22 desktop/mobile scenarios passed. Visual baselines reviewed, including 320px/light/reduced-motion. Four important review findings and stale-card labelling fixed with regressions. Main unchanged; dev publishing follows verification.
