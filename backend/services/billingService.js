const db = require('../database/connection');
const customerService = require('./customerService');
const { getProductById } = require('./productService');

function createInvoice(invoiceData) {
  const { customer_id, items, discount = 0, tax = 0 } = invoiceData;
  const effectiveCustomerId = customer_id ? customer_id : null;

  let customerSnapshot = { customer_name: null, customer_address: null, customer_phone: null };
  if (!['cash', 'credit'].includes(invoiceData.payment_method)) {
    throw new Error('Invalid payment method');
  }

  if (customer_id) {
    const customer = customerService.getCustomerById(customer_id);
    if (!customer) {
      throw new Error(`Customer ID ${customer_id} not found`);
    }

    customerSnapshot = {
      customer_name: customer.name,
      customer_address: customer.address || null,
      customer_phone: customer.phone || null,
    };
  }
  if (!Number.isFinite(discount) || discount < 0) {
  throw new Error('Discount cannot be negative');
}

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Invoice must have at least one item');
  }

  const createInvoiceTransaction = db.transaction(() => {
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error('Invalid quantity');
      }

      if (item.product_id) {
        const product = getProductById(item.product_id);
        if (!product) {
          throw new Error(`Product ID ${item.product_id} not found`);
        }

        const effectiveRate = item.rate !== undefined && item.rate !== null
          ? Number(item.rate)
          : product.selling_price;

        const itemSubtotal = effectiveRate * item.quantity;
        subtotal += itemSubtotal;

        itemDetails.push({
          product_id: product.id,
          custom_name: product.name,
          size: product.size || null,
          quantity: item.quantity,
          price: effectiveRate,
          subtotal: itemSubtotal
        });
      } else {
        if (typeof item.name !== 'string' || !item.name.trim()) {
          throw new Error('Manual item name is required');
        }
        if (!Number.isFinite(item.rate) || item.rate < 0) {
          throw new Error('Invalid manual item rate');
        }

        const itemSubtotal = item.rate * item.quantity;
        subtotal += itemSubtotal;

        itemDetails.push({
          product_id: null,
          custom_name: item.name.trim(),
          size: item.size || null,
          quantity: item.quantity,
          price: item.rate,
          subtotal: itemSubtotal
        });
      }
    }
    if (discount > subtotal) {
      throw new Error('Discount cannot be greater than the subtotal');
    }
    const grand_total = subtotal - discount + tax;
    
    const invoiceNumberStart =
      db.prepare(`SELECT value FROM settings WHERE key = 'invoice_number_start'`).get()
        ?.value || '0000000001';
    const invoicePrefix =
      db.prepare(`SELECT value FROM settings WHERE key = 'invoice_prefix'`).get()
        ?.value || 'INV-';
    const nextNumberRow = db
      .prepare(`SELECT value FROM settings WHERE key = 'invoice_number_next'`)
      .get();
    const invoiceNumberValue = nextNumberRow?.value || invoiceNumberStart;

    if (!/^\d+$/.test(invoiceNumberValue)) {
      throw new Error('Invalid invoice number sequence setting');
    }

    const invoiceNumberWidth = Math.max(
      invoiceNumberStart.length,
      invoiceNumberValue.length,
      1
    );
    let invoice_number = invoicePrefix + invoiceNumberValue.padStart(invoiceNumberWidth, '0');
    let nextNumber = BigInt(invoiceNumberValue) + 1n;
    while (db.prepare(`SELECT 1 FROM invoices WHERE invoice_number = ?`).get(invoice_number)) {
      invoice_number =
        invoicePrefix + nextNumber.toString().padStart(invoiceNumberWidth, '0');
      nextNumber += 1n;
    }

    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('invoice_number_next', @value)
      ON CONFLICT(key) DO UPDATE SET value = @value
    `).run({
      value: nextNumber.toString().padStart(invoiceNumberWidth, '0'),
    });

    const payment_status = invoiceData.payment_method === 'cash' ? 'paid' : 'unpaid';
    const invoiceStmt = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, customer_name, customer_address, customer_phone, subtotal, discount, tax, grand_total, payment_method, payment_status)
      VALUES (@invoice_number, @customer_id, @customer_name, @customer_address, @customer_phone, @subtotal, @discount, @tax, @grand_total, @payment_method, @payment_status)
    `);
    const result = invoiceStmt.run({
      invoice_number,
      customer_id: effectiveCustomerId,
      ...customerSnapshot,
      subtotal,
      discount,
      tax,
      payment_method: invoiceData.payment_method,
      payment_status,
      grand_total
    });
    const invoiceId = result.lastInsertRowid;

    const paymentStmt = db.prepare(`INSERT INTO payments (invoice_id, amount, method)VALUES (@invoice_id, @amount, @method)`);

      if (invoiceData.payment_method === 'cash') {
          paymentStmt.run({invoice_id: invoiceId,amount: grand_total,method: 'cash'});
        }

    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, custom_name, size, quantity, price, subtotal)
      VALUES (@invoice_id, @product_id, @custom_name, @size, @quantity, @price, @subtotal)
    `);
    const stockUpdateStmt = db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity - @qty WHERE id = @id
    `);
    const stockLogStmt = db.prepare(`
      INSERT INTO stock_transactions (product_id, change_quantity, reason)
      VALUES (@product_id, @change_quantity, @reason)
    `);

    for (const item of itemDetails) {
      itemStmt.run({ invoice_id: invoiceId, ...item });
      if (item.product_id) {
        stockUpdateStmt.run({ qty: item.quantity, id: item.product_id });
        stockLogStmt.run({ product_id: item.product_id, change_quantity: -item.quantity, reason: 'sale' });
      }
    }

    return { invoiceId, invoice_number, grand_total };
  });

  return createInvoiceTransaction();
}

