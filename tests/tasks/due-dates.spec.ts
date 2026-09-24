import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-009 A due date entered in words lands on the same day as the same date entered explicitly',
  {
    tag: ['@TC-009', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/11' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-013 A recurring task does not disappear when ticked off and moves on to its next due date',
  {
    tag: ['@TC-013', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/14' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
