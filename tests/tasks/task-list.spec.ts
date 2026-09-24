import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body,
// keep the title, tags and the `issue` annotation.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  "TC-008 A project's task list contains only the tasks of that project, nothing from elsewhere",
  {
    tag: ['@TC-008', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/10' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
