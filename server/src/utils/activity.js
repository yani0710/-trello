const { getDb } = require("../database/db");

async function logActivity(userId, action, details) {
  const db = await getDb();
  await db.run(
    "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
    [userId || null, action, details || ""]
  );
}

module.exports = { logActivity };
