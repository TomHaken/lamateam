import type { CreateTaskPayload } from '../../src/clients';
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

test(
  'TC-007 A task can be created with the required fields only, and every optional field is stored exactly as it was entered',
  {
    tag: ['@TC-007', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/9' },
  },
  async ({ api, testData, account, accountTimezone }) => {
    await test.step('Create a task with content only and check the defaults of the optional fields', async () => {
      const content = uniqueName('task');
      const created = await testData.createTask({ content });

      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(content);
      // A clear failure if the account has no Inbox, instead of a confusing project mismatch.
      expect(account.inbox_project_id).not.toBeNull();
      expect(loaded.project_id).toBe(account.inbox_project_id);
      expect(loaded.description).toBe('');
      expect(loaded.priority).toBe(1);
      expect(loaded.labels).toEqual([]);
      expect(loaded.due).toBeNull();
      expect(loaded.deadline).toBeNull();
      expect(loaded.duration).toBeNull();
      expect(loaded.parent_id).toBeNull();
      expect(loaded.section_id).toBeNull();
      expect(loaded.checked).toBe(false);
      expect(created).toMatchSchema(Schema.task);
      expect(loaded).toMatchSchema(Schema.task);
    });

    await test.step('Create a task with every optional field and check each one is stored as entered', async () => {
      const project = await testData.createProject();
      const labelName = uniqueName('label');
      const label = await testData.createLabel({ name: labelName });
      expect(label.name).toBe(labelName);
      const entered: Required<
        Pick<
          CreateTaskPayload,
          'content' | 'description' | 'priority' | 'labels' | 'due_date' | 'project_id'
        >
      > = {
        content: uniqueName('task'),
        description: 'První řádek popisu\nDruhý řádek: žluťoučký kůň',
        priority: 4,
        labels: [label.name],
        // 10 days ahead in the account timezone, never from the runner clock (CI runs in UTC).
        due_date: addDays(todayIn(accountTimezone), 10),
        project_id: project.id,
      };
      const created = await testData.createTask(entered);

      const loaded = await api.tasks.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(entered.content);
      expect(loaded.description).toBe(entered.description);
      expect(loaded.priority).toBe(entered.priority);
      expect(loaded.labels).toEqual(entered.labels);
      expect(loaded.due?.date).toBe(entered.due_date);
      expect(loaded.due?.is_recurring).toBe(false);
      expect(loaded.project_id).toBe(entered.project_id);
      expect(created).toMatchSchema(Schema.task);
      expect(loaded).toMatchSchema(Schema.task);
    });
  },
);
