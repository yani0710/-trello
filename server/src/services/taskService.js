const { getDb } = require("../database/db");
const { ensureBoardAccess } = require("../middleware/boardAccess");
const { AppError } = require("../utils/errors");
const { logActivity } = require("../utils/activity");
const { ensureDueDate, ensureOptionalText, ensurePriority, ensureString } = require("../utils/validators");

async function ensureTaskAccess(user, taskId) {
  const db = await getDb();
  const task = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);
  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, task.board_id);
  }

  return task;
}

async function createTask(user, boardId, payload) {
  const db = await getDb();
  if (user.role !== "Administrator") {
    await ensureBoardAccess(user.id, boardId);
  }

  const title = ensureString(payload.title, "Task title", 140);
  const description = ensureOptionalText(payload.description, 4000);
  const priority = ensurePriority(payload.priority);
  const dueDate = ensureDueDate(payload.dueDate);
  const labelColor = String(payload.labelColor || "#2563eb").slice(0, 20);
  const assignedTo = payload.assignedTo ? Number(payload.assignedTo) : null;
  const columnId = Number(payload.columnId);

  const column = await db.get("SELECT * FROM board_columns WHERE id = ? AND board_id = ?", [columnId, boardId]);
  if (!column) {
    throw new AppError("Invalid target column.");
  }

  const result = await db.run(
    `INSERT INTO tasks (column_id, board_id, title, description, due_date, priority, label_color, created_by, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [columnId, boardId, title, description, dueDate, priority, labelColor, user.id, assignedTo]
  );

  await db.run(
    "INSERT INTO task_history (task_id, from_column_id, to_column_id, moved_by) VALUES (?, ?, ?, ?)",
    [result.lastID, null, columnId, user.id]
  );

  await logActivity(user.id, "TASK_CREATED", `Created task \"${title}\" on board #${boardId}.`);
  return result.lastID;
}

async function getTaskDetails(user, taskId) {
  const db = await getDb();
  await ensureTaskAccess(user, taskId);

  const task = await db.get(
    `SELECT tasks.*, creators.username AS author_name, assignees.username AS assignee_name,
            board_columns.title AS column_title
     FROM tasks
     JOIN users AS creators ON creators.id = tasks.created_by
     LEFT JOIN users AS assignees ON assignees.id = tasks.assigned_to
     JOIN board_columns ON board_columns.id = tasks.column_id
     WHERE tasks.id = ?`,
    [taskId]
  );

  const comments = await db.all(
    `SELECT comments.*, users.username
     FROM comments
     JOIN users ON users.id = comments.user_id
     WHERE comments.task_id = ?
     ORDER BY comments.created_at ASC`,
    [taskId]
  );

  const history = await db.all(
    `SELECT task_history.*, users.username AS moved_by_name,
            from_column.title AS from_column_title,
            to_column.title AS to_column_title
     FROM task_history
     JOIN users ON users.id = task_history.moved_by
     LEFT JOIN board_columns AS from_column ON from_column.id = task_history.from_column_id
     LEFT JOIN board_columns AS to_column ON to_column.id = task_history.to_column_id
     WHERE task_history.task_id = ?
     ORDER BY task_history.moved_at DESC`,
    [taskId]
  );

  return { task, comments, history };
}

async function updateTask(user, taskId, payload) {
  const db = await getDb();
  await ensureTaskAccess(user, taskId);

  const title = ensureString(payload.title, "Task title", 140);
  const description = ensureOptionalText(payload.description, 4000);
  const priority = ensurePriority(payload.priority);
  const dueDate = ensureDueDate(payload.dueDate);
  const labelColor = String(payload.labelColor || "#2563eb").slice(0, 20);
  const assignedTo = payload.assignedTo ? Number(payload.assignedTo) : null;

  await db.run(
    `UPDATE tasks
     SET title = ?, description = ?, due_date = ?, priority = ?, label_color = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, description, dueDate, priority, labelColor, assignedTo, taskId]
  );

  await logActivity(user.id, "TASK_UPDATED", `Updated task #${taskId}.`);
}

async function moveTask(user, taskId, toColumnId) {
  const db = await getDb();
  const task = await ensureTaskAccess(user, taskId);
  const targetColumn = await db.get("SELECT * FROM board_columns WHERE id = ? AND board_id = ?", [toColumnId, task.board_id]);
  if (!targetColumn) {
    throw new AppError("Invalid destination column.");
  }

  await db.run("UPDATE tasks SET column_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [toColumnId, taskId]);
  await db.run(
    "INSERT INTO task_history (task_id, from_column_id, to_column_id, moved_by) VALUES (?, ?, ?, ?)",
    [taskId, task.column_id, toColumnId, user.id]
  );

  await logActivity(user.id, "TASK_MOVED", `Moved task #${taskId} to column \"${targetColumn.title}\".`);
}

async function deleteTask(user, taskId) {
  const db = await getDb();
  const task = await ensureTaskAccess(user, taskId);
  await db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
  await logActivity(user.id, "TASK_DELETED", `Deleted task \"${task.title}\".`);
}

async function addComment(user, taskId, content) {
  const db = await getDb();
  await ensureTaskAccess(user, taskId);
  const normalized = ensureString(content, "Comment", 1000);
  await db.run("INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)", [taskId, user.id, normalized]);
  await logActivity(user.id, "COMMENT_ADDED", `Added a comment to task #${taskId}.`);
}

module.exports = {
  addComment,
  createTask,
  deleteTask,
  getTaskDetails,
  moveTask,
  updateTask
};
