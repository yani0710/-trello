const { getDb } = require("../database/db");
const { logActivity } = require("../utils/activity");
const { ensureEmail, ensureString } = require("../utils/validators");

async function updateProfile(req, res) {
  const db = await getDb();
  const username = ensureString(req.body.username, "Username", 50);
  const email = ensureEmail(req.body.email);

  const existing = await db.get(
    "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
    [username, email, req.user.id]
  );
  if (existing) {
    return res.status(400).json({ message: "Username or email already exists." });
  }

  await db.run("UPDATE users SET username = ?, email = ? WHERE id = ?", [username, email, req.user.id]);
  await logActivity(req.user.id, "PROFILE_UPDATED", `Updated profile for ${username}.`);
  res.json({ message: "Profile updated." });
}

module.exports = { updateProfile };
