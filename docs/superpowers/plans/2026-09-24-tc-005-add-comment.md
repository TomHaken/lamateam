# TC-005 Add Comment Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate TC-005: a comment is added to a task with the text that was entered.

**Architecture:** One Playwright API test in a new file `tests/comments/comments.spec.ts` (the file the architecture plan assigns to TC-005). It uses the existing fixtures only: `testData.createTask` creates the task, `testData.createComment` adds the comment (both are deleted after the test), `api.comments.get` reads the comment back, `toMatchSchema(Schema.comment)` checks both responses. No framework changes.

**Tech Stack:** Playwright Test (API only, no browser), TypeScript strict, Ajv schemas from the pinned OpenAPI spec, Todoist API v1.

**Spec:** issue #7, `Test Cases for automation.md` (wave 1), `brief.md`, `docs/test-architecture-plan.md`

## Global Constraints

- Test title: `TC-005 A comment is added to a task with the text that was entered`
- Tags: `@TC-005` and `@smoke`, annotation `{ type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/7' }`
- One `test.step()` per ticket step (add the comment, read it back)
- Test data only through the `testData` fixture, content starts with `autotest-<run id>-`
- No `console`, no token in code or output. Never run with `--reporter=...`
- Commit subject `#7 <summary>`, branch `7-tc-005-add-comment`, PR with `Closes #7`, a human merges

## Review Focus

1. **The text is only echoed, not stored:** the create response has the content, but a later read might not. The test reads the comment back with `GET /comments/{id}` and compares with the entered text, not with the create response.
2. **Non-ASCII text:** the content contains `Příliš žluťoučký kůň` and must come back byte for byte.
3. **The comment is attached to the wrong task (or to none):** the request sends `task_id`, but the API v1 response names the task field `item_id` (the spec schema `NoteSyncView` lists neither, see `Comment` in `src/clients/types.ts`). Both responses must have `item_id` equal to the created task id, and no `project_id` value.
4. **A different comment comes back:** the read-back `id` must equal the created `id`.
5. **Response shape drifts / leftovers:** both responses are checked with `toMatchSchema(Schema.comment)` last. `testData` deletes the comment, then the task, also when the test fails. After the run no `autotest-` task from this run is left.

---

### Task 1: TC-005 test

**Files:**
- Create: `tests/comments/comments.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `Schema` from `src/fixtures`. `testData.createTask(overrides?: Partial<CreateTaskPayload>): Promise<Task>`, `testData.createComment(target: CommentTarget, overrides?: { content?: string }): Promise<Comment>`, `api.comments.get(id: string): Promise<Comment>`, `uniqueName(kind: string): string` from `src/data/runId`
- Produces: `tests/comments/comments.spec.ts`

- [x] **Step 1: Write the test**

```ts
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-005 A comment is added to a task with the text that was entered',
  {
    tag: ['@TC-005', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/7' },
  },
  async ({ api, testData }) => {
    // Diacritics on purpose: the text must come back exactly as entered.
    const content = `${uniqueName('comment')} Příliš žluťoučký kůň`;
    const task = await testData.createTask();

    const created = await test.step('Add a comment with the entered text to the task', async () => {
      const comment = await testData.createComment({ task_id: task.id }, { content });
      expect(comment.content).toBe(content);
      // The request sends `task_id`, the API v1 response names the same field `item_id`.
      expect(comment.item_id).toBe(task.id);
      expect(comment.project_id ?? null).toBeNull();
      expect(comment).toMatchSchema(Schema.comment);
      return comment;
    });

    await test.step('Load the comment again and check its text and task', async () => {
      const loaded = await api.comments.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(content);
      expect(loaded.item_id).toBe(task.id);
      expect(loaded.project_id ?? null).toBeNull();
      expect(loaded).toMatchSchema(Schema.comment);
    });
  },
);
```

- [x] **Step 2: Run it against the real account**

Run: `npx playwright test tests/comments/comments.spec.ts`
Expected: `1 passed`

- [x] **Step 3: Prove the test can fail (mutation check)**

Temporarily change the read-back assertion to ``expect(loaded.content).toBe(`${content}-wrong`);``, run the same command.
Expected: `1 failed` with `Expected: "...kůň-wrong"`. Then restore the original line.

- [x] **Step 4: Check that the failed run leaked no token**

Run: `node scripts/check-no-token.mts`
Expected: `check-no-token: OK`

- [x] **Step 5: Smoke suite and leftovers**

Run: `npm run test:smoke` → all passed. Then a temporary, uncommitted `tests/tmp-leftovers.spec.ts` that lists `api.tasks.list()` and expects no task whose content starts with `autotest-` and contains `-local-` (comments are listed per task, so a leftover comment can only live on a leftover task). Run it → `1 passed`, then delete it.

- [x] **Step 6: Lint, format, type check**

Run: `npm run lint && npm run format:check && npm run typecheck`
Expected: no errors, no warnings

- [x] **Step 7: Deletion guard, commit, push, PR**

`git diff --stat origin/main` and `git diff origin/main --diff-filter=D --name-only` (only additions expected). Commit `#7 Add TC-005 add comment smoke test`, push, `gh pr create` from `.github/pull_request_template.md` with `Closes #7` and the real output of steps 2 to 6.
