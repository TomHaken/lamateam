import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-012 A task ticked off by mistake can be put back among the open ones, and it is the same task, not a new one',
  {
    tag: ['@TC-012', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/13' },
  },
  async ({ api, testData }) => {
    const content = uniqueName('task');
    const task = await testData.createTask({ content });

    // The account is shared with parallel runs: only look at list items that are ours.
    const openTasksWithOurContent = async (): Promise<string[]> =>
      (await api.tasks.list({ project_id: task.project_id }))
        .filter((open) => open.content === content)
        .map((open) => open.id);

    await test.step('Close the task', async () => {
      await api.tasks.close(task.id);
      const closed = await api.tasks.get(task.id);
      expect(closed.checked).toBe(true);
      expect(await openTasksWithOurContent()).toEqual([]);
      expect(closed).toMatchSchema(Schema.task);
    });

    await test.step('Reopen the task', async () => {
      await api.tasks.reopen(task.id);
      const state = await api.tasks.get(task.id);
      expect(state.checked).toBe(false);
      expect(state.completed_at).toBeNull();
    });

    await test.step('Read the task back and find it in the open task list', async () => {
      const reopened = await api.tasks.get(task.id);
      expect(reopened.id).toBe(task.id);
      expect(reopened.content).toBe(content);
      expect(reopened.checked).toBe(false);

      // Exactly one open task with our content, and it is the original one, not a copy.
      expect(await openTasksWithOurContent()).toEqual([task.id]);
      expect(reopened).toMatchSchema(Schema.task);
    });
  },
);
