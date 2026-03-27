const bcrypt = require("bcryptjs");
const { getDb } = require("../database/db");
const { AppError } = require("../utils/errors");
const { ensureEmail, ensurePassword, ensureString } = require("../utils/validators");
const { logActivity } = require("../utils/activity");

async function registerUser(payload) {
  const db = await getDb();
  const username = ensureString(payload.username, "Username", 50);
  const email = ensureEmail(payload.email);
  const password = ensurePassword(payload.password);

  const existing = await db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
  if (existing) {
    throw new AppError("Username or email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    "INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, 2)",
    [username, email, passwordHash]
  );

  await logActivity(result.lastID, "REGISTER", `User ${username} created an account.`);
  return result.lastID;
}

async function loginUser(payload) {
  const db = await getDb();
  const email = ensureEmail(payload.email);
  const password = String(payload.password || "");

  const user = await db.get(
    `SELECT users.*, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.email = ?`,
    [email]
  );

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }
  if (!user.is_active) {
    throw new AppError("This account is inactive.", 403);
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new AppError("Invalid email or password.", 401);
  }

  await logActivity(user.id, "LOGIN", `User ${user.username} logged in.`);
  return user;
}

module.exports = { loginUser, registerUser };
