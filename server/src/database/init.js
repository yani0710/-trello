const { getDb } = require("./db");
const { schema } = require("./schema");

async function initializeDatabase() {
  const db = await getDb();
  await db.exec(schema);
  await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'Administrator')");
  await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'User')");
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialized successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
