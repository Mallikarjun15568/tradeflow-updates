const db = require('../database/connection');

function getDashboardSummary() {
  // Today's date in local IST
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  // SQLite invoice_date is stored as UTC:
  // YYYY-MM-DD HH:mm:ss
  // So compare using UTC date range for today's IST day.

  const start = new Date(`${today}T00:00:00+05:30`);
  const end = new Date(`${today}T23:59:59+05:30`);

  const startUTC = start.toISOString().slice(0, 19).replace('T', ' ');
  const endUTC = end.toISOString().slice(0, 19).replace('T', ' ');

  // Today's total sales
  const sales = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS total
    FROM invoices
    WHERE invoice_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Today's cash sales
  const cash = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS total
    FROM invoices
    WHERE payment_method = 'cash'
      AND invoice_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Today's credit sales
  const credit = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS total
    FROM invoices
    WHERE payment_method = 'credit'
      AND invoice_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Today's bill count
  const bills = db.prepare(`
    SELECT COUNT(*) AS count
    FROM invoices
    WHERE invoice_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Recent 8 bills
  const recentBills = db.prepare(`
    SELECT
      id,
      invoice_number,
      customer_name,
      grand_total,
      payment_method,
      payment_status,
      invoice_date
    FROM invoices
    ORDER BY invoice_date DESC
    LIMIT 8
  `).all();

  // Today's payments
  // Currently cash invoices represent received amount.
  const todayPayments = db.prepare(`
    SELECT
      invoice_number,
      customer_name,
      grand_total AS amount,
      payment_method,
      invoice_date
    FROM invoices
    WHERE payment_method = 'cash'
      AND invoice_date BETWEEN ? AND ?
    ORDER BY invoice_date DESC
    LIMIT 8
  `).all(startUTC, endUTC);

  // Low stock
  // Currently <= 5 is considered low stock.
  const lowStock = db.prepare(`
    SELECT
      id,
      name,
      size,
      stock_quantity,
      unit
    FROM products
    WHERE stock_quantity <= 5
    ORDER BY stock_quantity ASC, name ASC
    LIMIT 10
  `).all();

  return {
    today,
    stats: {
      todaySales: Number(sales.total || 0),
      cashReceived: Number(cash.total || 0),
      creditSales: Number(credit.total || 0),
      todayBills: Number(bills.count || 0),
    },
    recentBills,
    todayPayments,
    lowStock,
  };
}

module.exports = {
  getDashboardSummary,
};