import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-001 A new project is created and comes back under the name that was entered',
  {
    tag: ['@TC-001', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/3' },
  },
  async ({ api, testData }) => {
    // Diacritics on purpose: the name must come back exactly as entered.
    const name = `${uniqueName('project')} Příliš žluťoučký kůň`;

    const created = await test.step('Create a project with the entered name', async () => {
      const project = await testData.createProject({ name });
      expect(project.name).toBe(name);
      expect(project).toMatchSchema(Schema.project);
      return project;
    });

    await test.step('Load the project again and check its name', async () => {
      const loaded = await api.projects.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe(name);
      expect(loaded).toMatchSchema(Schema.project);
    });
  },
);

// Placeholder until #8 is implemented: replace `test.fixme` with `test` and a real body,
// keep the title, tags and the `issue` annotation.
test.fixme(
  'TC-006 A renamed project loads under the new name the next time it is opened, not only in the response to the update',
  {
    tag: ['@TC-006', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/8' },
  },
  () => {
    // Fails on purpose, so a placeholder turned into `test` without a body cannot pass.
    expect(false, 'Not implemented yet, see the linked issue').toBe(true);
  },
);
