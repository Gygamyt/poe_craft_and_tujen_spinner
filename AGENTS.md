# PoE Autocraft

- Веди изменения через OpenSpec. Подготовь proposal, требования со сценариями, технический план и задачи. Приступай к реализации после согласования плана пользователем.
- Write all new OpenSpec content in English, including proposals, specifications, designs, tasks, and future additions to existing artifacts. Do not translate existing content unless explicitly requested.
- Перед правкой проверь состояние рабочей копии и связанные исходники. Сохраняй правки пользователя.
- Commit completed, verified features or coherent implementation/test steps. Stage explicit task-owned paths and exclude unrelated user changes, including files already staged by the user. Keep commit messages and tool output concise; batch relevant checks and avoid repeating successful checks unless new changes or failures justify it.
- Фиксируй архитектурные решения и причины выбора в `docs/architecture/`.
- Отмечай задачу в `tasks.md` только после успешного выполнения предусмотренных проверок. Обновляй `docs/progress/current-state.md` при закрытии задачи и фиксируй в нём ограничения проверок.
- Соблюдай объём согласованного изменения. Для `bootstrap-desktop-app` используй синтетические данные и изолированные тесты контрактов.
