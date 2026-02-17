---
name: ai-factory.feature
description: End-to-end feature development. Creates git branch, plans implementation via /ai-factory.task, then executes via /ai-factory.implement — full cycle without manual steps. Use when user says "new feature", "start feature", "implement feature", or "add feature".
argument-hint: [--parallel | --list | --cleanup <branch>] <feature description>
allowed-tools: Bash(git *) Bash(cd *) Bash(cp *) Bash(mkdir *) Bash(basename *) Read Write Skill AskUserQuestion
disable-model-invocation: true
---

# Feature - New Feature Workflow

Start a new feature by creating a branch and planning implementation.

## Workflow

### Step 0: Load Project Context

**FIRST:** Read `.ai-factory/DESCRIPTION.md` if it exists to understand:
- Tech stack (language, framework, database)
- Project architecture
- Existing conventions

This context informs branch naming, task planning, and implementation.

### Step 0.1: Ensure Git Repository

Check if git is initialized. If not, initialize it.

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || git init
```

### Step 0.2: Parse Flags

Extract flags from `$ARGUMENTS` before parsing the feature description:

```
--parallel  → Enable parallel worktree mode
--list      → Show all active worktrees with feature status
--cleanup <branch> → Remove worktree and optionally delete branch
```

**Parsing rules:**
- Strip `--parallel`, `--list`, `--cleanup <branch>` from `$ARGUMENTS`
- Remaining text becomes the feature description
- `--list` and `--cleanup` are standalone — they execute immediately and stop (do NOT continue to Step 1+)

**Examples:**
```
/ai-factory.feature --parallel Add user authentication
→ parallel=true, description="Add user authentication"

/ai-factory.feature --list
→ show all active worktrees, then STOP

/ai-factory.feature --cleanup feature/user-auth
→ remove worktree for that branch, then STOP

/ai-factory.feature Add user authentication
→ normal flow (unchanged), parallel=false
```

**If `--list` is present**, jump to the [--list Subcommand](#--list-subcommand) section.
**If `--cleanup` is present**, jump to the [--cleanup Subcommand](#--cleanup-subcommand) section.
**Otherwise**, continue to Step 1.

### Step 1: Parse Feature Description

From `$ARGUMENTS`, extract:
- Core functionality being added
- Key domain terms
- Type (feature, enhancement, fix, refactor)

### Step 2: Generate Branch Name

Create a descriptive branch name:

```
Format: <type>/<short-description>

Examples:
- feature/user-authentication
- feature/stripe-checkout
- feature/product-search
- fix/cart-total-calculation
- refactor/api-error-handling
```

**Rules:**
- Lowercase with hyphens
- Max 50 characters
- No special characters except hyphens
- Descriptive but concise

### Step 3: Ask About Testing

**IMPORTANT: Always ask the user before proceeding:**

```
Before we start, a few questions:

1. Should I write tests for this feature?
   - [ ] Yes, write tests
   - [ ] No, skip tests

2. Update documentation after implementation?
   - [ ] Yes, update docs (/ai-factory.docs)
   - [ ] No, skip docs

3. Any specific requirements or constraints?
```

Store the testing and documentation preferences - they will be passed to `/ai-factory.task` and `/ai-factory.implement`.

### Step 4 (Parallel): Create Worktree

**Only when `--parallel` flag is set.** If not set, skip to Step 4 (Normal).

This creates an isolated working directory so multiple features can be developed concurrently, each with its own Claude Code session.

#### 4a. Get project directory name

```bash
DIRNAME=$(basename "$(pwd)")
# e.g. "my-project"
```

#### 4b. Create branch on main

```bash
git branch <branch-name> main
```

If the branch already exists, ask the user whether to reuse it or pick a different name.

#### 4c. Create worktree

```bash
git worktree add ../${DIRNAME}-<branch-name-with-hyphens> <branch-name>
```

Convert the branch name for the directory: replace `/` with `-`.

**Example:**
```
Project dir: my-project
Branch: feature/user-auth
Worktree: ../my-project-feature-user-auth
```

#### 4d. Copy context files to worktree

Copy these files/directories so the worktree has full AI context:

```bash
WORKTREE="../${DIRNAME}-<branch-name-with-hyphens>"

