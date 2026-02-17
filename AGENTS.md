# AGENTS.md

> Project map for AI agents. Keep this file up-to-date as the project evolves.

## Project Overview

Team-based timesheet management application with rule sharing capabilities. Allows teams to create and share timesheet rules, manage team memberships, and track user activity.

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js 15.4.5 (App Router)
- **Database:** PostgreSQL (Yandex Cloud)
- **ORM:** Prisma 6.13.0
- **State Management:** Redux Toolkit
- **UI Library:** Ant Design 5
- **Testing:** Jest
- **Documentation:** Storybook

## Project Structure

```
src/
├── app/                    # Next.js App Router entry points
│   ├── providers.tsx       # React providers (Redux, Antd, etc.)
│   └── store.ts           # Redux store configuration
├── components/            # Reusable UI components
│   ├── DatePicker/        # Custom date picker with stories
│   ├── RangePicker/       # Date range picker
│   ├── Text/              # Text component with MDX support
│   └── TextArea/          # Text input component
├── entities/              # Feature-based domain modules
│   ├── auth/              # Authentication (login, token, route guards)
│   ├── config/            # App configuration
│   ├── issue/             # Issue tracking (Jira, Yandex Tracker)
│   │   ├── common/        # Shared issue logic
│   │   ├── jira/          # Jira-specific implementation
│   │   └── yandex/        # Yandex Tracker implementation
│   ├── locale/            # Internationalization
│   ├── organization/      # Organization management
│   ├── queue/             # Queue management
│   └── track/             # Time tracking (core feature)
│       ├── common/        # Shared tracking logic
│       └── ui/            # Track calendar, forms, modals
├── features/              # Feature modules
├── lib/                   # Utilities and helpers
├── pages/                 # Legacy pages (if any)
├── shared/                # Shared types, constants
├── widgets/               # Composed widgets
└── __mocks__/             # Test mocks
```

## Key Entry Points

| File                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `package.json`          | Project dependencies and scripts   |
| `prisma/schema.prisma`  | Database schema (User, Team, Rule) |
| `next.config.js`        | Next.js configuration              |
| `middleware.ts`         | Auth middleware                    |
| `src/app/providers.tsx` | React context providers            |
| `src/app/store.ts`      | Redux store setup                  |
| `src/entities/track/`   | Core timesheet tracking feature    |

## Documentation

| Document            | Path                        | Description                    |
| ------------------- | --------------------------- | ------------------------------ |
| README              | README.md                   | Project landing page (English) |
| Полная документация | docs/README.md              | Technical docs in Russian      |
| Руководство         | docs/user_doc.md            | User guide in Russian          |
| Configuration Migr. | docs/CONFIGURATION.md       | ESLint/Prettier migration      |
| Docker Optimization | docs/DOCKER_OPTIMIZATION.md | Docker best practices          |
| Prisma Schema       | prisma/schema.prisma        | Database models                |
| Storybook           | .storybook/                 | Component documentation        |

## AI Context Files

| File                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| AGENTS.md                  | This file — project structure map        |
| .ai-factory/DESCRIPTION.md | Project specification and tech stack     |
| CLAUDE.md                  | Claude Code instructions and preferences |

## Available Skills

- **From skills.sh:** nextjs-app-router-patterns, prisma-expert
- **Custom skills:** ai-factory, architecture, best-practices, build-automation, ci, commit, deploy, dockerize, docs, evolve, feature, fix, implement, improve, review, security-checklist, skill-generator, task, verify

## MCP Servers Configured

- GitHub (repository integration)
- Filesystem (file operations)
- Postgres (database queries)
