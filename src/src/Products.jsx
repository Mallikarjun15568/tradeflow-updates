import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';

const emptyForm = { name: '', unit: 'pcs', size: '', selling_price: '', stock_quantity: '' };

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState('');
  const unitLabels = {
    pcs: 'Pcs',
    dozen: '12pcs',
    half_dozen: '6pcs',
    box: '10pcs',
  };
  const getUnitLabel = (unit) => unitLabels[unit] || unit;

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
  setCurrentPage(1);
}, [search]);

  async function loadProducts() {
    setLoading(true);
    const data = await window.api.products.getAll();
    setProducts(data);
    const pages = Math.max(1, Math.ceil(data.length / itemsPerPage));
    setCurrentPage((p) => Math.min(p, pages));
    setLoading(false);
  }

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCustomUnit(false);
    setShowCustomSize(false);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    const knownUnits = ['pcs', 'dozen', 'half_dozen', 'box'];
    const knownSizes = ['S', 'M', 'L', 'XL', 'XXL', ''];
    const productSize = product.size || '';
    setShowCustomUnit(!knownUnits.includes(product.unit));
    setShowCustomSize(!knownSizes.includes(productSize));
    setForm({
      name: product.name,
      unit: product.unit || 'pcs',
      size: productSize,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()){
      alert('Product name is required.');
      return;
    }
    if (!form.selling_price || Number(form.selling_price) <= 0) {
    alert('Selling price must be greater than 0.');
    return;
  }
     if (form.stock_quantity !== '' && Number(form.stock_quantity) < 0) {
    alert('Stock quantity cannot be negative.');
    return;
  }
  
    const payload = {
      name: form.name,
      sku: '',
      unit: form.unit,
      size: form.size,
      purchase_price: 0,
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity) || 0,
      category_id: null,
    };

    if (editingId) {
      await window.api.products.update(editingId, payload);
      alert('Product updated successfully.');
    } else {
      await window.api.products.add(payload);
    }

    setSaving(false);
    closeModal();
    await loadProducts();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await window.api.products.delete(id);
    await loadProducts();
  };
  const filteredProducts = products.filter((product) => {
  const query = search.toLowerCase().trim();

  if (!query) return true;

  return (
    product.name?.toLowerCase().includes(query) ||
    product.size?.toLowerCase().includes(query) ||
    getUnitLabel(product.unit)?.toLowerCase().includes(query)
  );
});

const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

const paginatedProducts = filteredProducts.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
    


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-lg font-semibold text-gray-800">All Products</h2>
    <p className="text-sm text-gray-500">
      {filteredProducts.length} products in inventory
    </p>
  </div>

  <div className="flex items-center gap-3">
    {/* Search */}
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-64 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>

    {/* Add Product */}
    <button
      onClick={openAddModal}
      className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus size={16} />
      Add Product
    </button>
  </div>
</div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Size</th>
              <th className="px-6 py-3 font-medium">Unit</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Stock</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">No products found</td></tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{product.name}</td>
                  <td className="px-6 py-3.5 text-gray-500">{product.size || '—'}</td>
                  <td className="px-6 py-3.5 text-gray-500">{getUnitLabel(product.unit)}</td>
                  <td className="px-6 py-3.5 text-gray-700">₹{product.selling_price}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.stock_quantity <= 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {product.stock_quantity} in stock
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md"
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              {showCustomSize ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Size</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 20/24, 26/30"
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowCustomSize(false); setForm({ ...form, size: '' }); }}
                      className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Size</label>
                  <select
                    value={form.size}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomSize(true);
                        setForm({ ...form, size: '' });
                      } else {
                        setForm({ ...form, size: e.target.value });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">Select size</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="custom">Custom (e.g. 20/24)...</option>
                  </select>
                </div>
              )}
              {showCustomUnit ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Unit</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 7pcs"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowCustomUnit(false); setForm({ ...form, unit: 'pcs' }); }}
                      className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomUnit(true);
                        setForm({ ...form, unit: '' });
                      } else {
                        setForm({ ...form, unit: e.target.value });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="pcs">Pcs</option>
                    <option value="dozen">12pcs</option>
                    <option value="half_dozen">6pcs</option>
                    <option value="box">10pcs</option>
                    <option value="custom">Custom...</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Selling Price</label>
                <input
                  type="number"
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Stock Quantity</label>
                <input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;