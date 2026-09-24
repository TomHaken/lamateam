# Remove Test Placeholders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only implemented tests stay in `tests/`. Every `test.fixme()` placeholder from #19/#20 is removed.

**Architecture:** Delete code only. Spec files that are left without a test are deleted. The tickets stay open in the backlog, and each implementation creates its file again (the architecture plan table still says which file).

**Tech Stack:** Playwright Test, TypeScript.

**Spec:** issue #22

## Global Constraints

- Keep the implemented tests unchanged: TC-001 in `tests/projects/projects.spec.ts`, TC-002 in `tests/tasks/create-task.spec.ts` (from #21, by the team)
- Commit `#22 ...`, branch `22-remove-placeholders`, PR `Closes #22`

## Review Focus

1. **An implemented test is deleted with the placeholders:** TC-001 and TC-002 must stay byte for byte (`git diff` shows only removed placeholder blocks in those two files).
2. **Unused imports are left behind:** lint must pass without warnings.
3. **Docs still describe placeholders:** the README line about `test.fixme` placeholders is updated.
4. **A skeleton file with no test is kept:** Playwright would list 0 tests from it, so the files are deleted.

---

### Task 1: Remove placeholders

**Files:**
- Modify: `tests/projects/projects.spec.ts` (remove TC-006 placeholder), `tests/tasks/create-task.spec.ts` (remove TC-003, TC-007 placeholders), `README.md` (placeholder sentence)
- Delete: `tests/tasks/task-list.spec.ts`, `tests/tasks/due-dates.spec.ts`, `tests/tasks/reopen-task.spec.ts`, `tests/labels/labels.spec.ts`, `tests/comments/comments.spec.ts`, `tests/e2e/project-lifecycle.spec.ts`, `tests/negative/auth.spec.ts`, `tests/negative/task-validation.spec.ts`

- [x] **Step 1:** Delete the 8 files: `git rm <files above>`
- [x] **Step 2:** In the two kept files, delete each `test.fixme(...)` block and its placeholder comment
- [x] **Step 3:** In `README.md`, keep the annotation rule and drop the placeholder sentence: `- Every test links its ticket: annotation: { type: 'issue', description: '.../issues/<id>' }, shown in the HTML report.`
- [x] **Step 4:** `grep -rn fixme tests` → nothing. `npx playwright test --list` → `Total: 2 tests in 2 files`
- [x] **Step 5:** `npx playwright test` → `2 passed`, 0 skipped. `node scripts/check-no-token.mts` → OK
- [x] **Step 6:** `git diff main -- tests/projects/projects.spec.ts tests/tasks/create-task.spec.ts` shows only removed lines, and the TC-001/TC-002 blocks are untouched
- [x] **Step 7:** `npm run lint && npm run format:check && npm run typecheck` → clean
- [x] **Step 8:** Commit `#22 Remove the not implemented test placeholders`, PR `Closes #22`, Superpowers `requesting-code-review`
