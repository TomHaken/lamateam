# TC-008 Project Task List Regression Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-008: a project's task list contains only the tasks of that project, nothing from elsewhere.

**Architecture:** New file `tests/tasks/task-list.spec.ts`, the file the architecture plan assigns to TC-008 (it does not exist yet). Existing fixtures only: `testData.createProject` and `testData.createTask` create two projects with their own tasks and delete them after the test, `api.tasks.list({ project_id })` reads the list across all pages (`listAll` follows `next_cursor`), `toMatchSchema(Schema.task)` checks every item. No framework changes.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #10, `Test Cases for automation.md` (wave 2), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-008 A project's task list contains only the tasks of that project, nothing from elsewhere`, tags `@TC-008` and `@regression`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/10' }`
- Every step is a `test.step()` with a readable name. Behaviour first, schema last
- Test data only through `testData`. The account is shared with other runs and agents, so assertions only look at the two new projects, never at the whole account
- Never run with `--reporter=...`
- Commit `#10 ...`, branch `10-tc-008-project-task-list`, PR `Closes #10`

## Review Focus

1. **Filter ignored, list returns everything:** if `project_id` were ignored, the list would contain B's tasks and every other task on the shared account. The exact id set comparison with A's three tasks fails on any extra item, and a separate check, which runs first so it fails with a short message, says no B task is in the list.
2. **A task of A is missing (for example only the first page is read):** the exact id set comparison fails on a missing item. `api.tasks.list` uses `listAll`, which follows `next_cursor`.
3. **B's absence proves nothing because B's tasks never landed in B:** a guard step lists project B and expects exactly B's two tasks, so "no B task in A" is a real check.
4. **Items claim the wrong project:** every listed item must have `project_id === projectA.id`.
5. **The list returns the right ids with wrong content:** the listed contents are compared with the entered texts (not with the create responses), and each item is checked against `Schema.task` last.

---

### Task 1: TC-008 test

**Files:**

- Create: `tests/tasks/task-list.spec.ts`

**Interfaces:**

- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; `uniqueName(kind: string): string` from `src/data/runId`; `Task` from `src/clients`; `testData.createProject(overrides?): Promise<Project>`; `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>`; `api.tasks.list(query?: TaskListQuery): Promise<Task[]>`; `Task.id`, `Task.project_id`, `Task.content`
- Produces: the TC-008 test

- [x] **Step 1: Write the test**

```ts
import type { Task } from '../../src/clients';
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

/** Sorted ids, so the comparison does not depend on the order the API returns. */
function idsOf(tasks: readonly Task[]): string[] {
  return tasks.map((task) => task.id).sort();
}

test(
  "TC-008 A project's task list contains only the tasks of that project, nothing from elsewhere",
  {
    tag: ['@TC-008', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/10' },
  },
  async ({ api, testData }) => {
    const contentsA = [uniqueName('task-a'), uniqueName('task-a'), uniqueName('task-a')];
    const contentsB = [uniqueName('task-b'), uniqueName('task-b')];

    const { projectA, projectB, tasksA, tasksB } =
      await test.step('Create project A with three tasks and project B with two tasks', async () => {
        const projectA = await testData.createProject();
        const projectB = await testData.createProject();
        const tasksA: Task[] = [];
        for (const content of contentsA) {
          tasksA.push(await testData.createTask({ content, project_id: projectA.id }));
        }
        const tasksB: Task[] = [];
        for (const content of contentsB) {
          tasksB.push(await testData.createTask({ content, project_id: projectB.id }));
        }
        return { projectA, projectB, tasksA, tasksB };
      });

    // Guard: B's tasks really are in B, so "no B task in A's list" below is not true by accident.
    await test.step('Check that project B lists exactly its own two tasks', async () => {
      const listedB = await api.tasks.list({ project_id: projectB.id });
      expect(idsOf(listedB)).toEqual(idsOf(tasksB));
    });

    await test.step('List the tasks of project A (all pages)', async () => {
      const listedA = await api.tasks.list({ project_id: projectA.id });

      // Cheap, specific checks first: if the filter is ignored, these fail with a short message
      // instead of a diff of every active task on the shared account.
      const idsB = new Set(tasksB.map((task) => task.id));
      expect(
        listedA.filter((task) => idsB.has(task.id)).map((task) => task.content),
        "project B's tasks in project A's list",
      ).toEqual([]);
      for (const task of listedA) {
        expect(task.project_id, `project_id of listed task ${task.id}`).toBe(projectA.id);
      }

      // Project A is new and only this test writes to it, so the list must be exactly its tasks.
      expect(idsOf(listedA)).toEqual(idsOf(tasksA));
      // Compared with the entered texts, not with the create responses.
      expect(listedA.map((task) => task.content).sort()).toEqual([...contentsA].sort());

      for (const task of listedA) {
        expect(task, `listed task ${task.id}`).toMatchSchema(Schema.task);
      }
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/tasks/task-list.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change the list step's exact id assertion to `expect(idsOf(listedA)).toEqual(idsOf([...tasksA, ...tasksB]));` and run `npx playwright test tests/tasks/task-list.spec.ts`.
Expected: `1 failed` with Expected listing five ids and Received three. Restore the line.

After code review (the assertions were reordered so the cheap, specific checks come first), a second mutation simulates the risk itself: `api.tasks.list()` without `project_id`. Expected: `1 failed` on `project B's tasks in project A's list` with B's two task names in Received. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`.

Other agents run local tests on the same account at the same time, so a plain `-local-` filter would raise false alarms. The runs in steps 2 and 3 therefore set their own run id, `AUTOTEST_RUN_ID=<UTC stamp>-local-tc008` (the stamp format keeps `parseRunTimestamp` working), and a temporary, uncommitted `tests/tc008-leftovers.spec.ts` looks only for that marker:

```ts
import { expect, test } from '../src/fixtures';

test('no TC-008 local test data is left', async ({ api }) => {
  const mine = (name: string) => name.startsWith('autotest-') && name.includes('-local-tc008-');
  expect((await api.projects.list()).filter((p) => mine(p.name))).toEqual([]);
  expect((await api.tasks.list()).filter((t) => mine(t.content))).toEqual([]);
});
```

Run it after step 3 → `1 passed`, then `rm tests/tc008-leftovers.spec.ts`.

- [x] **Step 5: Full run**

Run: `npx playwright test` → all passed.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [x] **Step 7: Commit, push, PR, code review**

`git commit -m "#10 Add TC-008 project task list regression test"`, push, PR `Closes #10` from the PR template, then Superpowers `requesting-code-review`.
