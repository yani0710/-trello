const bcrypt = require("bcryptjs");
const { getDb } = require("./db");
const { initializeDatabase } = require("./init");

async function resetData(db) {
  await db.exec(`
    DELETE FROM comments;
    DELETE FROM task_history;
    DELETE FROM tasks;
    DELETE FROM board_columns;
    DELETE FROM board_members;
    DELETE FROM boards;
    DELETE FROM activity_logs;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('users','boards','board_members','board_columns','tasks','task_history','comments','activity_logs');
  `);
}

async function seed() {
  await initializeDatabase();
  const db = await getDb();
  await resetData(db);

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user1234", 10);

  await db.run("INSERT INTO users (id, username, email, password_hash, role_id, is_active) VALUES (1, 'admin', 'admin@mini-trello.local', ?, 1, 1)", [adminHash]);
  await db.run("INSERT INTO users (id, username, email, password_hash, role_id, is_active) VALUES (2, 'maria', 'maria@mini-trello.local', ?, 2, 1)", [userHash]);
  await db.run("INSERT INTO users (id, username, email, password_hash, role_id, is_active) VALUES (3, 'ivan', 'ivan@mini-trello.local', ?, 2, 1)", [userHash]);

  await db.run("INSERT INTO boards (id, title, description, owner_id) VALUES (1, 'Училищен проект', 'Организация на задачи за училищния Kanban проект.', 2)");
  await db.run("INSERT INTO boards (id, title, description, owner_id) VALUES (2, 'Маркетинг кампания', 'Подготовка на съдържание и срокове за нова кампания.', 1)");

  await db.exec(`
    INSERT INTO board_members (board_id, user_id) VALUES (1, 2);
    INSERT INTO board_members (board_id, user_id) VALUES (1, 3);
    INSERT INTO board_members (board_id, user_id) VALUES (2, 1);
    INSERT INTO board_members (board_id, user_id) VALUES (2, 2);
  `);

  const columns = [
    [1, 1, "To Do", 1],
    [2, 1, "In Progress", 2],
    [3, 1, "Done", 3],
    [4, 2, "To Do", 1],
    [5, 2, "In Progress", 2],
    [6, 2, "Done", 3]
  ];

  for (const [id, boardId, title, position] of columns) {
    await db.run("INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)", [id, boardId, title, position]);
  }

  await db.exec(`
    INSERT INTO tasks (id, column_id, board_id, title, description, due_date, priority, label_color, created_by, assigned_to)
    VALUES
      (1, 1, 1, 'Създай wireframes', 'Подготви базови екрани за login, dashboard и board view.', '2026-03-31T09:00:00.000Z', 'High', '#ef4444', 2, 2),
      (2, 2, 1, 'Изгради backend API', 'Направи auth, boards и tasks endpoints.', '2026-04-02T12:00:00.000Z', 'Medium', '#2563eb', 2, 3),
      (3, 5, 2, 'Подготви Facebook постове', 'Създай серия публикации за следващата седмица.', '2026-04-01T08:00:00.000Z', 'Low', '#14b8a6', 1, 2),
      (4, 6, 2, 'Финален review', 'Провери готовите материали и ги одобри.', '2026-03-28T14:00:00.000Z', 'High', '#f59e0b', 1, 1);
  `);

  await db.exec(`
    INSERT INTO task_history (task_id, from_column_id, to_column_id, moved_by, moved_at) VALUES
      (1, NULL, 1, 2, '2026-03-20T09:00:00.000Z'),
      (2, NULL, 1, 2, '2026-03-21T10:00:00.000Z'),
      (2, 1, 2, 3, '2026-03-22T13:30:00.000Z'),
      (3, NULL, 4, 1, '2026-03-19T11:00:00.000Z'),
      (3, 4, 5, 2, '2026-03-21T16:15:00.000Z'),
      (4, NULL, 4, 1, '2026-03-18T15:00:00.000Z'),
      (4, 4, 5, 1, '2026-03-19T17:00:00.000Z'),
      (4, 5, 6, 1, '2026-03-20T10:00:00.000Z');
  `);

  await db.exec(`
    INSERT INTO comments (task_id, user_id, content, created_at) VALUES
      (1, 3, 'Ще добавя и идеи за mobile изглед.', '2026-03-21T08:30:00.000Z'),
      (2, 2, 'Auth частта е готова, остават board permissions.', '2026-03-22T14:00:00.000Z'),
      (3, 2, 'Ще подготвя текстовете до утре сутрин.', '2026-03-21T18:20:00.000Z');
  `);

  await db.exec(`
    INSERT INTO activity_logs (user_id, action, details, created_at) VALUES
      (1, 'SEED', 'Admin demo account created.', '2026-03-20T08:00:00.000Z'),
      (2, 'BOARD_CREATED', 'Created board Училищен проект.', '2026-03-20T08:10:00.000Z'),
      (3, 'TASK_MOVED', 'Moved task #2 to In Progress.', '2026-03-22T13:30:00.000Z');
  `);

  console.log("Seed data inserted successfully.");
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}

module.exports = { seed };
