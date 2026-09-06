import { useState, useEffect } from 'react';
import {
  PackagePlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

function Stock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [restockAmount, setRestockAmount] = useState({});

  const [editingProduct, setEditingProduct] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editReason, setEditReason] = useState('Stock adjustment');

  const [deleteLoading, setDeleteLoading] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);

    try {
      const data = await window.api.products.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // --------------------------------
  // ADD STOCK
  // --------------------------------

  const handleRestock = async (id) => {
    const amount = Number(restockAmount[id]);

    if (!amount || amount <= 0) {
      return;
    }

    try {
      await window.api.stock.addStock(
        id,
        amount,
        'restock'
      );

      setRestockAmount((prev) => ({
        ...prev,
        [id]: '',
      }));

      await loadProducts();
    } catch (error) {
      console.error('Failed to add stock:', error);
    }
  };

  // --------------------------------
  // OPEN EDIT STOCK
  // --------------------------------

  const openEditStock = (product) => {
    setEditingProduct(product);
    setEditQuantity(String(product.stock_quantity));
    setEditReason('Stock adjustment');
  };

  // --------------------------------
  // SAVE STOCK ADJUSTMENT
  // --------------------------------

  const handleAdjustStock = async () => {
    if (!editingProduct) return;

    const quantity = Number(editQuantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return;
    }

    try {
      setEditLoading(true);

      await window.api.stock.adjustStock(
        editingProduct.id,
        quantity,
        editReason.trim() || 'Stock adjustment'
      );

      setEditingProduct(null);
      setEditQuantity('');
      setEditReason('Stock adjustment');

      await loadProducts();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    } finally {
      setEditLoading(false);
    }
  };

  // --------------------------------
  // DELETE PRODUCT
  // --------------------------------

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(product.id);

      await window.api.products.delete(product.id);

      await loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Stock Management
        </h2>

        <p className="text-sm text-gray-500">
          Update stock when new inventory arrives
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">

          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">

              <th className="px-6 py-3 font-medium">
                Product
              </th>

              <th className="px-6 py-3 font-medium">
                Current Stock
              </th>

              <th className="px-6 py-3 font-medium">
                Add Stock
              </th>

              <th className="px-6 py-3 font-medium text-center">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-8 text-center text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (

                <tr
                  key={product.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >

                  {/* Product */}
                  <td className="px-6 py-3.5 font-medium text-gray-800">
                    {product.name}
                  </td>

                  {/* Current Stock */}
                  <td className="px-6 py-3.5">

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.stock_quantity <= 10
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {product.stock_quantity} in stock
                    </span>

                  </td>

                  {/* Add Stock */}
                  <td className="px-6 py-3.5">

                    <div className="flex items-center gap-2">

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={
                          restockAmount[product.id] || ''
                        }
                        onChange={(e) =>
                          setRestockAmount({
                            ...restockAmount,
                            [product.id]: e.target.value,
                          })
                        }
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />

                      <button
                        onClick={() =>
                          handleRestock(product.id)
                        }
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PackagePlus size={14} />
                        Add
                      </button>

                    </div>

                  </td>

                  {/* Actions */}
                  <td className="px-6 py-3.5">

                    <div className="flex items-center justify-center gap-2">

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() =>
                          openEditStock(product)
                        }
                        title="Edit stock"
                        className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(product)
                        }
                        disabled={
                          deleteLoading === product.id
                        }
                        title="Delete product"
                        className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>

                  </td>

                </tr>

              ))
            )}

          </tbody>
        </table>
      </div>

      {/* -------------------------------- */}
      {/* EDIT STOCK MODAL */}
      {/* -------------------------------- */}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">

          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Edit Stock
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  {editingProduct.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>

            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">

              {/* Current Stock */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Current Stock
                </label>

                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {editingProduct.stock_quantity}
                </div>
              </div>

              {/* New Quantity */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  New Stock Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  value={editQuantity}
                  onChange={(e) =>
                    setEditQuantity(e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Reason
                </label>

                <input
                  type="text"
                  value={editReason}
                  onChange={(e) =>
                    setEditReason(e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">

              <button
                type="button"
                onClick={() =>
                  setEditingProduct(null)
                }
                disabled={editLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAdjustStock}
                disabled={editLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Stock;