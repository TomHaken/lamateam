# TC-006 Rename Project Regression Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-006: a renamed project loads under the new name the next time it is opened, not only in the response to the update.

**Architecture:** One Playwright API test added to `tests/projects/projects.spec.ts` (the file the architecture plan assigns to TC-001 and TC-006). TC-001 in that file stays unchanged. It uses the existing fixtures only: `testData.createProject` creates the project (and deletes it by id after the test, so the rename does not affect cleanup), `api.projects.update` renames it, `api.projects.get` reads it back, `toMatchSchema(Schema.project)` checks both responses. No framework changes.

**Tech Stack:** Playwright Test (API only, no browser), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #8, `Test Cases for automation.md` (wave 2), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Test title: `TC-006 A renamed project loads under the new name the next time it is opened, not only in the response to the update`
- Tags: `@TC-006` and `@regression` (wave 2), annotation `issue` → `https://github.com/TomHaken/lamateam/issues/8`
- One `test.step()` per ticket step: step 1 rename, step 2 read again. Creating the project is the precondition and gets its own step so a failure there is readable
- Test data only through `testData`. The new name comes from `uniqueName()`, so it keeps the `autotest-<run id>-` prefix and a leftover would still be found by the global setup
- No `console`, no token. Never run with `--reporter=...`
- Commit subject `#8 <summary>`, branch `8-tc-006-rename-project`, PR with `Closes #8`, a human merges

## Review Focus

1. **The new name is only echoed, not stored:** the update response has the new name, but a later read does not. The test reads the project with `GET /projects/{id}` and compares with the name it sent, not with the update response.
2. **The rename does nothing because the names are equal:** the test asserts that the new name differs from the original name before renaming, so a pass cannot come from an unchanged project.
3. **The update touches or returns a different project:** the update response `id` and the read-back `id` must both equal the created `id`.
4. **Non-ASCII names get mangled on update:** the new name contains `Příliš žluťoučký kůň` and must come back byte for byte, in the update response and in the read.
5. **Schema drift and leftovers:** both responses are checked with `toMatchSchema(Schema.project)` (last, after behaviour). Cleanup deletes by id, so the renamed project is still removed. After the run, no `autotest-...-local-` project is left.

---

### Task 1: TC-006 test

**Files:**
- Modify: `tests/projects/projects.spec.ts` (append after TC-001, TC-001 unchanged)

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`; `testData.createProject(overrides?: Partial<CreateProjectPayload>): Promise<Project>`; `api.projects.update(id: string, payload: UpdateProjectPayload): Promise<Project>`; `api.projects.get(id: string): Promise<Project>`; `api.projects.list(): Promise<Project[]>`; `uniqueName(kind: string): string` from `src/data/runId`

- [x] **Step 1: Write the test**

```ts
test(
  'TC-006 A renamed project loads under the new name the next time it is opened, not only in the response to the update',
  {
    tag: ['@TC-006', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/8' },
  },
  async ({ api, testData }) => {
    const project = await test.step('Create a project to rename', () => testData.createProject());

    // Diacritics on purpose: the new name must come back exactly as entered.
    const newName = `${uniqueName('project-renamed')} Příliš žluťoučký kůň`;

    await test.step('Rename the project', async () => {
      expect(newName).not.toBe(project.name);
      const updated = await api.projects.update(project.id, { name: newName });
      expect(updated.id).toBe(project.id);
      expect(updated.name).toBe(newName);
      expect(updated).toMatchSchema(Schema.project);
    });

    await test.step('Load the project again and check it has the new name', async () => {
      const loaded = await api.projects.get(project.id);
      expect(loaded.id).toBe(project.id);
      expect(loaded.name).toBe(newName);
      expect(loaded).toMatchSchema(Schema.project);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/projects/projects.spec.ts`
Expected: `2 passed` (TC-001 and TC-006)

- [x] **Step 3: Mutation check**

Temporarily change the read-back assertion to `expect(loaded.name).toBe(project.name);` (the old name), run `npx playwright test tests/projects/projects.spec.ts --grep @TC-006`.
Expected: `1 failed` with `Expected: "autotest-...-project-..."` / `Received: "autotest-...-project-renamed-... Příliš žluťoučký kůň"`. Restore.

- [x] **Step 4: Token check**

Run: `node scripts/check-no-token.mts` → `check-no-token: OK`

- [x] **Step 5: Leftovers**

Temporary, uncommitted `tests/tmp-leftovers-tc006.spec.ts`:

```ts
import { expect, test } from '../src/fixtures';

test('no local TC-006 projects are left', async ({ api }) => {
  const leftovers = (await api.projects.list()).filter(
    (p) => p.name.startsWith('autotest-') && p.name.includes('-local-') && p.name.includes('project-renamed'),
  );
  expect(leftovers).toEqual([]);
});
```

Run it → `1 passed`, then delete it. (Filtered to `project-renamed` because other agents run tests on the same account at the same time.)

- [x] **Step 6: Full run, lint, format, type check**

Run: `npx playwright test --grep @regression`, `npm run test:smoke`, then `npm run lint && npm run format:check && npm run typecheck` → no errors, no warnings

- [x] **Step 7: Deletion guard, commit, push, PR**

`git diff --stat origin/main`, `git diff origin/main --diff-filter=D --name-only` (empty), no removed lines in `tests/projects/projects.spec.ts`. Commit `#8 Add TC-006 rename project regression test`, push, PR from the template with `Closes #8` and real output.
