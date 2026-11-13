# Текущее состояние PoE Autocraft

## add-item-footprints — implementation started, 2026-11-13

Tasks 2.1–3.2 completed: pure inventory occupancy/projection, half-open hit testing, instance context, four standalone synthetic presets, anchored placement and an overlap obstacle are implemented. Invalid edits preserve prior state. Cancellation marks pending actions inactive before cleanup, preventing cleanup button-up from applying currency; tests cover cancellation during motion and with owned button/Shift held, plus delayed old observations. Native harness extensions are implemented but await actual desktop acceptance. Full checks pass 273 tests / 35 files; typecheck, lint, formatting, production build and strict OpenSpec pass. Native/DPI claims are unchanged until real runs complete.

Task 1.1 completed: typed source dimension decoding and snapshot-pinned public lookup read existing raw base payloads without migration/reimport or a guessed 1x1 default. Focused catalog checks passed 56 tests, including real-worker reads of legacy payloads, unavailable IDs/snapshots and activation pinning. ADR-0006 and the catalog API guide record the compatibility decision. Named IPC and inspector dimensions are implemented; task 1.2 awaits actual desktop inspection of the existing accepted snapshot. Placement/testbed tasks remain in progress; no native acceptance is claimed yet.

## add-game-data-catalog — final acceptance, 2026-11-13

The user confirmed built-app import, provenance, Paua Amulet → ManaRegenerationImplicitAmulet1 → mana_regeneration_rate_+% (20–30), followed by lookup after a normal close/restart without reimport and retained calibration. Accepted snapshot: `poe1-3ac25f0277a2-c1e2111ca4bf`, declared patch 3.29.3.6. Desktop import took 3,240 ms for 70,309,353 bytes of records; separate source-worker measurements were 3,773 ms import, 8 ms/two overview queries and 192,360,448 database bytes. Query responsiveness was accepted interactively, without claiming a UI latency benchmark.

Snapshot switching and byte-for-byte preservation of an independent calibration file are covered by file-backed two-snapshot tests; only one real source revision was used in desktop acceptance. Focused catalog verification passes 45 tests; full integration previously passed 234 tests / 33 files. Typecheck, lint, format, build, strict OpenSpec and diff checks passed for the implementation. After the final test-only calibration assertion, focused checks were repeated; production code is unchanged. Remaining limitations: 14 legacy translation groups have explicit unsupported stat references; league compatibility is unverified; no eligibility/probability model or price feed exists. TD-001 physical DPI checks remain open. Large source/bundle/SQLite files are local and ignored. User-owned staged `.DS_Store` and archive moves remain excluded.

## Catalog desktop inspection accepted, 2026-11-13

Task 4.1 is complete: the user confirmed the built inspector's real import, provenance, Paua Amulet search and implicit modifier/stat range inspection. The emitted worker logged snapshot `poe1-3ac25f0277a2-c1e2111ca4bf` and import duration 3,240 ms. The local bundle contains 70,309,353 bytes of records. The instance was closed normally and restarted without Vite for offline persistence acceptance; that confirmation is still pending. Native multi-DPI coverage remains TD-001; no price integration or crafting eligibility is claimed.

## add-game-data-catalog — inspector implementation, 2026-11-13

Catalog inspector implementation is ready for desktop acceptance: main-owned folder import, authorized named IPC, bounded base/modifier queries, snapshot selection, provenance/hashes/coverage and raw detail warnings. The SQLite worker is lazy and closes with the main panel; calibration storage is unchanged. Added authorization, invalid payload, dialog cancellation/import and named preload tests. The existing calibration bridge tests now select the bridge by name instead of assuming exposure order.

Verification: all 234 tests / 33 files pass; typecheck, lint (no warnings), format:check, production build, strict change validation and diff checks pass. Build retains upstream Zod annotation warnings; Node source-worker tests retain experimental SQLite and typeless-module advisories. The built inspector has been started for real-bundle UI acceptance. Tasks 4.1/4.2 remain unchecked until the requested desktop inspection and offline restart are confirmed; final integration task remains open. User-owned staged files and OpenSpec archive moves are excluded from these changes.

