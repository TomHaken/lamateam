# TC-014 Negative Auth Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-014: with no access token (TC-014a) and with a malformed token (TC-014b), creating a project fails with 401 and nothing is created.

**Architecture:** Two Playwright API tests in a new file `tests/negative/auth.spec.ts` (the file the architecture plan assigns to TC-014a/b). The failing request goes through the existing fixtures `unauthenticatedApi` (no `Authorization` header) and `apiWithToken(token)` (a fake Bearer token), using the raw `send` method so the test sees the status instead of an `ApiError`. The payload comes from the `buildProject()` builder that `testData` uses, so the name has the `autotest-<run id>-` prefix. The read back uses the real-token `api.projects.list()`. No framework changes.

**Tech Stack:** Playwright Test (API only, no browser), TypeScript strict, Todoist API v1.

**Spec:** issue #15, `Test Cases for automation.md` (wave 5), `brief.md` (one behaviour per test, suffixes), `docs/test-architecture-plan.md` (file table, "probe first, assert as observed")

## Probe of the real API (2026-09-24, before writing the test)

A temporary, uncommitted spec sent `POST /projects` with an `autotest-` name:

| Case | Status | Body |
|------|--------|------|
| No `Authorization` header | 401 | `{"error":"Unauthorized","error_code":477,"error_extra":{"event_id":"…","retry_after":1},"error_tag":"UNAUTHORIZED","http_code":401}` |
| `Bearer autotest-malformed-token-not-real` | 401 | same shape, `retry_after` 5 |

Neither name showed up afterwards in `GET /projects` with the real token. The tests assert this observed behaviour: status 401, `error_tag: "UNAUTHORIZED"`, `http_code: 401`, and no project with the name. `event_id`, `retry_after` and `error_code` are not asserted (they vary or are not documented).

## Global Constraints

- Titles start with the TC ID plus suffix: `TC-014a With no access token the request fails with 401 and nothing is created`, `TC-014b With a malformed token the request fails with 401 and nothing is created`
- Tags `@TC-014` and `@negative` (wave 5), annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/15' }`
- Every ticket step is a `test.step()` with a readable name
- Names only from the `autotest-` builders, never touch other data on the shared account
- The malformed token is an obviously fake literal, never derived from the real token
- No `console`, never run with `--reporter=...`, `node scripts/check-no-token.mts` after a failing run
- No `toMatchSchema`: the pinned OpenAPI spec has no schema for the 401 body
- Commit subject `#15 <summary>`, branch `15-tc-014-auth-negative`, PR with `Closes #15`, a human merges

## Review Focus

1. **The 401 does not come from the auth check** (for example a gateway or a wrong path): the body must also say `error_tag: "UNAUTHORIZED"` and `http_code: 401`.
2. **Rejected but written anyway:** the project could be stored despite the 401. Step 3 lists projects with the valid token and expects the name to be absent.
3. **The API starts accepting the request** (regression): the project would stay on the shared account. `trackIfCreated` registers it with `testData` before any assertion, so teardown deletes it even when the test fails.
4. **Token leak:** the malformed token is a literal constant, and the real token is only used by the `api` fixture (redacted in traces). `check-no-token` runs after the mutation run.
5. **The "nothing created" check passes vacuously:** the name is unique per run (`uniqueName`), and `api.projects.list()` throws on a non-2xx, so a broken read back fails the test instead of returning an empty list. Known, not asserted: repeated failed auth returns growing `retry_after`, so a 429 is possible under load; it would fail with a readable `Received: 429`.

---

### Task 1: TC-014a and TC-014b

**Files:**
- Create: `tests/negative/auth.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, type `TestData` from `src/fixtures`. Fixtures `api`, `unauthenticatedApi: TodoistApi`, `apiWithToken: (token: string) => Promise<TodoistApi>`, `testData.track(kind: ResourceKind, id: string): void`. `buildProject(overrides?): CreateProjectPayload` from `src/data`. `BaseClient.send(method: HttpMethod, path: string, options?: RequestOptions): Promise<APIResponse>`. `api.projects.list(): Promise<Project[]>`
- Produces: `tests/negative/auth.spec.ts`

- [x] **Step 1: Write the tests**

```ts
import type { APIResponse } from '@playwright/test';

