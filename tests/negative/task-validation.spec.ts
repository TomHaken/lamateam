import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-015a A task with no text is rejected',
  {
    tag: ['@TC-015a', '@TC-015', '@negative'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/16' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-015b A task with a required field missing is rejected',
  {
    tag: ['@TC-015b', '@TC-015', '@negative'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/16' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-015c A task with an unreadable due date is rejected',
  {
    tag: ['@TC-015c', '@TC-015', '@negative'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/16' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
