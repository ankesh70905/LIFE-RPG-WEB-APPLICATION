import { createNotification } from "../utils/notifications.js";

async function createReminderIfNew(client, reminder) {
  const inserted = await client.query(
    `INSERT INTO reminders (
       user_id, reminder_type, reference_id, reminder_key, title, message, scheduled_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, reminder_key) DO NOTHING
     RETURNING id`,
    [
      reminder.userId,
      reminder.type,
      reminder.referenceId,
      reminder.key,
      reminder.title,
      reminder.message
    ]
  );

  if (!inserted.rowCount) {
    return null;
  }

  const notification = await createNotification(client, {
    userId: reminder.userId,
    type: `system`,
    title: reminder.title,
    message: reminder.message
  });

  await client.query(
    `UPDATE reminders
     SET delivered_at = CURRENT_TIMESTAMP, notification_id = $1
     WHERE id = $2`,
    [notification.id, inserted.rows[0].id]
  );

  return notification;
}

export async function refreshSmartReminders(client, userId) {
  let preferences;
  try {
    preferences = await client.query(
      `SELECT reminders_enabled FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    // Older installations can refresh reminders before migration 008 runs.
    if (error?.code !== "42P01") throw error;
    preferences = { rows: [] };
  }
  if (preferences.rows[0] && !preferences.rows[0].reminders_enabled) {
    return [];
  }
  const notifications = [];
  const [quests, habits, challenges, goals] = await Promise.all([
    client.query(
      `SELECT id, title
       FROM tasks
       WHERE user_id = $1
         AND completed = FALSE
         AND priority = 'high'
         AND (scheduled_date = CURRENT_DATE OR due_date = CURRENT_DATE)
       ORDER BY COALESCE(due_date, scheduled_date), id
       LIMIT 3`,
      [userId]
    ),
    client.query(
      `SELECT h.id, h.title
       FROM habits h
       WHERE h.user_id = $1
         AND h.active = TRUE
         AND (
           h.frequency = 'daily'
           OR (h.frequency = 'custom' AND (EXTRACT(ISODOW FROM CURRENT_DATE)::smallint = ANY(h.custom_days)))
         )
         AND NOT EXISTS (
           SELECT 1 FROM habit_completions hc
           WHERE hc.habit_id = h.id AND hc.completion_date = CURRENT_DATE
         )
       ORDER BY h.id
       LIMIT 3`,
      [userId]
    ),
    client.query(
      `SELECT id, title
       FROM user_challenges
       WHERE user_id = $1
         AND completed_at IS NULL
         AND ends_on = CURRENT_DATE + 1
       ORDER BY id
       LIMIT 2`,
      [userId]
    ),
    client.query(
      `SELECT id, title
       FROM goals
       WHERE user_id = $1
         AND status = 'active'
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
       ORDER BY updated_at ASC
       LIMIT 2`,
      [userId]
    )
  ]);

  const today = new Date().toISOString().slice(0, 10);
  for (const quest of quests.rows) {
    const notification = await createReminderIfNew(client, {
      userId,
      type: `quest`,
      referenceId: quest.id,
      key: `quest-due-${quest.id}-${today}`,
      title: `High-priority quest due today`,
      message: `${quest.title} is scheduled for today. A small start still counts.`
    });
    if (notification) notifications.push(notification);
  }

  for (const habit of habits.rows) {
    const notification = await createReminderIfNew(client, {
      userId,
      type: `habit`,
      referenceId: habit.id,
      key: `habit-due-${habit.id}-${today}`,
      title: `Your habit is waiting`,
      message: `${habit.title} has not been completed yet today.`
    });
    if (notification) notifications.push(notification);
  }

  for (const challenge of challenges.rows) {
    const notification = await createReminderIfNew(client, {
      userId,
      type: `challenge`,
      referenceId: challenge.id,
      key: `challenge-ending-${challenge.id}`,
      title: `Challenge ends tomorrow`,
      message: `${challenge.title} is almost out of time.`
    });
    if (notification) notifications.push(notification);
  }

  for (const goal of goals.rows) {
    const notification = await createReminderIfNew(client, {
      userId,
      type: `goal`,
      referenceId: goal.id,
      key: `goal-inactive-${goal.id}-${today}`,
      title: `A gentle goal check-in`,
      message: `${goal.title} has not had progress recently. Choose one small next step.`
    });
    if (notification) notifications.push(notification);
  }

  return notifications;
}
