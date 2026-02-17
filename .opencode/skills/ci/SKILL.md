---
name: ai-factory.ci
description: Generate CI/CD pipeline (GitHub Actions / GitLab CI) with linting, static analysis, tests, security. Use when user says "ci", "setup ci", "github actions", "gitlab ci", "pipeline".
argument-hint: [github|gitlab] [--enhance]
allowed-tools: Read Edit Glob Grep Write Bash(git *) AskUserQuestion
disable-model-invocation: true
metadata:
  author: AI Factory
  version: "1.0"
  category: ci
---

# CI — Pipeline Configuration Generator

Analyze a project and generate production-grade CI/CD pipeline configuration for GitHub Actions or GitLab CI. Generates separate jobs for linting, static analysis, tests, and security scanning — adapted to the project's language, framework, and existing tooling.

**Three modes based on what exists:**

| What exists | Mode | Action |
|-------------|------|--------|
| No CI config | `generate` | Create pipeline from scratch with interactive setup |
| CI config exists but incomplete | `enhance` | Audit & improve, add missing jobs |
| Full CI config | `audit` | Audit against best practices, fix gaps |

---

## Step 0: Load Project Context

Read the project description if available:

```
Read .ai-factory/DESCRIPTION.md
```

Store project context for later steps. If absent, Step 2 detects everything.

---

## Step 1: Detect Existing CI & Determine Mode

### 1.1 Scan for Existing CI Configuration

```
Glob: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, .circleci/config.yml, Jenkinsfile, .travis.yml, bitbucket-pipelines.yml
```

Classify found files:
- `HAS_GITHUB_ACTIONS`: `.github/workflows/` contains YAML files
- `HAS_GITLAB_CI`: `.gitlab-ci.yml` exists
- `HAS_OTHER_CI`: CircleCI, Jenkins, Travis, or Bitbucket detected

### 1.2 Determine Mode

**If `$ARGUMENTS` contains `--enhance`** -> set `MODE = "enhance"` regardless.

**Path A: No CI config exists** (`!HAS_GITHUB_ACTIONS && !HAS_GITLAB_CI && !HAS_OTHER_CI`):
- Set `MODE = "generate"`
- Proceed to **Step 1.3: Interactive Setup**

**Path B: CI config exists but is incomplete** (e.g., has only tests, no linting):
- Set `MODE = "enhance"`
- Read all existing CI files -> store as `EXISTING_CONTENT`
- Log: "Found existing CI configuration. Will analyze and add missing jobs."

**Path C: Full CI setup** (has linting + tests + static analysis):
- Set `MODE = "audit"`
- Read all existing CI files -> store as `EXISTING_CONTENT`
- Log: "Found complete CI setup. Will audit against best practices and fix gaps."

### 1.3 Interactive Setup (Generate Mode Only)

**Determine CI platform** from `$ARGUMENTS` or ask:

If `$ARGUMENTS` contains `github` -> set `PLATFORM = "github"`
If `$ARGUMENTS` contains `gitlab` -> set `PLATFORM = "gitlab"`

Otherwise:

```
AskUserQuestion: Which CI/CD platform do you use?

Options:
1. GitHub Actions (Recommended) — .github/workflows/*.yml
2. GitLab CI — .gitlab-ci.yml
```

**Ask about optional features:**

```
AskUserQuestion: Which additional CI features do you need?

Options (multiSelect):
1. Security scanning — Dependency audit, SAST
2. Coverage reporting — Upload test coverage
3. Matrix builds — Test across multiple language versions
4. None — Just linting, static analysis, and tests
```

Store choices:
- `PLATFORM`: github | gitlab
- `WANT_SECURITY`: boolean
- `WANT_COVERAGE`: boolean
- `WANT_MATRIX`: boolean

### 1.4 Read Existing Files (Enhance / Audit Modes)

Read all existing CI files and store as `EXISTING_CONTENT`:
- All `.github/workflows/*.yml` files
- `.gitlab-ci.yml`
- Any included GitLab CI files (check `include:` directives)

Determine `PLATFORM` from existing files.

---

## Step 2: Deep Project Analysis

Scan the project thoroughly — every decision in the generated pipeline depends on this profile.

### 2.1 Language & Runtime

