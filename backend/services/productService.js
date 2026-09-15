const db = require("../database/connection");

function validateProduct(product) {
  if (!product || typeof product.name !== 'string' || !product.name.trim()) {
    throw new Error('Product name is required');
  }
  if (!Number.isFinite(product.selling_price) || product.selling_price <= 0) {
    throw new Error('Selling price must be greater than 0');
  }
  if (
    product.stock_quantity !== undefined &&
    (!Number.isFinite(product.stock_quantity) || product.stock_quantity < 0)
  ) {
    throw new Error('Stock quantity cannot be negative');
  }
}

function addProduct(product) {
    validateProduct(product);
    const stmt = db.prepare(`
    INSERT INTO products (name, category_id, sku, unit, size, purchase_price, selling_price, stock_quantity)
    VALUES (@name, @category_id, @sku, @unit, @size, @purchase_price, @selling_price, @stock_quantity)
  `);
    const result = stmt.run(product);
    return result.lastInsertRowid;
}

function getAllProducts() {
    const stmt = db.prepare(`SELECT * FROM products ORDER BY name`);
    return stmt.all();
}

function getProductById(id) {
    const stmt = db.prepare(`SELECT * FROM products WHERE id = ?`);
    return stmt.get(id);
}

function updateProduct(id, product) {
    validateProduct(product);
    const stmt = db.prepare(`
    UPDATE products
    SET name = @name,
        category_id = @category_id,
        sku = @sku,
        unit = @unit,
        size = @size,
        purchase_price = @purchase_price,
        selling_price = @selling_price,
        stock_quantity = @stock_quantity
    WHERE id = @id
  `);
    const result = stmt.run({ ...product, id });
    if (result.changes === 0) {
      throw new Error('Product not found');
    }
    return result.changes;
}

function deleteProduct(id) {
    const deleteTransaction = db.transaction(() => {
      const usage = db.prepare(`
        SELECT
          EXISTS(SELECT 1 FROM invoice_items WHERE product_id = ?) AS invoice_usage,
          EXISTS(SELECT 1 FROM stock_transactions WHERE product_id = ?) AS stock_usage
      `).get(id, id);

      if (usage.invoice_usage || usage.stock_usage) {
        throw new Error('This product cannot be deleted because it has invoice or stock history.');
      }

      const result = db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
      if (result.changes === 0) {
        throw new Error('Product not found');
      }
    });

    deleteTransaction();
}

module.exports = {
    addProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
};