## add-game-data-catalog — 2026-11-13, runtime gate в работе

Задачи 3.1–3.3: реализованы SQLite schema 1, composite FK, immutable snapshots, atomic activation, bounded literal search/detail, snapshot pinning и сохранение повреждённых/неподдерживаемых файлов. Проверены реальные SQL-trigger rollback, первая неуспешная загрузка, worker termination до COMMIT, повторное открытие, FK, snapshot conflicts, escaping и raw/ordered weights. Политика backup-before-migration документирована; миграций в первой версии схемы нет, неизвестные версии не переписываются. Профильный набор — 41 тест, typecheck/lint/format прошли. Реальный source-worker import/reopen: 3 773 ms, два overview query — 8 ms, БД 192 360 448 bytes; восстановлены 5 461 база/40 355 модов и Paua chain. Inspector/user-data acceptance ещё впереди.

Задачи 2.1–2.2: добавлены canonical/manifest/query schemas, RePoE normalizer, bounded pinned fetch/cache и проверка bundle. Создан и повторно прочитан реальный bundle poe1-3ac25f0277a2-c1e2111ca4bf (70 309 353 bytes); 14 legacy translation groups имеют явные missingStatIds, обязательные ссылки модов остаются строгими. Сохранены raw fields, порядок/нулевые веса, stable-ID fallback безымянных баз. Профильные 28 тестов, typecheck/lint и реальные CLI refresh/validate успешны; включены local HTTP timeout/size/429/cache fixtures. Полные source/bundle файлы остаются ignored. SQLite import/query/UI далее по плану.

Обновление source gate 1.2: 13 файлов закреплённого export revision загружены в ignored tmp, JSON разобран, SHA-256 сохранены отдельно от Git blob IDs. Приняты 5 461 база, 40 355 модов, 23 362 стата, 1 389 тегов и 11 257 translation groups. Проверены ссылки base/class/implicit-mod и mod/stat/type/tags без пропусков. Цепочка Paua Amulet → ManaRegenerationImplicitAmulet1 → mana_regeneration_rate_+% → English translation подтверждена на реальных данных (20–30). Проверены attribution/ownership notices; полные snapshots в Git не добавлялись. League compatibility, normalized bundle и import acceptance остаются отдельными проверками. Nullable non-core поля сохраняются raw; полная идентичность upstream JSON-schema не заявляется.

Обновление после возвращения пользователя: задача 1.1 завершена. `probe:catalog:dev` и свежая build/`probe:catalog:start` вернули CATALOG_RUNTIME_PROBE ok=true, SQLite 3.53.4 / Node 24.22.2 / Electron 45.3.1. Worker threadId 1 записал first-open, threadId 2 после reopen прочитал first-open и записал reopened. Проверены именно emitted worker-файлы electron-vite. Vite перед build/start отсутствовал на 5173, процессы завершились сами; исходная calibration/workspace не затрагивалась. Ограничение на коммиты/approvals пользователем завершено.

Итог этого прохода: 196 тестов / 26 файлов, typecheck, lint, format:check, strict OpenSpec validation, diff check и проверка ссылок карты кода успешны. Исходные задачи 1.1/1.2 не отмечались завершёнными. Все изменения оставлены незакоммиченными согласно временному указанию пользователя. Получение большого mods.json через read-only GitHub fetch также отклонено как too large/unsupported; для source gate нужен отдельный способ получения полного pinned snapshot, когда разрешённые условия работы будут уточнены.

По команде пользователя начат каталог данных. На этот проход пользователь временно запретил коммиты и команды, требующие подтверждения. Выполнялись только sandbox-проверки, headless Electron и read-only исследования источника; GUI, production build и git mutations не запускались.

