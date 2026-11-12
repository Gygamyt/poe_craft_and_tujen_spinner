# Разработка PoE Autocraft

Для запуска нужны Node.js 24 и npm. Команды выполняются из корня репозитория.

## Установка и запуск

После обновления `package-lock.json` установи зависимости из него и открой окно разработки.

```sh
npm ci
npm run dev
```

Закрой окно разработки и останови dev-сервер. Собери и запусти приложение из локальных файлов.

```sh
npm run build
npm start
```

В обоих режимах должно открыться окно Electron с заголовком PoE Autocraft. Проверка выполняется при закрытом клиенте игры.

## Проверки

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
```

`npm run format` форматирует исходники, тесты и конфигурацию. Vitest запускает проверки контрактов в Node.

Текущие результаты проверок и статус lockfile приведены в [журнале](progress/current-state.md). Границы приложения описаны в [архитектурном решении](architecture/0001-desktop-boundaries.md).