# Project context
cp .ai-factory/DESCRIPTION.md "${WORKTREE}/.ai-factory/DESCRIPTION.md" 2>/dev/null

# Past lessons / patches
cp -r .ai-factory/patches/ "${WORKTREE}/.ai-factory/patches/" 2>/dev/null

# Claude Code skills + settings (required for Claude Code to work)
cp -r .claude/ "${WORKTREE}/.claude/" 2>/dev/null

# CLAUDE.md only if it exists and is NOT tracked by git
if [ -f CLAUDE.md ] && ! git ls-files --error-unmatch CLAUDE.md &>/dev/null; then
  cp CLAUDE.md "${WORKTREE}/CLAUDE.md"
fi
```

**Note:** Files tracked by git are already in the worktree via the checkout. Only copy untracked context files.

#### 4e. Create features directory in worktree

```bash
mkdir -p "${WORKTREE}/.ai-factory/features"
```

#### 4f. Switch to worktree and continue

```bash
cd "${WORKTREE}"
```

Display a brief confirmation:

```
✅ Parallel worktree created!

  Branch:    <branch-name>
  Directory: <worktree-path>

To manage worktrees later:
  /ai-factory.feature --list
  /ai-factory.feature --cleanup <branch-name>
```

**Continue to Step 5** — invoke `/ai-factory.task` in the worktree directory to start planning immediately.

### Step 4 (Normal): Create Branch

```bash
# Ensure we're on main/master and up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b <branch-name>
```

If branch already exists, ask user:
- Switch to existing branch?
- Create with different name?

### Step 5: Invoke Task Planning with Branch Context

**Plan file will be named after the branch:**

```
Branch: feature/user-authentication
Plan file: .ai-factory/features/feature-user-authentication.md (NOT .ai-factory/PLAN.md!)
```

Convert branch name to filename:
- Replace `/` with `-`
- Add `.md` extension

Call `/ai-factory.task` with explicit context:

```
/ai-factory.task $ARGUMENTS

CONTEXT FROM /ai-factory.feature:
- Plan file: .ai-factory/features/feature-user-authentication.md (use this name, NOT .ai-factory/PLAN.md)
- Testing: yes/no
- Logging: verbose/standard/minimal
```

**IMPORTANT:** Pass the exact plan filename to /ai-factory.task. This distinguishes feature-based work from direct /ai-factory.task calls.

Pass along:
- Full feature description
- **Exact plan file name** (based on branch, e.g., `.ai-factory/features/feature-user-authentication.md`)
- Testing preference
- Logging preference
- Any constraints

The plan file allows resuming work based on current git branch:
```bash
git branch --show-current  # → feature/user-authentication
# → Look for .ai-factory/features/feature-user-authentication.md
```

### Step 6: Next Action (depends on mode)

**Parallel mode (`--parallel`):** Automatically invoke `/ai-factory.implement` — the whole point of parallel is autonomous end-to-end execution in an isolated worktree.

```
/ai-factory.implement

CONTEXT FROM /ai-factory.feature:
- Plan file: .ai-factory/features/<branch-name>.md
- Testing: yes/no
- Logging: verbose/standard/minimal
- Docs: yes/no
```

**Normal mode:** STOP after planning. The user reviews the plan and decides when to implement.

```
Plan created! To start implementation:
/ai-factory.implement
```

### Context Cleanup

Context is heavy after branch creation and planning. All results are saved to the plan file — suggest freeing space:

```
AskUserQuestion: Free up context before continuing?

Options:
1. /clear — Full reset (recommended)
2. /compact — Compress history
3. Continue as is
```

## --list Subcommand

When `--list` is passed, show all active worktrees and their feature status. Then **STOP** — do not continue the normal workflow.

```bash
# Show all worktrees
git worktree list
```

Additionally, for each worktree path from the output:
1. Check if `<worktree>/.ai-factory/features/` contains any plan files
2. For each plan file found, show its name and whether it looks complete (has tasks) or is still in progress

**Output format:**
```
Active worktrees:

  /path/to/my-project          (main)        ← you are here
  /path/to/my-project-feature-user-auth  (feature/user-auth)  → Plan: feature-user-auth.md
  /path/to/my-project-fix-cart-bug       (fix/cart-bug)        → No plan yet