Добавлены чистый repository port, минимальный SQLite worker, bounded RPC (16 запросов, deadline, request IDs, failure/close cleanup), scratch-file probe и будущие dev/build команды диагностики. Семь file-backed/lifecycle тестов прошли под Node и повторно под headless Electron: Node 24.22.2, Electron 45.3.1, SQLite 3.53.4, reopened=true. `available:false` означает отсутствие реального каталога; import/query/UI пока не реализованы.

Задача 1.1 остаётся открытой: source-worker тесты не заменяют требуемые проверки emitted worker в Electron dev и build/start. До прохождения gate downstream реализация не начата. Реальная user-data БД и calibration JSON не затрагивались.

Зафиксирован кандидат RePoE export commit 3ac25f0277a23296b5799e5eaa911dd46f68e6e0 с pinned exported-version.txt=3.29.3.6 и schema revision 9ccbbba4d40b693b1fe5d6c689d7f6ca324be312. Показана реальная база Paua Amulet и её ссылка на implicit mod; полная base/mod/stat/translation цепочка ещё не проверена. Большие GitHub content ответы вернули пустой payload с blob metadata — содержимое не выдумывалось. Кандидат не принят как импортируемый snapshot; 1.2 также открыта. [ADR-0005](../architecture/0005-game-data-catalog.md), [описание проверок](../game-data-catalog.md).

## add-input-testbed — 2026-11-13

Итог: реализация и native-приёмка завершены. Dev и build/start — INPUT_NATIVE_SUITE ok=true, по 16 проверок; в bounded trace осталось 232/233 полученных события соответственно. Пользователь подтвердил плавные движения в dev и успешный полный сценарий сборки. Оставшаяся тестовая панель остановлена; PoE не использовался. После замечания о выделении текста добавлен user-select:none на поверхности стенда с user-select:text у seed input; эта CSS-правка собрана, но отдельный визуальный повтор не выполнялся. Следующее изменение — каталог данных; TD-001 сохраняется без новых заявлений о DPI-покрытии.

Задачи 2.3–3.3 выполнены: main регистрирует только собственный testbed HWND, ограничивает IPC его main frame, проверяет geometry/display token перед событиями. Публичные команды принимают ID ячеек, без произвольных HWND/координат/путей. Добавлены sandboxed-стенд, 12×5 inventory, 60/58/39 stash-слотов, независимые seed/epoch/version, остатки валюты, Shift, fault modes, Stop/Escape, bounded trace (500 записей) и экспорт через main-owned dialog. Калибровочное хранилище не используется стендом. `test:input` — 61 тест; весь набор — 189 тестов / 25 файлов. Typecheck, lint, format:check, strict OpenSpec и diff checks прошли.

Native-набор проверяет три страницы с primary/secondary вводом, Shift observation/release, varied planned clicks, timeout без повторной траты, stale observation, focus-loss/geometry/close cancellation и освобождение owned input. Vite перед build/start на 5173 отсутствовал; production build успешен вне sandbox, только прежние Zod annotation warnings. 189 unit/integration-тестов, типизация, lint, форматирование и strict OpenSpec прошли; git diff проверен перед коммитом.

При интеграции обнаружен runtime Zod import в sandboxed preload. Схемы выделены в отдельный validation-модуль, в контрактах моста остались только type imports; повторный dev-запуск и native-проверки успешны без отключения sandbox. Изменения архивных каталогов прежних changes находятся отдельно в рабочей копии и в коммиты input не включаются.

### Ход реализации (история)

Задачи 2.1–2.2: добавлены публичные контракты input, seeded Bezier-планировщик (550–850 ms по умолчанию), safe-inset цели, DIP/physical/virtual-desktop преобразования и serialized runner с отменой и owned-input cleanup. На этом шаге профильный запуск — 34 теста (включая 6 probe guards), typecheck и lint прошли. Покрыты replay/100 разных seed, недопустимая геометрия и timing, signed origins/четыре масштаба, held input, concurrent run, отмена, потеря фокуса и cleanup failure.

