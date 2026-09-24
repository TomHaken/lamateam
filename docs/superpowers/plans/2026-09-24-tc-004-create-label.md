# TC-004 Create Label Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-004: a new label is created under the name that was entered.

**Architecture:** One Playwright API test in `tests/labels/labels.spec.ts` (the file the architecture plan assigns to TC-004). It uses the existing fixtures only: `testData.createLabel` creates the personal label and deletes it after the test, `api.labels.get` reads it back, `toMatchSchema(Schema.label)` checks both responses. No framework changes.

**Tech Stack:** Playwright Test (API only, no browser), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #6, `Test Cases for automation.md` (wave 1), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Test title: `TC-004 A new label is created under the name that was entered`
- Tags: `@TC-004` and `@smoke` (wave 1, runs every hour on `main`), annotation `issue` → `https://github.com/TomHaken/lamateam/issues/6`
- Every step is a `test.step()` with a readable name
- Test data only through the `testData` fixture, names start with `autotest-<run id>-`
- No `console`, no token in code or output. Never run with `--reporter=...`
- Commit subject `#6 <summary>`, branch `6-tc-004-create-label`, PR with `Closes #6`, a human merges

## Review Focus

1. **The name is only echoed, not stored:** the create response has the name, a later read might not. The test reads the label back with `GET /labels/{id}` and compares with the entered value.
2. **Non-ASCII names:** the name contains `kůň` and must come back byte for byte. Found on the first run: the API silently cuts label names at about 60 characters (the OpenAPI spec says `maxLength: 128`; characters or bytes not confirmed), so the full `Příliš žluťoučký kůň` suffix did not fit. The name is 56 characters (58 UTF-8 bytes) with the CI run id, and a guard assertion fails early if it ever grows past 60 bytes.
3. **The response shape drifts from the documentation:** both responses are checked with `toMatchSchema(Schema.label)`, after the behaviour assertions.
4. **A different label comes back:** the read-back `id` must equal the created `id`.
5. **Leftover labels on the shared account:** `testData` deletes the label even when the test fails. After the run, no `autotest-...-local-` label is left (checked with a temporary spec).

---

### Task 1: TC-004 test

**Files:**
- Create: `tests/labels/labels.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`. `testData.createLabel(overrides?: Partial<CreateLabelPayload>): Promise<Label>`, `api.labels.get(id: string): Promise<Label>`, `api.labels.list(): Promise<Label[]>`, `uniqueName(kind: string): string` from `src/data/runId`
- Produces: `tests/labels/labels.spec.ts`

- [x] **Step 1: Write the test**

```ts
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-004 A new label is created under the name that was entered',
  {
    tag: ['@TC-004', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/6' },
  },
  async ({ api, testData }) => {
    // Diacritics on purpose: the name must come back exactly as entered.
    // Kept short: the API silently cuts label names at about 60 characters (seen once, characters
    // or bytes not confirmed; the OpenAPI spec says 128). uniqueName('label') alone is 52 characters
    // on CI (50 locally), so only a short suffix fits.
    const name = `${uniqueName('label')} kůň`;

    const created = await test.step('Create a personal label with the entered name', async () => {
      expect(
        Buffer.byteLength(name),
        'label names longer than 60 are cut by the API',
      ).toBeLessThanOrEqual(60);
      const label = await testData.createLabel({ name });
      expect(label.name).toBe(name);
      expect(label).toMatchSchema(Schema.label);
      return label;
    });

    await test.step('Load the label again and check its name', async () => {
      const loaded = await api.labels.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe(name);
      expect(loaded).toMatchSchema(Schema.label);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/labels/labels.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Mutation check**

Temporarily change `expect(loaded.name).toBe(name);` to `` expect(loaded.name).toBe(`${name}-wrong`); ``, run the same command.
Expected: `1 failed` with `Expected: "...kůň-wrong"` / `Received: "...kůň"`. Restore the line.

- [x] **Step 4: Token leak check**

Run: `node scripts/check-no-token.mts`
Expected: OK

- [x] **Step 5: Smoke suite and leftovers**

Run: `npm run test:smoke` → all passed. Then a temporary, uncommitted `tests/tmp-leftovers.spec.ts`:

```ts
import { expect, test } from '../src/fixtures';

test('no local autotest labels are left', async ({ api }) => {
  const leftovers = (await api.labels.list()).filter(
    (l) => l.name.startsWith('autotest-') && l.name.includes('-local-'),
  );
  expect(leftovers).toEqual([]);
});
```

Run: `npx playwright test tests/tmp-leftovers.spec.ts` → `1 passed`, then `rm tests/tmp-leftovers.spec.ts`.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck`
Expected: no errors, no warnings

- [x] **Step 7: Deletion guard, commit, push, PR**

```bash
git diff --stat origin/main
git diff origin/main --diff-filter=D --name-only
git add tests/labels/labels.spec.ts docs/superpowers/plans/2026-09-24-tc-004-create-label.md
git commit -m "#6 Add TC-004 create label smoke test"
git push -u origin 6-tc-004-create-label
gh pr create --base main --title "#6 Add TC-004 create label smoke test" --body-file <pr-body.md>
```

`<pr-body.md>` follows `.github/pull_request_template.md` with `Closes #6` and the real output of steps 2 to 6.