import { buildProject } from '../../src/data';
import { expect, test, type TestData } from '../../src/fixtures';

// Obviously fake on purpose. It is sent as a header and ends up in the trace, so it must never be
// derived from the real token.
const MALFORMED_TOKEN = 'autotest-malformed-token-not-a-real-todoist-token';

const ISSUE = { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/15' };

/** Should the API ever accept the request, the project must not stay on the shared account. */
async function trackIfCreated(response: APIResponse, testData: TestData): Promise<void> {
  if (!response.ok()) return;
  const body = (await response.json()) as { id?: unknown };
  if (typeof body.id === 'string') testData.track('project', body.id);
}

test(
  'TC-014a With no access token the request fails with 401 and nothing is created',
  { tag: ['@TC-014', '@negative'], annotation: ISSUE },
  async ({ api, unauthenticatedApi, testData }) => {
    const payload = buildProject();

    await test.step('Create a project with no Authorization header', async () => {
      const response = await unauthenticatedApi.projects.send('POST', 'projects', {
        body: payload,
      });
      await trackIfCreated(response, testData);
      expect(response.status()).toBe(401);
      expect(await response.json()).toMatchObject({ error_tag: 'UNAUTHORIZED', http_code: 401 });
    });

    await test.step('With the valid token, check that no project with that name exists', async () => {
      const names = (await api.projects.list()).map((project) => project.name);
      expect(names).not.toContain(payload.name);
    });
  },
);

test(
  'TC-014b With a malformed token the request fails with 401 and nothing is created',
  { tag: ['@TC-014', '@negative'], annotation: ISSUE },
  async ({ api, apiWithToken, testData }) => {
    const payload = buildProject();

    await test.step('Create a project with a malformed token', async () => {
      const badApi = await apiWithToken(MALFORMED_TOKEN);
      const response = await badApi.projects.send('POST', 'projects', { body: payload });
      await trackIfCreated(response, testData);
      expect(response.status()).toBe(401);
      expect(await response.json()).toMatchObject({ error_tag: 'UNAUTHORIZED', http_code: 401 });
    });

    await test.step('With the valid token, check that no project with that name exists', async () => {
      const names = (await api.projects.list()).map((project) => project.name);
      expect(names).not.toContain(payload.name);
    });
  },
);
```

- [x] **Step 2: Run against the real account**

Run: `AUTOTEST_RUN_ID=<UTC stamp>-local-tc014 npx playwright test tests/negative/auth.spec.ts`
Expected: `2 passed`

- [x] **Step 3: Mutation check**

Temporarily change the status in TC-014b to `toBe(403)` and run again.
Expected: `1 failed` with `Expected: 403` / `Received: 401`. Restore the line.

- [x] **Step 4: Leak check after the failing run**

Run: `node scripts/check-no-token.mts`
Expected: OK

- [x] **Step 5: Leftovers**

Temporary, uncommitted `tests/tc014-leftovers.spec.ts`:

```ts
import { expect, test } from '../src/fixtures';

test('no TC-014 local projects are left', async ({ api }) => {
  const leftovers = (await api.projects.list()).filter(
    (p) => p.name.startsWith('autotest-') && p.name.includes('-local-tc014'),
  );
  expect(leftovers).toEqual([]);
});
```

Run it → `1 passed`, then `rm tests/tc014-leftovers.spec.ts`.

- [x] **Step 6: Full run, lint, format, type check**

Run: `npx playwright test`, then `npm run lint && npm run format:check && npm run typecheck`
Expected: all passed, no errors, no warnings

- [x] **Step 7: Deletion guard, commit, push, PR**

```bash
git diff --stat origin/main
git diff origin/main --diff-filter=D --name-only
git add tests/negative/auth.spec.ts docs/superpowers/plans/2026-09-24-tc-014-auth-negative.md
git commit -m "#15 Add TC-014 negative auth tests"
git push -u origin 15-tc-014-auth-negative
gh pr create --base main --title "#15 Add TC-014 negative auth tests" --body-file <pr-body>
```

The PR body follows `.github/pull_request_template.md`, with `Closes #15`, the real output of steps 2 to 6, and the probe result as assumptions.
