# TC-001 Create Project Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-001: a new project is created and comes back under the name that was entered.

**Architecture:** One Playwright API test in `tests/projects/projects.spec.ts` (the file the architecture plan assigns to TC-001 and later TC-006). It uses the existing fixtures only: `testData.createProject` creates the project and deletes it after the test, `api.projects.get` reads it back, `toMatchSchema(Schema.project)` checks both responses. No framework changes.

**Tech Stack:** Playwright Test (API only, no browser), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #3, `Test Cases for automation.md` (wave 1), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Test title starts with the TC ID: `TC-001 A new project is created and comes back under the name that was entered`
- Tags: `@TC-001` and `@smoke` (wave 1, runs every hour on `main`)
- Every step is a `test.step()` with a readable name
- Test data only through the `testData` fixture, names start with `autotest-<run id>-`
- No `console`, no token in code or output. Never run with `--reporter=...`, because that switches off the redaction reporter (review finding on PR #8)
- Commit subject `#3 <summary>`, branch `3-tc-001-create-project`, PR with `Closes #3`, a human merges

## Review Focus

1. **The name is only echoed, not stored:** the create response has the name, but a later read does not. The test reads the project back with `GET /projects/{id}`.
2. **Non-ASCII names:** a Czech team enters diacritics. The name contains `Příliš žluťoučký kůň` and must come back byte for byte.
3. **The response shape drifts from the documentation:** both responses are checked with `toMatchSchema(Schema.project)`.
4. **A different project comes back:** the read-back `id` must equal the created `id`.
5. **Leftover data on the shared account:** cleanup is done by `testData` even when the test fails. After the run, no `autotest-` project from this run is left.

---

### Task 1: TC-001 test

**Files:**
- Create: `tests/projects/projects.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`. `testData.createProject(overrides?: Partial<CreateProjectPayload>): Promise<Project>`, `api.projects.get(id: string): Promise<Project>`, `api.projects.list(): Promise<Project[]>`, `uniqueName(kind: string): string` from `src/data/runId`
- Produces: `tests/projects/projects.spec.ts`, which TC-006 will extend later

- [x] **Step 1: Write the test**

```ts
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-001 A new project is created and comes back under the name that was entered',
  { tag: ['@TC-001', '@smoke'] },
  async ({ api, testData }) => {
    // Diacritics on purpose: the name must come back exactly as entered.
    const name = `${uniqueName('project')} Příliš žluťoučký kůň`;

    const created = await test.step('Create a project with the entered name', async () => {
      const project = await testData.createProject({ name });
      expect(project.name).toBe(name);
      expect(project).toMatchSchema(Schema.project);
      return project;
    });

    await test.step('Load the project again and check its name', async () => {
      const loaded = await api.projects.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe(name);
      expect(loaded).toMatchSchema(Schema.project);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/projects/projects.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change the last assertion to `expect(loaded.name).toBe(`${name}-wrong`);`, run the same command.
Expected: `1 failed` with `Expected: "...kůň-wrong"`. Then restore the original line.

- [x] **Step 4: Check that the failed run leaked no token**

Run: `node scripts/check-no-token.mts`
Expected: `check-no-token: OK`

- [x] **Step 5: Run it as part of the smoke suite and check the cleanup**

Run: `npm run test:smoke`
Expected: `1 passed`. `testData` fails the test if deleting the project fails, so a pass already means the delete call succeeded. To see it on the account too, add a temporary, uncommitted `tests/tmp-leftovers.spec.ts`:

```ts
import { expect, test } from '../src/fixtures';

test('no TC-001 projects are left', async ({ api }) => {
  const leftovers = (await api.projects.list()).filter((p) => p.name.includes('Příliš žluťoučký kůň'));
  expect(leftovers).toEqual([]);
});
```

Run: `npx playwright test tests/tmp-leftovers.spec.ts` → `1 passed`, then `rm tests/tmp-leftovers.spec.ts`.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck`
Expected: no errors, no warnings

- [x] **Step 7: Commit, push, PR**

```bash
git add tests/projects/projects.spec.ts docs/superpowers/plans/2026-09-24-tc-001-create-project.md
git commit -m "#3 Add TC-001 create project smoke test"
git push -u origin 3-tc-001-create-project
gh pr create --base main --title "#3 Add TC-001 create project smoke test" --body-file <pr-body.md>
```

`<pr-body.md>` follows `.github/pull_request_template.md`: `Closes #3`, what and why, how it was tested (steps 2 to 6 with their real output), the filled checklist.

Expected: PR checks green, the PR gets the labels of #3 (`type: test-case`, `priority: P1`, `area: projects`).
