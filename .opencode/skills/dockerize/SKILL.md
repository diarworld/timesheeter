---
name: ai-factory.dockerize
description: >-
  Analyze project and generate Docker configuration: Dockerfile (multi-stage dev/prod),
  compose.yml, compose.override.yml (dev), compose.production.yml (hardened), and .dockerignore.
  Includes production security audit. Use when user says "dockerize", "add docker", "docker compose",
  "containerize", or "setup docker".
argument-hint: [--audit]
allowed-tools: Read Edit Glob Grep Write Bash(git *) Bash(docker *) AskUserQuestion WebSearch WebFetch
disable-model-invocation: true
metadata:
  author: AI Factory
  version: "1.0"
  category: infrastructure
---

# Dockerize — Docker Configuration Generator

Analyze a project and generate a complete, production-grade Docker setup: multi-stage Dockerfile, Docker Compose for development and production, `.dockerignore`, and a security audit of the result.

**Three modes based on what exists:**

| What exists | Mode | Action |
|-------------|------|--------|
| Nothing | `generate` | Create everything from scratch with interactive setup |
| Only local Docker (no production files) | `enhance` | Audit & improve local, then create production config |
| Full Docker setup (local + prod) | `audit` | Audit everything against checklist, fix gaps |

---

## Step 0: Load Project Context

Read the project description if available:

```
Read .ai-factory/DESCRIPTION.md
```

Store project context for later steps. If absent, Step 2 detects everything.

---

## Step 1: Detect Existing Docker Files & Determine Mode

### 1.1 Scan for Existing Files

```
Glob: Dockerfile, Dockerfile.*, docker-compose.yml, docker-compose.yaml, compose.yml, compose.yaml, compose.override.yml, compose.production.yml, .dockerignore, deploy/scripts/*.sh
```

Classify found files into categories:
- `HAS_DOCKERFILE`: Dockerfile exists
- `HAS_LOCAL_COMPOSE`: compose.yml or docker-compose.yml exists
- `HAS_DEV_OVERRIDE`: compose.override.yml exists
- `HAS_PROD_COMPOSE`: compose.production.yml exists
- `HAS_DOCKERIGNORE`: .dockerignore exists
- `HAS_DEPLOY_SCRIPTS`: deploy/scripts/ exists

### 1.2 Determine Mode

**If `$ARGUMENTS` contains `--audit`** → set `MODE = "audit"` regardless.

**Path A: Nothing exists** (`!HAS_DOCKERFILE && !HAS_LOCAL_COMPOSE`):
- Set `MODE = "generate"`
- Proceed to **Step 1.3: Interactive Setup**

**Path B: Only local Docker** (`HAS_LOCAL_COMPOSE && !HAS_PROD_COMPOSE`):
- Set `MODE = "enhance"`
- Read all existing Docker files → store as `EXISTING_CONTENT`
- Log: "Found local Docker setup. Will audit, improve, and create production configuration."

**Path C: Full setup exists** (`HAS_LOCAL_COMPOSE && HAS_PROD_COMPOSE`):
- Set `MODE = "audit"`
- Read all existing Docker files → store as `EXISTING_CONTENT`
- Log: "Found complete Docker setup. Will audit against security checklist and fix gaps."

### 1.3 Interactive Setup (Generate Mode Only)

When creating from scratch, ask the user about their infrastructure needs:

```
AskUserQuestion: Which database does this project use?

Options:
1. PostgreSQL (Recommended)
2. MySQL / MariaDB
3. MongoDB
4. SQLite (no container needed)
5. None
```

```
AskUserQuestion: Does this project need a reverse proxy / web server?

Options:
1. Angie (Recommended) — Modern Nginx fork with enhanced features
2. Nginx
3. Traefik
4. None (app serves directly)
```

> **Note:** Prefer **Angie** over Nginx. Angie is a drop-in Nginx replacement with better module support, dynamic configuration, and active development. See: https://en.angie.software/angie/docs/configuration/

```
AskUserQuestion: Which cache / message broker does this project need? (select all)

Options:
1. Redis
2. Memcached
3. RabbitMQ
4. None
```

