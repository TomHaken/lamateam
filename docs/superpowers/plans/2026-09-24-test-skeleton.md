# Test Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every spec file from the architecture plan exists, with one `test.fixme()` per test case, so the report shows what is still to do.

**Architecture:** Placeholders only, no API calls and no framework changes. Each placeholder has the final test title, the `@TC-XXX` and suite tags, and an `issue` annotation with its ticket URL. Implementing a ticket later means replacing `test.fixme(...)` with `test(...)` and a body.

**Tech Stack:** Playwright Test, TypeScript.

**Spec:** issue #19, `docs/test-architecture-plan.md` ("Test files"), `brief.md` (tags and TC-014/015 split), `Test Cases for automation.md`

## Global Constraints

- Titles: `TC-XXX <text from Test Cases for automation.md>`. TC-014 and TC-015 are split into `TC-014a/b` and `TC-015a/b/c` (brief: one behaviour per test)
- Tags: `@TC-XXX` (for split cases the base ID too, `@TC-014`) and the suite tag: wave 1 `@smoke`, waves 2 and 4 `@regression`, wave 3 `@e2e`, wave 5 `@negative`
- Split titles:
  - `TC-014a With no access token the request fails with 401 and nothing is created`
  - `TC-014b With a malformed token the request fails with 401 and nothing is created`
  - `TC-015a A task with no text is rejected`
  - `TC-015b A task with a required field missing is rejected`
  - `TC-015c A task with an unreadable due date is rejected`
- `tests/projects/projects.spec.ts` is out of scope (PR #18). TC-010 is out of scope (brief)
- Commit `#19 ...`, branch `19-test-skeleton`, PR `Closes #19`

## Review Focus

1. **A placeholder runs as a passing test:** it must be `fixme` (reported as skipped), never an empty `test()` that passes and hides missing work.
2. **The hourly smoke goes green without testing anything:** wave 1 placeholders carry `@smoke`, so `--grep @smoke` finds them as skipped, not passed.
3. **Wrong file for a test case:** the mapping follows the architecture plan table exactly.
4. **Tag typo:** a later `--grep @TC-004` must find exactly one test.
5. **Lint or CI breaks on placeholders:** empty bodies and `fixme` must pass lint without warnings.

---

### Task 1: Spec files with placeholders

**Files (create):**

| File | Placeholders | Tags |
|------|--------------|------|
| `tests/tasks/create-task.spec.ts` | TC-002 (#4), TC-003 (#5), TC-007 (#9) | `@smoke`, `@smoke`, `@regression` |
| `tests/tasks/task-list.spec.ts` | TC-008 (#10) | `@regression` |
| `tests/tasks/due-dates.spec.ts` | TC-009 (#11), TC-013 (#14) | `@regression` |
| `tests/tasks/reopen-task.spec.ts` | TC-012 (#13) | `@regression` |
| `tests/labels/labels.spec.ts` | TC-004 (#6) | `@smoke` |
| `tests/comments/comments.spec.ts` | TC-005 (#7) | `@smoke` |
| `tests/e2e/project-lifecycle.spec.ts` | TC-011 (#12) | `@e2e` |
| `tests/negative/auth.spec.ts` | TC-014a, TC-014b (#15) | `@negative` |
| `tests/negative/task-validation.spec.ts` | TC-015a, TC-015b, TC-015c (#16) | `@negative` |

**Interfaces:**
- Consumes: `test`, `expect` from `src/fixtures`
- Produces: the files above. Each ticket replaces its placeholder

- [x] **Step 1: Write the files.** Each placeholder looks like this:

```ts
import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body,
// keep the title, tags and the `issue` annotation.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-002 A new task is created with the text that was entered',
  {
    tag: ['@TC-002', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/4' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
```

(An empty `() => {}` body fails lint: `no-empty-function` and `playwright/expect-expect`, found in step 5 and fixed this way.)

- [x] **Step 2: List them**

Run: `npx playwright test --list`
Expected: 15 tests in 9 files (TC-001 comes with PR #18)

- [x] **Step 3: Run everything and the smoke suite**

Run: `npx playwright test` and `npm run test:smoke`
Expected: all skipped, 0 passed, 0 failed. No API calls from the placeholders (the global setup still runs its stale-data cleanup)

- [x] **Step 4: Tags are unique**

Run: `npx playwright test --list --grep @TC-004` → 1 test, `--grep @TC-015` → 3 tests

- [x] **Step 5: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck`
Expected: no errors, no warnings

- [ ] **Step 6: Commit, push, PR, code review**

`git commit -m "#19 Add spec file skeleton for all test cases"`, PR with `Closes #19` following the PR template, then Superpowers `requesting-code-review`.
