import type { Task } from '../../src/clients';
import { uniqueName } from '../../src/data/runId';
import { expect, Schema, test } from '../../src/fixtures';

/** Sorted ids, so the comparison does not depend on the order the API returns. */
function idsOf(tasks: readonly Task[]): string[] {
  return tasks.map((task) => task.id).sort();
}

test(
  "TC-008 A project's task list contains only the tasks of that project, nothing from elsewhere",
  {
    tag: ['@TC-008', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/10' },
  },
  async ({ api, testData }) => {
    const contentsA = [uniqueName('task-a'), uniqueName('task-a'), uniqueName('task-a')];
    const contentsB = [uniqueName('task-b'), uniqueName('task-b')];

    const { projectA, tasksA, tasksB } =
      await test.step('Create project A with three tasks and project B with two tasks', async () => {
        const projectA = await testData.createProject();
        const projectB = await testData.createProject();
        const tasksA: Task[] = [];
        for (const content of contentsA) {
          tasksA.push(await testData.createTask({ content, project_id: projectA.id }));
        }
        const tasksB: Task[] = [];
        for (const content of contentsB) {
          tasksB.push(await testData.createTask({ content, project_id: projectB.id }));
        }

        // Guard: B's tasks really are in B, so "not in A's list" below is not true by accident.
        const listedB = await api.tasks.list({ project_id: projectB.id });
        expect(idsOf(listedB)).toEqual(idsOf(tasksB));

        return { projectA, tasksA, tasksB };
      });

    await test.step('List the tasks of project A (all pages)', async () => {
      const listedA = await api.tasks.list({ project_id: projectA.id });

      // Project A is new and only this test writes to it, so the list must be exactly its tasks.
      expect(idsOf(listedA)).toEqual(idsOf(tasksA));
      for (const task of listedA) {
        expect(task.project_id).toBe(projectA.id);
      }
      const idsB = new Set(tasksB.map((task) => task.id));
      expect(listedA.filter((task) => idsB.has(task.id))).toEqual([]);
      // Compared with the entered texts, not with the create responses.
      expect(listedA.map((task) => task.content).sort()).toEqual([...contentsA].sort());

      for (const task of listedA) {
        expect(task).toMatchSchema(Schema.task);
      }
    });
  },
);