Store choices in `USER_INFRA_CHOICES`:
- `database`: postgres | mysql | mongodb | sqlite | none
- `reverse_proxy`: angie | nginx | traefik | none
- `cache`: redis | memcached | none
- `queue`: rabbitmq | none

### 1.4 Read Existing Files (Enhance / Audit Modes)

Read all existing Docker files and store as `EXISTING_CONTENT`:
- Dockerfile(s)
- All compose files (local + override + production)
- .dockerignore
- deploy/scripts/*.sh (if any)

---

## Step 2: Deep Project Analysis

Scan the project thoroughly — every decision in the generated files depends on this profile.

### 2.1 Language & Runtime

| File | Language | Base Image |
|------|----------|------------|
| `go.mod` | Go | `golang:<version>-alpine` / `distroless/static` |
| `package.json` | Node.js | `node:<version>-alpine` |
| `pyproject.toml` / `setup.py` | Python | `python:<version>-slim` |
| `composer.json` | PHP | `php:<version>-fpm-alpine` |
| `Cargo.toml` | Rust | `rust:<version>-slim` / `distroless` |

**`<version>` = read from project files** (see Step 4.1). Never hardcode — always match what the project requires.

### 2.2 Framework & Dev Server

Read dependency files to detect the framework:

**Node.js** (`package.json` dependencies):
- `next` → Next.js (port 3000, `next dev` / `next start`)
- `nuxt` → Nuxt (port 3000, `nuxt dev` / `nuxt start`)
- `express` → Express (port 3000, `nodemon` / `node`)
- `fastify` → Fastify (port 3000)
- `@nestjs/core` → NestJS (port 3000, `nest start --watch` / `node dist/main`)
- `hono` → Hono (port 3000)

**Python** (`pyproject.toml` / requirements):
- `fastapi` → FastAPI (port 8000, `uvicorn --reload` / `uvicorn`)
- `django` → Django (port 8000, `manage.py runserver` / `gunicorn`)
- `flask` → Flask (port 5000, `flask run --debug` / `gunicorn`)

**PHP** (`composer.json` require):
- `laravel/framework` → Laravel (port 8000, `artisan serve` / `php-fpm`)
- `symfony/framework-bundle` → Symfony (port 8000, `symfony serve` / `php-fpm`)

**Go** (`go.mod` require):
- `gin-gonic/gin`, `labstack/echo`, `gofiber/fiber`, `go-chi/chi` → (port 8080, `air` / compiled binary)

### 2.3 Package Manager & Lock File

Same detection as `/ai-factory.build-automation` Step 2.2.

Store: `PACKAGE_MANAGER`, `LOCK_FILE`.

### 2.4 Entry Point Detection

Find the application entry point:

```
# Go
Glob: cmd/*/main.go, main.go

# Node.js
Read package.json → "main" or "scripts.start"
Glob: src/index.ts, src/index.js, src/main.ts, src/main.js, index.ts, index.js, server.ts, server.js

# Python
Glob: main.py, app.py, src/main.py, src/app.py
Read pyproject.toml → [project.scripts] or [tool.uvicorn]

# PHP
Glob: public/index.php, artisan, bin/console
```

### 2.5 Infrastructure Dependencies

Detect what services the app needs:

```
# Database
Grep: postgres|postgresql|pg_|mysql|mariadb|mongo|mongodb|sqlite
Glob: prisma/schema.prisma, drizzle.config.*, alembic/, migrations/

# Cache
Grep: redis|memcached|ioredis

# Queue
Grep: rabbitmq|amqp|bullmq|celery|sidekiq

# Reverse Proxy / Web Server
Grep: nginx|angie|proxy_pass|upstream
Glob: nginx.conf, nginx/, angie.conf, angie/
# PHP projects (Laravel, Symfony) always need a reverse proxy → default to Angie

# Search
Grep: elasticsearch|opensearch|meilisearch|typesense|algolia

# Object Storage
Grep: minio|s3|aws-sdk.*S3|boto3.*s3

