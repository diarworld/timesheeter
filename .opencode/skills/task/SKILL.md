---
name: ai-factory.task
description: Create a step-by-step implementation plan for a feature or task. Breaks down work into actionable tasks tracked via the task system. Use when user says "plan", "create tasks", "break down", or "make a plan for".
argument-hint: <task description>
allowed-tools: Read Write Glob Grep Bash(git *) TaskCreate TaskUpdate TaskList AskUserQuestion
disable-model-invocation: false
---

# Task - Implementation Planning

Create a detailed, actionable implementation plan broken into trackable tasks.

## Workflow

### Step 0: Load Project Context

**FIRST:** Read `.ai-factory/DESCRIPTION.md` if it exists to understand:
- Tech stack (language, framework, database, ORM)
- Project architecture
- Coding conventions
- Non-functional requirements (logging, error handling)

Use this context when:
- Exploring codebase (know what patterns to look for)
- Writing task descriptions (use correct technologies)
- Planning file structure (follow project conventions)

### Step 0.1: Ensure Git & Determine Plan File

**Check git repository:**
```bash
git rev-parse --is-inside-work-tree 2>/dev/null || git init
```

**Determine plan file name:**

1. **If called from `/ai-factory.feature`** - use the plan file name passed (e.g., `.ai-factory/features/feature-user-auth.md`)

2. **If called directly (`/ai-factory.task`)** - ALWAYS use `.ai-factory/PLAN.md`
   - Do NOT check current branch
   - Direct task planning = temporary plan in `.ai-factory/PLAN.md`

### Step 1: Analyze Requirements

From `$ARGUMENTS`, identify:
- Core functionality to implement
- Components/files that need changes
- Dependencies between tasks
- Edge cases to handle

### Step 2: Ask Clarifying Questions (if needed)

If requirements are ambiguous:
```
I need a few clarifications before creating the plan:

1. [Specific question about scope]
2. [Question about approach]
```

### Step 3: Check Testing Preference

If not already specified (from `/ai-factory.feature`), ask:

```
Should I include test tasks in the plan?
- [ ] Yes, include tests
- [ ] No, skip tests
```

**IMPORTANT:** If user says NO to tests:
- Do NOT create any test-related tasks
- Do NOT mention testing in task descriptions
- Do NOT add "write tests" steps

### Step 4: Explore Codebase

Before planning, understand the existing code:
- Find relevant files and patterns
- Identify where changes need to be made
- Note existing conventions to follow

### Step 5: Create Task Plan

Create tasks using `TaskCreate` with clear, actionable items:

```
## Implementation Plan: [Feature Name]

### Tasks:

1. **[Task Subject]**
   Description: [What needs to be done]
   Files: [Files to modify/create]

2. **[Task Subject]**
   Description: [What needs to be done]
   Files: [Files to modify/create]

...
```

**Task Guidelines:**
- Each task should be completable in one focused session
- Tasks should be ordered by dependency (do X before Y)
- Include file paths where changes will be made
- Be specific about what to implement, not vague

### Step 6: Set Up Dependencies

Use `TaskUpdate` to set `blockedBy` relationships:
- Task 2 blocked by Task 1 if it depends on Task 1's output
- Keep dependency chains logical

### Step 7: Save Plan to File

**Write the plan to the determined plan file:**

```markdown
# Implementation Plan: [Feature Name]

Branch: [current branch or "none"]
Created: [date]

## Settings
- Testing: yes/no
- Logging: verbose/standard/minimal
- Docs: yes/no

## Commit Plan
<!-- For plans with 5+ tasks, define commit checkpoints -->
- **Commit 1** (after tasks 1-3): "feat: add base models and types"
- **Commit 2** (after tasks 4-6): "feat: implement core service logic"
- **Commit 3** (after tasks 7-8): "feat: add API endpoints"

## Tasks

### Phase 1: Setup
- [ ] Task 1: [description]
- [ ] Task 2: [description]

### Phase 2: Core Implementation
- [ ] Task 3: [description] (depends on 1, 2)
- [ ] Task 4: [description]
<!-- 🔄 Commit checkpoint: tasks 1-4 -->

### Phase 3: Integration
- [ ] Task 5: [description] (depends on 3, 4)
<!-- 🔄 Commit checkpoint: tasks 5+ -->
```

**Commit Plan Rules:**
- **5+ tasks** → add commit checkpoints every 3-5 tasks
- **Less than 5 tasks** → single commit at the end, no commit plan needed
- Group logically related tasks into one commit
- Suggest meaningful commit messages following conventional commits

