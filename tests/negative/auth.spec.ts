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
      const leaked = (await api.projects.list()).filter((project) => project.name === payload.name);
      // Track before asserting, so a project created despite the rejection is still deleted.
      for (const project of leaked) testData.track('project', project.id);
      expect(leaked).toEqual([]);
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
      const leaked = (await api.projects.list()).filter((project) => project.name === payload.name);
      // Track before asserting, so a project created despite the rejection is still deleted.
      for (const project of leaked) testData.track('project', project.id);
      expect(leaked).toEqual([]);
    });
  },
);
