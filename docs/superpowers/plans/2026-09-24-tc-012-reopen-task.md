# TC-012 Reopen Task Regression Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-012: a task ticked off by mistake can be put back among the open ones, and it is the same task, not a new one.

**Architecture:** A new file `tests/tasks/reopen-task.spec.ts` (the file the architecture plan assigns to TC-012). It uses the existing fixtures only: `testData.createTask` creates the task and deletes it after the test, `api.tasks.close` / `api.tasks.reopen` change its state, `api.tasks.get` and `api.tasks.list({ project_id })` read it back, and `toMatchSchema(Schema.task)` checks the read-back response last. No framework changes.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #13, `Test Cases for automation.md` (wave 4), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-012 A task ticked off by mistake can be put back among the open ones, and it is the same task, not a new one`, tags `@TC-012` and `@regression`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/13' }`
- One `test.step()` per ticket step (close, reopen, read back and list). Behaviour first, schema last
- Test data only through `testData`. Never run with `--reporter=...`
- The account is shared with other parallel runs: list assertions look only at items with our task id or our unique content, never at the length or content of the whole list
- No dates involved, so no timezone handling is needed
- Commit `#13 ...`, branch `13-tc-012-reopen-task`, PR `Closes #13`

## Review Focus

1. **Reopen creates a copy instead of restoring the task:** after reopening, `GET /tasks/{id}` with the original id returns the task, and in the open list of its project exactly one task carries our unique content, and its id is the original id.
2. **Close silently does nothing (then reopen proves nothing):** after closing, the task must be missing from the open list and `GET` must report `checked: true`. Only then is it reopened.
3. **Reopen answers 2xx but the task stays completed:** after reopening, `GET` must report `checked: false` and `completed_at: null`.
4. **Content is lost or changed on the way:** the read-back `content` must equal the entered content (not the create response).
5. **Shared account, other agents' data in the list:** list checks filter by our id / unique content, so parallel runs neither break nor fake a pass.

---

### Task 1: TC-012 test

**Files:**
- Create: `tests/tasks/reopen-task.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; `uniqueName(kind: string): string` from `src/data/runId`; `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>`; `api.tasks.close(id: string): Promise<void>`; `api.tasks.reopen(id: string): Promise<void>`; `api.tasks.get(id: string): Promise<Task>`; `api.tasks.list(query?: TaskListQuery): Promise<Task[]>` (active tasks only, `project_id` filter); `Task.checked: boolean`, `Task.completed_at: string | null`
- Produces: the TC-012 test

- [x] **Step 1: Write the test**

```ts
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-012 A task ticked off by mistake can be put back among the open ones, and it is the same task, not a new one',
  {
    tag: ['@TC-012', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/13' },
  },
  async ({ api, testData }) => {
    const content = uniqueName('task');
    const task = await testData.createTask({ content });

    // The account is shared with parallel runs: only look at list items that are ours.
    const openTasksWithOurContent = async (): Promise<string[]> =>
      (await api.tasks.list({ project_id: task.project_id }))
        .filter((open) => open.content === content)
        .map((open) => open.id);

    await test.step('Close the task', async () => {
      await api.tasks.close(task.id);
      const closed = await api.tasks.get(task.id);
      expect(closed.checked).toBe(true);
      expect(await openTasksWithOurContent()).toEqual([]);
    });

    await test.step('Reopen the task', async () => {
      await api.tasks.reopen(task.id);
    });

    await test.step('Read the task back and find it in the open task list', async () => {
      const reopened = await api.tasks.get(task.id);
      expect(reopened.id).toBe(task.id);
      expect(reopened.content).toBe(content);
      expect(reopened.checked).toBe(false);
      expect(reopened.completed_at).toBeNull();

      // Exactly one open task with our content, and it is the original one, not a copy.
      expect(await openTasksWithOurContent()).toEqual([task.id]);
      expect(reopened).toMatchSchema(Schema.task);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `AUTOTEST_RUN_ID=<stamp>-local-tc012 npx playwright test tests/tasks/reopen-task.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change `expect(reopened.checked).toBe(false);` to `toBe(true)` and run again.
Expected: `1 failed` with `Expected: true`, `Received: false`. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`. Then a temporary, uncommitted `tests/tc012-leftovers.spec.ts` that lists open tasks and expects none whose content starts with `autotest-<our run id>` (the `-local-tc012` run id, so other agents' data is ignored). Run it → `1 passed`, then delete it.

- [x] **Step 5: Regression file and smoke suite**

Run: `npm run test:smoke` → all passed.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [x] **Step 7: Commit, push, PR, code review**

`git commit -m "#13 Add TC-012 reopen task regression test"`, push, PR `Closes #13` from the PR template, then Superpowers `requesting-code-review`.
