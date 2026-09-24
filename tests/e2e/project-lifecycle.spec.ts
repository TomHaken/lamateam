import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-011 A project from empty to done: three tasks, two ticked off, one still open at the end',
  {
    tag: ['@TC-011', '@e2e'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/12' },
  },
  async ({ api, testData }) => {
    // The test works in its own new project, so the project lists below can only contain
    // this test's tasks, even though other runs use the same account at the same time.
    const project = await test.step('Start with an empty project', async () => {
      const created = await testData.createProject();
      expect(await api.tasks.list({ project_id: created.id })).toEqual([]);
      return created;
    });

    const contents = [uniqueName('task'), uniqueName('task'), uniqueName('task')] as const;
    const byContent = (a: { content: string }, b: { content: string }): number =>
      a.content.localeCompare(b.content);

    const [first, second, third] = await test.step('Add three tasks to the project', async () => {
      const tasks = [
        await testData.createTask({ content: contents[0], project_id: project.id }),
        await testData.createTask({ content: contents[1], project_id: project.id }),
        await testData.createTask({ content: contents[2], project_id: project.id }),
      ] as const;

      // Read back: all three are open in this project, with the entered content.
      const open = await api.tasks.list({ project_id: project.id });
      expect(
        open
          .map(({ content, project_id, checked }) => ({ content, project_id, checked }))
          .sort(byContent),
      ).toEqual(
        contents
          .map((content) => ({ content, project_id: project.id, checked: false }))
          .sort(byContent),
      );
      return tasks;
    });

    await test.step('Close two of the tasks', async () => {
      await api.tasks.close(first.id);
      await api.tasks.close(second.id);

      // Read back: the closure is stored, not only acknowledged.
      for (const closed of [first, second]) {
        const loaded = await api.tasks.get(closed.id);
        expect(loaded.id).toBe(closed.id);
        expect(loaded.checked).toBe(true);
        expect(loaded.completed_at).not.toBeNull();
      }
    });

    await test.step('List the open tasks of the project', async () => {
      const open = await api.tasks.list({ project_id: project.id });
      const openIds = open.map((task) => task.id);

      // Exactly one open task, and it is the one that was not closed.
      expect(openIds).toEqual([third.id]);
      expect(openIds).not.toContain(first.id);
      expect(openIds).not.toContain(second.id);

      const [remaining] = open;
      expect(remaining?.content).toBe(contents[2]);
      expect(remaining?.checked).toBe(false);
      expect(remaining).toMatchSchema(Schema.task);
    });
  },
);
