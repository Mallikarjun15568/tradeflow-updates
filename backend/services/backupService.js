const fs = require('fs');
const path = require('path');

const db = require('../database/connection');

const { app } = require('electron');

const dbDir = path.join(
  app.getPath('userData'),
  'database'
);

const dbPath = path.join(
  dbDir,
  'wholesale.db'
);

const backupDir = path.join(
  dbDir,
  'backups'
);

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function getTodayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
}

async function createBackup() {
  ensureBackupDir();

  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  const backupPath = path.join(
    backupDir,
    `backup-${timestamp}.db`
  );

  await db.backup(backupPath);

  const backupTime = new Date().toISOString();

  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES ('last_backup', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(backupTime);

  return {
    success: true,
    path: backupPath,
    fileName: path.basename(backupPath),
    backupTime,
  };
}

async function createAutomaticBackupIfNeeded() {
  const settings = db.prepare(`
    SELECT value
    FROM settings
    WHERE key = 'automatic_backup'
  `).get();

  if (!settings || settings.value !== 'on') {
    return {
      success: false,
      skipped: true,
      reason: 'Automatic backup is disabled',
    };
  }

  ensureBackupDir();

  const today = getTodayDate();

  const files = fs.readdirSync(backupDir);

  const backupExistsToday = files.some((file) => {
    return (
      file.startsWith(`backup-${today}-`) &&
      file.endsWith('.db')
    );
  });

  if (backupExistsToday) {
    return {
      success: true,
      skipped: true,
      reason: 'Backup already exists for today',
    };
  }

  const result = await createBackup();

  return {
    ...result,
    automatic: true,
  };
}

function getAvailableBackups() {
  ensureBackupDir();

  return fs
    .readdirSync(backupDir)
    .filter(
      (file) =>
        file.startsWith('backup-') &&
        file.endsWith('.db')
    )
    .map((file) => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      return {
        fileName: file,
        path: filePath,
        size: stats.size,
        createdAt: stats.mtime.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
}

async function restoreBackup(fileName) {
  ensureBackupDir();

  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid backup file.');
  }

  const backupPath = path.resolve(
    backupDir,
    fileName
  );

  const backupRoot = path.resolve(backupDir);

  // Security check
  if (
    !backupPath.startsWith(backupRoot + path.sep) ||
    !fileName.startsWith('backup-') ||
    !fileName.endsWith('.db')
  ) {
    throw new Error('Invalid backup file.');
  }

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file not found.');
  }

  // --------------------------------
  // 1. Current DB ka safety backup
  // --------------------------------

  const safetyTimestamp = new Date()
    .toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  const safetyPath = path.join(
    backupDir,
    `before-restore-${safetyTimestamp}.db`
  );

  await db.backup(safetyPath);

  // --------------------------------
  // 2. Database connection close
  // --------------------------------

  db.close();

  // --------------------------------
  // 3. Remove old SQLite WAL files
  // --------------------------------

  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }

  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }

  // --------------------------------
  // 4. Selected backup -> main DB
  // --------------------------------

  fs.copyFileSync(
    backupPath,
    dbPath
  );

  return {
    success: true,
    backupFile: fileName,
    safetyBackup: path.basename(safetyPath),
  };
}

module.exports = {
  createBackup,
  createAutomaticBackupIfNeeded,
  getAvailableBackups,
  restoreBackup,
};