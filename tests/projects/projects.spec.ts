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

test(
  'TC-006 A renamed project loads under the new name the next time it is opened, not only in the response to the update',
  {
    tag: ['@TC-006', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/8' },
  },
  async ({ api, testData }) => {
    const project = await test.step('Create a project to rename', () => testData.createProject());

    // Diacritics on purpose: the new name must come back exactly as entered.
    const newName = `${uniqueName('project-renamed')} Příliš žluťoučký kůň`;
    expect(newName).not.toBe(project.name);

    await test.step('Rename the project', async () => {
      const updated = await api.projects.update(project.id, { name: newName });
      expect(updated.id).toBe(project.id);
      expect(updated.name).toBe(newName);
      expect(updated).toMatchSchema(Schema.project);
    });

    await test.step('Load the project again and check it has the new name', async () => {
      const loaded = await api.projects.get(project.id);
      expect(loaded.id).toBe(project.id);
      expect(loaded.name).toBe(newName);
      expect(loaded).toMatchSchema(Schema.project);
    });
  },
);
