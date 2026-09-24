import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-005 A comment is added to a task with the text that was entered',
  {
    tag: ['@TC-005', '@smoke'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/7' },
  },
  async ({ api, testData }) => {
    // Diacritics on purpose: the text must come back exactly as entered.
    const content = `${uniqueName('comment')} Příliš žluťoučký kůň`;
    const task = await testData.createTask();

    const created = await test.step('Add a comment with the entered text to the task', async () => {
      const comment = await testData.createComment({ task_id: task.id }, { content });
      expect(comment.content).toBe(content);
      // The request sends `task_id`, the API v1 response names the same field `item_id`.
      expect(comment.item_id).toBe(task.id);
      expect(comment.project_id ?? null).toBeNull();
      expect(comment).toMatchSchema(Schema.comment);
      return comment;
    });

    await test.step('Load the comment again and check its text and task', async () => {
      const loaded = await api.comments.get(created.id);
      expect(loaded.id).toBe(created.id);
      expect(loaded.content).toBe(content);
      expect(loaded.item_id).toBe(task.id);
      expect(loaded.project_id ?? null).toBeNull();
      expect(loaded).toMatchSchema(Schema.comment);
    });
  },
);