| File | Language |
|------|----------|
| `composer.json` | PHP |
| `package.json` | Node.js / TypeScript |
| `pyproject.toml` / `setup.py` / `setup.cfg` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pom.xml` | Java (Maven) |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin (Gradle) |

### 2.2 Language Version

Detect the project's language version to use in CI:

| Language | Version Source | Example |
|----------|---------------|---------|
| PHP | `composer.json` -> `require.php` | `>=8.2` -> `['8.2', '8.3', '8.4']` |
| Node.js | `package.json` -> `engines.node`, `.nvmrc`, `.node-version` | `>=18` -> `[18, 20, 22]` |
| Python | `pyproject.toml` -> `requires-python`, `.python-version` | `>=3.11` -> `['3.11', '3.12', '3.13']` |
| Go | `go.mod` -> `go` directive | `go 1.23` -> `'1.23'` |
| Rust | `Cargo.toml` -> `rust-version`, `rust-toolchain.toml` | `1.82` -> `'1.82'` |
| Java | `pom.xml` -> `maven.compiler.source`, `build.gradle` -> `sourceCompatibility` | `17` -> `[17, 21]` |

For matrix builds: use the minimum version from the project config as the lowest, and include the latest stable version. For non-matrix builds: use the latest version that satisfies the constraint.

### 2.3 Package Manager & Lock File

| File | Package Manager | Install Command |
|------|-----------------|-----------------|
| `composer.lock` | Composer | `composer install --no-interaction --prefer-dist` |
| `bun.lockb` | Bun | `bun install --frozen-lockfile` |
| `pnpm-lock.yaml` | pnpm | `pnpm install --frozen-lockfile` |
| `yarn.lock` | Yarn | `yarn install --frozen-lockfile` |
| `package-lock.json` | npm | `npm ci` |
| `uv.lock` | uv | `uv sync --all-extras --dev` |
| `poetry.lock` | Poetry | `poetry install` |
| `Pipfile.lock` | Pipenv | `pipenv install --dev` |
| `requirements.txt` | pip | `pip install -r requirements.txt` |
| `go.sum` | Go modules | `go mod download` |
| `Cargo.lock` | Cargo | (built-in) |

Store: `PACKAGE_MANAGER`, `LOCK_FILE`, `INSTALL_CMD`.

### 2.4 Linters & Formatters

Detect existing tools by scanning config files and dependency files:

**PHP** (scan `composer.json` -> `require-dev`):

| Tool | Config File | CI Command |
|------|-------------|------------|
| PHP-CS-Fixer | `.php-cs-fixer.php`, `.php-cs-fixer.dist.php` | `vendor/bin/php-cs-fixer fix --dry-run --diff` |
| PHP_CodeSniffer | `phpcs.xml`, `phpcs.xml.dist` | `vendor/bin/phpcs` |
| Pint | `pint.json` | `vendor/bin/pint --test` |

**Node.js** (scan `package.json` -> `devDependencies`):

| Tool | Config File | CI Command |
|------|-------------|------------|
| ESLint | `eslint.config.*`, `.eslintrc.*` | `npx eslint .` |
| Prettier | `.prettierrc*`, `prettier.config.*` | `npx prettier --check .` |
| Biome | `biome.json`, `biome.jsonc` | `npx biome check .` |

**Python** (scan `pyproject.toml` -> `[tool.*]` sections, `requirements-dev.txt`):

| Tool | Config File | CI Command |
|------|-------------|------------|
| Ruff | `ruff.toml`, `pyproject.toml [tool.ruff]` | `ruff check .` / `ruff format --check .` |
| Black | `pyproject.toml [tool.black]` | `black --check .` |
| isort | `pyproject.toml [tool.isort]` | `isort --check-only .` |
| Flake8 | `.flake8`, `setup.cfg [flake8]` | `flake8 .` |
| Pylint | `.pylintrc`, `pyproject.toml [tool.pylint]` | `pylint src/` |

**Go:**

| Tool | Config File | CI Command |
|------|-------------|------------|
| golangci-lint | `.golangci.yml`, `.golangci.yaml` | `golangci-lint run` |

**Rust** (built-in):

| Tool | CI Command |
|------|------------|
| clippy | `cargo clippy --all-targets --all-features -- -D warnings` |
| rustfmt | `cargo fmt --all -- --check` |

**Java:**

| Tool | Config File | CI Command (Maven) | CI Command (Gradle) |
|------|-------------|-------------------|---------------------|
| Checkstyle | `checkstyle.xml` | `mvn checkstyle:check -B` | `./gradlew checkstyleMain` |
| PMD | `pmd-ruleset.xml` | `mvn pmd:check -B` | `./gradlew pmdMain` |
| SpotBugs | — | `mvn compile spotbugs:check -B` | `./gradlew spotbugsMain` |

### 2.5 Static Analysis Tools

**PHP** (scan `composer.json` -> `require-dev`):

| Tool | Config File | CI Command |
|------|-------------|------------|
| PHPStan | `phpstan.neon`, `phpstan.neon.dist` | `vendor/bin/phpstan analyse --memory-limit=512M` |
| Psalm | `psalm.xml`, `psalm.xml.dist` | `vendor/bin/psalm --no-cache` |
| Rector | `rector.php` | `vendor/bin/rector process --dry-run` |

**Python:**

| Tool | CI Command |
|------|------------|
| mypy | `mypy src/` |
| pyright | `pyright` |

**Node.js (TypeScript):**

| Tool | CI Command |
|------|------------|
| tsc | `npx tsc --noEmit` |

**Go:**
- `golangci-lint` includes static analysis (go vet, staticcheck, etc.)

**Rust:**
- `cargo clippy` covers static analysis

### 2.6 Test Framework

| Language | Detect By | Test Command |
|----------|-----------|--------------|
| PHP | `phpunit/phpunit` in composer.json | `vendor/bin/phpunit` |
| PHP | `pestphp/pest` in composer.json | `vendor/bin/pest --ci` |
| Node.js | `jest` in package.json | `npx jest --ci` |
| Node.js | `vitest` in package.json | `npx vitest run` |
| Python | `pytest` in pyproject.toml | `pytest -v` |
| Go | Built-in | `go test -race -v ./...` |
| Rust | Built-in | `cargo test --all-features` |
| Java | Built-in (JUnit) | `mvn verify -B` / `./gradlew test` |

Also detect coverage tools:

| Language | Coverage Flag |
|----------|--------------|
| PHP | `--coverage-clover coverage.xml` |
| Node.js (Jest) | `--coverage` |
| Node.js (Vitest) | `--coverage` |
| Python | `--cov=src --cov-report=xml` |
| Go | `-coverprofile=coverage.out -covermode=atomic` |
| Rust | `cargo tarpaulin --ignore-tests --out xml` |
| Java | `mvn jacoco:report` / `./gradlew jacocoTestReport` |

### 2.7 Security Audit Tools

| Language | Tool | CI Command |
|----------|------|------------|
| PHP | Composer audit | `composer audit` |
| Node.js | npm audit | `npm audit --audit-level=high` |
| Python | pip-audit | `pip-audit` or `uv run pip-audit` (dependency vulnerabilities) |
| Python | bandit | `bandit -r src/` or `uv run bandit -r src/` (code security) |
| Go | govulncheck | `govulncheck ./...` |
| Rust | cargo audit | `cargo audit` |
| Rust | cargo deny | `cargo deny check` |
| Java | OWASP | `mvn dependency-check:check -B` |

### 2.8 Services Detection

Check if tests require external services (database, Redis, etc.):

```
Grep in tests/: postgres|mysql|redis|mongo|rabbitmq|elasticsearch
Glob: docker-compose.test.yml, docker-compose.ci.yml
```

If services are needed, they will be configured in the CI pipeline as service containers.

### 2.9 Build Output

Does the project have a build step?

| Language | Has Build | Build Command |
|----------|-----------|---------------|
| Node.js (with `build` script) | Yes | `npm run build` / `pnpm build` |
| Go | Yes | `go build ./...` |
| Rust | Yes | `cargo build --release` |
| Java | Yes | `mvn package -DskipTests -B` / `./gradlew assemble` |
| PHP | Usually no | — |
| Python | Usually no | — |

### Summary

Build `PROJECT_PROFILE`:
- `language`, `language_version`, `language_versions` (for matrix)
- `package_manager`, `lock_file`, `install_cmd`
- `linters`: list of {name, command, config_file}
- `static_analyzers`: list of {name, command}
- `test_framework`, `test_cmd`, `coverage_cmd`
- `security_tools`: list of {name, command}
- `has_build_step`, `build_cmd`
- `has_typescript`: boolean (for typecheck job)
- `services_needed`: list of services for CI
- `source_dir`: main source directory (src/, app/, lib/)

---

## Step 3: Read Best Practices & Templates

```
Read skills/ci/references/BEST-PRACTICES.md
```

Select templates matching the platform and language:

**GitHub Actions:**

| Language | Template |
|----------|----------|
| PHP | `templates/github/php.yml` |
| Node.js | `templates/github/node.yml` |
| Python | `templates/github/python.yml` |
| Go | `templates/github/go.yml` |
| Rust | `templates/github/rust.yml` |
| Java | `templates/github/java.yml` |

**GitLab CI:**

| Language | Template |
|----------|----------|
| PHP | `templates/gitlab/php.yml` |
| Node.js | `templates/gitlab/node.yml` |
| Python | `templates/gitlab/python.yml` |
| Go | `templates/gitlab/go.yml` |
| Rust | `templates/gitlab/rust.yml` |
| Java | `templates/gitlab/java.yml` |

Read the selected template:

```
Read skills/ci/templates/<platform>/<language>.yml
```

---

## Step 4: Generate Pipeline (Generate Mode)

Using the `PROJECT_PROFILE`, best practices, and template as a base, generate a customized CI pipeline.

### 4.1 GitHub Actions Generation

**One workflow per concern** — each file has its own triggers, permissions, concurrency:

| File | Name | Jobs | When to create |
|------|------|------|----------------|
| `lint.yml` | Lint | code-style, static-analysis, rector | Linters or SA detected |
| `tests.yml` | Tests | tests (+ service containers) | Always |
| `build.yml` | Build | build | `has_build_step` |
| `security.yml` | Security | dependency-audit, dependency-review | `WANT_SECURITY` |

**Why one file per concern:**
- Each check is a **separate status check** in PR — instantly see what failed
- Independent triggers — security on schedule, tests on push/PR, build only after tests
- Independent permissions — security may need `security-events: write`
- Can disable/re-run one workflow without touching others
- Branch protection rules can require specific workflows (e.g. require `tests` but not `security`)

**When to keep single file:** Only for very small projects with just lint + tests (2 jobs). As soon as there are 3+ concerns — split.

**Every workflow gets the same header pattern:**

```yaml
name: <Name>

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
```

**Per-file job organization:**

**`lint.yml`** — all code quality checks in parallel:

| Job | Purpose | When to include |
|-----|---------|-----------------|
| `code-style` | Formatting (CS-Fixer, Prettier, Ruff format, rustfmt) | Formatter detected |
| `lint` | Linting (ESLint, Ruff check, Clippy, golangci-lint) | Linter detected |
| `static-analysis` | Type checking / SA (PHPStan, Psalm, mypy, tsc) | SA tools detected |
| `rector` | Rector dry-run (PHP only) | Rector detected |

All jobs run in parallel (no `needs`). If only one tool detected (e.g. Go with just golangci-lint) — single job in the file is fine.

**`tests.yml`** — test suite:

| Job | Purpose | When to include |
|-----|---------|-----------------|
| `tests` | Unit/integration tests | Always |
| `tests-<service>` | Tests requiring service containers | `services_needed` detected |

Matrix builds (multiple language versions) only in this file.

**`build.yml`** — build verification:

| Job | Purpose | Notes |
|-----|---------|-------|
| `build` | Verify compilation/bundling | Can depend on external workflow via `workflow_run` or just run independently |

**`security.yml`** — security scanning:

| Job | Purpose | Extra triggers |
|-----|---------|---------------|
| `dependency-audit` | Vulnerability scan | `schedule: cron '0 6 * * 1'` (weekly) |
| `dependency-review` | PR dependency diff | Only on `pull_request` |

**Per-job rules:**

1. Each job gets its own setup (checkout, language setup, cache, dependency install)
2. Use language-specific setup actions with built-in cache:
   - PHP: `shivammathur/setup-php@v2` with `tools:` parameter
   - Node.js: `actions/setup-node@v4` with `cache:` parameter
   - Python: `astral-sh/setup-uv@v5` (if uv) or `actions/setup-python@v5` (if pip)
   - Go: `actions/setup-go@v5` (auto-caches)
   - Rust: `dtolnay/rust-toolchain@stable` + `Swatinem/rust-cache@v2`
   - Java: `actions/setup-java@v4` with `cache:` parameter
3. Use `fail-fast: false` in matrix builds
4. Upload coverage as artifact when `WANT_COVERAGE`

**Matrix builds** (when `WANT_MATRIX`):

Only the `tests` job uses a matrix. Lint/SA jobs run on the latest version only.

```yaml
tests:
  name: Tests (${{ matrix.<language>-version }})
  strategy:
    fail-fast: false
    matrix:
      <language>-version: <language_versions from PROJECT_PROFILE>
