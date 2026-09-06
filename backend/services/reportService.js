const db = require('../database/connection');

function getSalesReport(fromDate, toDate, customerId = null) {
  if (!fromDate || !toDate) {
    throw new Error('Date range is required');
  }

  const start = `${fromDate} 00:00:00`;
  const end = `${toDate} 23:59:59`;

  let customerCondition = '';
  const params = [start, end];

  if (customerId) {
    customerCondition = 'AND customer_id = ?';
    params.push(customerId);
  }

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(grand_total), 0) AS total_sales,

      COALESCE(SUM(
        CASE
          WHEN payment_method = 'cash'
          THEN grand_total
          ELSE 0
        END
      ), 0) AS cash_sales,

      COALESCE(SUM(
        CASE
          WHEN payment_method = 'credit'
          THEN grand_total
          ELSE 0
        END
      ), 0) AS credit_sales,

      COUNT(*) AS total_bills

    FROM invoices
    WHERE invoice_date BETWEEN ? AND ?
    ${customerCondition}
  `).get(...params);

  return {
    fromDate,
    toDate,
    customerId: customerId || null,

    totalSales: Number(summary.total_sales || 0),
    cashSales: Number(summary.cash_sales || 0),
    creditSales: Number(summary.credit_sales || 0),
    totalBills: Number(summary.total_bills || 0),
  };
}

function getSalesReportDetails(fromDate, toDate, customerId = null) {
  if (!fromDate || !toDate) {
    throw new Error('Date range is required');
  }

  const start = `${fromDate} 00:00:00`;
  const end = `${toDate} 23:59:59`;

  let customerCondition = '';
  const params = [start, end];

  if (customerId) {
    customerCondition = 'AND i.customer_id = ?';
    params.push(customerId);
  }

  return db.prepare(`
    SELECT
      i.id,
      i.invoice_number,
      i.invoice_date,
      i.customer_name,
      i.grand_total,
      i.payment_method
    FROM invoices i
    WHERE i.invoice_date BETWEEN ? AND ?
    ${customerCondition}
    ORDER BY i.invoice_date DESC, i.id DESC
  `).all(...params);
}

module.exports = {
  getSalesReport,
  getSalesReportDetails,
};