Gate 1.1–1.2 успешно завершён. Dev и build/start вернули INPUT_PROBE ok=true: Electron 45.3.1, Node 24.22.2, Windows x64, Koffi 3.3.8, INPUT size=40/dataOffset=8. В обоих режимах ожидаемый центр (313,192) DIP, получены trusted pointerdown/up около (312.8,191.2) и click (312,191). Пользователь подтвердил видимое сообщение успеха в сборке. Vite перед build/start остановлен. 134 теста, typecheck, lint, format:check, strict OpenSpec и diff checks успешны; production build успешен вне sandbox. Это только проверка ABI/native delivery: плавность, runner и полный testbed ещё впереди.

Ход gate: установлен Koffi 3.3.8, добавлен opt-in probe с отдельным sandboxed-окном и main-owned HWND. Первый автоматический запуск остановлен проверкой foreground до отправки событий; запуск переведён на явную кнопку Start.

При отладке HMR дублировал listeners, меню смещало клиентскую Y-координату примерно на 14 DIP, последующий IPC обращался к уничтоженному окну. Исправлено через unmount cleanup, removeMenu и раннюю проверку завершения; позднее сообщение покрыто guard-тестом. Тестовые окна завершились самостоятельно.

Шесть изолированных guard-тестов, typecheck и lint после исправлений успешны. Полный запуск до этих последних исправлений: 134 теста; format:check и strict OpenSpec validation успешны. Они не заменяют native-приёмку. Установка npm внутри sandbox не дала ответа; после остановки повтор вне sandbox успешен. npm сообщил прежние 7 moderate vulnerabilities; автоматические обновления не выполнялись. Подробности: [ADR-0004](../architecture/0004-desktop-input.md), [команды пробы](../input-testbed.md).

## organize-feature-modules — 2026-11-12

План согласован, реализация выполнена. Чистая логика, orchestration, Vue-экраны и bundled layout принадлежат `src/features/calibration`; существующие crafting-контракты — `src/features/crafting`. Electron-окна, IPC, storage и режимы ввода перенесены в `src/platform/electron/calibration`. Имена IPC, sender permissions, формат и путь workspace, layout/slot IDs, сохранение и порядок revision не менялись. OverlayMode теперь объявлен в чистом контракте. [Карта кода](../code-map.md) и [ADR-0003](../architecture/0003-feature-modules.md) фиксируют точки входа и причины выбора.

Проверки задач 1.1–2.3: typecheck, lint и 128 тестов прошли (95 calibration, 4 crafting, 29 архитектурных). Профильные npm-команды проверены отдельно: тесты одной фичи не запускают другую; полный запуск включает все 17 файлов, в том числе интеграционные проверки. Локальное правило ESLint проверяет TS/Vue imports, re-exports, literal dynamic imports и type imports; покрыты private-path обходы, Node built-ins с обоими написаниями и platform/UI границы. Ссылки и пути карты проверены, README обновлён.

Итоговые проверки 3.1: format:check, strict OpenSpec validation и git diff --check прошли. Production build успешен вне sandbox: внутри esbuild не смог прочитать родительский каталог (Access denied). Rollup сообщил только предупреждения об аннотациях в Zod; зависимостей и lockfile не меняли.

Ручная приёмка 3.2: пользователь подтвердил dev-проверку существующей раскладки, Edit/Escape, Save/preview/Hide. Dev остановлен; перед build/start подтверждено отсутствие Vite на 5173. После свежей production-сборки пользователь подтвердил восстановление раскладки, Edit/Save/preview/Hide и закрыл приложение. Настройки дисплея в этом проходе не меняли и повторно не измеряли; ранее записанная среда — 3440 × 1440 / 125%. TD-001 остаётся открытым: физические 100/150% и дополнительный монитор не проверены. Калибровочное изменение ещё не архивировано и не синхронизировано; следующие input/catalog changes не реализовывались.