```

**Combining linter jobs:**

If the project has both a formatter AND a linter from the same ecosystem, combine them into one job:
- PHP: `php-cs-fixer` check + other lint -> `code-style` job
- Node.js: `eslint` + `prettier` -> `lint` job. **Biome replaces BOTH ESLint and Prettier** — if Biome is detected, use only `npx biome check .` in a single `lint` job
- Python: `ruff check` + `ruff format --check` -> `lint` job (Ruff handles both)
- Rust: `cargo fmt` + `cargo clippy` -> can be separate (fmt is fast, clippy needs compilation)

**Do NOT combine** lint/SA with tests — they should fail independently with clear feedback.

**`security.yml` example** (when `WANT_SECURITY`):

```yaml
name: Security

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday

permissions:
  contents: read

jobs:
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Language-specific: composer audit / govulncheck / npm audit / cargo deny

  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

**`tests.yml` example:**

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: tests-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  tests:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Language-specific setup + test command
```

### 4.2 GitLab CI Generation

Output file: `.gitlab-ci.yml`

**Pipeline structure:**

```yaml
stages:
  - install
  - lint
  - test
  - build

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

default:
  interruptible: true
```

**Job organization:**

| Stage | Jobs | Notes |
|-------|------|-------|
| `install` | `install` | Install dependencies, cache + artifact for downstream |
| `lint` | `code-style`, `lint`, `static-analysis`, `rector` | All `needs: [install]`, run in parallel |
| `test` | `tests` | `needs: [install]` |
| `build` | `build` | `needs: [tests, lint, ...]` |
| `security` | `security` | `needs: [install]`, `allow_failure: true` |

**GitLab-specific features:**

1. **Cache strategy**: Use `policy: pull-push` on `install` job, `policy: pull` on all others
2. **Cache key**: Use `key: files:` with lock file for automatic invalidation
3. **Artifacts**: Pass `vendor/`/`node_modules/` via artifacts from install job (faster than cache for same-pipeline)
4. **Reports**: Use `artifacts.reports.junit` for test results, `artifacts.reports.codequality` for lint output
5. **DAG**: Use `needs:` keyword for parallel execution within stages
6. **Hidden jobs**: Use `.setup` anchors for shared `before_script` and cache config
7. **Coverage regex**: Add `coverage:` regex for test jobs

**PHP-specific GitLab patterns:**

```yaml
image: php:8.3-cli

