const notificationTypes = new Set([
  "achievement",
  "level_up",
  "streak",
  "purchase",
  "system"
]);

export async function createNotification(
  client,
  { userId, type, title, message }
) {
  if (!notificationTypes.has(type)) {
    throw new RangeError("Invalid notification type");
  }

  const result = await client.query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, type, title, message, is_read, created_at`,
    [userId, type, title, message]
  );

  return result.rows[0];
}
