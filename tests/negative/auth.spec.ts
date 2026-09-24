import { expect, test } from '../../src/fixtures';

// Placeholders until each ticket is implemented: replace `test.fixme` with `test` and a real body,
// keep the title, tags and the `issue` annotation.
// The body fails on purpose, so a placeholder turned into `test` without a body cannot pass.

test.fixme(
  'TC-014a With no access token the request fails with 401 and nothing is created',
  {
    tag: ['@TC-014a', '@TC-014', '@negative'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/15' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);

test.fixme(
  'TC-014b With a malformed token the request fails with 401 and nothing is created',
  {
    tag: ['@TC-014b', '@TC-014', '@negative'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/15' },
  },
  () => {
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