variables:
  COMPOSER_HOME: $CI_PROJECT_DIR/.composer

.composer-setup:
  before_script:
    - apt-get update && apt-get install -y git unzip
    - curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
```

**Report formats for GitLab integration:**

| Tool | Flag | Report Type |
|------|------|-------------|
| PHPStan | `--error-format=gitlab` | `codequality` |
| ESLint | `--format json` | `codequality` |
| Ruff | `--output-format=gitlab` | `codequality` |
| golangci-lint | `--out-format code-climate` | `codequality` |
| PHPUnit | `--log-junit report.xml` | `junit` |
| Jest | `--reporters=jest-junit` | `junit` |
| pytest | `--junitxml=report.xml` | `junit` |

### 4.3 Service Containers

If `services_needed` is not empty, add service containers to the test job:

**GitHub Actions:**

```yaml
tests:
  services:
    postgres:
      image: postgres:17
      env:
        POSTGRES_DB: test
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
```

**GitLab CI:**

```yaml
tests:
  services:
    - name: postgres:17
      alias: db
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: "postgresql://test:test@db:5432/test"
```

### Quality Checks (Before Writing)

Verify generated pipeline before writing:

**Correctness:**
- [ ] Every job has checkout/setup/install steps
- [ ] Cache is configured for the correct lock file
- [ ] All commands match tools actually present in the project
- [ ] Matrix versions match the project's version constraints
- [ ] Service containers have health checks

**Best practices:**
- [ ] `concurrency` group set (GitHub Actions)
- [ ] `permissions: contents: read` set (GitHub Actions)
- [ ] `interruptible: true` set (GitLab CI)
- [ ] `workflow.rules` defined (GitLab CI)
- [ ] Jobs are parallel where possible (no unnecessary `needs`)
- [ ] `fail-fast: false` on matrix builds

**No over-engineering:**
- [ ] No jobs for tools not present in the project
- [ ] No matrix builds if the project only targets one version
- [ ] No security scanning unless requested or tools are installed
- [ ] No build job if the project has no build step

---

## Step 5: Enhance / Audit Existing Pipeline

When `MODE = "enhance"` or `MODE = "audit"`, analyze `EXISTING_CONTENT` against the project profile and best practices.

### 5.1 Gap Analysis

Compare existing pipeline against `PROJECT_PROFILE`:

**Missing jobs:**
- Linter installed but no lint job in CI?
- SA tool installed but no SA job?
- Tests exist but no test job?
- Security tools installed but no security job?

**Configuration issues:**
- No caching configured?
- No concurrency group (GitHub Actions)?
- Using deprecated actions (e.g., `actions-rs` instead of `dtolnay/rust-toolchain`)?
- Hardcoded language versions instead of variable/matrix?
- Missing `fail-fast: false` on matrix?
- Using `policy: pull-push` on all GitLab jobs instead of `pull` on non-install jobs?

**Missing features:**
- No coverage reporting when coverage tools are available?
- No JUnit/codequality report integration (GitLab)?
- No path filtering for monorepos?
- No `workflow_dispatch` trigger (GitHub Actions)?

### 5.2 Audit Report

```
## CI Pipeline Audit

