const db = require("../database/connection");

function validateCustomer(customer) {
  if (!customer || typeof customer.name !== 'string' || !customer.name.trim()) {
    throw new Error('Customer name is required');
  }
  if (customer.phone && (typeof customer.phone !== 'string' || !/^\d{10}$/.test(customer.phone.trim()))) {
    throw new Error('Phone number must be exactly 10 digits');
  }
}

function addCustomer(customer) {
    validateCustomer(customer);
    const normalizedName = customer.name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = customer.phone?.trim() || '';
    const existing = db.prepare(`
        SELECT id, name, phone
        FROM customers
        ORDER BY id
    `).all().find((candidate) =>
        candidate.name.trim().replace(/\s+/g, ' ').toLowerCase() ===
          normalizedName.toLowerCase() &&
        (candidate.phone || '').trim() === normalizedPhone
    );

    if (existing) {
        throw new Error('Customer already exists with this name and phone number.');
    }

    const stmt = db.prepare(`
        INSERT INTO customers (name, phone, address)
        VALUES (@name, @phone, @address)
    `);

    const result = stmt.run({
        ...customer,
        name: normalizedName,
        phone: customer.phone?.trim() || '',
        address: customer.address?.trim() || '',
    });
    return result.lastInsertRowid;
}

function getAllCustomers() {
    const stmt = db.prepare(`
        SELECT
            c.*,
            EXISTS(
                SELECT 1
                FROM invoices i
                WHERE i.customer_id = c.id
            ) AS has_history
        FROM customers c
        ORDER BY name
    `);

    return stmt.all();
}

function getCustomerById(id) {
    const stmt = db.prepare(`
        SELECT * FROM customers
        WHERE id = ?
    `);

    return stmt.get(id);
}

function updateCustomer(id, customer) {
    validateCustomer(customer);
    const normalizedName = customer.name.trim().replace(/\s+/g, ' ');
    const duplicate = customer.phone?.trim()
      ? db.prepare(`
        SELECT id, name
        FROM customers
        WHERE id != ? AND phone = ?
        LIMIT 1
      `).get(id, customer.phone.trim())
      : null;
    if (duplicate) {
        throw new Error('A customer with this name already exists.');
    }
    const stmt = db.prepare(`
        UPDATE customers
        SET name = @name,
            phone = @phone,
            address = @address
        WHERE id = @id
    `);

    const result = stmt.run({
        ...customer,
        name: normalizedName,
        phone: customer.phone?.trim() || '',
        address: customer.address?.trim() || '',
        id
    });
    if (result.changes === 0) {
        throw new Error('Customer not found');
    }
}
function getCreditCustomers() {
    const customers = db.prepare(`
        SELECT
            c.id,
            c.name,
            c.phone,
            c.address,

            COALESCE((
                SELECT SUM(
                    i.grand_total - COALESCE((
                        SELECT SUM(p.amount)
                        FROM payments p
                        WHERE p.invoice_id = i.id
                    ), 0)
                )
                FROM invoices i
                WHERE i.customer_id = c.id
            ), 0) AS total_credit
            ,
            COALESCE((
                SELECT SUM(p.amount)
                FROM payments p
                INNER JOIN invoices pi ON pi.id = p.invoice_id
                WHERE pi.customer_id = c.id
            ), 0) AS total_paid

        FROM customers c
        ORDER BY c.name
    `).all();

    return customers
        .map((customer) => {
            const totalCredit = Math.max(0, Number(customer.total_credit || 0));
            const totalPaid = Number(customer.total_paid || 0);

            return {
                ...customer,
                total_credit: totalCredit,
                total_paid: totalPaid,
                remaining: totalCredit
            };
        })
        .filter((customer) => customer.remaining > 0);
}

/* =========================================================
   CUSTOMER CREDIT BILLS
   ========================================================= */

function getCustomerCreditBills(customerId) {
    const customer = getCustomerById(customerId);

    if (!customer) {
        throw new Error(`Customer ID ${customerId} not found`);
    }

    const bills = db.prepare(`
        SELECT
            i.id,
            i.invoice_number,
            i.invoice_date,
            i.grand_total,

            COALESCE((
                SELECT SUM(p.amount)
                FROM payments p
                WHERE p.invoice_id = i.id
            ), 0) AS paid

        FROM invoices i
        WHERE i.customer_id = ?
        ORDER BY i.invoice_date ASC
    `).all(customerId);

    return bills
        .map((bill) => {
            const amount = Number(bill.grand_total || 0);
            const paid = Number(bill.paid || 0);
            const remaining = Math.max(0, amount - paid);

            return {
                ...bill,
                amount,
                paid,
                remaining,
            };
        })
        .filter((bill) => bill.remaining > 0);
}
/* =========================================================
   CUSTOMER PAYMENT SUMMARY
   ========================================================= */

