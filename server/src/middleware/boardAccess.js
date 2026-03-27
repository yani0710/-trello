const { getDb } = require("../database/db");
const { AppError } = require("../utils/errors");

async function ensureBoardAccess(userId, boardId, requireOwner = false) {
  const db = await getDb();
  const board = await db.get("SELECT * FROM boards WHERE id = ?", [boardId]);
  if (!board) {
    throw new AppError("Board not found.", 404);
  }

  const member = await db.get(
    "SELECT id FROM board_members WHERE board_id = ? AND user_id = ?",
    [boardId, userId]
  );

  if (!member) {
    throw new AppError("You do not have access to this board.", 403);
  }

  if (requireOwner && board.owner_id !== userId) {
    throw new AppError("Only the board owner can perform this action.", 403);
  }

  return board;
}

module.exports = { ensureBoardAccess };