### Jobs
| Check | Status | Detail |
|-------|--------|--------|
| Code style job | ✅ | php-cs-fixer dry-run |
| Static analysis | ❌ | PHPStan installed but no CI job |
| Rector check | ❌ | rector.php exists but no CI job |
| Tests | ✅ | PHPUnit with coverage |
| Security audit | ❌ | No dependency scanning |

### Configuration
| Check | Status | Detail |
|-------|--------|--------|
| Caching | ⚠️ | Missing composer cache |
| Concurrency | ❌ | No concurrency group |
| Permissions | ❌ | No explicit permissions |
| Matrix builds | ⚠️ | Only PHP 8.3, missing 8.2 |

### Recommendations
1. CRITICAL: Add PHPStan job — phpstan.neon exists
2. CRITICAL: Add Rector dry-run job — rector.php exists
3. HIGH: Add concurrency group to cancel redundant runs
4. HIGH: Add composer cache for faster installs
5. MEDIUM: Add security audit job (composer audit)
6. LOW: Add PHP 8.2 to test matrix
```

### 5.3 Fix Issues

```
AskUserQuestion: CI audit found issues. What should we do?

Options:
1. Fix all — Apply all recommendations
2. Fix critical only — Add missing jobs, skip configuration improvements
3. Show details — Explain each issue before deciding
```

**If fixing:**
- For missing jobs -> add new jobs to existing pipeline
- For configuration issues -> edit existing jobs
- Preserve existing structure, job names, and ordering conventions
- For GitHub Actions: edit in-place or add new workflow files
- For GitLab CI: edit `.gitlab-ci.yml` in-place

---

## Step 6: Write Files

### 6.1 Generate Mode — Write Pipeline

**GitHub Actions:**

```
Bash: mkdir -p .github/workflows
Write .github/workflows/lint.yml        # If linters/SA detected
Write .github/workflows/tests.yml       # Always
Write .github/workflows/build.yml       # If has_build_step
Write .github/workflows/security.yml    # If WANT_SECURITY
```

Only create files for detected concerns. If only lint + tests — two files. If the project is trivially small (single lint + single test job) — a single `ci.yml` is acceptable.

**GitLab CI:**

```
Write .gitlab-ci.yml
```

GitLab CI uses a single `.gitlab-ci.yml` — stages and DAG (`needs:`) handle separation.

### 6.2 Enhance / Audit Mode — Update Existing

Edit existing files using the `Edit` tool. Preserve the original structure and only add/modify what's needed.

---

## Step 7: Summary & Follow-Up

### 7.1 Display Summary

```
## CI Pipeline Generated

### Platform
GitHub Actions

### Files Created
| File | Purpose |
|------|---------|
| .github/workflows/lint.yml | code-style, static-analysis, rector |
| .github/workflows/tests.yml | phpunit (PHP 8.2, 8.3, 8.4) |
| .github/workflows/security.yml | composer audit |

### Features
- Composer caching via shivammathur/setup-php
- Concurrency groups (cancel redundant runs)
- Matrix builds for PHP 8.2, 8.3, 8.4
- Coverage upload as artifact

### Quick Start
  # Trigger manually
  gh workflow run ci.yml

  # View runs
  gh run list --workflow=ci.yml
```

### 7.2 Suggest Follow-Up Skills

```
AskUserQuestion: CI pipeline is ready. What's next?

Options:
1. Build automation — Run /ai-factory.build-automation to add CI targets to Makefile/Taskfile
2. Docker setup — Run /ai-factory.dockerize to containerize the project
3. Both
4. Done — Skip follow-ups
```
