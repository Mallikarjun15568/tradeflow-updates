const db = require('../database/connection');
const crypto = require('crypto');

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}

function getSecurityPinState() {
  const settings = getAllSettings();
  return { configured: Boolean(settings.security_pin_hash && settings.security_pin_salt) };
}

function verifySecurityPin(pin) {
  const settings = getAllSettings();
  if (!settings.security_pin_hash || !settings.security_pin_salt) return false;
  const { hash } = hashPin(pin, settings.security_pin_salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(settings.security_pin_hash, 'hex')
  );
}

function setSecurityPin(pin) {
  if (!/^\d{4,6}$/.test(String(pin))) {
    throw new Error('PIN must contain 4 to 6 digits.');
  }
  const { salt, hash } = hashPin(pin);
  updateSetting('security_pin_salt', salt);
  updateSetting('security_pin_hash', hash);
}

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

module.exports = {
  getAllSettings,
  updateSetting,
  getSecurityPinState,
  verifySecurityPin,
  setSecurityPin,
};