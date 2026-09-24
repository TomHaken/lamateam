# CLAUDE.md

Playwright + TypeScript API tests (no browser) against the Todoist API v1, on a shared free account. Public repo, team of two. Read `brief.md` and `docs/test-architecture-plan.md` before changing tests or the framework.

## Workflow

- Implementing a test ticket: use the project skill `implementing-test-tickets` (`.claude/skills/`). Every step, also under time pressure.
- The subagent `test-writer` (`.claude/agents/`) runs the same skill in its own context, but only when the user names it explicitly. It never merges.
- Every change goes through a GitHub issue → branch `<issue>-<slug>` from a freshly pulled `main` → PR with `Closes #<issue>` → code review → **a human merges** (or explicitly asks you to).
- Commit subject `#<issue> <summary>` (the `commit-msg` hook enforces it). Never commit or push to `main` (the `pre-push` hook blocks it).
- New issues follow the issue forms (`.github/ISSUE_TEMPLATE/`): Priority and Area become labels automatically, and a PR gets its issue's labels. Reuse the backlog ticket, never create a duplicate.
- Before every PR, run the deletion guard: `git diff --stat main` and `git diff main --diff-filter=D --name-only`. Every deleted file or removed line must be intended and explained in the PR. Teammates work in parallel, so never overwrite their tests.

## Security

- Never read, print or commit `.env` or the `TODOIST_API_TOKEN` value. It lives only in `.env` (gitignored) and in the GitHub secret.
- Never run Playwright with `--reporter=...`. That drops the redaction reporter and can put the token into traces.
- After a run, `node scripts/check-no-token.mts` must say OK before anything is shared.
- No `console` in the framework or tests (ESLint enforces it).

## Commands

| Command                                                     | Use                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                    | Install, also sets up the git hooks                                                                      |
| `npx playwright test <file>`                                | Run tests against the real account (needs `.env` with `TODOIST_API_TOKEN`, see README "Getting started") |
| `npm run test:smoke`                                        | `@smoke` tests only (hourly on `main`)                                                                   |
| `npm run lint && npm run format:check && npm run typecheck` | Must be clean before a PR                                                                                |

## Test conventions

- File per the file → test case table (`| File | Tests | Tag |`) in `docs/test-architecture-plan.md`. Add to an existing file, never replace it.
- Title `TC-XXX <text from Test Cases for automation.md>`, tags `@TC-XXX` plus the suite tag, and `annotation: { type: 'issue', description: '<ticket URL>' }`.
- Test data only through the `testData` fixture (`autotest-<run id>-` prefix, cleaned up). Read back with GET and compare with the entered value. Behaviour assertions first, `toMatchSchema` last.
- Dates from `accountTimezone` and `src/utils/dates.ts`, never the runner clock (CI runs in UTC).
- A test is done only after it has failed once on purpose (mutation check) and then passes again.
