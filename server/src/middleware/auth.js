const { getDb } = require("../database/db");
const { AppError } = require("../utils/errors");

async function hydrateUser(req, _res, next) {
  if (!req.session.userId) {
    return next();
  }

  const db = await getDb();
  const user = await db.get(
    `SELECT users.id, users.username, users.email, users.is_active, users.created_at,
            roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.id = ?`,
    [req.session.userId]
  );

  if (!user || !user.is_active) {
    req.session.destroy(() => next());
    return;
  }

  req.user = user;
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError("Authentication required.", 401));
  }
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== "Administrator") {
    return next(new AppError("Administrator access required.", 403));
  }
  next();
}

module.exports = { hydrateUser, requireAuth, requireAdmin };
