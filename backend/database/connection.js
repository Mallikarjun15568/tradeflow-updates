const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

const dbDir = path.join(app.getPath('userData'), 'database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'wholesale.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;