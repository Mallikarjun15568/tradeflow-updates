const db = require("../database/connection");

function addStock(product_id, quantity, reason = "restock") {
    const updateStmt = db.prepare(`
    UPDATE products SET stock_quantity = stock_quantity + @qty WHERE id = @id
  `);
    const logStmt = db.prepare(`
    INSERT INTO stock_transactions (product_id, change_quantity, reason)
    VALUES (@product_id, @change_quantity, @reason)
  `);

    const transaction = db.transaction(() => {
        updateStmt.run({ qty: quantity, id: product_id });
        logStmt.run({ product_id, change_quantity: quantity, reason });
    });

    transaction();
}

function adjustStock(product_id, newQuantity, reason = "adjustment") {
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