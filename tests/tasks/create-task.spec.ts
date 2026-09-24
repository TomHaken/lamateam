import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';
import { addDays, todayIn } from '../../src/utils/dates';

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

test(
  'TC-003 A new task is created with the due date that was entered',
  {
    tag: ['@TC-003', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/5' },
  },
  async ({ api, testData, accountTimezone }) => {
    // A week ahead in the account timezone, never from the runner clock (CI runs in UTC).
    const dueDate = addDays(todayIn(accountTimezone), 7);

    const created = await test.step('Create a task with the entered due date', async () => {
      const task = await testData.createTask({ due_date: dueDate });
      expect(task.due?.date).toBe(dueDate);
      expect(task.due?.is_recurring).toBe(false);
      expect(task).toMatchSchema(Schema.task);
      return task;
    });

    await test.step('Load the task again and check its due date', async () => {
      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.due?.date).toBe(dueDate);
      expect(loaded.due?.is_recurring).toBe(false);
      expect(loaded).toMatchSchema(Schema.task);
    });
  },
);
