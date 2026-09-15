const db = require('../database/connection');

function getDashboardSummary() {
  // Today's date in local IST
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  // invoice_date is stored as an India-local SQLite timestamp.
  const startUTC = `${today} 00:00:00`;
  const endUTC = `${today} 23:59:59`;

  // Today's total sales
  const sales = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS total
    FROM invoices
    WHERE invoice_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Cash received today is based on recorded payments, not invoice totals.
  const cash = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE method = 'cash'
      AND payment_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  const online = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE method = 'online'
      AND payment_date BETWEEN ? AND ?
  `).get(startUTC, endUTC);

  // Today's outstanding amount from today's invoices after recorded payments.
  const credit = db.prepare(`
    SELECT COALESCE(SUM(i.grand_total - COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.invoice_id = i.id
    ), 0)), 0) AS total
    FROM invoices i
    WHERE i.invoice_date BETWEEN ? AND ?
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

  // Today's cash payments
  const todayPayments = db.prepare(`
    SELECT
      i.invoice_number,
      i.customer_name,
      p.amount,
      p.method AS payment_method,
      p.payment_date AS invoice_date
    FROM payments p
    INNER JOIN invoices i ON i.id = p.invoice_id
    WHERE p.payment_date BETWEEN ? AND ?
    ORDER BY p.payment_date DESC
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
      onlineReceived: Number(online.total || 0),
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