Активное изменение — `add-calibration-overlay`. План согласован пользователем 2026-11-12; реализация начата. Новые материалы OpenSpec пишутся на английском согласно `AGENTS.md`; существующие не переводятся.

Реализация и приёмка при 3440 × 1440 / 125% завершены. По прямому решению пользователя оставшиеся ручные DPI-проверки вынесены в [TD-001](technical-debt.md). Прежние 2.3 и 5.2 удалены из отслеживаемых implementation-задач с сохранением ссылок и исходных условий проверки; они не отмечены как выполненные. Текущий список содержит 19 выполненных задач. Изменение пока не архивировано. Функциональные требования DPI сохранены, широкая физическая совместимость не заявляется проверенной.

Уточнение пользователя: одинаковое представление включённых ячеек в editing/preview и заметный выход из просмотра. Пользователь выбрал отдельную компактную панель с кнопкой «Скрыть», без глобальных хоткеев. Proposal/spec/design/tasks согласованы с этим выбором; добавлены 4.6 и 4.7, итоговая 5.1 повторно проверена для изменённой реализации. Мини-панель показывается только в preview; Hide скрывает обе preview-поверхности и возвращает главное окно. Пользователь подтвердил поведение в dev и build/start. Права мини-панели, её положение, скрытие при изменении дисплея и очистка всех окон покрыты native-adapter тестами; физические DPI-переходы и второй монитор вручную не проверены.

При последующей диагностике Save подтверждены один активный экземпляр приложения, запись изменённой геометрии в `%APPDATA%\auto_poe\calibration-workspace.json` и scaleFactor 1.25 (масштаб Windows 125%) по процессу Electron и профилю. Сохранённые пользовательские данные при исправлении не удалялись.

Проверки раннего оверлея: типизация, линтинг, форматирование, сборка и 56 тестов прошли. Матрица геометрии покрывает 6 разрешений (включая 3440 × 1440 и 5120 × 1440) при масштабах 100%, 125%, 150%, 200%; это изолированные проверки, не физическая приёмка всех мониторов. Сборка выполнялась вне sandbox из-за ограничения esbuild. После явного show/focus пользователь подтвердил видимость панели и dev-разметки; также подтвердил build/start поверх безрамочной PoE и при закрытой игре, работу скрытия. Разрешение пользователя — 3440 × 1440; точный scaleFactor отдельно не подтверждён. Пользователь уточнил целевой режим: только оконный безрамочный, обычный оконный исключён из обязательной приёмки. Новых зависимостей не добавлялось.

Изменение OpenSpec — `bootstrap-desktop-app`, архивировано в `openspec/changes/archive/2026-11-12-bootstrap-desktop-app/`.

## Исходное состояние

- Минимальный проект TypeScript с демонстрационной точкой входа и npm lockfile.
- Схема OpenSpec `spec-driven`, две спецификации и согласованный список задач.
- В индексе Git уже был `.DS_Store`.

## Проверки — 2026-11-12

