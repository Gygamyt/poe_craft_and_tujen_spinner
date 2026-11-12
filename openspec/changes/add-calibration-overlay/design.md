# Технический план оверлея калибровки

## Context

Мотивация и границы поведения описаны в [proposal.md](proposal.md), требования — в `specs/calibration-layouts/spec.md` и `specs/calibration-overlay/spec.md`.

В проекте одно BrowserWindow с изоляцией, пустой preload и экран-заголовок Vue. `src/domain/calibration.ts` уже проверяет регулярную сетку и прямоугольные именованные слоты; координаты области неотрицательны, координаты слота локальны относительно области. Хранения, IPC и управления дисплеями нет.

Просмотрены четыре локальных изображения: `Char.jpg` содержит сетку 12 × 5; `First currency.jpg`, `Second currency.jpg`, `Third currency.jpg` показывают General, Atlas, League. Области стеша нерегулярны, имеют повторяющийся нижний блок и дополнительные нижние слоты. Картинки обрезаны, поэтому не задают позицию на экране, DPI и точную актуальную раскладку лиги. Назначение валют по изображениям не устанавливается.

Изменение затрагивает модель данных, два renderer-контекста, доверенную границу IPC и локальное хранение, поэтому отдельный design необходим.

## Goals / Non-Goals

**Goals:** согласовать геометрию, которую одинаково понимают JSON-шаблон, renderer, main и сохранённая калибровка; не связывать будущие подписи с идентичностью слотов; оставить возможность загрузить следующую раскладку без изменения кода.

**Non-Goals:** crafting execution and a currency catalogue, automatic coordinate migration between geometry versions, game-window detection/tracking, simultaneous overlays on multiple displays, and a full template authoring tool. The agreed acceptance target is Windows borderless windowed mode; ordinary windowed mode is not required for acceptance.

## Decisions

### 1. Отдельное окно оверлея, основной экран — панель управления

Main owns three isolated windows: the ordinary controls, a transparent frameless canvas covering the selected display, and a compact opaque preview-control panel. The canvas remains transparent, frameless and nonresizable; SVG geometry is resized inside it. All three use the same renderer entry with an explicit main/overlay/preview-controls view. The compact panel is positioned near the selected display's top centre, clamped to its bounds, and has no taskbar entry.

Состояния:
- `hidden`: окно скрыто;
- `editing`: окно принимает ввод, содержит черновик, рамки и маркеры; Escape отменяет и скрывает;
- `preview`: show the canvas without activation, ignore its mouse events and disable focus; show the compact Hide panel above it without activation or keyboard focus. Only that panel's small rectangle accepts pointer input.

Preview releases canvas focus; the user activates the game without injected input. The compact panel's Hide action hides both preview windows and explicitly shows/focuses the main controls. Hide is the only mutation permitted from this window; other editing/import requests from it are rejected. Editing and hidden modes hide the compact panel. Main-window closure disposes both child windows and their handlers; a renderer failure hides preview and surfaces the error in the main controls. Global shortcuts remain out of scope, and Alt+Tab remains a fallback.

Editing and preview share a single scene-building path for frames, enabled-cell positions and labels, with shared CSS for colour, stroke and fill. Editing additionally shows selection outlines, resize handles and disabled slots. This prevents Save from visually appearing to replace the layout when only the interaction mode changed. The compact preview panel uses the same visual palette as the editing toolbar.

Альтернативы: рисование поверх игры внутри её процесса исключено из объёма; один прозрачный экран вместо панели делает управление в preview неудобным. Нативное изменение размера окна не используется из-за ограничений прозрачности.

### 2. Шаблон, названия и экранная калибровка — разные данные

Планируемое размещение: `src/domain/` — схемы и чистые преобразования; `src/layouts/` — поставляемые JSON-шаблоны и каталог; `src/main/` — загрузка, хранение и окна; `src/preload/` — ограниченный мост; `src/renderer/src/` — панель и редактор.

Модель шаблона:
- `schemaVersion`: версия формата JSON;
- `layoutId`: семейство раскладки, без предположения о конкретной лиге;
- `geometryVersion`: неизменяемая версия состава и геометрии слотов;
- `leagueLabel?`: необязательная поясняющая метка;
- `inventory`: 12 столбцов, 5 строк;
- `pages.general`, `pages.atlas`, `pages.league`: наборы слотов `{ id, bounds, defaultLabel? }` в относительных координатах страницы;
- `defaultLabel?` не входит в сравнение геометрии.

