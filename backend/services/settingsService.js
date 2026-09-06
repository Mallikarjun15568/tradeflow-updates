const db = require('../database/connection');

function getAllSettings() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  return settings;
}

function updateSetting(key, value) {
  if (key === 'invoice_number_start') {
    const start = String(value || '').trim();
    if (!/^\d+$/.test(start) || BigInt(start) < 0n) {
      throw new Error('Invoice starting number must contain only digits.');
    }

    const currentStart = db
      .prepare(`SELECT value FROM settings WHERE key = 'invoice_number_start'`)
      .get();
    if (!currentStart || currentStart.value !== start) {
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('invoice_number_next', @value)
        ON CONFLICT(key) DO UPDATE SET value = @value
      `).run({ value: start });
    }
  }

  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `);
  stmt.run({ key, value });
}

module.exports = { getAllSettings, updateSetting };