import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body,
// keep the title, tags and the `issue` annotation.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-002 A new task is created with the text that was entered',
  {
    tag: ['@TC-002', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/4' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-003 A new task is created with the due date that was entered',
  {
    tag: ['@TC-003', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/5' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-007 A task can be created with the required fields only, and every optional field is stored exactly as it was entered',
  {
    tag: ['@TC-007', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/9' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
