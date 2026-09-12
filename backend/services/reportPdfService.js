const PDFDocument = require('pdfkit');
const fs = require('fs');

const reportService = require('./reportService');
const customerService = require('./customerService');
const settingsService = require('./settingsService');

async function generateSalesReportPDF({
  filePath,
  fromDate,
  toDate,
  customerId = null,
}) {
  const report = reportService.getSalesReport(
    fromDate,
    toDate,
    customerId
  );

  const details = reportService.getSalesReportDetails(
    fromDate,
    toDate,
    customerId
  );

  const shopSettings = settingsService.getAllSettings();

  let customerName = 'All Customers';

  if (customerId) {
    const customer = customerService.getCustomerById(customerId);
    customerName = customer?.name || 'Customer';
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      const stream = fs.createWriteStream(filePath);

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', reject);
      doc.on('error', reject);

      doc.pipe(stream);

      const money = (value) =>
        `Rs. ${Number(value || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      // =========================
      // HEADER
      // =========================

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(shopSettings.shop_name || 'WHOLESALE BILLING', {
          align: 'left',
        });

      if (shopSettings.shop_phone) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Phone: ${shopSettings.shop_phone}`);
      }

      doc
        .moveDown(0.8)
        .fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('SALES REPORT');

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Period: ${fromDate} to ${toDate}`);

      doc.text(`Customer: ${customerName}`);

      // line
      doc
        .moveDown(0.8)
        .strokeColor('#222222')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      // =========================
      // SUMMARY
      // =========================

      doc.moveDown(1);

      const summaryTop = doc.y;
      const summaryRows = [
        ['Total Sales', money(report.totalSales)],
        ['Cash Sales', money(report.cashSales)],
        ['Credit Sales', money(report.creditSales)],
        ['Total Bills', String(report.totalBills)],
      ];

      summaryRows.forEach(([label, value], index) => {
        const y = summaryTop + index * 18;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(label, 40, y, { width: 200 });
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text(value, 390, y, { width: 165, align: 'right' });
      });

      doc
        .strokeColor('#dddddd')
        .lineWidth(0.5)
        .moveTo(40, summaryTop + summaryRows.length * 18 + 8)
        .lineTo(555, summaryTop + summaryRows.length * 18 + 8)
        .stroke();

      doc.y = summaryTop + summaryRows.length * 18 + 20;

      // =========================
      // DETAILS
      // =========================

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Report Details');

      doc.moveDown(0.6);

      const tableTop = doc.y;

      const columns = {
        invoice: 40,
        customer: 135,
        date: 290,
        amount: 380,
        payment: 465,
      };

      // Header background
      doc
        .rect(40, tableTop - 4, 515, 24)
        .fill('#eeeeee');

      doc
        .fillColor('#000000')
        .fontSize(8)
        .font('Helvetica-Bold');

      doc.text('Invoice No.', columns.invoice, tableTop, {
        width: 90,
      });

      doc.text('Customer', columns.customer, tableTop, {
        width: 150,
      });

      doc.text('Date', columns.date, tableTop, {
        width: 80,
      });

      doc.text('Amount', columns.amount, tableTop, {
        width: 80,
        align: 'right',
      });

      doc.text('Payment', columns.payment, tableTop, {
        width: 90,
      });

      doc.y = tableTop + 27;

      // =========================
      // TABLE ROWS
      // =========================

      doc.font('Helvetica').fontSize(8);

      if (details.length === 0) {
        doc
          .fillColor('#777777')
          .text('No invoices found for this period.', 40, doc.y);

        doc.end();
        return;
      }

      details.forEach((invoice) => {
        // New page if needed
        if (doc.y > 740) {
          doc.addPage();

          doc
            .fontSize(13)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Report Details');

          doc.moveDown(0.6);

          doc.y = doc.y;

          drawTableHeader(doc, columns);

          doc.y += 27;

          doc.font('Helvetica').fontSize(8);
        }

        const rowY = doc.y;

        const invoiceDate = invoice.invoice_date
          ? new Date(invoice.invoice_date).toLocaleDateString('en-IN')
          : '-';

        const customer = invoice.customer_name || 'Walk-in';

        doc.fillColor('#222222');

        doc.text(invoice.invoice_number || '-', columns.invoice, rowY, {
          width: 90,
        });

        doc.text(customer, columns.customer, rowY, {
          width: 145,
          ellipsis: true,
        });

        doc.text(invoiceDate, columns.date, rowY, {
          width: 80,
        });

        doc.text(
          money(invoice.grand_total),
          columns.amount,
          rowY,
          {
            width: 80,
            align: 'right',
          }
        );

        doc.text(
          invoice.payment_method === 'cash' ? 'Cash' : 'Credit',
          columns.payment,
          rowY,
          {
            width: 90,
          }
        );

        doc
          .strokeColor('#dddddd')
          .lineWidth(0.5)
          .moveTo(40, rowY + 16)
          .lineTo(555, rowY + 16)
          .stroke();

        doc.y = rowY + 22;
      });

      // =========================
      // FOOTER
      // =========================

      doc
        .moveDown(1)
        .fontSize(8)
        .fillColor('#999999')
        .text(
          'Generated by Wholesale Billing System',
          40,
          790,
          {
            width: 515,
            align: 'center',
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}


// =========================
// TABLE HEADER
// =========================

function drawTableHeader(doc, columns) {
  const y = doc.y;

  doc
    .rect(40, y - 4, 515, 24)
    .fill('#eeeeee');

  doc
    .fillColor('#000000')
    .fontSize(8)
    .font('Helvetica-Bold');

  doc.text('Invoice No.', columns.invoice, y, {
    width: 90,
  });

  doc.text('Customer', columns.customer, y, {
    width: 150,
  });

  doc.text('Date', columns.date, y, {
    width: 80,
  });

  doc.text('Amount', columns.amount, y, {
    width: 80,
    align: 'right',
  });

  doc.text('Payment', columns.payment, y, {
    width: 90,
  });
}


module.exports = {
  generateSalesReportPDF,
};