- Задача 1.0 — исходное состояние сверено с Git, конфигурацией npm и файлами OpenSpec.
- Задача 1.1 — существующий lockfile соответствует зависимостям проекта; `npm ci` установил 236 пакетов, `npm run typecheck` завершился с кодом 0. Node.js 24.4.0, npm 11.10.1.
- `npm run lint`, `npm run format:check`, `npm test` (2 файла, 10 тестов), `npm run build` и `openspec validate bootstrap-desktop-app --strict` завершились с кодом 0. В `item-parser.ts` исправлено только форматирование.
- Задача 3.1 — инструкции запуска, пути и архитектурное решение сверены с репозиторием.
- Задача 1.4 закрыта: lint, format:check и Vitest (10 тестов) прошли после исправления форматирования.
- Задача 2.1 закрыта: calibration.test.ts проверяет валидную сетку и слот на границе, неположительные и дробные размеры сетки, неположительную геометрию, дубликаты ID и выход слота за область.
- Задача 2.2 закрыта: crafting-contracts.test.ts проверяет успешный парсинг синтетической фикстуры, пустой текст и неподдерживаемый формат; itemSchema проверяет модель.
- Задача 2.3 закрыта: crafting-contracts.test.ts проверяет последовательность двух намерений, insufficient-budget и отклонение отрицательного/дробного лимита валюты.
- При первом dev-запуске выявлено отсутствие бинарника Electron: electron-vite завершился с `Electron uninstall`. Добавлен проектный `postinstall: install-electron`, lockfile синхронизирован без изменения версий. Повторный `npm ci` успешно загрузил бинарник, Electron стартовал без ошибки.
- Задача 1.2 закрыта: пользователь подтвердил экран PoE Autocraft в dev-режиме и закрытый клиент PoE. В main проверены contextIsolation: true, sandbox: true, nodeIntegration: false; демонстрационная src/index.ts отсутствует.
- Задача 1.3 закрыта: после остановки dev-процесса выполнена повторная сборка. Перед `npm start` проверено отсутствие слушателя на порту 5173. Пользователь подтвердил тот же экран в собранном приложении при закрытом клиенте PoE.

## Ограничения проверок

- `npm ci` внутри Windows sandbox завершился EPERM при доступе к пользовательскому npm-cache; повтор вне песочницы успешен. Сборка внутри песочницы не смогла прочитать родительские каталоги через esbuild; повтор вне песочницы успешен. Типизация, линтинг, форматирование, тесты и OpenSpec проверены внутри песочницы.
- `npm audit --json` сообщил о 7 moderate-записях в dev-цепочке typescript-eslint → minimatch (GHSA-g3hv-75wg-m249), без high/critical. Зависимости автоматически не обновлялись.
- Реальные данные и клиент PoE не используются; проверки предметного слоя выполняются на синтетических фикстурах.

## Итоговая сверка — задача 3.2

После добавления postinstall повторены чистая установка, типизация, линтинг, форматирование, 10 тестов, сборка и оба режима запуска. `openspec validate bootstrap-desktop-app --strict` и `git diff --check` успешны.

| Сценарии спецификаций | Подтверждение |
| --- | --- |
| Корректная калибровка и некорректная геометрия | calibration.test.ts; успешный запуск Vitest |
| Контракты парсера и планировщика | crafting-contracts.test.ts; синтетические фикстуры, успешный и ошибочный исходы |
| Работа вне игры | Оба режима подтверждены пользователем при закрытом PoE; исходники не содержат исполнителя игровых команд или системного ввода |
| Dev-режим и собранное приложение | Ручное подтверждение пользователя; перед запуском сборки Vite остановлен |
| Изоляция окна | Настройки BrowserWindow сверены в исходном и собранном main; отдельная runtime-проверка доступа к Node не выполнялась |
| Воспроизводимые проверки | npm ci и все предусмотренные npm-проверки прошли; ограничения песочницы описаны выше |
| Документированный порядок изменений | Задачи отмечены после проверок, результаты и ограничения внесены в этот журнал |

Все 10 задач bootstrap выполнены. Изменение архивировано; требования перенесены в основные спецификации `openspec/specs/crafting-contracts/spec.md` и `openspec/specs/desktop-shell/spec.md`. В основных спецификациях заполнены разделы Purpose вместо автоматически созданных заглушек.

## add-calibration-overlay — проверенные задачи, 2026-11-12

### Итоговые автоматические проверки