Начальные ID нейтральны (`slot-001` и далее), уникальны в пределах страницы. Полный ключ — `(layoutId, pageId, slotId)`. Порядок массива и текст подписи не используются как ключи. Уже выданные ID не перенумеровываются при добавлении слотов. Совпадающие нижние блоки трёх страниц могут иметь одинаковые локальные ID, но их калибровки независимы: синхронизация положения между страницами пока не подразумевается.

Названия по умолчанию пока не заполняются реальными валютами. Нейтральная подпись «Слот N» строится из явно заданного номера/ID и остаётся стабильной при перестановке массива. Будущий словарь сможет заполнить `defaultLabel` без изменения геометрической версии. Кастомное переименование и каталог валют в эту итерацию не входят.

Калибровка отдельно содержит `schemaVersion`, `layoutId`, `geometryVersion`, снимок дисплея, рамку инвентаря и по каждой странице рамку, относительные поправки слотов и `enabled` по ID. Отключение не удаляет слот. Начальные видимые на референсах слоты доступны для настройки; пользователь сам отключает ненужные. Центральная область предмета не превращается в валютный слот и сейчас не калибруется.

Альтернатива: зашить пиксели и названия в Vue-компонент — проще сначала, но требует менять код при каждой раскладке и ломает ссылки при переименовании.

### 3. Координаты и редактирование

Глобальные координаты дисплея берутся через Electron `screen` в DIP и допускают отрицательное начало. Существующая геометрия области остаётся локальной к выбранному дисплею с неотрицательными x/y. Глобальное начало применяется только при создании OS-окна. Слоты шаблона хранятся в нормализованных координатах 0..1 внутри рамки стеша, включая проверку правой/нижней границы. Для проверки результата нормализованные координаты материализуются в локальные прямоугольники существующего `calibrationSchema`.

SVG и pointer events рассчитывают перетаскивание в локальных CSS/DIP-координатах при масштабе renderer 1. `devicePixelRatio` не умножается второй раз на координаты Electron. На рамке — угловые маркеры и перетаскивание; минимальный положительный размер и границы выбранного дисплея ограничивают жест. Инвентарь делится на 12 × 5; для стеша меняется общая рамка либо отдельный слот. Все сохранённые слоты, включая выключенные, остаются валидными после изменения рамки. Ширина и высота изменяются независимо; пользователь вручную добивается совпадения с игрой.

Автоматические проверки чистых преобразований охватывают углы, дробные координаты, отрицательное глобальное начало дисплея, точное касание края, недопустимый выход за край и отсутствие накопления округления после сохранения/загрузки.

Resolution coverage: initial frames derive from the selected display's DIP bounds rather than a fixed 1920 × 1080 canvas. Isolated tests cover 1280 × 720, 1920 × 1080, 2560 × 1440, 3440 × 1440, 3840 × 2160 and 5120 × 1440 at 100%, 125%, 150% and 200% scaling. These tests verify bounds, grid shape, slot materialization and coordinate round trips; they do not replace native Windows acceptance tests. Game UI alignment remains manual, with a separate calibration per compatible display snapshot.

### 4. Версии, импорт и сохранение

Импорт вызывается из основной панели через нативный выбор JSON-файла. Main читает только выбранный файл, проверяет Zod-схемы и показывает сводку до принятия. Отмена диалога ничего не меняет. Импортированные шаблоны сохраняются в каталоге приложения под `userData`; пользователь не должен править исходники или `node_modules`.

Для одного `(layoutId, geometryVersion)` геометрия неизменна: конфликт отклоняется. Импорт с теми же геометрией и ключами может обновить только метаданные и подписи после подтверждения. При новой версии создаётся отдельная калибровка, без автопереноса изменившихся слотов; прежняя версия и её данные сохраняются. До явного переключения активная раскладка не меняется. Для первого шаблона не утверждаем соответствие текущей лиге.

Main сериализует операции записи, сначала записывает и проверяет временный файл, затем заменяет файл настроек. При сбое сохраняется предыдущая пригодная копия; renderer получает типизированную ошибку, черновик не исчезает. Пользовательский файл с неизвестным форматом или повреждением не перезаписывается при старте; сброс требует явного подтверждения. Для тестов используются временные каталоги, а не настоящий профиль пользователя.

