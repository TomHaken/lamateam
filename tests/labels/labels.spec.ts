import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-004 A new label is created under the name that was entered',
  {
    tag: ['@TC-004', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/6' },
  },
  async ({ api, testData }) => {
    // Diacritics on purpose: the name must come back exactly as entered.
    // Kept short: the API silently cuts label names to 60 characters (the OpenAPI spec says 128),
    // and the prefix alone is about 52 characters on CI.
    const name = `${uniqueName('label')} kůň`;

    const created = await test.step('Create a personal label with the entered name', async () => {
      const label = await testData.createLabel({ name });
      expect(label.name).toBe(name);
      expect(label).toMatchSchema(Schema.label);
      return label;
    });

    await test.step('Load the label again and check its name', async () => {
      const loaded = await api.labels.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe(name);
      expect(loaded).toMatchSchema(Schema.label);
    });
  },
);
