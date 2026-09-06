const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');

function getStatementsDir() {
    const statementsDir = path.join(
        os.homedir(),
        'Downloads',
        'TradeFlow',
        'Statements'
    );

    fs.mkdirSync(statementsDir, { recursive: true });
    return statementsDir;
}

function sanitizeFileName(name) {
    return String(name || 'Customer')
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .trim();
}

function formatMoney(value) {
    return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateValue) {
    if (!dateValue) return '-';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return String(dateValue);

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function drawTableHeader(doc, y) {
    doc
        .rect(40, y, 515, 27)
        .fill('#f3f4f6');

    doc
        .fillColor('#4b5563')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('DATE', 50, y + 9)
        .text('DESCRIPTION', 145, y + 9)
        .text('DEBIT', 300, y + 9, { width: 55, align: 'right' })
        .text('CREDIT', 360, y + 9, { width: 55, align: 'right' })
        .text('BALANCE', 420, y + 9, { width: 60, align: 'right' })
        .text('DUE', 485, y + 9, { width: 60, align: 'right' });
}

function generateCustomerStatementPDF({
    customer,
    overview,
    transactions,
    creditBills,
}) {
    if (!customer) {
        throw new Error('Customer details are required');
    }

    const statementsDir = getStatementsDir();
    const fileName = `${sanitizeFileName(customer.name)}_Statement_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
    const filePath = path.join(statementsDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(filePath);

        stream.on('finish', () => resolve({ success: true, filePath, fileName }));
        stream.on('error', reject);
        doc.pipe(stream);

        const pageWidth = 515;

        // Invoice-style header.
        doc
            .fillColor('#1f2937')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text('TRADEFLOW', 40, 42);
        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .fontSize(9)
            .text('Business Management', 40, 68);
        doc
            .fillColor('#1f2937')
            .font('Helvetica-Bold')
            .fontSize(16)
            .text('ACCOUNT STATEMENT', 350, 48, { width: 205, align: 'right' });
        doc
            .strokeColor('#1f2937')
            .lineWidth(1.5)
            .moveTo(40, 88)
            .lineTo(555, 88)
            .stroke();

        // Customer and document details.
        doc
            .fillColor('#9ca3af')
            .font('Helvetica-Bold')
            .fontSize(8)
            .text('BILL TO', 40, 108);
        doc
            .fillColor('#1f2937')
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(customer.name || 'Customer', 40, 122);
        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .fontSize(9)
            .text(customer.phone ? `Phone: ${customer.phone}` : 'Phone: -', 40, 142);
        doc.text(customer.address || 'Address: -', 40, 157, { width: 250 });

        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .fontSize(9)
            .text('Statement Date', 390, 112)
            .text(formatDate(new Date()), 470, 112, { width: 85, align: 'right' })
            .text('Total Bills', 390, 130)
            .text(String(overview?.totalBills || 0), 470, 130, { width: 85, align: 'right' });

        const summaryY = 190;
        const summary = [
            ['Total Sales', overview?.totalSales || 0],
            ['Total Received', overview?.totalReceived || 0],
            ['Outstanding', overview?.balanceDue || 0],
        ];

        summary.forEach(([label, value], index) => {
            doc
                .fillColor('#374151')
                .font('Helvetica')
                .fontSize(10)
                .text(label, 40, summaryY + index * 18, { width: 150 });
            doc
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .fontSize(10)
                .text(formatMoney(value), 390, summaryY + index * 18, { width: 165, align: 'right' });
        });

        doc
            .strokeColor('#d1d5db')
            .lineWidth(0.8)
            .moveTo(40, summaryY + 60)
            .lineTo(555, summaryY + 60)
            .stroke();

        doc
            .fillColor('#1f2937')
            .font('Helvetica-Bold')
            .fontSize(12)
            .text('Account History', 40, 270);

        let tableY = 290;
        drawTableHeader(doc, tableY);
        tableY += 27;

        const sortedTransactions = [...(transactions || [])].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );
        let balance = 0;

        sortedTransactions.forEach((transaction) => {
            const isPayment = String(transaction.type || '').toLowerCase().includes('payment');
            const amount = Number(transaction.amount || 0);
            const debit = isPayment ? 0 : amount;
            const credit = isPayment ? amount : 0;
            balance += debit - credit;

            if (tableY > 735) {
                doc.addPage();
                tableY = 45;
                doc
                    .fillColor('#1f2937')
                    .font('Helvetica-Bold')
                    .fontSize(12)
                    .text('Account History - Continued', 40, tableY);
                tableY += 22;
                drawTableHeader(doc, tableY);
                tableY += 27;
            }

            doc
                .fillColor('#374151')
                .font('Helvetica')
                .fontSize(8.5)
                .text(formatDate(transaction.date), 50, tableY + 9)
                .text(`${transaction.type || 'Transaction'}  ${transaction.reference || ''}`, 145, tableY + 9, {
                    width: 165,
                    ellipsis: true,
                })
                .text(debit ? formatMoney(debit) : '-', 300, tableY + 9, { width: 55, align: 'right' })
                .text(credit ? formatMoney(credit) : '-', 360, tableY + 9, { width: 55, align: 'right' })
                .text(formatMoney(balance), 420, tableY + 9, { width: 60, align: 'right' })
                .text(
                    (() => {
                        if (isPayment) return '-';

                        const bill = (creditBills || []).find(
                            (item) =>
                                item.invoice_number === transaction.reference
                        );

                        if (!bill) return '-';

                        const billDate = new Date(
                            String(bill.invoice_date).replace(' ', 'T')
                        );
                        const today = new Date();
                        const dueDays = Math.max(
                            0,
                            Math.floor(
                                (today - billDate) /
                                    (1000 * 60 * 60 * 24)
                            )
                        );

                        return `${dueDays} ${
                            dueDays === 1 ? 'day' : 'days'
                        }`;
                    })(),
                    485,
                    tableY + 9,
                    { width: 60, align: 'right' }
                );

            doc
                .strokeColor('#e5e7eb')
                .lineWidth(0.5)
                .moveTo(40, tableY + 27)
                .lineTo(555, tableY + 27)
                .stroke();
            tableY += 27;
        });

        if (tableY > 700) {
            doc.addPage();
            tableY = 55;
        }

        doc
            .strokeColor('#1f2937')
            .lineWidth(1)
            .moveTo(365, tableY + 18)
            .lineTo(555, tableY + 18)
            .stroke();
        doc
            .fillColor('#1f2937')
            .font('Helvetica-Bold')
            .fontSize(12)
            .text('Total Outstanding:', 365, tableY + 28)
            .text(formatMoney(overview?.balanceDue || 0), 365, tableY + 28, {
                width: 190,
                align: 'right',
            });

        doc
            .fillColor('#9ca3af')
            .font('Helvetica')
            .fontSize(8)
            .text('This is a computer-generated statement.', 40, 770, {
                width: pageWidth,
                align: 'center',
            });

        doc.end();
    });
}

module.exports = {
    generateCustomerStatementPDF,
};