Восстановление требует совпадения layout/geometry version и снимка дисплея: ID, bounds, scaleFactor, rotation. На `display-removed`/`display-metrics-changed` разметка скрывается и помечается непригодной, старые данные сохраняются. При ручном перемещении/изменении окна игры требуется повторное совмещение: это ограничение показывается в панели, поскольку трекинга игры нет.

### 5. Ограниченный IPC и тестирование

Preload предоставляет только предметные операции: чтение состояния и списка дисплеев, выбор раскладки/страницы/монитора, смена режима, подтверждение калибровки, импорт через main-диалог и подтверждённый сброс. Произвольный IPC, файловые пути, выполнение кода и прямой Node-доступ наружу не выдаются. Main проверяет зарегистрированный WebContents, основной frame, схему аргументов и допустимый переход состояния; события обновления имеют функцию отписки.

Модели, преобразования, переключение состояний, IPC-отказы, импорт и хранение проверяются Vitest с синтетическими данными и подменёнными Electron-адаптерами. Референсы используются для визуальной сверки состава и расположения шаблонов, а не как источник распознанных названий валют.

Manual Windows acceptance is required in dev and build/start: inventory plus General/Atlas/League, frame/slot manipulation, enabled flags, cancel, save/restart, preview input pass-through, hide/return and both-window shutdown. Repeat over borderless windowed PoE and with the game closed. Manually verify 100% and 150% Windows scaling; an unavailable required check stays open with a recorded limitation. Test a second monitor when hardware is available, otherwise record that limitation; isolated tests cover signed display origins.

### 6. Архитектурные записи

Renderer synchronization: runtime snapshots carry a monotonic revision, and both views reject older asynchronous read replies after newer broadcasts. Saving flushes pending gestures and explicitly submits the visible profile before persistence. Page selection is captured before awaiting queued updates. Regression tests cover reordered snapshots after Save and preservation of the final displayed geometry.

При реализации добавить `docs/architecture/0002-calibration-overlay.md`: обосновать отдельное прозрачное окно, режимы ввода, границы IPC, локальные DIP-координаты, разделение шаблона/калибровки и идентичность слота без зависимости от подписи. В рамках текущего propose записываются только плановые артефакты.

## Risks / Trade-offs

- Видимость поверх игры зависит от режима окна и Windows → сначала выполнить узкую ручную проверку прозрачного окна в dev/build; исключён эксклюзивный fullscreen, не обещать видимость без фактического теста.
- Прозрачное окно само по себе не пропускает мышь → явно применять `setIgnoreMouseEvents`, отключать фокус в preview, проверять на реальной игре.
- Картинки не являются полной экранной калибровкой → зафиксировать относительную геометрию шаблона и ручную подстройку; не выдавать исходные размеры JPG за пиксели рабочего стола.
- В новой лиге меняются слоты → новая geometryVersion, явное переключение и новая калибровка; будущие названия без изменения геометрии не требуют этого шага.
- Разметка может остаться поверх другого приложения → явное скрытие в основной панели; автоматическая привязка к фокусу игры отложена.
- Ограничения текущей Windows sandbox могут мешать сборке, кэшу npm и GUI → фиксировать способ запуска и ограничения в журнале; не менять глобальные разрешения в рамках этого change.

## Migration Plan

Существующих пользовательских калибровок в приложении нет. Первое включение создаёт настройки нового формата, сохраняя базовые контракты и тесты. До выбора сохранения редактор работает с черновиком. Откат к предыдущей версии приложения не требует удаления пользовательских JSON; она их не читает. Обновления геометрических версий устанавливаются рядом с прежними.

## Open Questions

- Реальные названия валют для каждого ID будут заполнены позднее по отдельному согласованию.
- Пользователь позже определит назначение и необходимость дополнительных Standard-ячеек на актуале; пока они сохраняются как независимо отключаемые слоты без семантического назначения.

## Sources

- [Electron: прозрачные окна и ограничения изменения размера](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles).
- [Electron: пропуск мыши через окно](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions).
- [Electron screen: дисплеи и DIP](https://www.electronjs.org/docs/latest/api/screen).
