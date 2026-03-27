const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { dbPath } = require("../config/env");

let dbInstance;

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
}

module.exports = { getDb };