function getCustomerPaymentSummary(customerId) {
    const customer = getCustomerById(customerId);

    if (!customer) {
        throw new Error(`Customer ID ${customerId} not found`);
    }

    /*
     * Credit invoices
     */
    const creditResult = db.prepare(`
        SELECT COALESCE(SUM(
            i.grand_total - COALESCE((
                SELECT SUM(p.amount)
                FROM payments p
                WHERE p.invoice_id = i.id
            ), 0)
        ), 0) AS total_credit,
        COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            INNER JOIN invoices pi ON pi.id = p.invoice_id
            WHERE pi.customer_id = ?
        ), 0) AS total_paid
        FROM invoices i
        WHERE i.customer_id = ?
    `).get(customerId, customerId);

    const totalCredit = Math.max(0, Number(creditResult.total_credit || 0));

    return {
        customer_id: customerId,
        total_credit: totalCredit,
        total_paid: Number(creditResult.total_paid || 0),
        remaining: totalCredit
    };
}


/* =========================================================
   CUSTOMER OVERVIEW
   ========================================================= */

function getCustomerOverview(customerId) {
    const customer = getCustomerById(customerId);

    if (!customer) {
        throw new Error(`Customer ID ${customerId} not found`);
    }

    /*
     * TOTAL SALES
     *
     * Includes:
     * - Cash invoices
     * - Credit invoices
     */
    const salesResult = db.prepare(`
        SELECT
            COALESCE(SUM(i.grand_total), 0) AS total_sales,

            COALESCE(SUM(i.grand_total - COALESCE((
                SELECT SUM(p.amount)
                FROM payments p
                WHERE p.invoice_id = i.id
            ), 0)), 0) AS total_credit,

            COUNT(i.id) AS total_bills

        FROM invoices i
        WHERE i.customer_id = ?
    `).get(customerId);


    /*
     * CASH SALES
     *
     * Cash invoices are already fully received.
     */
    const receivedResult = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) AS total_received
        FROM payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        WHERE i.customer_id = ?
    `).get(customerId);



    const totalSales = Number(salesResult.total_sales || 0);
    const totalCredit = Number(salesResult.total_credit || 0);

    const totalReceivedFromPayments = Number(receivedResult.total_received || 0);


    /*
     * RECEIVED
     *
     * Cash sales are automatically received.
     * Credit sales are received only when a payment is recorded.
     */
    const totalReceived = totalReceivedFromPayments;


    /*
     * BALANCE DUE
     *
     * Only unpaid portion of credit sales remains outstanding.
     */
    const balanceDue = Math.max(
        0,
        totalSales - totalReceived
    );


    return {
        customer,

        // All invoices
        totalSales,

        // Only credit invoices
        totalCredit,

        // Cash invoices + payments against credit invoices
        totalReceived,

        // Remaining credit amount
        balanceDue,

        totalBills: Number(salesResult.total_bills || 0)
    };
}


/* =========================================================
   CUSTOMER TRANSACTIONS
   ========================================================= */

function getCustomerTransactions(customerId) {
    const customer = getCustomerById(customerId);

    if (!customer) {
        throw new Error(`Customer ID ${customerId} not found`);
    }

    const transactions = db.prepare(`
        /*
         * CASH SALE
         */
        SELECT
            i.invoice_date AS date,
            'Cash Sale' AS type,
            i.invoice_number AS reference,
            i.grand_total AS amount,
            i.id AS invoice_id
        FROM invoices i
        WHERE i.customer_id = ?
          AND i.payment_method = 'cash'

        UNION ALL

        /*
         * CREDIT SALE
         */
        SELECT
            i.invoice_date AS date,
            'Credit Sale' AS type,
            i.invoice_number AS reference,
            i.grand_total AS amount,
            i.id AS invoice_id
        FROM invoices i
        WHERE i.customer_id = ?
          AND i.payment_method = 'credit'

        UNION ALL

        /*
         * PAYMENT RECEIVED
         */
        SELECT
            p.payment_date AS date,
            'Payment Received' AS type,
            'PAY-' || p.id AS reference,
            p.amount AS amount,
            p.invoice_id AS invoice_id
        FROM payments p
        INNER JOIN invoices i
            ON i.id = p.invoice_id
        WHERE i.customer_id = ?

        ORDER BY date DESC
    `).all(
        customerId,
        customerId,
        customerId
    );

    return transactions;
}


/* =========================================================
   DELETE CUSTOMER
   ========================================================= */

function deleteCustomer(id) {
    const deleteTransaction = db.transaction(() => {
        const usage = db.prepare(`
          SELECT EXISTS(SELECT 1 FROM invoices WHERE customer_id = ?) AS invoice_usage
        `).get(id);

        if (usage.invoice_usage) {
            throw new Error('This customer cannot be deleted because invoice history exists.');
        }

        const result = db.prepare(`
            DELETE FROM customers
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            throw new Error('Customer not found');
        }
    });

    deleteTransaction();
}


module.exports = {
    addCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getCustomerOverview,
    getCustomerTransactions,
    getCustomerPaymentSummary,
    getCreditCustomers,
    getCustomerCreditBills,
};