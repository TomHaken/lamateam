import { expect, Schema, test } from '../../src/fixtures';
import { todayIn, tomorrowIn } from '../../src/utils/dates';

/** Seconds until the next midnight in the given timezone. */
function secondsToMidnight(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((p) => p.type === type)?.value);
    if (!Number.isFinite(value)) throw new Error(`No ${type} in the time of day in ${timeZone}.`);
    return value;
  };
  return 24 * 60 * 60 - (part('hour') * 3600 + part('minute') * 60 + part('second'));
}

/**
 * Todoist resolves "tomorrow" in the account timezone. Close to midnight there, the day could
 * change between our date and Todoist's, so a test starting in the last minute waits until
 * 15 seconds after midnight (and gets that much more time). The 15 s also cover a Todoist server
 * clock that is a few seconds behind ours.
 */
async function waitIfCloseToMidnight(timeZone: string): Promise<void> {
  const untilMidnight = secondsToMidnight(timeZone);
  if (untilMidnight >= 60) return;
  const waitMs = (untilMidnight + 15) * 1000;
  // A timeout of 0 means no limit, so there is nothing to extend.
  if (test.info().timeout > 0) test.setTimeout(test.info().timeout + waitMs);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

test(
  'TC-009 A due date entered in words lands on the same day as the same date entered explicitly',
  {
    tag: ['@TC-009', '@regression'],
    annotation: { type: 'issue', description: 'https://github.com/TomHaken/lamateam/issues/11' },
  },
  async ({ api, testData, accountTimezone }) => {
    // Tomorrow in the account timezone, never from the runner clock (CI runs in UTC).
    await waitIfCloseToMidnight(accountTimezone);
    const today = todayIn(accountTimezone);
    const tomorrow = tomorrowIn(accountTimezone);

    const inWords =
      await test.step('Create a task with the due date "tomorrow" in words', async () => {
        const task = await testData.createTask({ due_string: 'tomorrow', due_lang: 'en' });
        expect(task.due).not.toBeNull();
        return task;
      });

    const explicit =
      await test.step("Create a task with tomorrow's date entered explicitly", async () => {
        const task = await testData.createTask({ due_date: tomorrow });
        expect(task.due).not.toBeNull();
        return task;
      });

    await test.step('Load both tasks again and check they are due on the same day, tomorrow', async () => {
      const loadedInWords = await api.tasks.get(inWords.id);
      const loadedExplicit = await api.tasks.get(explicit.id);
      expect(todayIn(accountTimezone), 'The account day changed during the test').toBe(today);

      expect(loadedInWords.due?.date, '"tomorrow" in words and the explicit date differ').toBe(
        loadedExplicit.due?.date,
      );
      expect(loadedInWords.due?.date, 'The task with "tomorrow" in words').toBe(tomorrow);
      expect(loadedExplicit.due?.date, "The task with tomorrow's explicit date").toBe(tomorrow);
      expect(loadedInWords.due?.is_recurring).toBe(false);
      expect(loadedExplicit.due?.is_recurring).toBe(false);

      expect(loadedInWords).toMatchSchema(Schema.task);
      expect(loadedExplicit).toMatchSchema(Schema.task);
    });
  },
);
