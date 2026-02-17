# Implementation Plan: Issue Summary Report for Team

Branch: none
Created: 2026-02-17

## Settings

- Testing: yes
- Logging: standard
- Docs: no

## Overview

Add a new "Issue Summary" report to the Reports tab. The report displays a table where:

- **Rows**: Team issues (issue keys with summaries)
- **Columns**: Team members (people)
- **Cell values**: Time logged by each person on each issue

This complements the existing "Time by Day" report which shows users vs days.

## Commit Plan

- **Commit 1** (after tasks 1-3): "feat: add report type selector and data transformation"
- **Commit 2** (after tasks 4-6): "feat: implement IssueSummaryTable component"
- **Commit 3** (after task 7): "feat: add tests for issue summary report"

## Tasks

### Phase 1: Data & UI Foundation

- [x] **Task 1**: Add report type selector to Reports tab header
  - Add Segmented or Radio component to switch between "Time by Day" and "Issue Summary" reports
  - Persist selection in component state
  - Files: `src/entities/track/yandex/ui/YandexTimesheet/YandexTimesheet.tsx`

- [x] **Task 2**: Create data transformation utility for issue grouping
  - Create function to group tracks by issueKey
  - Calculate total duration per issue per user
  - Return structured data for table rendering
  - LOGGING: Log input track count, grouped issue count, any empty/null duration values
  - Files: `src/entities/track/common/lib/transform-tracks-by-issue.ts` (new)

- [ ] **Task 3**: Add localization keys for new report
  - Add keys: report.issueSummary, report.timeByDay, report.issue, report.totalTime, report.noIssues
  - Files: `public/local/api/locale-en.json`, `public/local/api/locale-ru.json`
  <!-- 🔄 Commit checkpoint: tasks 1-3 -->

### Phase 2: Component Implementation

- [ ] **Task 4**: Create IssueSummaryTable component
  - Build table with issues as rows, team members as columns
  - Show duration per issue per user, with total per issue
  - Include sorting by issue key or total time
  - Add link to issue in Yandex Tracker
  - Files: `src/entities/track/yandex/ui/YandexTimesheet/IssueSummaryTable.tsx` (new)

- [ ] **Task 5**: Create IssueSummaryTable styles
  - Match existing ReportsTable styling
  - Support dark/light mode
  - Files: `src/entities/track/yandex/ui/YandexTimesheet/IssueSummaryTable.module.scss` (new)

- [ ] **Task 6**: Integrate IssueSummaryTable in YandexTimesheet
  - Conditionally render based on report type selection
  - Pass transformed data to component
  - Handle loading state
  - Files: `src/entities/track/yandex/ui/YandexTimesheet/YandexTimesheet.tsx`
  <!-- 🔄 Commit checkpoint: tasks 4-6 -->

### Phase 3: Testing

- [ ] **Task 7**: Write unit tests for track transformation
  - Test grouping by issueKey
  - Test duration calculation
  - Test handling of empty tracks
  - Files: `src/entities/track/common/lib/transform-tracks-by-issue.test.ts` (new)