**Before saving, ensure directory exists:**
```bash
mkdir -p .ai-factory/features  # only when saving to features/
```

Save to: `.ai-factory/PLAN.md` (direct call) or `.ai-factory/features/<branch-name>.md` (from /ai-factory.feature)

### Step 8: Confirm Plan

Present to user:

```
Plan saved to: [filename].md

Ready to start? Use `/ai-factory.implement` to begin execution.
```

## Task Creation Format

```
TaskCreate:
  subject: "Implement user login endpoint"
  description: |
    Create POST /api/auth/login endpoint that:
    - Accepts email and password
    - Validates credentials against database
    - Returns JWT token on success
    - Returns 401 on invalid credentials

    Files: src/api/auth/login.ts, src/services/auth.ts
  activeForm: "Implementing login endpoint"
```

## Examples

### Example 1: API Feature (NO tests)

**Input:** `/ai-factory.task Add product search API`
**Testing:** No

**Plan:**
1. Create search service with filtering logic
2. Add GET /api/products/search endpoint
3. Implement query parameter parsing
4. Add pagination support
5. Update API documentation

*(No test tasks included)*

### Example 2: Full Feature (WITH tests)

**Input:** `/ai-factory.task Add product search API`
**Testing:** Yes

**Plan:**
1. Create search service with filtering logic
2. Add GET /api/products/search endpoint
3. Implement query parameter parsing
4. Add pagination support
5. Write unit tests for search service
6. Write integration tests for search endpoint
7. Update API documentation

## Important Rules

1. **NO tests if user said no** - Don't sneak in test tasks
2. **NO reports** - Don't create summary/report tasks at the end
3. **Actionable tasks** - Each task should have clear deliverable
4. **Right granularity** - Not too big (overwhelming), not too small (noise)
5. **Dependencies matter** - Order tasks so they can be done sequentially
6. **Include file paths** - Help implementer know where to work
7. **Commit checkpoints for large plans** - 5+ tasks need commit plan with checkpoints every 3-5 tasks
8. **.ai-factory/PLAN.md for direct calls** - Always use `.ai-factory/PLAN.md` when called directly, branch-named files only from `/ai-factory.feature`

## CRITICAL: Logging in Task Descriptions

**Every task description MUST include logging requirements.** AI-generated code often has subtle bugs - verbose logging is essential for debugging.

When writing task descriptions, include:
- What to log (inputs, outputs, state changes, errors)
- Log format recommendations (structured JSON when possible)
- Key checkpoints where logs are critical

### Example Task with Logging

```
TaskCreate:
  subject: "Implement order processing service"
  description: |
    Create OrderService with processOrder method that:
    - Validates order data
    - Calculates totals with tax
    - Submits to payment gateway
    - Returns confirmation

    LOGGING REQUIREMENTS:
    - Log function entry with order ID and item count
    - Log validation result (pass/fail with reasons)
    - Log payment gateway request and response
    - Log any errors with full context (order state, error details)
    - Use format: [ServiceName.method] message {data}
    - Use log levels (DEBUG/INFO/WARN/ERROR)
    - Make logs configurable via LOG_LEVEL env var

    Files: src/services/order.ts
  activeForm: "Implementing order service"
```

### Configurable Logging

Task descriptions should specify that logs must be:
- **Level-based** - DEBUG for verbose, INFO for important events, ERROR for failures
- **Environment-controlled** - LOG_LEVEL or DEBUG env variable
- **Rotation-aware** - for file logs, mention rotation requirements
- **Production-safe** - can be reduced without code changes

**DO NOT create tasks without logging instructions - this leads to hard-to-debug implementations.**

## After Planning

Tell user:
```
Plan created with [N] tasks.
Plan file: [filename].md

To start implementation, run:
/ai-factory.implement

To view tasks:
/tasks (or use TaskList)
```

### Context Cleanup

Context is heavy after planning. All results are saved to the plan file — suggest freeing space:

```
AskUserQuestion: Free up context before continuing?

Options:
1. /clear — Full reset (recommended)
2. /compact — Compress history
3. Continue as is
```

## Plan File Handling

**`.ai-factory/PLAN.md`** (direct `/ai-factory.task` call):
- Temporary plan for quick tasks
- After completion, `/ai-factory.implement` will ask to delete it
- Not tied to any branch

**Branch-named file** (from `/ai-factory.feature`):
- Permanent documentation of feature work
- `/ai-factory.implement` will NOT suggest deletion
- User decides whether to keep or delete before merge
