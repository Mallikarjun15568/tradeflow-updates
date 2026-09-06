const db = require('./backend/database/connection');

const cleanupStatements = [
    "DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'INV-%')",
    "DELETE FROM stock_transactions WHERE product_id IN (SELECT id FROM products WHERE sku = 'TEST-001')",
    "DELETE FROM invoices WHERE invoice_number LIKE 'INV-%'",
    "DELETE FROM products WHERE sku = 'TEST-001'",
    "DELETE FROM customers WHERE name = 'Invoice Test Customer'"
];

for (const sql of cleanupStatements) {
    db.prepare(sql).run();
}

console.log('Temporary billing data cleaned up');