# TC-011 Project Lifecycle E2E Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-011: a project from empty to done: three tasks, two ticked off, one still open at the end.

**Architecture:** A new file `tests/e2e/project-lifecycle.spec.ts` (the file the architecture plan assigns to TC-011; it does not exist yet). It uses the existing fixtures only: `testData.createProject` and `testData.createTask` create the data and delete it after the test, `api.tasks.close` closes tasks, `api.tasks.get` and `api.tasks.list({ project_id })` read back, and `toMatchSchema(Schema.task)` checks the remaining task. No framework changes.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #12, `Test Cases for automation.md` (wave 3), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-011 A project from empty to done: three tasks, two ticked off, one still open at the end`, tags `@TC-011` and `@e2e`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/12' }`
- One `test.step()` per ticket step, plus one for the precondition (empty project). Behaviour first, schema last
- The account is shared with other runs at the same time: every list is filtered by the test's own new project, so it can only contain this test's tasks
- Test data only through `testData`. Never run with `--reporter=...`
- No other file changes. Commit `#12 ...`, branch `12-tc-011-project-lifecycle`, PR `Closes #12`

## Review Focus

1. **Close is only acknowledged, not stored:** after closing, each closed task is read back with `GET /tasks/{id}` and must have `checked: true` and a `completed_at`.
2. **The wrong task is closed or stays open:** the final open list must be exactly `[third.id]`, and its content must equal the entered content of the third task.
3. **Closed tasks still show up as open:** the final open list must not contain the ids of the two closed tasks.
4. **Tasks land in the wrong project (for example the Inbox):** after creating them, the project list must contain exactly the three entered contents, each with `project_id` of the test project and `checked: false`.
5. **Noise from other runs on the shared account:** the project is new and must start empty (`[]`), and all lists use `project_id`, so other agents' tasks cannot make the test pass or fail. Cleanup deletes closed tasks too (the fixture treats 404 as fine; deleting the project takes its tasks along).

---

### Task 1: TC-011 test

**Files:**
- Create: `tests/e2e/project-lifecycle.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; `uniqueName(kind: string): string` from `src/data/runId`; `testData.createProject(overrides?): Promise<Project>`; `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>`; `api.tasks.close(id: string): Promise<void>`; `api.tasks.get(id: string): Promise<Task>`; `api.tasks.list(query?: TaskListQuery): Promise<Task[]>` (active tasks only); `Task.checked: boolean`, `Task.completed_at: string | null`
- Produces: the TC-011 test

- [x] **Step 1: Write the test**

```ts
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-011 A project from empty to done: three tasks, two ticked off, one still open at the end',
  {
    tag: ['@TC-011', '@e2e'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/12' },
  },
  async ({ api, testData }) => {
    // The test works in its own new project, so the project lists below can only contain
    // this test's tasks, even though other runs use the same account at the same time.
    const project = await test.step('Start with an empty project', async () => {
      const created = await testData.createProject();
      expect(await api.tasks.list({ project_id: created.id })).toEqual([]);
      return created;
    });

    const contents = [uniqueName('task'), uniqueName('task'), uniqueName('task')] as const;
    const byContent = (a: { content: string }, b: { content: string }): number =>
      a.content.localeCompare(b.content);

    const [first, second, third] = await test.step('Add three tasks to the project', async () => {
      const tasks = [
        await testData.createTask({ content: contents[0], project_id: project.id }),
        await testData.createTask({ content: contents[1], project_id: project.id }),
        await testData.createTask({ content: contents[2], project_id: project.id }),
      ] as const;

      // Read back: all three are open in this project, with the entered content.
      const open = await api.tasks.list({ project_id: project.id });
      expect(
        open
          .map(({ content, project_id, checked }) => ({ content, project_id, checked }))
          .sort(byContent),
      ).toEqual(
        contents
          .map((content) => ({ content, project_id: project.id, checked: false }))
          .sort(byContent),
      );
      return tasks;
    });

    await test.step('Close two of the tasks', async () => {
      await api.tasks.close(first.id);
      await api.tasks.close(second.id);

      // Read back: the closure is stored, not only acknowledged.
      for (const closed of [first, second]) {
        const loaded = await api.tasks.get(closed.id);
        expect(loaded.id).toBe(closed.id);
        expect(loaded.checked).toBe(true);
        expect(loaded.completed_at).not.toBeNull();
      }
    });

    await test.step('List the open tasks of the project', async () => {
      const open = await api.tasks.list({ project_id: project.id });
      const openIds = open.map((task) => task.id);

      // Exactly one open task, and it is the one that was not closed.
      expect(openIds).toEqual([third.id]);
      expect(openIds).not.toContain(first.id);
      expect(openIds).not.toContain(second.id);

      const [remaining] = open;
      expect(remaining?.content).toBe(contents[2]);
      expect(remaining?.checked).toBe(false);
      expect(remaining).toMatchSchema(Schema.task);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/e2e/project-lifecycle.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change the final assertion to `expect(openIds).toEqual([second.id]);` and run the file again.
Expected: `1 failed` with `Expected` the second task's id and `Received` the third task's id. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`. Then a temporary, uncommitted `tests/tc011-leftovers.spec.ts` that lists projects and tasks and expects none whose name/content starts with `autotest-` and contains `-local-tc011-`. Other agents run in parallel on the same account, so steps 2 and 3 run with `AUTOTEST_RUN_ID=<UTC stamp>-local-tc011`, and the check matches only this test's data (including the failed run in step 3), not every `-local-` item. Run it, then delete it.

- [x] **Step 5: Full run**

Run: `npx playwright test` → all passed, 0 skipped. Other agents' concurrent runs may add noise; failures in other files are reported, not fixed here.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [ ] **Step 7: Commit, push, PR, code review**

`git commit -m "#12 Add TC-011 project lifecycle e2e test"`, push, PR `Closes #12` from the PR template, then Superpowers `requesting-code-review`. A human merges.