function addPayment(invoiceId, amount, method = 'cash') {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Invalid payment amount');
  }

  if (!['cash'].includes(method)) {
    throw new Error('Invalid payment method');
  }

  const addPaymentTransaction = db.transaction(() => {
    const invoice = db.prepare(`
      SELECT id, grand_total, payment_status
      FROM invoices
      WHERE id = ?
    `).get(invoiceId);

    if (!invoice) {
      throw new Error(`Invoice ID ${invoiceId} not found`);
    }

    // Already fully paid
    if (invoice.payment_status === 'paid') {
      throw new Error('Invoice is already fully paid');
    }

    // Total payments already received
    const paidResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_paid
      FROM payments
      WHERE invoice_id = ?
    `).get(invoiceId);

    const totalPaid = Number(paidResult.total_paid || 0);
    const remaining = Number(invoice.grand_total) - totalPaid;
    const paymentAmount = Number(amount);

    // Don't allow overpayment
    if (paymentAmount > remaining) {
      throw new Error(
        `Payment cannot be greater than remaining amount ₹${remaining.toFixed(2)}`
      );
    }

    // Add payment
    const paymentStmt = db.prepare(`
      INSERT INTO payments (invoice_id, amount, method)
      VALUES (@invoice_id, @amount, @method)
    `);

    const result = paymentStmt.run({
      invoice_id: invoiceId,
      amount: paymentAmount,
      method,
    });

    const newTotalPaid = totalPaid + paymentAmount;

    // Update invoice status
    const newStatus =
      newTotalPaid >= Number(invoice.grand_total)
        ? 'paid'
        : 'partial';

    db.prepare(`
      UPDATE invoices
      SET payment_status = ?
      WHERE id = ?
    `).run(newStatus, invoiceId);

    return {
      paymentId: result.lastInsertRowid,
      invoiceId,
      amount: paymentAmount,
      totalPaid: newTotalPaid,
      remaining: Number(invoice.grand_total) - newTotalPaid,
      paymentStatus: newStatus,
    };
  });

  return addPaymentTransaction();
}

function getAllInvoices() {
  return db.prepare(`
    SELECT * FROM invoices ORDER BY invoice_date DESC
  `).all();
}

function getInvoicePayments(invoiceId) {
  return db.prepare(`
    SELECT
      id,
      invoice_id,
      amount,
      method,
      payment_date
    FROM payments
    WHERE invoice_id = ?
    ORDER BY payment_date ASC, id ASC
  `).all(invoiceId);
}

function getInvoiceWithItems(invoiceId) {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice ID ${invoiceId} not found`);
  }

  const items = db.prepare(`
    SELECT * FROM invoice_items WHERE invoice_id = ?
  `).all(invoiceId);

  return { ...invoice, items };
}

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceWithItems,
  addPayment,
  getInvoicePayments
};