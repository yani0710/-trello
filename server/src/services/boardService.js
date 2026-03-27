const { getDb } = require("../database/db");
const { ensureBoardAccess } = require("../middleware/boardAccess");
const { AppError } = require("../utils/errors");
const { logActivity } = require("../utils/activity");
const { ensureOptionalText, ensureString } = require("../utils/validators");

const WORKFLOW_COLUMNS = [
  { key: "not_started", title: "Not Started", aliases: ["to do", "todo", "not started", "no started"] },
  { key: "in_progress", title: "In Progress", aliases: ["in progress", "progress", "doing"] },
  { key: "done", title: "Done", aliases: ["done", "completed", "complete", "finished"] }
];

function normalizeColumnTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getWorkflowDefinition(title) {
  const normalized = normalizeColumnTitle(title);
  return WORKFLOW_COLUMNS.find((column) => column.aliases.includes(normalized)) || null;
}

async function ensureWorkflowColumns(db, boardId) {
  const existingColumns = await db.all(
    "SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position",
    [boardId]
  );

  const matchedKeys = new Set();
  let nextPosition = existingColumns.reduce((max, column) => Math.max(max, Number(column.position) || 0), 0);

  for (const column of existingColumns) {
    const workflow = getWorkflowDefinition(column.title);
    if (!workflow || matchedKeys.has(workflow.key)) {
      continue;
    }

    matchedKeys.add(workflow.key);
    if (column.title !== workflow.title) {
      await db.run("UPDATE board_columns SET title = ? WHERE id = ?", [workflow.title, column.id]);
    }
  }

  for (const workflow of WORKFLOW_COLUMNS) {
    if (matchedKeys.has(workflow.key)) {
      continue;
    }

    nextPosition += 1;
    await db.run(
      "INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)",
      [boardId, workflow.title, nextPosition]
    );
  }
}

async function createDefaultColumns(db, boardId) {
  for (let index = 0; index < WORKFLOW_COLUMNS.length; index += 1) {
    await db.run(
      "INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)",
      [boardId, WORKFLOW_COLUMNS[index].title, index + 1]
    );
  }
}

async function createBoard(userId, payload) {
  const db = await getDb();
  const title = ensureString(payload.title, "Board title", 120);
  const description = ensureOptionalText(payload.description, 600);
  const result = await db.run(
    "INSERT INTO boards (title, description, owner_id) VALUES (?, ?, ?)",
    [title, description, userId]
  );

  await db.run("INSERT INTO board_members (board_id, user_id) VALUES (?, ?)", [result.lastID, userId]);
  await createDefaultColumns(db, result.lastID);
  await logActivity(userId, "BOARD_CREATED", `Created board \"${title}\".`);
  return result.lastID;
}

async function listBoards(user) {
  const db = await getDb();
  const sql = user.role === "Administrator"
    ? `SELECT boards.id, boards.title, boards.description, boards.created_at, boards.is_archived,
              owners.username AS owner_name,
              COUNT(DISTINCT board_members.user_id) AS member_count,
              COUNT(DISTINCT tasks.id) AS task_count
       FROM boards
       JOIN board_members ON board_members.board_id = boards.id
       JOIN users AS owners ON owners.id = boards.owner_id
       LEFT JOIN tasks ON tasks.board_id = boards.id
       GROUP BY boards.id
       ORDER BY boards.created_at DESC`
    : `SELECT boards.id, boards.title, boards.description, boards.created_at, boards.is_archived,
              owners.username AS owner_name,
              COUNT(DISTINCT member_list.user_id) AS member_count,
              COUNT(DISTINCT tasks.id) AS task_count
       FROM boards
       JOIN board_members ON board_members.board_id = boards.id AND board_members.user_id = ?
       JOIN users AS owners ON owners.id = boards.owner_id
       LEFT JOIN board_members AS member_list ON member_list.board_id = boards.id
       LEFT JOIN tasks ON tasks.board_id = boards.id
       GROUP BY boards.id
       ORDER BY boards.created_at DESC`;

  return user.role === "Administrator" ? db.all(sql) : db.all(sql, [user.id]);
}

async function getBoardDetails(user, boardId, sortBy = "position", assignee = "") {
  const db = await getDb();
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, boardId);
  }

  const board = await db.get(
    `SELECT boards.*, owners.username AS owner_name
     FROM boards
     JOIN users AS owners ON owners.id = boards.owner_id
     WHERE boards.id = ?`,
    [boardId]
  );

  if (!board) {
    throw new AppError("Board not found.", 404);
  }

  await ensureWorkflowColumns(db, boardId);

  const members = await db.all(
    `SELECT users.id, users.username, users.email, roles.name AS role
     FROM board_members
     JOIN users ON users.id = board_members.user_id
     JOIN roles ON roles.id = users.role_id
     WHERE board_members.board_id = ?
     ORDER BY users.username`,
    [boardId]
  );

  const columns = await db.all(
    "SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position",
    [boardId]
  );

  columns.forEach((column) => {
    const workflow = getWorkflowDefinition(column.title);
    column.workflow_key = workflow?.key || null;
    column.is_system = Boolean(workflow);
  });

  const orderClause = sortBy === "priority"
    ? "CASE tasks.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, tasks.created_at DESC"
    : sortBy === "due_date"
      ? "CASE WHEN tasks.due_date IS NULL THEN 1 ELSE 0 END, tasks.due_date ASC"
      : "tasks.created_at DESC";

  for (const column of columns) {
    const taskSql = `SELECT tasks.*, creators.username AS author_name, assignees.username AS assignee_name
                     FROM tasks
                     JOIN users AS creators ON creators.id = tasks.created_by
                     LEFT JOIN users AS assignees ON assignees.id = tasks.assigned_to
                     WHERE tasks.column_id = ? ${assignee ? "AND tasks.assigned_to = ?" : ""}
                     ORDER BY ${orderClause}`;
    column.tasks = await db.all(taskSql, assignee ? [column.id, Number(assignee)] : [column.id]);
  }

  const stats = await db.get(
    `SELECT COUNT(*) AS total_tasks,
            SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS high_priority,
            SUM(CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END) AS with_due_date
     FROM tasks
     WHERE board_id = ?`,
    [boardId]
  );

  return { board, members, columns, stats, filters: { sortBy, assignee } };
}