На чистой установке из проверенного lockfile после уточнения preview прошли typecheck, lint, format:check, 99 тестов в 16 файлах, build, `git diff --check` и `openspec validate --all --strict` (изменение и обе основные спецификации). npm ci успешно выполнен до UI-уточнения; package.json и lockfile с тех пор не менялись, поэтому повторная установка не требовалась. npm ci/build выполнены вне sandbox по ранее описанным ограничениям. npm по-прежнему сообщает о 7 moderate-проблемах dev-цепочки. Rollup выдал предупреждения о комментариях @__PURE__ внутри Zod, сборка завершилась с кодом 0.

| Сценарии | Результат и границы |
| --- | --- |
| Четыре поверхности, начальные шаблоны и геометрия | Аудит референсов, Zod-схемы, 60/58/39 слотов и grid 12 × 5; tests/reference-layout, calibration-layout, calibration-geometry |
| ID, будущие названия, enabled и версии лиг | Каталог и service-тесты; реальные временные файлы в calibration-persistence.integration подтверждают сохранность координат/выключенных слотов и возврат прежней версии |
| Сохранение, отмена и сбой записи | WorkspaceStore/service/integration: предыдущий файл и черновик сохраняются при ошибке, неизвестный формат блокирует запись, reset требует подтверждения и сохраняет recovery-копию |
| Редактирование инвентаря и слотов | 6 тестов жестов и ручное подтверждение пользователя в dev; Save после защиты от устаревших снимков отдельно подтверждён |
| Режимы и изоляция | Native-адаптеры и preload-тесты; пользователь подтвердил preview/Escape/Alt+Tab и закрытие обоих окон; произвольного IPC, пути файла и игровых команд нет |
| Разрешения и масштабы | 24 изолированных сочетания разрешения/масштаба; физически подтверждены 3440 × 1440 при 125%. Ручная смена 100% ↔ 150% ещё не подтверждена |
| Финальная сборка и восстановление | Пользователь подтвердил build/start при выключенном Vite, восстановление геометрии/страницы/enabled, отмену импорта и работу компактной панели. Проверки выполнены при 125%; 100%/150% отложены |

