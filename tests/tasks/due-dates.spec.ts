import { expect, Schema, test } from '../../src/fixtures';
import { todayIn, tomorrowIn } from '../../src/utils/dates';

test(
  'TC-009 A due date entered in words lands on the same day as the same date entered explicitly',
  { tag: ['@TC-009', '@regression'] },
  async ({ api, testData, accountTimezone }) => {
    // Todoist resolves "tomorrow" in the account timezone, so the expected date comes from it too.
    const today = todayIn(accountTimezone);
    const tomorrow = tomorrowIn(accountTimezone);

    const inWords = await test.step('Create a task due "tomorrow" in words', () =>
      testData.createTask({ due_string: 'tomorrow', due_lang: 'en' }));

    const explicit = await test.step('Create a task with tomorrow as an explicit date', () =>
      testData.createTask({ due_date: tomorrow }));

    const [inWordsLoaded, explicitLoaded] = await test.step('Load both tasks again', async () => {
      const loaded = await Promise.all([api.tasks.get(inWords.id), api.tasks.get(explicit.id)]);
      for (const task of loaded) expect(task).toMatchSchema(Schema.task);
      return loaded;
    });

    // Around midnight in the account timezone "tomorrow" can move between the two calls.
    // eslint-disable-next-line playwright/no-skipped-test -- runtime guard, not a disabled test
    test.skip(
      todayIn(accountTimezone) !== today,
      'The day changed in the account timezone during the test',
    );

    await test.step('Both tasks are due on the same day, tomorrow in the account timezone', () => {
      expect(inWordsLoaded.due?.date).toBe(explicitLoaded.due?.date);
      expect(explicitLoaded.due?.date).toBe(tomorrow);
      expect(inWordsLoaded.due?.is_recurring).toBe(false);
    });
  },
);
