const db = require('./connection');

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function runMigration(version, callback) {
  const currentVersion = db
    .prepare(`SELECT version FROM schema_version WHERE id = 1`)
    .get().version;

  if (currentVersion >= version) {
    return;
  }

  const transaction = db.transaction(() => {
    callback();

    db.prepare(`
      UPDATE schema_version
      SET version = ?
      WHERE id = 1
    `).run(version);
  });

  transaction();

  console.log(`✅ Migration ${version} applied`);
}

function initSchema() {
  // --------------------------------------------------
  // 1. Migration tracking table
  // --------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO schema_version (id, version)
    VALUES (1, 0);
  `);

  // --------------------------------------------------
  // 2. Base schema
  // --------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      sku TEXT,
      unit TEXT,
      size TEXT,
      purchase_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      stock_quantity REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+05:30')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now', '+05:30'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      invoice_date TEXT DEFAULT (datetime('now', '+05:30')),
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      product_id INTEGER,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      change_quantity REAL NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now', '+05:30')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      amount REAL NOT NULL,
      payment_date TEXT DEFAULT (datetime('now', '+05:30')),
      method TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS balance_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      adjustment_date TEXT DEFAULT (datetime('now', '+05:30')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // --------------------------------------------------
  // 3. Existing schema upgrades
  // --------------------------------------------------

  // Migration 1:
  // Product size
  runMigration(1, () => {
    if (!columnExists('products', 'size')) {
      db.exec(`
        ALTER TABLE products
        ADD COLUMN size TEXT
      `);
    }
  });

  // Migration 2:
  // Invoice item custom name
  runMigration(2, () => {
    if (!columnExists('invoice_items', 'custom_name')) {
      db.exec(`
        ALTER TABLE invoice_items
        ADD COLUMN custom_name TEXT
      `);
    }
  });

  // Migration 3:
  // Invoice item size
  runMigration(3, () => {
    if (!columnExists('invoice_items', 'size')) {
      db.exec(`
        ALTER TABLE invoice_items
        ADD COLUMN size TEXT
      `);
    }
  });

  // Migration 4:
  // Customer snapshot on invoice
  runMigration(4, () => {
    if (!columnExists('invoices', 'customer_name')) {
      db.exec(`
        ALTER TABLE invoices
        ADD COLUMN customer_name TEXT
      `);
    }

    if (!columnExists('invoices', 'customer_address')) {
      db.exec(`
        ALTER TABLE invoices
        ADD COLUMN customer_address TEXT
      `);
    }

    if (!columnExists('invoices', 'customer_phone')) {
      db.exec(`
        ALTER TABLE invoices
        ADD COLUMN customer_phone TEXT
      `);
    }
  });

  // Migration 5:
  // Invoice payment method
  runMigration(5, () => {
    if (!columnExists('invoices', 'payment_method')) {
      db.exec(`
        ALTER TABLE invoices
        ADD COLUMN payment_method TEXT DEFAULT 'cash'
      `);
    }
  });

  // Migration 6:
  // Opening customer balance and invoice balance transfer
  runMigration(6, () => {
    if (!columnExists('customers', 'opening_balance')) {
      db.exec(`
        ALTER TABLE customers
        ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0
      `);
    }

    if (!columnExists('invoices', 'previous_due_added')) {
      db.exec(`
        ALTER TABLE invoices
        ADD COLUMN previous_due_added REAL NOT NULL DEFAULT 0
      `);
    }
  });

  // --------------------------------------------------
  // 4. Default settings
  // --------------------------------------------------

  const defaults = {
    shop_name: 'WHOLESALE BILLING',
    shop_phone: '9876543210',
    shop_address: '',
    invoice_prefix: 'INV-',
    invoice_number_start: '0000000001',
    invoice_number_next: '0000000001',
    automatic_backup: 'off',
    last_backup: '',
  };

  const insertDefault = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES (@key, @value)
  `);

  for (const [key, value] of Object.entries(defaults)) {
    insertDefault.run({ key, value });
  }

  // --------------------------------------------------
  // 5. Final schema version
  // --------------------------------------------------

  const finalVersion = db
    .prepare(`SELECT version FROM schema_version WHERE id = 1`)
    .get().version;

  console.log(`✅ Database schema ready (version ${finalVersion})`);
}

module.exports = initSchema;