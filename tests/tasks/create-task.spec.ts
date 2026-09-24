import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-002 A new task is created with the text that was entered',
  {
    tag: ['@TC-002', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/4' },
  },
  async ({ api, testData }) => {
    const content = `${uniqueName('task')} Příliš žluťoučký kůň`;

    const created = await test.step('Create a task with the entered content', async () => {
      const task = await testData.createTask({ content });
      expect(task.content).toBe(content);
      expect(task).toMatchSchema(Schema.task);
      return task;
    });

    await test.step('Load the task again and check its content', async () => {
      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(content);
      expect(loaded).toMatchSchema(Schema.task);
    });
  },
);
