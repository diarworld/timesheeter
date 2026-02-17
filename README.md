# Timesheet

> Учет рабочего времени в Yandex Tracker для разработчиков

Timesheet — современное решение для учета рабочего времени, созданное разработчиками для разработчиков. Интегрируется с Yandex Tracker и Outlook/Exchange календарем.

## Quick Start

```bash
# Install dependencies
npm ci

# Build project
npm run build

# Run in production
npm run start

# Development mode
npm run dev
```

## Key Features

- **Календарная интеграция** — выгрузка встреч из Outlook/Exchange в Yandex Tracker
- **Визуализация отчетов** — наглядные графики затраченного времени
- **Управление командой** — создание команд и共享 правил
- **Быстрое создание треков** — несколько способов ввода данных
- **Закрепление задач** — важные задачи всегда под рукой

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **UI:** Ant Design 5
- **State:** Redux Toolkit
- **Database:** PostgreSQL (Prisma 6)
- **Testing:** Jest, Storybook

## Environment Variables

| Variable          | Required | Description                   |
| ----------------- | -------- | ----------------------------- |
| `CLIENT_ID`       | Yes      | Yandex OAuth2 App ID          |
| `ENCRYPTION_KEY`  | Yes      | Salt for encrypting passwords |
| `DATABASE_URL`    | Yes      | PostgreSQL connection         |
| `EWS_SERVICE_URL` | No       | Exchange Web Services URL     |

Full list: see [Configuration](docs/configuration.md)

## Docker

```bash
# Build and run
docker-compose up --build
```

## Documentation

| Guide                                                      | Description                     |
| ---------------------------------------------------------- | ------------------------------- |
| [User Guide](docs/user_doc.md)                             | Полное руководство пользователя |
| [README (Full)](docs/README.md)                            | Полная документация на русском  |
| [Configuration Migration](docs/CONFIGURATION_MIGRATION.md) | Миграция конфигурации           |
| [Docker Optimization](docs/DOCKER_OPTIMIZATION.md)         | Оптимизация Docker              |
| [LLM Prompt](docs/llm_prompt.md)                           | Prompt для AI-ассистента        |

## Support

- [Issues](https://github.com/diarworld/timesheeter/issues)
- [Telegram](https://t.me/diarworld)

## License

MIT