async function inviteMember(ownerUser, boardId, email) {
  const db = await getDb();
  const board = ownerUser.role === "Administrator"
    ? await db.get("SELECT * FROM boards WHERE id = ?", [boardId])
    : await ensureBoardAccess(ownerUser.id, boardId, true);

  if (!board) {
    throw new AppError("Board not found.", 404);
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await db.get("SELECT id, username, is_active FROM users WHERE email = ?", [normalizedEmail]);
  if (!user) {
    throw new AppError("User with this email was not found.", 404);
  }
  if (!user.is_active) {
    throw new AppError("Inactive users cannot be added to boards.");
  }

  await db.run("INSERT OR IGNORE INTO board_members (board_id, user_id) VALUES (?, ?)", [boardId, user.id]);
  await logActivity(ownerUser.id, "BOARD_MEMBER_ADDED", `Added ${user.username} to board #${boardId}.`);
}

async function deleteBoard(user, boardId) {
  const db = await getDb();
  const board = await db.get("SELECT * FROM boards WHERE id = ?", [boardId]);
  if (!board) {
    throw new AppError("Board not found.", 404);
  }
  if (user.role !== "Administrator" && board.owner_id !== user.id) {
    throw new AppError("Only the owner or an administrator can delete this board.", 403);
  }

  await db.run("DELETE FROM boards WHERE id = ?", [boardId]);
  await logActivity(user.id, "BOARD_DELETED", `Deleted board \"${board.title}\".`);
}

async function createColumn(user, boardId, payload) {
  const db = await getDb();
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, boardId);
  }

  const title = ensureString(payload.title, "Column title", 80);
  const { nextPosition } = await db.get(
    "SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition FROM board_columns WHERE board_id = ?",
    [boardId]
  );

  const result = await db.run(
    "INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)",
    [boardId, title, nextPosition]
  );

  await logActivity(user.id, "COLUMN_CREATED", `Added column \"${title}\" to board #${boardId}.`);
  return result.lastID;
}

async function renameColumn(user, columnId, payload) {
  const db = await getDb();
  const column = await db.get("SELECT * FROM board_columns WHERE id = ?", [columnId]);
  if (!column) {
    throw new AppError("Column not found.", 404);
  }
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, column.board_id);
  }
  if (getWorkflowDefinition(column.title)) {
    throw new AppError("Default workflow columns cannot be renamed.");
  }

  const title = ensureString(payload.title, "Column title", 80);
  await db.run("UPDATE board_columns SET title = ? WHERE id = ?", [title, columnId]);
  await logActivity(user.id, "COLUMN_RENAMED", `Renamed column #${columnId} to \"${title}\".`);
}

async function deleteColumn(user, columnId) {
  const db = await getDb();
  const column = await db.get("SELECT * FROM board_columns WHERE id = ?", [columnId]);
  if (!column) {
    throw new AppError("Column not found.", 404);
  }
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, column.board_id);
  }
  if (getWorkflowDefinition(column.title)) {
    throw new AppError("Default workflow columns cannot be deleted.");
  }

  const taskCount = await db.get("SELECT COUNT(*) AS count FROM tasks WHERE column_id = ?", [columnId]);
  if (taskCount.count > 0) {
    throw new AppError("You cannot delete a column that still contains tasks.");
  }

  await db.run("DELETE FROM board_columns WHERE id = ?", [columnId]);
  await logActivity(user.id, "COLUMN_DELETED", `Deleted column \"${column.title}\".`);
}

async function reorderColumns(user, boardId, columnIds) {
  const db = await getDb();
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, boardId);
  }

  for (let index = 0; index < columnIds.length; index += 1) {
    await db.run(
      "UPDATE board_columns SET position = ? WHERE id = ? AND board_id = ?",
      [index + 1, Number(columnIds[index]), boardId]
    );
  }

  await logActivity(user.id, "COLUMNS_REORDERED", `Reordered columns on board #${boardId}.`);
}

module.exports = {
  createBoard,
  createColumn,
  deleteBoard,
  deleteColumn,
  getBoardDetails,
  inviteMember,
  listBoards,
  renameColumn,
  reorderColumns
};
