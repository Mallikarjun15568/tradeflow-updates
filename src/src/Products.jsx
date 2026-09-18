import { useState, useEffect } from 'react';
import { Plus, Pencil, X, Search, Loader2, PackageOpen, RefreshCw } from 'lucide-react';

const emptyForm = { name: '', unit: 'pcs', selling_price: '', stock_quantity: '' };

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingSize, setEditingSize] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
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
    setLoadError('');
    try {
      const data = await window.api.products.getAll();
      setProducts(data);
      const pages = Math.max(1, Math.ceil(data.length / itemsPerPage));
      setCurrentPage((p) => Math.min(p, pages));
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoadError('Could not load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditingSize(null);
    setShowCustomUnit(false);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    const knownUnits = ['pcs', 'dozen', 'half_dozen', 'box'];
    setEditingSize(product.size || null);
    setShowCustomUnit(!knownUnits.includes(product.unit));
    setForm({
      name: product.name,
      unit: product.unit || 'pcs',
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
    });
    setShowModal(true);
    setFormError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setEditingSize(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleSave = async () => {
    if (saving) return;

    if (!form.name.trim()){
      setFormError('Product name is required.');
      return;
    }
    const sellingPrice = Number(form.selling_price);
    const stockQuantity = form.stock_quantity === '' ? 0 : Number(form.stock_quantity);

    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      setFormError('Selling price must be greater than 0.');
      return;
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setFormError('Stock quantity cannot be negative.');
      return;
    }
  
    const payload = {
      name: form.name,
      sku: '',
      unit: form.unit,
      size: editingId ? editingSize : null,
      purchase_price: 0,
      selling_price: sellingPrice,
      stock_quantity: stockQuantity,
      category_id: null,
    };

    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await window.api.products.update(editingId, payload);
      } else {
        await window.api.products.add(payload);
      }

      closeModal();
      await loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      setFormError(error.message || 'Could not save product. Please try again.');
    } finally {
      setSaving(false);
    }
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
      {loadError && (
        <div className="ui-alert-error mb-4 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
  <div>
    <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Products</h2>
    <p className="text-sm text-gray-500">
      {filteredProducts.length} products in inventory
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onClick={loadProducts}
      disabled={loading}
      className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-600 text-sm font-medium px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
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
        className="w-full sm:w-64 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>

    {/* Add Product */}
    <button
      onClick={openAddModal}
      className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
    >
      <Plus size={16} />
      Add Product
    </button>
  </div>
</div>
      <div className="ui-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="ui-table-head border-b border-slate-200 text-left">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Unit</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Stock</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5"><div className="ui-loading"><Loader2 size={18} className="animate-spin text-blue-600" />Loading products...</div></td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="5"><div className="ui-empty"><PackageOpen size={28} className="text-slate-300" /><span className="ui-empty-title">No products found</span><span>Add a product to start managing your inventory.</span></div></td></tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{product.name}</td>
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
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
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