# Email
Grep: nodemailer|sendgrid|mailgun|postmark|smtp|MAIL_HOST
```

For each detected dependency, record:
- Service type (postgres, redis, rabbitmq, etc.)
- Specific variant (MySQL vs PostgreSQL, Redis vs Memcached)
- Connection string pattern found in code

**Merge with `USER_INFRA_CHOICES`** (from Step 1.3 in Generate mode):
- User choices override auto-detection for database and reverse proxy
- Auto-detected services are added unless user explicitly chose "None"

**Reverse proxy preference:** When a reverse proxy is needed, prefer **Angie** over Nginx. Angie is a fully compatible Nginx fork with active development, dynamic upstream management, and built-in Prometheus metrics. Reference: https://en.angie.software/angie/docs/configuration/

### 2.6 Exposed Ports

Check existing configs:

```
Grep: PORT|port|listen|EXPOSE
Read package.json → scripts.dev, scripts.start (look for --port)
```

### 2.7 Build Output

```
# Node.js
Read package.json → scripts.build, check for dist/, build/, .next/, out/
Read tsconfig.json → outDir

# Go
Glob: cmd/*/main.go → binary name from directory

# Python
Check for pyproject.toml [build-system]

# PHP
Check for public/ directory (web root)
```

### 2.8 Existing .env Structure

```
Glob: .env.example, .env.sample, .env.template
```

If found, read it to understand required environment variables. This drives `env_file`, `environment:` (computed values), and `.env.example` generation.

### Summary

Build `PROJECT_PROFILE`:
- `language`, `language_version`
- `framework`, `dev_command`, `prod_command`
- `package_manager`, `lock_file`
- `entry_point`, `build_output_dir`
- `port` (primary app port)
- `debug_port` (language-specific debug port)
- `services`: list of infrastructure deps (`postgres`, `redis`, `rabbitmq`, etc.)
- `has_build_step`: boolean
- `env_vars`: list from .env.example

---

## Step 3: Read Best Practices & Templates

```
Read skills/dockerize/references/BEST-PRACTICES.md
Read skills/dockerize/references/SECURITY-CHECKLIST.md
```

Select the Dockerfile template matching the language:

| Language | Template |
|----------|----------|
| Go | `templates/dockerfile-go` |
| Node.js | `templates/dockerfile-node` |
| Python | `templates/dockerfile-python` |
| PHP | `templates/dockerfile-php` |

Read selected template and the compose templates:

```
Read skills/dockerize/templates/dockerfile-<language>
Read skills/dockerize/templates/compose-base.yml
Read skills/dockerize/templates/compose-override-dev.yml
Read skills/dockerize/templates/compose-production.yml
Read skills/dockerize/templates/dockerignore
```

---

## Step 4: Generate Files (Generate Mode)

Generate files customized from the project profile and templates.

### 4.1 Generate Dockerfile

Using the language-specific template as a base:

**Customize:**
- Base image version **from the project**, not from template defaults:
  - Go: read `go` directive in `go.mod` → e.g. `go 1.24` → `golang:1.24-alpine`
  - Node.js: read `engines.node` in `package.json`, `.nvmrc`, or `.node-version` → e.g. `node:22-alpine`
  - Python: read `requires-python` in `pyproject.toml` or `.python-version` → e.g. `python:3.13-slim`
  - PHP: read `require.php` in `composer.json` → e.g. `php:8.4-fpm-alpine`
  - Rust: read `rust-version` in `Cargo.toml` or `rust-toolchain.toml` → e.g. `rust:1.82-slim`
- Entry point to match `entry_point`
- Build command to match project's actual build script
- Dev command with hot reload (framework-specific)
- Production command (framework-specific)
- Exposed ports (app port + debug port in dev stage)
- Package manager commands (npm ci vs pnpm install vs yarn install vs bun install)
- Lock file name in COPY

**Stages:**
1. `deps` — install production dependencies only
2. `builder` — install all dependencies + build
3. `development` — full dev environment with hot reload, debug port
4. `production` — minimal image, non-root user, only runtime artifacts

**Verify infrastructure image versions online:**

For infrastructure images (PostgreSQL, Redis, Angie, Nginx, etc.) — the version is NOT in project files. Before generating compose.yml, use `WebSearch` to check the current stable version of each infrastructure image:
- Search for `<service> docker official image latest version` (e.g. `angie docker image latest version`)
- Use the latest stable `major.minor` tag, never `:latest`
- Example: `docker.angie.software/angie:1.11-alpine`, `postgres:17-alpine`, `redis:7-alpine`

This prevents generating non-existent image tags that would break `docker compose pull`.

### 4.2 Generate compose.yml (Base)

The shared configuration:

- Top-level `name: ${COMPOSE_PROJECT_NAME}` — project name from `.env`, NOT from folder name
- `app` service with `build.target: production`, healthcheck, depends_on with `service_healthy`
- Infrastructure services based on `PROJECT_PROFILE.services` + `USER_INFRA_CHOICES`:
  - PostgreSQL / MySQL / MongoDB → with healthcheck, named volume
  - Redis / Memcached → with healthcheck, maxmemory config, named volume
  - RabbitMQ → with healthcheck, management UI port in dev
  - Angie / Nginx / Traefik → as reverse proxy with SSL termination config
  - Elasticsearch → with healthcheck, JVM memory, ulimits
  - MinIO → with healthcheck

**Reverse proxy (Angie/Nginx):**
- Image: `docker.angie.software/angie:<version>-alpine` (Angie) or `nginx:<version>-alpine` (Nginx) — verify current version online before using
- Volume-mount config: `./docker/angie/angie.conf:/etc/angie/angie.conf:ro`
- Healthcheck: `CMD wget --spider -q http://localhost/health || exit 1`
- Sits on `frontend` network, proxies to `app` on `backend` network
- In production: read_only, cap_add NET_BIND_SERVICE for port 80/443
- Named volumes for all data directories
- Separate `frontend` and `backend` networks

**Environment variable strategy — `env_file` over `environment`:**

Use `env_file: .env` on `app` service. Do NOT list every app variable in `environment:`.

Only use `environment:` for:
1. **Computed values** that compose assembles from parts: `DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}`
2. **Infrastructure image config** on their own services: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` on `db` service

Everything else (API keys, feature flags, app settings) — the app reads from `.env` directly via `env_file:`.

```yaml
# CORRECT
services:
  app:
    env_file: .env
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# WRONG — duplicating .env in compose, maintenance burden
services:
  app:
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-}
      TOKEN_TTL_DAYS: ${TOKEN_TTL_DAYS:-7}
      # ...20 more lines of the same
```

**Service inclusion is conditional** — only add services that were detected in Step 2.5.

### 4.3 Generate compose.override.yml (Development)

Development overrides:

- `build.target: development`
- Bind mount source code (`.:/app`) with anonymous volume for deps
- Expose all ports (app, debug, database, cache)
- `NODE_ENV=development` / `LOG_LEVEL=debug` etc.
- Dev command override
- Dev-only services (with profiles):
  - `mailpit` → if email sending detected (profile: `dev`)
- **No database admin UIs** (pgAdmin, Adminer) — use native GUI clients (TablePlus, DBeaver, DataGrip) via the exposed DB port instead. Admin UIs in compose add attack surface and unnecessary complexity.

**Hot-reload tool config check:**

If the dev stage uses a hot-reload tool, verify its config file exists and points to the correct entry point. Many tools assume the main file is in the project root — if it's not (e.g. `./cmd/server/main.go`), the tool will fail without a config.

| Stack | Tool | Config | Key setting |
|-------|------|--------|-------------|
| Go | air | `.air.toml` | `build.cmd` → path to main package |
| Node.js | nodemon | `nodemon.json` | `exec` / `watch` paths |

If the config file doesn't exist and the entry point is non-standard, generate it alongside the Docker files. If the config already exists, do not overwrite it.

### 4.4 Generate compose.production.yml (Hardened)

Production hardening overlay:

- Use pre-built image from registry (not `build:`)
- `read_only: true` on all services
- `security_opt: [no-new-privileges:true]`
- `cap_drop: [ALL]` with selective `cap_add` per service
- `user: "1001:1001"`
- `tmpfs` for `/tmp` with `noexec,nosuid,size=100m`
- Resource limits (CPU, memory, PIDs) — use reference recommendations
- Log rotation on every service (`max-size: 20m, max-file: 5`)
- `restart: unless-stopped`
- `backend` network with `internal: true`
- Sensitive values via `.env` file (gitignored) — NOT hardcoded in compose
- YAML anchors (`x-logging`, `x-security`) to reduce duplication
- **NO `ports:` on infrastructure services** (DB, Redis, RabbitMQ) — they communicate via Docker network only
- Only the reverse proxy (or app if no proxy) exposes ports `80`/`443` to the host
- If a port MUST be exposed, bind to localhost only: `127.0.0.1:5432:5432`
- NO debug ports (9229, 5005, etc.)
- NO dev tools

### 4.5 Generate .dockerignore

Use the template as base, add language-specific exclusions:

- Go: `bin/`, `*.exe`
- Node.js: `node_modules/`, `.next/`, `out/`
- Python: `__pycache__/`, `.venv/`, `*.pyc`, `.mypy_cache/`
- PHP: `vendor/`, `storage/`, `bootstrap/cache/`

### Quality Checks (Before Writing)

Verify generated content before passing to Step 6:

**Correctness:**
- [ ] Dockerfile has all 4 stages (deps, builder, development, production)
- [ ] Production stage uses non-root user
- [ ] Production stage uses minimal base image
- [ ] BuildKit cache mounts present for dependency installation
- [ ] compose.yml has healthchecks on every service
- [ ] compose.yml uses `depends_on` with `condition: service_healthy`
- [ ] compose.production.yml has security hardening on every service
- [ ] compose.production.yml has resource limits on every service
- [ ] compose.production.yml has log rotation on every service
- [ ] .dockerignore excludes `.git`, dependencies, `.env*`, Docker files

**Over-engineering check** (read `references/SECURITY-CHECKLIST.md` → "Over-Engineering Checklist"):
- [ ] No services added that the code doesn't import/use
- [ ] No reverse proxy for single-service apps with no SSL needs
- [ ] No deploy scripts if project deploys via CI/CD
- [ ] No backup scripts if using managed DB (RDS, Cloud SQL)
- [ ] No separate frontend/backend networks if there's only app + DB
- [ ] Complexity matches project size (solo → minimal, team → standard, production → full)

**Remove anything that fails the over-engineering check before writing.**

---

## Step 5: Audit & Enhance Existing Files (Enhance / Audit Modes)

When `MODE = "enhance"` or `MODE = "audit"`, analyze `EXISTING_CONTENT` against the security checklist and best practices.

**Enhance mode** (`MODE = "enhance"`): Local Docker exists but no production config. After auditing local files, create production configuration (compose.production.yml, deploy scripts, security hardening). Ask interactive questions about missing infrastructure (same as Step 1.3) before generating production files.

### 5.1 Dockerfile Audit

Read each section from `references/SECURITY-CHECKLIST.md` → "Dockerfile Security" and check:

- Image pinning (no `:latest`)
- Minimal base image
- Multi-stage build present
- Non-root user in final stage
- No secrets in ENV/ARG
- .dockerignore exists and is comprehensive
- BuildKit features used (cache mounts)
- HEALTHCHECK instruction present

### 5.2 Compose Security Audit

Read each section from `references/SECURITY-CHECKLIST.md` → "Compose Security" and check:

**For each service:**
- `read_only: true`?
- `security_opt: [no-new-privileges:true]`?
- `cap_drop: [ALL]`?
- `user:` specified?
- `tmpfs` for temp directories?
- Resource limits set?
- Healthcheck defined?
- Log rotation configured?
- Restart policy set?

**Network security:**
- Backend network `internal: true`?
- No `network_mode: host`?
- No Docker socket mounted?

**Secrets:**
- Sensitive values via `.env` (not hardcoded in compose)?
- `.env` in `.gitignore`?
- `.env.example` exists with placeholder values?

### 5.3 Gap Analysis

Compare existing compose against `PROJECT_PROFILE`:
- Services detected in code but missing from compose?
- .env variables referenced but no matching service?
- Dev override file exists?
- Production hardening file exists?

### 5.4 Audit Report

```
## Docker Security Audit

### Dockerfile
| Check | Status | Detail |
|-------|--------|--------|
| Pinned base image | ✅ | node:22.5-alpine |
| Multi-stage build | ✅ | 3 stages |
| Non-root user | ❌ | Running as root in final stage |
| No secrets in ENV | ✅ | |
| .dockerignore | ⚠️ | Missing: .env*, docker-compose* |
| Healthcheck | ❌ | No HEALTHCHECK instruction |

### compose.yml
| Service | read_only | no-new-privs | cap_drop | resources | healthcheck | logging |
|---------|-----------|-------------|----------|-----------|-------------|---------|
| app | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| db | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| redis | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Missing Infrastructure
- Redis detected in code but not in compose
- RabbitMQ connection string found but no service defined

### Recommendations
1. CRITICAL: Add non-root user to Dockerfile
2. CRITICAL: Create compose.production.yml with security hardening
3. HIGH: Add resource limits to all services
4. HIGH: Add log rotation to all services
5. MEDIUM: Add healthcheck to redis service
6. LOW: Update .dockerignore to exclude .env files
```

### 5.5 Fix Issues

```
AskUserQuestion: Audit found issues. What should we do?

Options:
1. Fix all — Apply all recommendations
2. Fix critical only — Fix security issues, skip improvements
3. Show details — Explain each issue before deciding
4. Export report — Save audit report to .ai-factory/docker-audit.md
```

**If fixing:**
- For Dockerfile issues → edit existing Dockerfile
- For missing compose.production.yml → generate it (Step 4.4)
- For missing services → add to existing compose
- For security hardening → add to compose.production.yml
- Preserve existing structure and naming conventions

### 5.6 Enhance Mode — Create Production Config

**Only for `MODE = "enhance"`** (local Docker exists, no production config):

After auditing and fixing local compose, proceed to generate missing production files:

1. **Ask infrastructure questions** (same as Step 1.3) for any services not yet in compose:
   - Database type if not already present
   - Reverse proxy (Angie preferred) if needed for production
   - Additional services

2. **Generate missing files:**
   - `compose.production.yml` → hardened overlay (Step 4.4)
   - `.dockerignore` → if missing (Step 4.5)
   - `.env.example` → if missing (Step 6.3)
   - Deploy scripts → (Step 8)

3. **Improve existing files:**
   - Add `COMPOSE_PROJECT_NAME` to compose.yml if missing
   - Add healthchecks to services missing them
   - Add `depends_on` with `condition: service_healthy`
   - Ensure logging to stdout/stderr in Dockerfile
   - Preserve existing structure and naming conventions

---

## Step 6: Write Files

### 6.0 File Organization

**Root directory** — only files Docker expects by convention:
- `Dockerfile` — CI/CD, Docker Hub, GitHub Actions look for it in root
- `compose.yml`, `compose.override.yml`, `compose.production.yml` — `docker compose` looks in root
- `.dockerignore` — must be in build context root

**`docker/` directory** — all service configs and supporting files:
```
docker/
├── angie/                    # Reverse proxy (if used)
│   ├── angie.conf
│   └── conf.d/
│       └── default.conf
├── postgres/                 # DB init scripts (if needed)
│   └── init.sql
├── php/                      # PHP-FPM config (if PHP project)
│   ├── php.ini
│   └── php-fpm.conf
└── redis/                    # Custom Redis config (if needed)
    └── redis.conf
```

**`deploy/` directory** — production ops scripts:
```
deploy/
└── scripts/
    ├── deploy.sh
    ├── update.sh
    ├── logs.sh
    ├── health-check.sh
    ├── rollback.sh
    └── backup.sh
```

**Rule:** Only create directories that are needed. If no reverse proxy → no `docker/angie/`. If no custom DB init → no `docker/postgres/`.

### 6.1 Generate Mode — Write All Files

**Always created (root):**

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage (dev + prod) |
| `compose.yml` | Base configuration with `COMPOSE_PROJECT_NAME` |
| `compose.override.yml` | Development overrides |
| `compose.production.yml` | Production hardened |
| `.dockerignore` | Build context exclusions |

**Conditionally created (`docker/`):**

| Directory | When |
|-----------|------|
| `docker/angie/` | Reverse proxy selected (Angie/Nginx) |
| `docker/postgres/` | Custom init scripts needed |
| `docker/php/` | PHP project (php.ini, php-fpm.conf) |
| `docker/redis/` | Custom Redis config needed |

**Always created:**

| Directory | Purpose |
|-----------|---------|
| `deploy/scripts/` | Production ops scripts (Step 8) |

Update compose volumes to reference `docker/` paths:
```yaml
# Example: Angie config mount
volumes:
  - ./docker/angie/angie.conf:/etc/angie/angie.conf:ro
  - ./docker/angie/conf.d:/etc/angie/conf.d:ro
```

### 6.2 Audit / Enhance Mode — Write Fixed/New Files

Only write files that were changed or created. Don't overwrite files that passed audit. Respect existing file structure — if project already uses a different layout (e.g. `nginx/` instead of `docker/nginx/`), follow their convention.

### 6.3 Create .env.example (if not exists)

If `.env.example` doesn't exist, generate one. **Single file with sections** — no separate `.env.prod.example`. Production-only vars are commented out.

Build from: compose variables + detected app env vars from `.env.example`/code.

```env
# === Project ===
COMPOSE_PROJECT_NAME=myapp

# === Database ===
DB_NAME=mydb
DB_USER=app
DB_PASSWORD=changeme
POSTGRES_VERSION=17

# === Application ===
LOG_LEVEL=debug                          # prod: warn

# (add project-specific vars detected in Step 2.8)

# === Production (uncomment for deploy) ===
# DOCKER_REGISTRY=ghcr.io
# DOCKER_IMAGE=myapp
# VERSION=latest
# ALLOWED_ORIGINS=https://myapp.com
# TRUSTED_PROXIES=172.16.0.0/12
```

Also ensure `.env` is in `.gitignore`.

---

## Step 7: Security Checklist (Always Runs)

Regardless of mode, run the production security checklist on the final compose.production.yml.

Read `references/SECURITY-CHECKLIST.md` and verify every item on the generated/existing production file.

Display a compact checklist result:

```
## Production Security Checklist

### Container Isolation
- [x] read_only filesystem on all services
- [x] no-new-privileges on all services
- [x] cap_drop ALL on all services
- [x] Non-root user on all services
- [x] tmpfs for temp directories

### Network & Ports
- [x] Backend network internal (no internet)
- [x] No host networking
- [x] No Docker socket mounted
- [x] No ports exposed on infrastructure services (DB, Redis)
- [x] Only proxy/app exposes 80/443

### Resources
- [x] Memory limits on all services
- [x] CPU limits on all services
- [x] PID limits on all services

### Secrets
- [x] Sensitive values in .env file (not hardcoded in compose)
- [x] .env file in .gitignore
- [x] .env.example exists (without real values)

### Health & Logging
- [x] Healthcheck on every service
- [x] Log rotation on every service
- [x] restart: unless-stopped on all services

### Images
- [x] All images version-pinned
- [x] Minimal base images used
- [ ] Image vulnerability scanning (recommend: add to CI)

Score: 20/21 checks passed
```

If any checks fail → offer to fix immediately (same as Step 5.5).

---

## Step 8: Generate Deploy Scripts (Production)

Generate production deployment scripts in `deploy/scripts/`. These scripts assume `compose.yml` + `compose.production.yml` and provide a complete ops toolkit.

### 8.1 Read Deploy Script Templates

```
Read skills/dockerize/templates/deploy.sh
Read skills/dockerize/templates/update.sh
Read skills/dockerize/templates/logs.sh
Read skills/dockerize/templates/health-check.sh
Read skills/dockerize/templates/rollback.sh
Read skills/dockerize/templates/backup.sh
```

### 8.2 Generate Scripts

Customize each template based on `PROJECT_PROFILE`:

| Script | Purpose | Customization |
|--------|---------|---------------|
| `deploy/scripts/deploy.sh` | Initial production deployment | Pre-flight checks, build, start, health verify |
| `deploy/scripts/update.sh` | Zero-downtime rolling update | Pre-backup, pull, build, recreate app, health check |
| `deploy/scripts/logs.sh` | Log aggregation utility | Service names from compose |
| `deploy/scripts/health-check.sh` | Full health diagnostics | App port, health endpoints |
| `deploy/scripts/rollback.sh` | Version rollback | Git-based version detection |
| `deploy/scripts/backup.sh` | Database backup with retention | DB_USER, DB_NAME from .env |

**Customization points for all scripts:**
- `COMPOSE_FILE` / `COMPOSE_PROD` paths (relative from `deploy/scripts/`)
- App port from `PROJECT_PROFILE.port`
- DB user/name from `.env.example`
- Service names from generated `compose.yml`
- Health check endpoint URL

**All scripts must:**
- Use `set -euo pipefail`
- Have colored logging (`log_info`, `log_success`, `log_error`)
- Calculate `PROJECT_ROOT` relative to script location
- Use `docker compose -f compose.yml -f compose.production.yml` pattern
- Include usage comments in header

### 8.3 Write Scripts

```
Write deploy/scripts/deploy.sh
Write deploy/scripts/update.sh
Write deploy/scripts/logs.sh
Write deploy/scripts/health-check.sh
Write deploy/scripts/rollback.sh
Write deploy/scripts/backup.sh
Bash: chmod +x deploy/scripts/*.sh
```

### 8.4 Skip Condition

If `MODE = "audit"` and deploy scripts already exist:
- Check existing scripts against templates for missing functionality
- Suggest improvements but don't overwrite

---

## Step 9: Summary & Follow-Up

### 9.1 Display Summary

```
## Docker Setup Complete

### Files Created/Updated
- Dockerfile (multi-stage: development + production)
- compose.yml (app + postgres + redis, COMPOSE_PROJECT_NAME from .env)
- compose.override.yml (dev: hot reload, debug ports, mailpit)
- compose.production.yml (hardened: read-only, non-root, resource limits, no infra ports)
- .dockerignore (38 exclusion rules)
- .env.example (with COMPOSE_PROJECT_NAME, DB credentials, app config)
- docker/angie/ (reverse proxy config, if needed)
- deploy/scripts/ (deploy, update, logs, health-check, rollback, backup)

### Quick Start
  # Development
  docker compose up

  # Development with email testing
  docker compose --profile dev up

  # Production (locally)
  docker compose -f compose.yml -f compose.production.yml up -d

  # Build production image
  docker build --target production -t myapp:latest .

### Services
| Service | Port (dev) | Port (prod) | Image |
|---------|------------|-------------|-------|
| app | 3000, 9229 | — | built locally |
| postgres | 5432 | — | postgres:17-alpine |
| redis | 6379 | — | redis:7-alpine |
| mailpit | 8025, 1025 | — | axllent/mailpit |
```

### 9.2 Suggest Follow-Up Skills

```
AskUserQuestion: Docker setup complete. What's next?

Options:
1. Build automation — Run /ai-factory.build-automation to add Docker targets to Makefile/Taskfile
2. Update docs — Run /ai-factory.docs to document the Docker setup
3. Both — Build automation first, then docs
4. Done — Skip follow-ups
```

**If build automation** → suggest invoking `/ai-factory.build-automation`
**If docs** → suggest invoking `/ai-factory.docs`
**If both** → suggest build-automation first, then docs