Последующие строки содержат результаты отдельных закрытых задач.
- 1.1: Добавлены схемы шаблона и профиля, четыре поверхности, опциональные названия, уникальные ID и проверка ссылок на шаблон. typecheck и 9 тестов calibration-layout.test.ts прошли; используется синтетический дисплей с отрицательным глобальным началом.
- 1.2: JSON reference-v1 проверен схемой и вручную по всем трём JPG: General 60 слотов, Atlas 58, League 39; нижние дополнительные слоты 1/3/1 включены, центральная область исключена. Имена не назначены. typecheck и reference-layout.test.ts прошли.
- 1.3: Реализованы чистые преобразования, 60 ячеек, перемещение и четыре угла resize. typecheck и 7 geometry-тестов прошли: дробные размеры, границы, отрицательное начало монитора и масштабы 100%/150% без двойного преобразования, независимость страниц и JSON round-trip.
- 1.4: Добавлены ADR 0002, docs/calibration-layouts.md с аудитом референсов и пример JSON. Пример проверен Vitest, typecheck успешен; ссылки на документы и правила ID/geometryVersion/defaultLabel сверены.
- 2.1: Пользователь подтвердил dev-разметку при 3440 × 1440 и build/start поверх безрамочной PoE и при закрытой игре, включая скрытие. Vite остановлен перед npm start. Изоляция, showInactive, DIP и границы отправителя покрыты 4 desktop-тестами; общий набор 56 тестов, typecheck/lint/format/build прошли.
- 2.2: Пользователь подтвердил Editing/Escape, доступность мыши и клавиатуры игре в preview, возврат через Alt+Tab и закрытие обоих окон. 10 тестов переходов/дисплеев прошли, typecheck/lint/format успешны. Смена масштаба 100%/150% в ответе отдельно не подтверждена и остаётся открытой в 2.3.
- 3.1: WorkspaceStore подключён к userData; черновик отделён в CalibrationService. Проверены save/load всех поверхностей, последовательные записи, сбой rename с сохранением старого файла и черновика, повреждение и неизвестный формат, подтверждённый reset с recovery-копией. Тесты используют временные каталоги.
- 3.2: Каталог сравнивает геометрию без подписей и порядка слотов. Vitest проверяет добавление версии рядом со старой, конфликт версии, metadata-only обновление с сохранностью enabled/координат, явный выбор и возврат к прежней калибровке.
- 3.3: Main/preload подключены к service через именованные методы и typed error envelopes. Проверены чужое окно/frame, неизвестные команды, неверные аргументы, отмена native-диалогов, ошибка чтения и отсутствие raw IPC/пути файла в API. Подписки и обработчики очищаются; typecheck успешен.
- 3.4: ADR 0002 и docs/calibration-layouts.md обновлены фактическими правилами импорта/хранения/восстановления. JSON-пример и named API проверяются тестами, настоящий userData в тестах не используется. Полный набор: 80 тестов, typecheck/lint/format/OpenSpec strict успешны.
- 4.2: 6 тестов жестов редактора прошли; пользователь подтвердил перемещение/углы инвентаря 12 × 5 и Escape, затем отдельно подтвердил исправленный Save. Геометрия применяется из начального снимка жеста, координаты указателя переводятся обратной SVG-матрицей.
- 4.3: Пользователь подтвердил общий resize стеша, настройку отдельного слота на General/Atlas/League и включение/отключение. Тесты проверяют сохранность ID, соседних слотов и остальных страниц, границы и возврат disabled-слота с прежней геометрией.
- 5.1: После npm ci прошли typecheck/lint/format, 91 тест (14 файлов), build, git diff --check и OpenSpec --all --strict. Матрица сценариев и ограничения sandbox/ручных проверок внесены в журнал. Зависимости не обновлялись; 7 moderate dev-проблем остаются известным ограничением.
- 5.3: calibration-persistence.integration.test.ts проверяет service + реальный WorkspaceStore во временном каталоге: save/restart, только названия без сброса enabled/координат, новая геометрическая версия, возврат старого профиля и подтверждённое восстановление повреждённого файла с recovery-копией. ADR/руководство сверены; игровые команды не реализованы.
- 4.6: Пользователь подтвердил одинаковый вид editing и Save→preview. Общая buildCalibrationScene сохраняет геометрию и подписи включённых ячеек; CSS линий/заливок общий, маркеры и disabled остаются только в редакторе. Scene-тесты и typecheck/lint прошли, руководство и ADR обновлены.
- 5.1: После preview-уточнения прошли typecheck/lint/format, 99 тестов в 16 файлах, build, git diff --check и OpenSpec --all --strict. Успешная npm ci переиспользована: package.json/lockfile не изменены, что проверено Git. Ограничения и матрица сценариев обновлены; новая нативная build-проверка ещё ожидается.
- 4.1: Пользователь подтвердил панель, четыре поверхности и переключение General/Atlas/League, управление из preview и отмену native-импорта без изменения текущей раскладки в сборке.
- 4.4: После исправления ревизий снимков пользователь подтвердил Save и восстановление геометрии/страницы/enabled после перезапуска сборки. Регрессионные и реальные файловые integration-тесты проверяют save/cancel/error, поздние ответы, версии и обновление defaultLabel без потери калибровки.
- 4.5: docs/calibration-overlay.md сверено с реализацией и ручным прохождением dev/build: рамки, слоты, disabled, Save/Escape, перезапуск, импорт/отмена и мини-панель. Ограничения borderless-only, ручного выбора вкладок и отсутствия каталога названий/автотрекинга явно описаны.
- 4.7: Пользователь подтвердил мини-панель Hide и возврат main в dev и build/start при 3440×1440/125%. Native-adapter тесты проверяют отсутствие автофокуса, роль read/hide-only, скрытие при смене режима/дисплея/сбое и disposal всех окон; bounds проверены на signed/tiny displays. Физический DPI остаётся в 2.3/5.2.