```

## --cleanup Subcommand

When `--cleanup <branch>` is passed, remove the worktree and optionally delete the branch. Then **STOP**.

```bash
DIRNAME=$(basename "$(pwd)")
BRANCH_DIR=$(echo "<branch>" | tr '/' '-')
WORKTREE="../${DIRNAME}-${BRANCH_DIR}"

# Remove the worktree
git worktree remove "${WORKTREE}"

# Only delete branch if it's been merged into main
git branch -d <branch>  # -d (not -D) will fail if unmerged, which is safe
```

If `git branch -d` fails because the branch is unmerged, inform the user:

```
⚠️  Branch <branch> has unmerged changes.
To force-delete: git branch -D <branch>
To merge first: git checkout main && git merge <branch>
```

If the worktree path doesn't exist, check `git worktree list` and suggest the correct path.

## Examples

**User:** `/ai-factory.feature Add user authentication with email/password and OAuth`

**Actions:**
1. Parse: authentication feature, email/password + OAuth
2. Generate branch: `feature/user-authentication`
3. Ask about testing preference
4. Create branch: `git checkout -b feature/user-authentication`
5. Call `/ai-factory.task` → creates plan, user reviews
6. STOP — user runs `/ai-factory.implement` when ready

**User:** `/ai-factory.feature --parallel Add Stripe checkout integration`

**Actions:**
1. Parse flags: `--parallel` found, description = "Add Stripe checkout integration"
2. Generate branch: `feature/stripe-checkout`
3. Ask about testing preference
4. Get dirname: `my-project`
5. Create branch: `git branch feature/stripe-checkout main`
6. Create worktree: `git worktree add ../my-project-feature-stripe-checkout feature/stripe-checkout`
7. Copy context files (.ai-factory/DESCRIPTION.md, .ai-factory/patches/, .claude/, CLAUDE.md if untracked)
8. `cd` into worktree
9. Call `/ai-factory.task` → creates plan, user reviews
10. Auto-invoke `/ai-factory.implement` → executes the plan (parallel = autonomous)

**User:** `/ai-factory.feature --list`

**Actions:**
1. Run `git worktree list`
2. Check each worktree for plan files in `.ai-factory/features/`
3. Display formatted list — STOP

**User:** `/ai-factory.feature --cleanup feature/stripe-checkout`

**Actions:**
1. Compute worktree path: `../my-project-feature-stripe-checkout`
2. Run `git worktree remove ../my-project-feature-stripe-checkout`
3. Run `git branch -d feature/stripe-checkout`
4. Report result — STOP

**User:** `/ai-factory.feature Fix cart not updating quantities correctly`

**Actions:**
1. Parse: bug fix, cart quantities
2. Generate branch: `fix/cart-quantity-update`
3. Ask about testing
4. Create branch
5. Call `/ai-factory.task` → creates plan, user reviews
6. STOP — user runs `/ai-factory.implement` when ready

## Important

- **Always ask about testing** before creating the plan
- **Never assume** testing preference - always ask explicitly
- Pass testing preference to downstream skills
- If git operations fail, report clearly and don't proceed
- Don't create branch if one with same purpose exists (ask first)

## CRITICAL: Logging Preference

When asking about testing, also ask about logging:

```
Before we start:

1. Should I write tests for this feature?
   - [ ] Yes, write tests
   - [ ] No, skip tests

2. Logging level for implementation:
   - [ ] Verbose (recommended) - detailed DEBUG logs for development
   - [ ] Standard - INFO level, key events only
   - [ ] Minimal - only WARN/ERROR

3. Update documentation after implementation?
   - [ ] Yes, update docs (/ai-factory.docs)
   - [ ] No, skip docs

4. Any specific requirements or constraints?
```

**Default to verbose logging.** AI-generated code benefits greatly from extensive logging because:
- Subtle bugs are common and hard to trace without logs
- Users can always remove logs later
- Missing logs during development wastes debugging time

**Logging must always be configurable:**
- Use LOG_LEVEL environment variable
- Implement log rotation for file-based logs
- Ensure production can run with minimal logs without code changes

Pass the logging and documentation preferences to `/ai-factory.task` along with testing preference.
