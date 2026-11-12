# Задачи оверлея калибровки

Отмечать задачу только после её проверок и вместе с обновлением `docs/progress/current-state.md`. Недоступная обязательная ручная проверка оставляет задачу открытой.

## 1. Модель раскладок и координаты

- [x] 1.1 Добавить Zod-схемы шаблона, версии, страниц General/Atlas/League и сохранённой калибровки поверх базовых контрактов. Проверить Vitest: четыре поверхности, инвентарь 12 × 5, отсутствие подписи, дубликаты ID, неверные размеры и неподдерживаемый формат; выполнить typecheck.
- [x] 1.2 Добавить начальный JSON-шаблон по четырём изображениям в `docs/reference/`, со стабильными нейтральными ID, незаполненными `defaultLabel` и включаемыми слотами. Проверить схему и вручную сверить число/расположение слотов каждой страницы с её референсом, включая нижние дополнительные слоты и исключение центральной области предмета.
- [x] 1.3 Реализовать чистые преобразования нормализованных слотов в локальные DIP, сетки 12 × 5 и ограничение перемещения/растягивания рамок. Проверить Vitest: 60 равных ячеек, край области, дробные координаты, отрицательное глобальное начало дисплея, невалидная геометрия и отсутствие двойного применения scaleFactor.
- [x] 1.4 Записать решения модели и координат в `docs/architecture/0002-calibration-overlay.md`, добавить пример формата шаблона и правила ID/geometryVersion/defaultLabel в документацию. Проверить пример схемой, сверить ссылки и объяснение обновления названий без потери координат.

## 2. Окно оверлея и режимы ввода

- [x] 2.1 Separate main/overlay renderer views and add an isolated transparent window covering the selected display. Verify test-overlay visibility on Windows in dev and build/start over borderless windowed PoE and with the game closed; record actual display settings and results before developing the full editor.
- [x] 2.2 Реализовать состояния hidden/editing/preview, отказ от фокуса и пропуск мыши в preview, скрытие при ошибке renderer и закрытие оверлея вместе с основным окном. Проверить переходы Vitest с Electron-адаптером и вручную: мышь/клавиатура доступны игре в preview, hidden не мешает вводу, возврат через основное окно возможен, оба окна закрываются.
- [ ] 2.3 Добавить выбор дисплея и инвалидирование разметки при изменении bounds/scaleFactor/rotation, отключении дисплея и смене геометрической версии. Проверить Vitest со снимками дисплеев и вручную смену масштаба 100% ↔ 150%: старая разметка скрыта и предлагается новая калибровка; расширить ADR режимами окна и DPI.

## 3. Хранение, импорт и доверенная граница

- [x] 3.1 Реализовать локальное хранение под userData с сериализованными безопасными записями, черновиком отдельно от подтверждённого состояния и явным сбросом. Проверить Vitest во временном каталоге: save/load всех поверхностей, сбой записи с сохранением предыдущих данных и черновика, повреждённый файл, неизвестный формат и отказ от автоматической перезаписи.
- [x] 3.2 Реализовать проверку импорта JSON, каталог версий и сравнение геометрии без учёта подписей и порядка слотов. Проверить Vitest: новая версия рядом со старой, конфликт неизменяемой версии, обновление только названий без потери калибровки и enabled, перестановка массива, отказ от некорректного шаблона.
- [x] 3.3 Подключить ограниченный типизированный preload/IPC для окон, состояния, дисплеев, калибровки, main-диалога импорта и сброса. Проверить typecheck и изолированные тесты: неверные аргументы, неизвестная команда, посторонний отправитель/frame, отмена диалога, ошибка чтения; никакой произвольный путь или IPC-вызов не доступен renderer.
- [x] 3.4 Дополнить ADR границами IPC и хранения, документировать импорт, сохранение предыдущих версий, обновление только подписей и восстановление после повреждения. Проверить документацию по тестовым JSON и фактическим ответам API, сверить отсутствие доступа тестов к настоящему userData.

## 4. Ручная настройка поверхностей

- [ ] 4.1 Добавить панель выбора шаблона, монитора, инвентаря и одной страницы стеша, управления режимами, импорта с подтверждением и сообщений о несовместимой калибровке. Проверить вручную четыре поверхности, независимость переключения страниц, отмену импорта и доступность управления из preview.
- [x] 4.2 Добавить SVG-сетку инвентаря с перетаскиванием и угловыми маркерами, используя проверенные преобразования. Проверить Vitest последовательности жестов и вручную совмещение 12 × 5 с инвентарём, ограничения размера и границ, сохранение и отмену через Escape.
- [x] 4.3 Добавить растягивание рамки стеша, правку отдельных слотов, нейтральные подписи и включение/отключение без удаления. Проверить Vitest неизменность ID и соседних слотов, затем вручную все три страницы: общий resize, правка слота, отключение в preview и повторное включение с прежней геометрией.
- [ ] 4.4 Connect save/cancel to persistence and restoration, preserving the draft for retry after write failure. Verify save/cancel/error integration tests, reordered snapshot replies after Save, and explicit submission of the visible geometry. Manually verify restart preserves coordinates/enabled flags; adding only defaultLabel must not reset calibration.
- [ ] 4.5 Обновить руководство настройкой инвентаря и трёх страниц, возвращением из preview, работой с лишними слотами и ограничениями режимов игры. Проверить инструкцию ручным прохождением; явно указать отсутствие автоопределения вкладок, слежения за игрой и заполненного каталога валют.

- [x] 4.6 Keep frames, enabled-slot labels and styling consistent across editing/preview using a shared scene model. Verify mode parity and disabled-slot filtering with Vitest, and manually confirm Save changes only editing affordances; update the guide and architecture record.
- [ ] 4.7 Add an isolated compact preview panel on the selected display with a Hide button returning to main controls. Verify mode visibility, pointer/focus boundaries, sender permissions, display changes and all-window disposal with native-adapter tests and manual dev/build checks; update usage documentation.

## 5. Итоговая интеграционная приёмка

- [x] 5.1 Выполнить npm ci, typecheck, lint, format:check, npm test, build, git diff --check и openspec validate add-calibration-overlay --strict. Сверить успешные результаты со сценариями обеих спецификаций в журнале, сохранив существующие контрактные тесты и указав ограничения sandbox.
- [ ] 5.2 Verify the complete Windows workflow in dev and build/start with Vite stopped: Inventory + General/Atlas/League, alignment, individual slot, enabled, Escape, save/restart, matching preview appearance, compact-panel Hide and all-window shutdown. Repeat over borderless windowed PoE and with the game closed, at 100% and 150% Windows scale; record user confirmation and actual settings. Document unavailable second-monitor hardware as a limitation rather than claiming it was tested.
- [x] 5.3 Проверить интеграционно обновление только названий, импорт новой геометрической версии, возврат к старой версии и обработку повреждённого сохранения. Убедиться в сохранности прежних данных и отсутствии игровых действий, сверить ADR/руководство/журнал с реализацией; закрыть задачу только после прохождения сценариев.

## Workflow follow-up

- После согласования этого плана перейти к openspec-apply-change.
- После выполнения и проверки всех задач перенести требования в основные спецификации и архивировать изменение.
