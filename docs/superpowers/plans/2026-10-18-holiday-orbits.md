# Holiday Orbits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически включать три лёгкие праздничные темы ST VILLAGE с отключением посетителем и изолированным предпросмотром на dev.

**Architecture:** Типизированный ежегодный календарь и чистый московский resolver; небольшой клиентский context управляет датой, предпочтением и видимостью. Общий CSS/SVG-renderer используется в шапке, иллюстрации главной, боковых полях и изолированном предпросмотре; сервер ограничивает доступ к preview.

**Tech Stack:** Существующие React 19 / TypeScript / vinext, CSS, inline SVG, Node test runner и Playwright; без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-10-18-holiday-orbits-design.md` — одобрена пользователем 18 октября 2026.

**Результат выполнения, 18 октября:** реализация сохранена локально в dev; 156/156 тестов, lint, typecheck, production build и performance budget проходят. Проведено независимое ревью и один RED→GREEN проход исправлений. Условия и ограничения записаны в `docs/holiday-orbits.md`. Публикация на dev и удалённая проверка ожидают отдельного разрешения, main не изменён. Checkbox-шаги ниже сохранены как исходный план, а не как повторное задание.

## Global Constraints

- «Разработка и проверка — в dev. Перенос в main требует отдельного запроса пользователя».
- `winter`: 20 декабря — 10 января, приоритет 100; `space`: 10 — 12 апреля, 80; `halloween`: 25 октября — 1 ноября, 70. Границы включены, зона `Europe/Moscow`.
- «В видимой вкладке дата перепроверяется раз в минуту. Возвращение во вкладку вызывает немедленную проверку. В скрытой вкладке периодическая работа и движение приостанавливаются».
- «На компьютерах — не более 18 одновременно видимых декоративных частиц, на экранах до 680 px — не более 6»; спутник включается в общий лимит.
- «На публичных страницах вне главной — только небольшой статичный акцент около логотипа»; `/status/management` и preview исключены из автоматического декора.
- `st-holiday-effects`: `on` / `off`; отсутствие или постороннее значение разрешает оформление. Первоначальный SSR и клиентский вывод — без декора.
- «При системном уменьшении движения остаются только статичные детали. При высокой контрастности весь декоративный слой скрывается, а настройка остаётся доступной».
- «Нет звуков, полноэкранных вспышек, внешних виджетов, новых шрифтов, тяжёлых видео или Canvas-движка»; декор `aria-hidden`, `pointer-events: none`.
- Preview `/preview/holidays`: локальный development или доверенный `SITE_URL === "https://dev.stvillage.ru"`; в main production — 404, noindex, без sitemap.
- Не менять партнёрскую ссылку `null`, «Скоро», купоны, тарифы, новости, бота, авторизацию, Caddy, версию приложения или секреты. Не включать неподтверждённые дополнительные праздники.
- Сохранять чужие `debug.log`, `output/` и любые новые посторонние изменения. Только адресно перечисленные файлы в коммитах; не использовать `git add .`.

## Review Focus

1. Вкладка открыта до московской полуночи либо возвращена после нескольких дней сна: корректная новая тема без перезагрузки (Task 2).
2. Storage запрещён или очищен другой вкладкой: живой переключатель, предсказуемый default, без сбоя сайта (Task 2).
3. Переход на служебный маршрут, назад и unmount: нет оставшихся слоёв, обработчиков или таймеров (Task 2).
4. Изменённые Host/query или локальные настройки на main не открывают preview и не назначают тему (Tasks 1, 4).
5. Телефон 320 px, увеличение текста, высокая контрастность: кнопки и смысловые статусы читаемы и доступны, частиц не больше лимита (Tasks 3, 5).

## File Structure

Все новые части функции лежат в `src/features/holidays/`:

- `calendar.ts`: типы, три правила, чистый resolver.
- `policy.ts`: чистые правила маршрутов, preference и допуска preview; без чтения env в браузере.
- `holiday-provider.tsx`: context, lifecycle даты/видимости/storage и hook.
- `holiday-toggle.tsx`: доступная настройка в подвале.
- `holiday-scene.tsx`: общий renderer и фиксированные наборы SVG/координат.
- `holiday-boundary.tsx`: локальная error boundary с fallback null только вокруг декоративного renderer, без перехвата основного содержимого сайта.
- `holiday-surfaces.tsx`: context-aware обёртки logo / hero / edges, без второго календаря.
- `holiday-preview.tsx`: локальный выбор темы только внутри образца.
- `app/holiday-orbits.css`: ограниченные селекторы `holiday-*`, темы, адаптивность, доступность.
- `app/preview/holidays/page.tsx`: серверный gate, noindex, клиентский образец.

Изменяемые файлы: `app/layout.tsx`, `app/page.tsx`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `package.json`, `tests/rendered-html.test.mjs`, пять существующих visual spec-файлов (перечислены в Task 5). Не менять существующие пороги сравнения снимков.

Тесты: `tests/holiday-calendar.test.mjs`, `tests/visual/holiday-runtime.spec.ts`, `tests/visual/holiday-orbits.spec.ts`, `tests/visual/holiday-preview.spec.ts`; эталоны `tests/visual/__screenshots__/{desktop,mobile}/holiday-{winter,space,halloween}-{dark,light}.png`. Production gate проверять существующим worker-test подходом, no-JS — Playwright context с javaScriptEnabled=false. Новый тестовый серверный фреймворк не добавлять.

## Подготовка выполнения

- [ ] Прочитать spec, этот план, выбранный execution skill и `using-git-worktrees`; проверить branch/status и сохранить исходный SHA. Решение об изоляции принять по skill, не создавать и не переключать checkout поверх чужой работы. Целевая интеграционная ветка — dev.
- [ ] Снять исходный результат lint, typecheck, unit/server и Playwright. Если есть исходные ошибки — отделить их от изменений функции. Не обновлять эталоны для скрытия регрессий.
- [ ] На Windows использовать имеющийся Node runtime; не переустанавливать зависимости без необходимости. Все файловые правки через apply_patch. Сначала RED, затем GREEN для каждой функции ниже.

### Task 1: Календарь и чистые политики

**Files:** Create `src/features/holidays/calendar.ts`, `src/features/holidays/policy.ts`, `tests/holiday-calendar.test.mjs`; Modify `package.json` (добавить новый файл в существующий strip-types test command).

**Interfaces:**
- Produces `HolidayTheme = "winter" | "space" | "halloween"`.
- Produces `HolidayRule = { readonly id: string; readonly name: string; readonly start: {month:number;day:number}; readonly end: {month:number;day:number}; readonly theme: HolidayTheme; readonly priority:number; readonly enabled:boolean }` и `HOLIDAY_RULES: readonly HolidayRule[]`.
- Produces `resolveHoliday(now: Date, rules: readonly HolidayRule[] = HOLIDAY_RULES): HolidayRule | null`.
- Produces `parseHolidayPreference(raw: string | null): boolean`, `getHolidayScope(pathname: string): "home" | "logo" | "none"`, `canPreviewHolidays(nodeEnv: string | undefined, siteUrl: string): boolean`.

- [ ] **Step 1 — RED tests:** добавить Node-тесты с конкретными assertions:

```js
assert.equal(resolveHoliday(new Date("2026-10-24T20:59:59Z")), null);
assert.equal(resolveHoliday(new Date("2026-10-24T21:00:00Z"))?.theme, "halloween");
assert.equal(resolveHoliday(new Date("2026-11-01T21:00:00Z")), null);
assert.equal(resolveHoliday(new Date("2027-01-09T21:00:00Z"))?.theme, "winter");
assert.equal(resolveHoliday(new Date("2027-01-10T21:00:00Z")), null);
assert.equal(parseHolidayPreference("off"), false);
assert.equal(parseHolidayPreference("invalid"), true);
assert.equal(getHolidayScope("/status/management"), "none");
assert.equal(canPreviewHolidays("production", "https://stvillage.top"), false);
assert.equal(canPreviewHolidays("production", "https://dev.stvillage.ru"), true);
```

  Дополнить именованными cases: все начала/концы трёх окон, 31 декабря/1 января, `Invalid Date`, разный порядок перекрывающихся правил, высший priority, tie по ASCII-id, выключенные, невозможные дни/месяцы, неизвестная theme, нечисловой priority. Тесты с fixture-правилом 29 февраля: только високосная дата; однодневное окно и разные host-like URL (`dev.stvillage.ru.evil`, http, credentials, произвольный порт) не дают допуск. В маршрутах нормализовать завершающий `/`, исключить всё под `/preview/` и `/status/management/`; query не является аргументом resolver.
- [ ] **Step 2:** `node --experimental-strip-types --test tests/holiday-calendar.test.mjs` → FAIL из-за отсутствующего модуля/экспортов. Подтвердить именно ожидаемую причину.
- [ ] **Step 3:** реализовать интерфейсы. `Intl.DateTimeFormat(..., {timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now)`; сравнивать валидные пары месяц–день с включёнными границами, cross-year через OR. Валидировать календарные границы на високосном опорном году без нормализации невозможных дат; окно только 29 февраля не превращать в 1 марта. Некорректные правила пропускать, повторяющиеся id исключать, ошибку даты/Intl возвращать как null. ASCII tie через `<`/`>`, не localeCompare. Preview разрешать только `nodeEnv === "development"` либо точный нормализованный dev URL; никаких request headers.
- [ ] **Step 4:** повторить Node-команду → PASS; `pnpm typecheck` → exit 0. Проверить, что `pnpm test` действительно включает новый файл.
- [ ] **Step 5:** адресно добавить четыре файла и commit `feat: add deterministic Moscow holiday calendar`.

### Task 2: Lifecycle, предпочтение и статичный акцент

**Files:** Create `holiday-provider.tsx`, `holiday-toggle.tsx`, `holiday-surfaces.tsx`, `holiday-boundary.tsx`, начальный `holiday-scene.tsx`, `app/holiday-orbits.css`, `tests/visual/holiday-runtime.spec.ts`; Modify `app/layout.tsx`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`.

**Interfaces:**
- Consumes Task 1 exports.
- Produces `HolidayProvider({children}:{children:React.ReactNode})` и `useHoliday(): {ready:boolean; enabled:boolean; active:HolidayRule|null; scope:"home"|"logo"|"none"; visible:boolean; toggle:()=>void}`.
- Produces `HolidayToggle()`, `HolidayLogoAccent()`, `HolidayHeroAccent()`, `HolidayEdgeEffects()`; последние две временно возвращают null до Task 3.
- Produces `HolidayScene({theme,surface,paused}:{theme:HolidayTheme;surface:"logo"|"hero"|"edges";paused:boolean})`; в этом task реализован logo, остальные surface — null. Не рисовать временные заглушки пользователю.
- Produces `HolidayBoundary({children,resetKey}:{children:React.ReactNode;resetKey:string})`: при render error только decor subtree возвращает null; смена resetKey позволяет следующей теме отрисоваться. Обёртки surface используют ключ theme+surface.

- [ ] **Step 1 — RED:** Playwright cases с `page.clock.install({time:new Date("2026-10-25T12:00:00Z")})` до навигации и заглушками существующих внешних API, как в `partner-banner.spec.ts`. Проверки: после mount один `[data-holiday-surface="logo"][data-holiday-theme="halloween"]`; кнопка имеет доступное имя «Праздничное оформление: включено» и `aria-pressed=true`; Space отключает, `off` сохраняется, reload не показывает акцент; Enter включает. `st-theme` не меняется. Сохранённый off не допускает появления декора даже при задержанном JS; SSR содержит кнопку, но не сезонную разметку.
- [ ] **Step 2:** `pnpm exec playwright test tests/visual/holiday-runtime.spec.ts` → ожидаемый FAIL (нет controls/акцента).
- [ ] **Step 3:** добавить provider вокруг существующего shell в layout, не превращая сам server layout/footer в client-компоненты. Начальные `ready=false`, `active=null`; только после mount прочитать preference, вычислить дату и активировать. Ошибки storage/Intl ловить локально. Один 60_000-ms interval только при visible; visibilitychange обновляет немедленно и управляет paused. Отписки и clearInterval при cleanup. `storage` принимает ключ функции или `key===null` (clear), игнорирует чужие ключи. Добавить logo accent внутри существующей brand-ссылки шапки, не менять размеры логотипа. Кнопка в `.footer-meta`, flex-wrap в scoped CSS, не меняет смысловые цвета сайта. Theme renderer — fixed SVG без случайных id/чисел, aria-hidden, не focusable.
- [ ] **Step 4 — GREEN + Review Focus 1–3:** добавить assertions: часы с 24 октября 23:59:30 MSK переходят к 25 октября через `clock.fastForward(60_000)`; окончание 1 ноября → 2 ноября снимает тему. В двух pages одного context изменение синхронизируется, removeItem/clear возвращает on. Storage getter/setter бросает SecurityError — переключатель работает в памяти. Скрытие/возврат вкладки: нет активного interval в скрытом состоянии, возврат после смены даты актуализирует тему; отдельно проверить cleanup при unmount в test harness и реальные client-переходы `/` → `/status/management` → `/` без дубликатов. Нет console hydration/pageerror. Повторить Playwright и typecheck → PASS.
  Фактическую ошибку renderer проверить в browser: перехватить через Playwright локальный dev module `holiday-scene.tsx`, внедрить тестовый throw только в renderer и убедиться, что hero heading/CTA/footer продолжают работать. Fault injection не сохранять в продуктовые файлы или API; тест находится в `holiday-runtime.spec.ts`.
- [ ] **Step 5:** commit только перечисленных файлов `feat: add accessible holiday preferences and lifecycle`.

### Task 3: Три законченные сцены главной

**Files:** Modify `holiday-scene.tsx`, `holiday-surfaces.tsx`, `app/holiday-orbits.css`, `app/layout.tsx`, `app/page.tsx`; Create `tests/visual/holiday-orbits.spec.ts` и 12 новых PNG-эталонов (три темы × две цветовые темы × два проекта).

**Interfaces:** Consumes context и renderer из Task 2; завершает `HolidayScene` для hero/edges. Сохраняет `data-holiday-theme`, `data-holiday-surface`; каждый учитываемый элемент имеет `[data-holiday-particle]`. Без публичного theme override через URL/storage.

- [ ] **Step 1 — RED:** для трёх фиксированных дат (25 октября, 25 декабря, 12 апреля) на `/`: theme в logo/hero/edges, максимум 18 видимых particles при 1440 и 6 при 390/320. На `/news`, `/pricing`, `/status` — только logo. На служебном маршруте — ноль. Проверить `aria-hidden=true`, отсутствие SVG в tab sequence, работающую hero CTA и переключатель темы. Непраздничная дата 18 октября — ни одного декоративного слоя.
- [ ] **Step 2:** `pnpm exec playwright test tests/visual/holiday-orbits.spec.ts` → FAIL на отсутствующих hero/edges.
- [ ] **Step 3:** renderer: winter — снег по краям, ледяной halo и статичная гирлянда; space — звёзды/спутник только в иллюстрации; halloween — огоньки/силуэты тыкв, сдержанный amber/violet. На home объединённый бюджет hero+edges 18/6, не лимит на каждый слой отдельно. Невидимые mobile-частицы `display:none`, не opacity 0. Все координаты/задержки детерминированы. Hero — absolute внутри `.hero-visual`, edge — узкие clipped поля viewport; не перекрывать copy/CTA. При недостатке поля сократить/скрыть частицы. Добавить hero accent рядом с существующими орбитами; edges единожды в layout, оба под контролем scope. CSS анимирует transform/opacity; paused скрытой вкладки останавливает animation; reduced-motion полностью убирает animation, forced-colors скрывает декор. Не менять общие `.button`, `--accent` и цвета статусов.
- [ ] **Step 4 — GREEN:** повторить тесты; измерить bounding boxes видимых particles относительно разрешённых hero/edge областей и отсутствие горизонтального overflow. После resize лимиты сохраняются. При reduced-motion computed animations — none; forced-colors — все decorations hidden, toggle visible. Проверить prefers-reduced-transparency через существующий CDP-подход: читаемость стекла сохранена. Ни одного нового внешнего запроса и ошибки hydration. Снять только новые снимки `holiday-{theme}-{dark,light}.png` после freeze анимации, визуально открыть каждый; затем обычный запуск без update → PASS. Старые снимки не перезаписывать.
- [ ] **Step 5:** commit файлов и новых эталонов `feat: add winter space and Halloween orbital scenes`.

### Task 4: Серверно ограниченный dev-предпросмотр

**Files:** Create `app/preview/holidays/page.tsx`, `src/features/holidays/holiday-preview.tsx`, `tests/visual/holiday-preview.spec.ts`; Modify `app/holiday-orbits.css`, `tests/rendered-html.test.mjs`.

**Interfaces:** Consumes `canPreviewHolidays(process.env.NODE_ENV, SITE_URL)` и `HolidayScene`. Produces `HolidayPreview()` с внутренним `HolidayTheme | null`; локальный выбор не проходит через provider toggle и не пишет localStorage.

- [ ] **Step 1 — RED:** browser test `/preview/holidays` в development: кнопки «Обычный вид», «Зима», «Космос», «Хэллоуин», выбранная имеет aria-pressed. При выборе меняется только `[data-holiday-preview]`, нет глобальных logo/edge accents и не меняется `st-holiday-effects`. Meta robots noindex, sitemap не содержит preview. Reduced-motion/forced-colors действуют и здесь. Query `?theme=winter` на обычной странице не меняет вычисленную тему.
- [ ] **Step 2:** browser command `pnpm exec playwright test tests/visual/holiday-preview.spec.ts` → ожидаемый FAIL 404.
- [ ] **Step 3:** server page вызывает notFound при запрете, до render клиента; допускает уже настроенный `SITE_URL` dev при production build. Metadata с robots index=false/follow=false, без индексируемого preview canonical. В образце есть компактная brand/hero сцена и ограниченное поле для edge-renderer; не менять настройки реального посетителя. Кнопки обычные доступные; обычный вид — пустой sample без decoration, не fake-статус. Не добавлять ссылку в публичную навигацию или sitemap.
- [ ] **Step 4 — production gate:** в существующем built-worker тесте при production/default site URL запросы `/preview/holidays`, `?theme=winter`, с `Host`/`X-Forwarded-Host:dev.stvillage.ru`, URL origin dev и cookie/storage-like заголовками → status 404. Home SSR без сезонного DOM; `/sitemap.xml` без preview. В чистом отдельном build с `NEXT_PUBLIC_SITE_URL=https://dev.stvillage.ru` route → 200 + noindex; проверить это последним перед возвратом к обычному main-like build, не менять .env и не смешивать build cache. Unit-policy test включает development allowed, test/production default denied. Команды `pnpm test` и preview browser tests → PASS.
- [ ] **Step 5:** commit `feat: add development-only holiday preview`.

### Task 5: Общая приёмка и передача на dev

**Files:** Modify новые holiday test files по обнаруженным пробелам; `tests/visual/{orbital-home,liquid-glass,coupons-closed,partner-banner,public-pages}.spec.ts` для фиксированного непраздничного времени. Новые продуктовые исправления — только в файлах задач 1–4.

**Interfaces:** Проверяет весь согласованный spec; не добавляет новые функции/даты.

- [ ] **Step 1 — regression tests before fixes:** на 320 px и с увеличенным текстом (200%) проверить footer controls в viewport, hero actions кликабельны, page scrollWidth <= innerWidth; проверить reduced-motion переключение на лету, отсутствие JS (основной контент/ссылки доступны, декора нет). В пяти старых visual specs добавить beforeEach `page.clock.setFixedTime(new Date("2026-10-18T12:00:00Z"))`: таймеры работают нормально, screenshot не зависит от дня запуска CI. Для их самостоятельно созданных contexts применить тот же fixedTime до goto, кроме no-JS. Если обнаружен баг — сначала минимальный failing regression case, потом исправление.
- [ ] **Step 2:** полный `pnpm release:check` и `pnpm test:visual` → exit 0. Эквивалент без pnpm wrapper на Windows: Node запускает eslint/tsc/performance script/vinext build, затем все test files из package.json и Playwright CLI; не пропускать новые тесты. Логи должны подтверждать результаты, не просто наличие файлов. Повторно запустить browser suite без update-snapshots.
- [ ] **Step 3:** прочитать итоговый diff, сравнить с каждой секцией spec, проверить bundle на отсутствие новой зависимости/ресурсной загрузки, изображения и CTA не изменены. Выполнить fresh whole-branch review по выбранному execution skill, устранить подтверждённые замечания с повторной проверкой. `git diff --check` → exit 0. Commit только исправленных файлов `test: harden holiday effects across routes and accessibility modes` (не создавать пустой коммит).
- [ ] **Step 4:** перед push проверить согласованный scope/полномочия. Если разрешён deploy dev — push только dev, дождаться Quality/Visual/CodeQL и штатного dev deploy, прочитать current-sha и health. Не писать в main и не перенастраивать root-сервисы. При permission blocker остановить соответствующий шаг, не обходить sudo. Если разрешения на push/deploy нет — передать локальные результаты и запросить его отдельно.
- [ ] **Step 5:** открыть защищённый `https://dev.stvillage.ru/preview/holidays`, проверить три темы desktop/mobile, выключение и обычные страницы; записать SHA, результаты тестов, ссылку для просмотра и границы проверки. Отдельно пояснить: 18 октября автоматической темы ещё нет, Хэллоуин включится 25 октября; preview позволяет посмотреть раньше. Main не изменён. Не объявлять deploy успешным без фактического подтверждения.

## План отката

Возврат dev к предшествующему приложению штатным deploy либо отдельный коммит отключения трёх правил; не reset чужой работы, не удалять данные. Все defaults без активного события оставляют обычный сайт; новые маршруты не требуют изменения Caddy или секретов.

## Передача исполнения

Сейчас создан только план; реализация и push не начаты. Пользователь читает план и выбирает:

1. **Native — рекомендовано:** один исполнитель в этой сессии последовательно проходит пять связанных задач; затем свежая независимая проверка всей ветки. Меньше затрат на передачу контекста renderer/provider.
2. **Subagent-driven:** отдельный исполнитель и независимые проверки каждой задачи до следующей; больше промежуточных проверок и расходов контекста.

После выбора использовать соответствующий обязательный execution skill. Main — только после отдельного согласования результата на dev.
