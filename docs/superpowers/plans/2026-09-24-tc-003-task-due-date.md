# TC-003 Task Due Date Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-003: a new task is created with the due date that was entered.

**Architecture:** One more test in `tests/tasks/create-task.spec.ts`, next to TC-002 (the file the architecture plan assigns to TC-002, TC-003 and TC-007). It uses the existing fixtures only: `testData.createTask` creates the task and deletes it after the test, `api.tasks.get` reads it back, `accountTimezone` with `src/utils/dates.ts` gives the date, and `toMatchSchema(Schema.task)` checks both responses. No framework changes.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #5, `Test Cases for automation.md` (wave 1), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-003 A new task is created with the due date that was entered`, tags `@TC-003` and `@smoke`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/5' }`
- Every step is a `test.step()` with a readable name. Behaviour is checked first, then the schema (review finding on #18)
- Dates come from the **account timezone**, never from the runner clock (CI runs in UTC)
- Test data only through `testData`. Never run with `--reporter=...`
- TC-002 in the same file stays unchanged
- Commit `#5 ...`, branch `5-tc-003-task-due-date`, PR `Closes #5`

## Review Focus

1. **The date is only echoed, not stored:** the test reads the task back with `GET /tasks/{id}` and checks `due.date` there too.
2. **The date moves by a day because of timezones:** the entered date is a week ahead in the account timezone. The stored `due.date` must be exactly that `YYYY-MM-DD` string, so an off-by-one shift fails.
3. **A date-only due turns into a date-time:** `due.date` must be exactly the 10-character date, with no time part.
4. **The explicit date is treated as recurring:** `due.is_recurring` must be `false`.
5. **Midnight on the runner vs the account:** an explicit date a week ahead does not depend on what "today" is at the exact second, so no midnight guard is needed (unlike "tomorrow" in words).

---

### Task 1: TC-003 test

**Files:**
- Modify: `tests/tasks/create-task.spec.ts` (add TC-003 after TC-002, add the `dates` import)

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; the `accountTimezone` worker fixture (`string`, IANA zone); `addDays(date: string, days: number): string` and `todayIn(timeZone: string): string` from `src/utils/dates`; `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>`; `api.tasks.get(id: string): Promise<Task>`; `Task.due: Due | null` with `date: string` and `is_recurring: boolean`
- Produces: the TC-003 test. TC-007 will be added to the same file later

- [x] **Step 1: Write the test**

Add the import at the top:

```ts
import { addDays, todayIn } from '../../src/utils/dates';
```

Add after TC-002:

```ts
test(
  'TC-003 A new task is created with the due date that was entered',
  {
    tag: ['@TC-003', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/5' },
  },
  async ({ api, testData, accountTimezone }) => {
    // A week ahead in the account timezone, never from the runner clock (CI runs in UTC).
    const dueDate = addDays(todayIn(accountTimezone), 7);

    const created = await test.step('Create a task with the entered due date', async () => {
      const task = await testData.createTask({ due_date: dueDate });
      expect(task.due?.date).toBe(dueDate);
      expect(task).toMatchSchema(Schema.task);
      return task;
    });

    await test.step('Load the task again and check its due date', async () => {
      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.due?.date).toBe(dueDate);
      expect(loaded.due?.is_recurring).toBe(false);
      expect(loaded).toMatchSchema(Schema.task);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/tasks/create-task.spec.ts`
Expected: `2 passed` (TC-002 and TC-003)

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change the read-back assertion to `expect(loaded.due?.date).toBe(addDays(dueDate, 1));` and run `npx playwright test tests/tasks/create-task.spec.ts --grep @TC-003`.
Expected: `1 failed` with `Expected` one day later than `Received`. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`. Then a temporary, uncommitted `tests/tmp-leftovers.spec.ts`:

```ts
import { expect, test } from '../src/fixtures';

// Any task left by a local run. Can only raise a false alarm (another local run), never a false pass.
test('no local test tasks are left', async ({ api }) => {
  const leftovers = (await api.tasks.list()).filter(
    (t) => t.content.startsWith('autotest-') && t.content.includes('-local-'),
  );
  expect(leftovers).toEqual([]);
});
```

Run: `npx playwright test tests/tmp-leftovers.spec.ts` right after step 3 → `1 passed`, then `rm tests/tmp-leftovers.spec.ts`.

- [x] **Step 5: Smoke suite and full run**

Run: `npm run test:smoke` → `3 passed` (TC-001, TC-002, TC-003). `npx playwright test` → `3 passed`, 0 skipped.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [ ] **Step 7: Commit, push, PR, code review**

`git commit -m "#5 Add TC-003 task due date smoke test"`, push, PR `Closes #5` from the PR template, then Superpowers `requesting-code-review`. After the merge, check that #5 is closed (the board moves it to Done).
