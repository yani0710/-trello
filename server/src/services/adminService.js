const { getDb } = require("../database/db");
const { AppError } = require("../utils/errors");
const { logActivity } = require("../utils/activity");

async function getAdminOverview() {
  const db = await getDb();
  const counts = await db.get(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users_count,
       (SELECT COUNT(*) FROM boards) AS boards_count,
       (SELECT COUNT(*) FROM tasks) AS tasks_count,
       (SELECT COUNT(*) FROM comments) AS comments_count`
  );

  const recentActivity = await db.all(
    `SELECT activity_logs.*, users.username
     FROM activity_logs
     LEFT JOIN users ON users.id = activity_logs.user_id
     ORDER BY activity_logs.created_at DESC
     LIMIT 12`
  );

  const boardMemberships = await db.all(
    `SELECT boards.title AS board_title, users.username
     FROM board_members
     JOIN boards ON boards.id = board_members.board_id
     JOIN users ON users.id = board_members.user_id
     ORDER BY boards.title, users.username`
  );

  return { counts, recentActivity, boardMemberships };
}

async function listUsers() {
  const db = await getDb();
  return db.all(
    `SELECT users.id, users.username, users.email, users.is_active, users.created_at,
            roles.name AS role,
            COUNT(DISTINCT board_members.board_id) AS boards_count,
            MAX(activity_logs.created_at) AS last_activity
     FROM users
     JOIN roles ON roles.id = users.role_id
     LEFT JOIN board_members ON board_members.user_id = users.id
     LEFT JOIN activity_logs ON activity_logs.user_id = users.id
     GROUP BY users.id
     ORDER BY users.created_at ASC`
  );
}

async function toggleUserStatus(adminId, userId, isActive) {
  const db = await getDb();
  const user = await db.get("SELECT id, username FROM users WHERE id = ?", [userId]);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  await db.run("UPDATE users SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, userId]);
  await logActivity(adminId, "USER_STATUS_CHANGED", `Set ${user.username} to ${isActive ? "active" : "inactive"}.`);
}

async function setBoardMembership(adminId, boardId, userId, addMember) {
  const db = await getDb();
  if (addMember) {
    await db.run("INSERT OR IGNORE INTO board_members (board_id, user_id) VALUES (?, ?)", [boardId, userId]);
  } else {
    const board = await db.get("SELECT owner_id FROM boards WHERE id = ?", [boardId]);
    if (board && Number(board.owner_id) === Number(userId)) {
      throw new AppError("The board owner cannot be removed from the board.");
    }
    await db.run("DELETE FROM board_members WHERE board_id = ? AND user_id = ?", [boardId, userId]);
  }

  await logActivity(adminId, "BOARD_ACCESS_CHANGED", `Membership updated for user #${userId} on board #${boardId}.`);
}

module.exports = { getAdminOverview, listUsers, setBoardMembership, toggleUserStatus };
