# TC-007 Task Required and Optional Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-007: a task can be created with the required fields only, and every optional field is stored exactly as it was entered.

**Architecture:** One more test in `tests/tasks/create-task.spec.ts`, after TC-002 and TC-003 (the file the architecture plan assigns to TC-002, TC-003 and TC-007). Existing fixtures only: `testData.createProject/createLabel/createTask` create the data and delete it after the test, `api.tasks.get` reads each task back, the worker fixture `account` gives the Inbox project id, `accountTimezone` with `src/utils/dates.ts` gives the due date, and `toMatchSchema(Schema.task)` checks the responses. No framework changes.

**Tech Stack:** Playwright Test (API only), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #9, `Test Cases for automation.md` (wave 2), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Title `TC-007 A task can be created with the required fields only, and every optional field is stored exactly as it was entered`, tags `@TC-007` and `@regression`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/9' }`
- Two `test.step()`s, one per ticket step. Behaviour is checked first, then the schema
- Assertions on the **read-back** (GET) task, not only on the create response
- The due date comes from the **account timezone**, never from the runner clock (CI runs in UTC)
- The optional fields are the ones the ticket lists: description, priority, labels, due date, project
- Test data only through `testData`. Never run with `--reporter=...`
- TC-002 and TC-003 in the same file stay unchanged
- Commit `#9 ...`, branch `9-tc-007-task-fields`, PR `Closes #9`

## Review Focus

1. **Defaults are not documented values:** the minimal task must read back with `description: ''`, `priority: 1` (normal), `labels: []`, `due: null`, `deadline: null`, `duration: null`, `parent_id: null`, `section_id: null`, `checked: false`, and `project_id` equal to the account's Inbox (`account.inbox_project_id`).
2. **A field is only echoed, not stored:** both tasks are read back with `GET /tasks/{id}` and every field is compared with the entered value there.
3. **A default value hides a lost field:** the full task uses non-default values (priority 4, a non-empty multi-line description with diacritics, a label, a date, a non-Inbox project), so a field that the API drops fails the assertion instead of matching the default.
4. **The label reference breaks:** `labels` must be exactly `[label.name]` of the label the test created, not an extra or renamed label.
5. **The due date shifts by a day or turns into a date-time:** `due.date` must be exactly the entered `YYYY-MM-DD` (10 days ahead in the account timezone) and `due.is_recurring` must be `false`.

---

### Task 1: TC-007 test

**Files:**

- Modify: `tests/tasks/create-task.spec.ts` (append TC-007 after TC-003, add `import type { CreateTaskPayload } from '../../src/clients';`)

**Interfaces:**

- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; worker fixtures `account: User` (`inbox_project_id: string | null`) and `accountTimezone: string`; `uniqueName(kind)` from `src/data/runId`; `addDays`, `todayIn` from `src/utils/dates`; `testData.createProject()`, `testData.createLabel()`, `testData.createTask(overrides)`; `api.tasks.get(id)`
- Produces: the TC-007 test

- [x] **Step 1: Write the test**

```ts
test(
  'TC-007 A task can be created with the required fields only, and every optional field is stored exactly as it was entered',
  {
    tag: ['@TC-007', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/9' },
  },
  async ({ api, testData, account, accountTimezone }) => {
    await test.step('Create a task with content only and check the defaults of the optional fields', async () => {
      const content = uniqueName('task');
      const created = await testData.createTask({ content });

      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(content);
      expect(loaded.project_id).toBe(account.inbox_project_id);
      expect(loaded.description).toBe('');
      expect(loaded.priority).toBe(1);
      expect(loaded.labels).toEqual([]);
      expect(loaded.due).toBeNull();
      expect(loaded.deadline).toBeNull();
      expect(loaded.duration).toBeNull();
      expect(loaded.parent_id).toBeNull();
      expect(loaded.section_id).toBeNull();
      expect(loaded.checked).toBe(false);
      expect(created).toMatchSchema(Schema.task);
      expect(loaded).toMatchSchema(Schema.task);
    });

    await test.step('Create a task with every optional field and check each one is stored as entered', async () => {
      const project = await testData.createProject();
      const label = await testData.createLabel();
      const entered: Required<
        Pick<CreateTaskPayload, 'content' | 'description' | 'priority' | 'labels' | 'due_date' | 'project_id'>
      > = {
        content: uniqueName('task'),
        description: 'První řádek popisu\nDruhý řádek: žluťoučký kůň',
        priority: 4,
        labels: [label.name],
        // 10 days ahead in the account timezone, never from the runner clock (CI runs in UTC).
        due_date: addDays(todayIn(accountTimezone), 10),
        project_id: project.id,
      };
      const created = await testData.createTask(entered);

      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(entered.content);
      expect(loaded.description).toBe(entered.description);
      expect(loaded.priority).toBe(entered.priority);
      expect(loaded.labels).toEqual(entered.labels);
      expect(loaded.due?.date).toBe(entered.due_date);
      expect(loaded.due?.is_recurring).toBe(false);
      expect(loaded.project_id).toBe(entered.project_id);
      expect(created).toMatchSchema(Schema.task);
      expect(loaded).toMatchSchema(Schema.task);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/tasks/create-task.spec.ts`
Expected: `3 passed` (TC-002, TC-003, TC-007)

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change `expect(loaded.priority).toBe(entered.priority);` to `.toBe(3)` and run `npx playwright test tests/tasks/create-task.spec.ts --grep @TC-007`.
Expected: `1 failed` with `Expected: 3`, `Received: 4`. Restore the line.

- [x] **Step 4: Leak check and leftovers**

Run: `node scripts/check-no-token.mts` → `OK`. Then a temporary, uncommitted `tests/tc007-leftovers.spec.ts` that lists tasks, projects and labels and expects none whose name starts with `autotest-` and contains `-local-` from this run. Run it, then delete it.

- [x] **Step 5: Regression file and smoke suite**

Run: `npm run test:smoke` → all passed. The full run is limited to this file, because other agents run tests on the same account at the same time.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck` → clean, no warnings.

- [ ] **Step 7: Commit, push, PR, code review**

`git commit -m "#9 Add TC-007 task required and optional fields test"`, push, PR `Closes #9` from the PR template, then Superpowers `requesting-code-review`.
