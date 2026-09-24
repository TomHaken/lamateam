import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-012 A task ticked off by mistake can be put back among the open ones, and it is the same task, not a new one',
  {
    tag: ['@TC-012', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/13' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
