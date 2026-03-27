const path = require("path");

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || "mini-trello-demo-secret",
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "mini-trello.sqlite")
};
