# Оверлей калибровки инвентаря и валютного стеша

## Why

Существующие контракты калибровки пока нельзя совместить с интерфейсом игры. Нужен ручной оверлей для инвентаря и трёх страниц валютного стеша, с возможностью менять раскладку после выхода новой лиги и позже добавлять названия ячеек.

## What Changes

- Добавить прозрачный оверлей поверх игры: перемещение и растягивание рамки инвентаря 12 × 5 и раскладок General, Atlas, League; для стеша — также уточнение отдельных прямоугольников слотов.
- Разделить редактирование, просмотр с пропуском мыши в игру и скрытое состояние. Управление остаётся доступным из основного окна приложения.
- Keep enabled-cell geometry, colours, fills and labels visually consistent between editing and preview; show manipulation handles only during editing. Provide a small separate preview panel with a visible Hide button that hides the overlay and returns to the main controls.
- Ввести версионируемые JSON-шаблоны раскладки, отдельно от пользовательской экранной калибровки. Пользователь сможет загрузить новый шаблон лиги и явно выбрать его без изменения кода оверлея.
- Для каждого слота предусмотреть стабильный технический ID, необязательное название по умолчанию и флаг включения. Пока названия не заполнены, показывать нейтральные номера; определение валют по иконкам и полный словарь названий отложить.
- Дать возможность отключать лишние слоты, сохраняя их идентичность и геометрию. Не назначать им функции или валюты на актуале автоматически.
- Сохранять подтверждённую калибровку локально и восстанавливать её только для совместимой версии шаблона и конфигурации экрана.
- Target Windows borderless windowed mode on one selected display at a time, independently of resolution and aspect ratio. Ordinary windowed mode is outside the acceptance scope; exclusive fullscreen and automatic game-window tracking are out of scope.

## Capabilities

### New Capabilities

- `calibration-layouts`: версионируемые шаблоны четырёх поверхностей, стабильные ID и будущие подписи слотов, включение слотов, импорт шаблонов и локальное хранение калибровки.
- `calibration-overlay`: ручное совмещение сетки и слотов с интерфейсом игры, режимы ввода, выбор поверхности и монитора, проверка пригодности экранной калибровки.

### Modified Capabilities

Нет. Базовые Zod-контракты `crafting-contracts` сохраняются; новые модели используют их для проверки геометрии. Оболочка `desktop-shell` сохраняет изоляцию и оба способа запуска.

## Impact

Acceptance follow-up: the user explicitly moved physical 100%/150% DPI verification to TD-001 in `docs/progress/technical-debt.md`. Native acceptance is confirmed at 3440 × 1440 / 125%; automated coverage is broader. This is deferred verification, not evidence that the outstanding checks passed.

После согласования затрагиваются `src/domain/`, Electron main/preload, Vue renderer и тесты. Добавляются каталог JSON-шаблонов, ограниченный типизированный IPC и хранение под `app.getPath("userData")`. Архитектурные решения будут записаны в `docs/architecture/`, результаты — в журнале прогресса.

Визуальные источники: `docs/reference/Char.jpg`, `First currency.jpg`, `Second currency.jpg`, `Third currency.jpg`. Это обрезанные примеры расположения, а не готовая калибровка рабочего стола или подтверждённый каталог валют текущей лиги.

Вне объёма: исполнение крафта, игровые клики, чтение памяти игры, распознавание экрана, автоматическое определение активной вкладки и полный редактор шаблонов. Проверки геометрии и хранения изолированы от игры; ручная проверка оверлея проводится отдельно.
