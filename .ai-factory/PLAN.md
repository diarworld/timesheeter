# Implementation Plan: Load User's Tasks by Default in Task Selector

Created: 2026-02-20

## Settings

- Testing: yes
- Logging: standard
- Docs: no

## Overview

When creating a new track, the task selector is currently empty until the user starts typing. This feature adds functionality to load the current user's assigned tasks ordered by created date by default.

**Note:** User ID is already available via `self?.uid` from `useYandexUser`/`useJiraUser` hooks - no extra API call needed.

## Tasks

### Phase 1: Yandex Implementation

1. **[Task 1] Modify useYandexIssuesSearchOptions to accept userId and fetch user's assigned issues** ✅
   - Add `userId` parameter to the hook
   - When search is empty and userId exists, call `yandexIssueApi.useGetYandexIssuesQuery` with assignee filter
   - Sort results by Created date
   - LOG: Log when loading user's issues vs search

   Files: `src/entities/issue/yandex/lib/use-yandex-issues-search-options.ts`

2. **[Task 2] Update YandexIssuesSearchConnected to pass userId** ✅
   - Add `userId` prop to component
   - Pass it to `useYandexIssuesSearchOptions`

   Files: `src/entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected.tsx`

3. **[Task 3] Pass userId from YandexTimesheet to renderIssuesSearchConnected** ✅
   - Update `TrackModalCreate` to accept optional `userId` prop
   - Pass `userId` to `renderIssuesSearchConnected`
   - Pass `self?.uid` from `YandexTimesheet` to `TrackModalCreate`

   Files: `src/entities/track/yandex/ui/YandexTimesheet/YandexTimesheet.tsx`, `src/entities/track/common/ui/TrackModalCreate/TrackModalCreate.tsx`, `src/entities/track/common/ui/TrackFormCreate/TrackFormCreate.tsx`

4. **[Task 4] Write unit tests for Yandex issue search options hook**
   - Test that user's issues are loaded when search is empty
   - Test that user's issues are sorted by Created date
   - Test that search works normally when user types

   Files: `src/entities/issue/yandex/lib/__tests__/use-yandex-issues-search-options.test.ts`

### Phase 2: Jira Implementation

5. **[Task 5] Modify useJiraIssuesSearchOptions to accept userId and fetch user's assigned issues** ✅
   - Add `userId` parameter to the hook
   - When search is empty and userId exists, call `jiraIssueApi.useGetJiraIssuesQuery` with assignee filter
   - Sort results by Created date
   - LOG: Log when loading user's issues vs search

   Files: `src/entities/issue/jira/lib/use-jira-issues-search-options.ts`

6. **[Task 6] Update JiraIssuesSearchConnected to pass userId** ✅
   - Add `userId` prop to component
   - Pass it to `useJiraIssuesSearchOptions`

   Files: `src/entities/track/jira/ui/JiraIssuesSearchConnected/JiraIssuesSearchConnected.tsx`

7. **[Task 7] Pass userId from JiraTimesheet to TrackModalCreate** ⏸️ N/A
   - JiraTimesheet doesn't have TrackModalCreate integrated - track creation UI is missing for Jira
   - Skipping this task

8. **[Task 8] Write unit tests for Jira issue search options hook**
   - Test that user's issues are loaded when search is empty
   - Test that user's issues are sorted by Created date
   - Test that search works normally when user types

   Files: `src/entities/issue/jira/lib/__tests__/use-jira-issues-search-options.test.ts`

### Phase 3: Verification

9. **[Task 9] Verify both implementations work correctly**
   - Run existing tests to ensure no regressions
   - Verify that task selector shows user's issues on open

---

## Commit Plan

- **Commit 1** (after tasks 1-3): "feat: load user's Yandex tasks by default in task selector"
- **Commit 2** (after tasks 5-6): "feat: load user's Jira tasks by default in task selector"
