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
    // Kept short: the API silently cuts label names at about 60 characters (seen once, characters
    // or bytes not confirmed; the OpenAPI spec says 128). uniqueName('label') alone is 52 characters
    // on CI (50 locally), so only a short suffix fits.
    const name = `${uniqueName('label')} kůň`;

    const created = await test.step('Create a personal label with the entered name', async () => {
      expect(
        Buffer.byteLength(name),
        'label names longer than 60 are cut by the API',
      ).toBeLessThanOrEqual(60);
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
