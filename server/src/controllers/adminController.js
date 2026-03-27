const adminService = require("../services/adminService");
const { getDb } = require("../database/db");

async function overview(_req, res) {
  const data = await adminService.getAdminOverview();
  res.json(data);
}

async function users(_req, res) {
  const users = await adminService.listUsers();
  res.json({ users });
}

async function toggleUser(req, res) {
  await adminService.toggleUserStatus(req.user.id, Number(req.params.userId), !!req.body.isActive);
  res.json({ message: "User updated." });
}

async function memberships(_req, res) {
  const db = await getDb();
  const boards = await db.all("SELECT id, title FROM boards ORDER BY title");
  const users = await db.all("SELECT id, username, email FROM users ORDER BY username");
  const memberships = await db.all("SELECT board_id, user_id FROM board_members");
  res.json({ boards, users, memberships });
}

async function setMembership(req, res) {
  await adminService.setBoardMembership(
    req.user.id,
    Number(req.body.boardId),
    Number(req.body.userId),
    !!req.body.addMember
  );
  res.json({ message: "Board access updated." });
}

module.exports = { memberships, overview, setMembership, toggleUser, users };
