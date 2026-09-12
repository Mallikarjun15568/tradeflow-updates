const db = require("../database/connection");

function validateProductId(product_id) {
    if (!Number.isInteger(product_id) || product_id <= 0) {
        throw new Error("Invalid product ID");
    }
}

function addStock(product_id, quantity, reason = "restock") {
    validateProductId(product_id);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Stock quantity must be greater than 0");
    }
    const updateStmt = db.prepare(`
    UPDATE products SET stock_quantity = stock_quantity + @qty WHERE id = @id
  `);
    const logStmt = db.prepare(`
    INSERT INTO stock_transactions (product_id, change_quantity, reason)
    VALUES (@product_id, @change_quantity, @reason)
  `);

    const transaction = db.transaction(() => {
        const result = updateStmt.run({ qty: quantity, id: product_id });
        if (result.changes === 0) {
            throw new Error("Product not found");
        }
        logStmt.run({ product_id, change_quantity: quantity, reason });
    });

    transaction();
}

function adjustStock(product_id, newQuantity, reason = "adjustment") {
    validateProductId(product_id);
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
        throw new Error("Stock quantity cannot be negative");
    }
    const product = db.prepare(`SELECT stock_quantity FROM products WHERE id = ?`).get(product_id);
    if (!product) {
        throw new Error("Product not found");
    }

    const diff = newQuantity - product.stock_quantity;

    const updateStmt = db.prepare(`UPDATE products SET stock_quantity = @qty WHERE id = @id`);
    const logStmt = db.prepare(`
    INSERT INTO stock_transactions (product_id, change_quantity, reason)
    VALUES (@product_id, @change_quantity, @reason)
  `);

    const transaction = db.transaction(() => {
        updateStmt.run({ qty: newQuantity, id: product_id });
        logStmt.run({ product_id, change_quantity: diff, reason });
    });

    transaction();
}

function getStockHistory(product_id) {
    return db.prepare(`
    SELECT * FROM stock_transactions WHERE product_id = ? ORDER BY created_at DESC
  `).all(product_id);
}

module.exports = {
    addStock,
    adjustStock,
    getStockHistory
};