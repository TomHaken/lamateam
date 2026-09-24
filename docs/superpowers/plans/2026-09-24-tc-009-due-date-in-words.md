# TC-009 Due Date In Words Regression Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-009: a due date entered in words (`due_string: "tomorrow"`) lands on the same day as the same date entered explicitly (`due_date` of tomorrow).

**Architecture:** A new file `tests/tasks/due-dates.spec.ts` (the architecture plan assigns TC-009 and later TC-013 to it). It uses the existing fixtures only: `testData.createTask` creates both tasks and deletes them after the test, `api.tasks.get` reads them back, `accountTimezone` with `tomorrowIn` from `src/utils/dates.ts` gives the expected date, and `toMatchSchema(Schema.task)` checks the read-back tasks. No framework changes. A small spec-local helper keeps the test away from the minute around midnight in the account timezone.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #11, `Test Cases for automation.md` (wave 2), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-009 A due date entered in words lands on the same day as the same date entered explicitly`, tags `@TC-009` and `@regression`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/11' }`
- One `test.step()` per ticket step (two creates), plus one comparison step. Behaviour first, schema last
- Dates come from the **account timezone**, never from the runner clock (CI runs in UTC)
- `due_lang: 'en'` is sent with the words, so the account language cannot change how "tomorrow" is parsed
- Test data only through `testData`. Never run with `--reporter=...`
- Commit `#11 ...`, branch `11-tc-009-due-date-in-words`, PR `Closes #11`

## Review Focus

1. **The date is only echoed, not stored:** both tasks are read back with `GET /tasks/{id}` and the stored `due.date` is compared, not the create response.
2. **Both are wrong the same way:** comparing the two tasks with each other alone would pass if both were off by a day. Each `due.date` is also compared with `tomorrowIn(accountTimezone)`.
3. **Midnight in the account timezone:** if the account day changes between computing "tomorrow" and Todoist parsing the words, the test would fail for no reason. The test waits until a few seconds after midnight when it starts less than 60 s before it, and at the end asserts the account day did not change during the test, so a crossing gives a clear message instead of a vague date mismatch.
4. **The words become a date-time or a recurring due:** `due.date` must be exactly the 10-character date with no time, and `due.is_recurring` must be `false` for both.
5. **The words were not parsed at all:** the words task sends no date, only the words, so a `due` that is not `null` and equals tomorrow can only come from parsing them. (Todoist does not keep `due.string` as `tomorrow`; the first run showed it rewrites it to a date like `25 Sep`, so the test does not assert the string.)

---

### Task 1: TC-009 test

**Files:**
- Create: `tests/tasks/due-dates.spec.ts`
- Create: this plan

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; the `accountTimezone` worker fixture (`string`, IANA zone); `tomorrowIn(timeZone: string, now?: Date): string` and `todayIn(timeZone: string, now?: Date): string` from `src/utils/dates`; `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>` (`due_string`, `due_lang`, `due_date` exist in `CreateTaskPayload`); `api.tasks.get(id: string): Promise<Task>`; `Task.due: Due | null` with `date`, `string`, `is_recurring`
- Produces: the TC-009 test. TC-013 will be added to the same file later

- [x] **Step 1: Write the test**

```ts
import { expect, Schema, test } from '../../src/fixtures';
import { todayIn, tomorrowIn } from '../../src/utils/dates';

/** Seconds until the next midnight in the given timezone. */
function secondsToMidnight(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);
  return 24 * 60 * 60 - (part('hour') * 3600 + part('minute') * 60 + part('second'));
}

/**
 * Todoist resolves "tomorrow" in the account timezone. Close to midnight there, the day could
 * change between our date and Todoist's, so a test starting in the last minute waits until a few
 * seconds after midnight (and gets that much more time).
 */
async function waitIfCloseToMidnight(timeZone: string): Promise<void> {
  const untilMidnight = secondsToMidnight(timeZone);
  if (untilMidnight >= 60) return;
  const waitMs = (untilMidnight + 5) * 1000;
  test.setTimeout(test.info().timeout + waitMs);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

test(
  'TC-009 A due date entered in words lands on the same day as the same date entered explicitly',
  {
    tag: ['@TC-009', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/11' },
  },
  async ({ api, testData, accountTimezone }) => {
    // Tomorrow in the account timezone, never from the runner clock (CI runs in UTC).
    await waitIfCloseToMidnight(accountTimezone);
    const today = todayIn(accountTimezone);
    const tomorrow = tomorrowIn(accountTimezone);

    const inWords =
      await test.step('Create a task with the due date "tomorrow" in words', async () => {
        const task = await testData.createTask({ due_string: 'tomorrow', due_lang: 'en' });
        expect(task.due).not.toBeNull();
        return task;
      });

    const explicit =
      await test.step("Create a task with tomorrow's date entered explicitly", async () => {
        const task = await testData.createTask({ due_date: tomorrow });
        expect(task.due).not.toBeNull();
        return task;
      });

    await test.step('Load both tasks again and check they are due on the same day, tomorrow', async () => {
      const loadedInWords = await api.tasks.get(inWords.id);
      const loadedExplicit = await api.tasks.get(explicit.id);
      expect(todayIn(accountTimezone), 'The account day changed during the test').toBe(today);

      expect(loadedInWords.due?.date).toBe(loadedExplicit.due?.date);
      expect(loadedInWords.due?.date).toBe(tomorrow);
      expect(loadedExplicit.due?.date).toBe(tomorrow);
      expect(loadedInWords.due?.is_recurring).toBe(false);
      expect(loadedExplicit.due?.is_recurring).toBe(false);

      expect(loadedInWords).toMatchSchema(Schema.task);
      expect(loadedExplicit).toMatchSchema(Schema.task);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/tasks/due-dates.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change `expect(loadedInWords.due?.date).toBe(tomorrow);` to `.toBe(today);` and run the file.
Expected: `1 failed` with Expected today, Received tomorrow. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`. Then a temporary, uncommitted `tests/tc009-leftovers.spec.ts` that lists tasks and expects none whose content starts with `autotest-` and contains `-local-` → `1 passed`, then delete it. (Other agents run locally at the same time, so a hit is checked against our own task ids before calling it a leftover.)

- [x] **Step 5: Smoke suite and full run**

Run: `npm run test:smoke`, then `npx playwright test` → all passed.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [x] **Step 7: Commit, push, PR, code review**

`git commit -m "#11 Add TC-009 due date in words regression test"`, push, PR `Closes #11` from the PR template, then Superpowers `requesting-code-review`.
