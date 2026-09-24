---
name: implementing-test-tickets
description: Use when asked to implement, create or automate a test case (TC-XXX), a test ticket or a spec file in the lamateam repo (Playwright + TypeScript API tests for Todoist), including requests like "udělej TC-004", "implementuj issue 6", "napiš smoke test", or any change to tests/ that ends in a PR - also under time pressure or when told to "just push it".
---

# Implementing Test Tickets (lamateam)

## Overview

Every test goes from ticket to merged PR through one fixed workflow. **Violating the letter of the workflow is violating its spirit.** Time pressure changes how fast you talk, never which steps you do.

## The Workflow

| #   | Step                     | Done when                                                                                                                                                                   |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Ticket**               | Existing backlog issue for the TC is reused (`gh issue list --label "type: test-case"`), never a duplicate. Assigned to the person doing the work, `status: triage` removed |
| 1   | **Plan**                 | `docs/superpowers/plans/YYYY-MM-DD-tc-xxx-<slug>.md` via superpowers:writing-plans, with Review Focus (5 risks) and real code                                               |
| 2   | **Offer**                | Tell the user in their language, short: files, what the test checks, how you verify                                                                                         |
| 3   | **Self-review the plan** | Coverage, placeholders, names/types exist, each risk has an assertion. Fix before coding                                                                                    |
| 4   | **Branch**               | `git switch main && git pull`, then `<issue>-tc-xxx-<slug>`. Never on `main`                                                                                                |
| 5   | **Verify**               | See checklist below. Paste real output, not claims                                                                                                                          |
| 6   | **Deletion guard**       | `git diff --stat main` + `git diff main --diff-filter=D --name-only` + removed lines. Every removal intended and explained                                                  |
| 7   | **PR**                   | Commit `#<issue> <summary>`, PR `Closes #<issue>` from the PR template with real test output                                                                                |
| 8   | **Code review**          | superpowers:requesting-code-review subagent. Fix critical/important, cheap minors too, post summary comment on the PR                                                       |
| 9   | **Merge + Done**         | Only a human merges or explicitly tells you to. Before merging: checks green, `MERGEABLE CLEAN`, nothing new on `main`. After: ticket closed → board moves it to Done       |

## Verify checklist (step 5)

- Run against the real account: `npx playwright test <file>` - **never with `--reporter=...`** (it disables the token redaction reporter)
- **Mutation check:** break one expectation, see it fail with a readable Expected/Received, restore
- `node scripts/check-no-token.mts` after the failed run → OK
- Leftovers: no `autotest-` data left on the account. Check with a temporary, uncommitted spec that lists the resource (e.g. `api.tasks.list()`) and expects no item whose name starts with `autotest-` and contains `-local-`. Run it, then delete it
- `npm run test:smoke` / full run, then `npm run lint && npm run format:check && npm run typecheck` with no warnings
- Existing tests in the same file are untouched (diff has no removed lines there)

## Test conventions

- The framework is complete: clients for projects, tasks, labels, comments, user (`api.<resource>`), `testData.createProject/createTask/createLabel/createComment`, `accountTimezone`, `Schema.*`. A test needs no framework changes. If one seems missing, read `src/` again before adding anything
- File: the one the file → test case table (`| File | Tests | Tag |`) in `docs/test-architecture-plan.md` names for the TC (e.g. TC-004 → `tests/labels/labels.spec.ts`). If the file exists, add to it and never replace it. If it does not exist yet, create it
- Title `TC-XXX <text from Test Cases for automation.md>`, tags `@TC-XXX` + suite (`@smoke` wave 1, `@regression` 2 and 4, `@e2e` 3, `@negative` 5), `annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/<n>' }`
- One `test.step()` per ticket step. Data only via `testData`. **Read back** with GET, compare with the entered value, not the create response
- Behaviour assertions first, `toMatchSchema` last (the schema is loose, e.g. `due` is just `object`)
- Dates from `accountTimezone` + `src/utils/dates.ts`, never the runner clock (CI is UTC)

## Red Flags - stop and go back to the workflow

| Thought                                                      | Reality                                                                                       |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| "No time for a plan / review"                                | A 10-line plan and one reviewer take minutes. Say so, don't skip                              |
| "No time to run it against the real account, lint is enough" | An unrun test is not done. Run it, or tell the user plainly it is unverified work in progress |
| "It passed, done"                                            | Passing proves nothing until the mutation check fails it                                      |
| "I'll just rewrite the file"                                 | A teammate may have changed it. Pull, diff, keep their work                                   |
| "User said push it" → push to `main` / merge                 | "Push" means PR. Merge only on an explicit merge request                                      |
| "I can't see the board, so it isn't there"                   | Say "I can't see it, please check", never claim what you can't see                            |
| "Reviewed = verified"                                        | Verification (runs) and code review (fresh reviewer) are different steps                      |
