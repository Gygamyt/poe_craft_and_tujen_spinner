# Оверлей ручной калибровки

## Purpose

Дать пользователю возможность вручную совместить сетку инвентаря и слоты выбранной страницы валютного стеша с интерфейсом игры. Отображать подтверждённую разметку без перехвата игрового ввода и явно сообщать о необходимости повторной калибровки.

## ADDED Requirements

### Requirement: Выбор отображаемых поверхностей
Система SHALL позволять независимо показывать инвентарь и одну выбранную страницу стеша General, Atlas или League на выбранном мониторе. Выбор страницы SHALL выполняться пользователем и SHALL не изменять калибровку остальных страниц.

#### Scenario: Инвентарь рядом со стешем
- **WHEN** пользователь включает инвентарь и выбирает General
- **THEN** оверлей показывает сетку инвентаря и слоты General, не рисуя Atlas и League

#### Scenario: Переключение страницы
- **WHEN** пользователь выбирает Atlas вместо General
- **THEN** отображается калибровка Atlas, а сохранённые положения General, League и инвентаря не меняются

### Requirement: Натягиваемая сетка инвентаря
В режиме редактирования система SHALL позволять перемещать рамку инвентаря и изменять её размер за угловые маркеры. Все 60 ячеек SHALL пересчитываться как равные прямоугольники 12 столбцов и 5 строк внутри этой рамки.

#### Scenario: Совмещение с инвентарём
- **WHEN** пользователь перемещает или растягивает рамку
- **THEN** сетка обновляется сразу, сохраняет 12 × 5 ячеек и остаётся внутри выбранного монитора с положительными размерами

### Requirement: Настройка нерегулярных слотов стеша
Система SHALL позволять перемещать и растягивать рамку выбранной страницы стеша с пропорциональным пересчётом относительных прямоугольников, а также отдельно корректировать положение и размер её слотов.

#### Scenario: Масштабирование страницы
- **WHEN** пользователь изменяет размер или положение рамки стеша
- **THEN** взаимное относительное расположение всех слотов этой страницы сохраняется

#### Scenario: Точная настройка слота
- **WHEN** пользователь корректирует один слот
- **THEN** изменяется только этот слот, его ID сохраняется, а размеры остаются положительными и внутри рамки страницы

### Requirement: Редактирование и пропуск ввода
The overlay canvas SHALL have hidden, editing and preview states. In preview it SHALL pass mouse input to the underlying window without taking keyboard focus. A separate compact preview-control panel SHALL accept pointer input only within its own bounds. Hidden windows SHALL not capture input.

#### Scenario: Режим настройки
- **WHEN** пользователь начинает редактирование из основного окна
- **THEN** появляются рамки и маркеры, доступные для ручного совмещения с игрой

#### Scenario: Подтверждённая разметка
- **WHEN** пользователь успешно сохраняет настройку и включает просмотр
- **THEN** enabled-cell markup keeps its editing appearance without resize handles, a compact Hide panel is visible, and the canvas passes mouse and keyboard input to the game after the user activates it

### Requirement: Управление и выход из редактирования
The main window SHALL provide show, hide and edit controls. Cancel and Escape in the focused editor SHALL discard the draft. Closing the main window SHALL dispose the overlay canvas and preview-control panel.

#### Scenario: Возврат из просмотра
- **WHEN** пользователь возвращается в основное окно и выбирает редактирование
- **THEN** оверлей снова принимает ввод для настройки; управление доступно без клика по пропускающему мышь оверлею

#### Scenario: Выход без сохранения
- **WHEN** пользователь нажимает Escape во время редактирования
- **THEN** черновые изменения отбрасываются, оверлей скрывается и сохранённые настройки остаются прежними

### Requirement: Монитор и масштаб отображения
The system SHALL support calibration independently of the selected display's resolution and aspect ratio, accounting for its position, size and Windows scale. A change to those parameters or the layout geometry version SHALL hide incompatible calibration and require explicit recalibration rather than silently applying stale coordinates.

#### Scenario: Масштаб Windows
- **WHEN** пользователь калибрует разметку при масштабе 100% или 150%
- **THEN** положение разметки соответствует перетаскиванию, а при неизменных параметрах восстанавливается после перезапуска без дополнительного масштабирования

#### Scenario: Resolution-independent calibration
- **WHEN** a user opens calibration on a supported display, including 3440 × 1440 ultrawide and standard 16:9 resolutions, at the current Windows scale
- **THEN** initial frames fit the selected display, the inventory remains 12 × 5, and the user can align all surfaces manually without resolution-specific code or presets

#### Scenario: Изменение конфигурации
- **WHEN** выбранный монитор отключён, изменил положение, размер или масштаб либо выбрана другая геометрическая версия
- **THEN** прежняя разметка не показывается как действующая, пользователь получает запрос на повторную калибровку, сохранённые данные старой конфигурации остаются доступны

### Requirement: Границы взаимодействия с игрой
The overlay SHALL work on Windows over the game's borderless windowed mode without sending game commands, reading game memory or recognizing screen content. The interface SHALL explain manual alignment and recalibration after moving or resizing the game window.

#### Scenario: Игра открыта
- **WHEN** the user aligns inventory and each of the three stash pages in borderless windowed mode
- **THEN** разметка видна поверх игры, а настройка не выполняет игровые действия

#### Scenario: Игра закрыта
- **WHEN** пользователь запускает приложение и редактирует калибровку при закрытой игре
- **THEN** редактор остаётся доступным без зависимости от процесса игры

#### Scenario: Неподдерживаемый режим
- **WHEN** пользователь читает условия использования оверлея
- **THEN** the supported target is identified as borderless windowed mode; exclusive fullscreen and automatic game-window tracking are not supported

### Requirement: Изоляция интерфейса
The overlay and preview-control windows SHALL retain context isolation, sandbox and disabled Node integration. Window, import and storage operations SHALL validate input and sender identity. The preview-control panel SHALL be limited to reading display state and hiding the overlay, without edit, import or file access permissions.

#### Scenario: Некорректный запрос
- **WHEN** интерфейс передаёт неизвестную команду, неверную геометрию или запрос приходит от постороннего окна
- **THEN** запрос отклоняется без изменения окон, шаблонов и сохранённой калибровки

### Requirement: Consistent appearance across modes
Enabled cells SHALL retain the same geometry, colours, fills and labels in editing and preview. Resize handles and selection outlines SHALL appear only while editing. Disabled slots SHALL remain visible only in editing as required by calibration-layouts.

#### Scenario: Save preserves the visual layout
- **WHEN** the user saves an edited calibration and enters preview
- **THEN** the same enabled cells remain at the same positions with the same labels and styling; only editing controls and handles are removed

### Requirement: Visible preview exit controls
Preview SHALL display a compact control panel on the selected monitor without automatically activating it. Its Hide button SHALL hide both the canvas and compact panel and show the main controls. The compact panel SHALL be absent in editing and hidden states.

#### Scenario: Exit preview from the game
- **WHEN** the user clicks Hide in the compact preview panel
- **THEN** the overlay canvas and compact panel disappear, the main controls are shown, and saved calibration remains unchanged

#### Scenario: Mode or display changes
- **WHEN** preview ends, the selected display becomes incompatible or the application closes
- **THEN** no detached preview-control panel remains visible
