import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

function Billing({ onInvoiceCreated, onViewInvoice }) {
  const draftKey = 'tradeflow_billing_draft';
  const [activeTab, setActiveTab] = useState('new');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const productInputRef = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const draftLoadedRef = useRef(false);
  const historyPerPage = 10;

  const loadData = async () => {
    try {
      const [customerData, productData, invoiceData] = await Promise.all([
        window.api.customers.getAll(),
        window.api.products.getAll(),
        window.api.billing.getAllInvoices(),
      ]);
      setCustomers(customerData);
      setProducts(productData);
      setInvoices(invoiceData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      setErrorMsg(error.message || 'Could not load billing data.');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setCustomerName(draft.customerName || '');
        setCustomerPhone(draft.customerPhone || '');
        setCustomerAddress(draft.customerAddress || '');
        setProductSearch(draft.productSearch || '');
        setQuantity(draft.quantity || 1);
        setRate(draft.rate || '');
        setDiscount(draft.discount || 0);
        setItems(Array.isArray(draft.items) ? draft.items : []);
        setPaymentMethod(draft.paymentMethod || 'cash');
      }
    } catch (error) {
      console.error('Failed to restore billing draft:', error);
      localStorage.removeItem(draftKey);
    } finally {
      draftLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftLoadedRef.current) return;

    const hasDraft = items.length > 0 || customerName || customerPhone ||
      customerAddress || productSearch || rate !== '' || Number(discount) !== 0;

    if (!hasDraft) {
      localStorage.removeItem(draftKey);
      return;
    }

    try {
      localStorage.setItem(draftKey, JSON.stringify({
        customerName,
        customerPhone,
        customerAddress,
        productSearch,
        quantity,
        rate,
        discount,
        items,
        paymentMethod,
      }));
    } catch (error) {
      console.error('Failed to save billing draft:', error);
    }
  }, [
    customerName,
    customerPhone,
    customerAddress,
    productSearch,
    quantity,
    rate,
    discount,
    items,
    paymentMethod,
  ]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to clear billing draft:', error);
    }
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setProductSearch('');
    setQuantity(1);
    setRate('');
    setDiscount(0);
    setItems([]);
    setPaymentMethod('cash');
    setErrorMsg('');
  };

  const matchedCustomer = customers.find(
    (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
  );

  const matchedProduct = products.find(
    (p) => p.name.toLowerCase() === productSearch.trim().toLowerCase()
  );

  const handleProductSearchChange = (value) => {
    setProductSearch(value);
    const nextMatch = products.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (nextMatch) {
      setRate(nextMatch.selling_price);
    }
  };

  const handleAddItem = () => {
    if (!productSearch.trim()) {
      setErrorMsg('Please enter an item name.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setErrorMsg('Please enter a valid quantity.');
      return;
    }
    if (rate === '' || rate < 0) {
      setErrorMsg('Please enter a valid rate.');
      return;
    }
    setErrorMsg('');

    setItems([
      ...items,
      {
        id: Date.now(),
        product_id: matchedProduct ? matchedProduct.id : null,
        name: matchedProduct ? matchedProduct.name : productSearch.trim(),
        availableStock: matchedProduct ? matchedProduct.stock_quantity : null,
        qty: Number(quantity),
        rate: Number(rate),
      },
    ]);
    setProductSearch('');
    setQuantity(1);
    setRate('');
    productInputRef.current?.focus();
  };

  const handleRemoveItem = (id) => setItems(items.filter((i) => i.id !== id));

  const updateItem = (id, field, value) => {
    setItems(
      items.map((i) => {
        if (i.id !== id) return i;
        const nextValue = value === '' ? '' : Number(value);
        return { ...i, [field]: nextValue };
      })
    );
  };

  const subTotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  const grandTotal = subTotal - Number(discount || 0);

  //History filters
  const filteredInvoices = invoices.filter((inv) => {
    // search Invoice No / Customer / Phone
    const searchTerm = historySearch.trim().toLowerCase();

    const matchesSearch = 
      !searchTerm ||
      String(inv.invoice_number).toLowerCase().includes(searchTerm) ||
      String(inv.customer_name).toLowerCase().includes(searchTerm) ||
      String(inv.customer_phone).toLowerCase().includes(searchTerm);

      // Payment filter 
      const matchesPayment = paymentFilter === 'all' || inv.payment_method === paymentFilter;

      // Date filter
      const matchesDate = !dateFilter ||String(inv.invoice_date || '').slice(0, 10) === dateFilter;

       return matchesSearch && matchesPayment && matchesDate;
  });


 const totalHistoryPages = Math.ceil(
  filteredInvoices.length / historyPerPage
);

const safeHistoryPage =
  totalHistoryPages > 0
    ? Math.min(historyPage, totalHistoryPages)
    : 1;

const paginatedInvoices = filteredInvoices.slice(
  (safeHistoryPage - 1) * historyPerPage,
  safeHistoryPage * historyPerPage
);

  const handleCreateInvoice = async () => {
    setErrorMsg('');

    const invalidItem = items.find(
      (i) => !i.qty || i.qty <= 0 || i.rate === '' || i.rate < 0
    );
    if (invalidItem) {
      setErrorMsg(`"${invalidItem.name}" has an invalid quantity or rate.`);
      return;
    }
    if (Number(discount) < 0) {
     setErrorMsg('Discount cannot be negative.');
     return; 
    }

     if (Number(discount) > subTotal) {
       setErrorMsg('Discount cannot be greater than the subtotal.');
       return;
      }
  if (customerPhone && !/^\d{10}$/.test(customerPhone.trim())) {
    setErrorMsg('Mobile number must be exactly 10 digits.');
    return;
  }

    setCreating(true);
    try {
      let customerId = null;

      if (customerName.trim()) {
        if (matchedCustomer) {
          customerId = matchedCustomer.id;
          if (
            customerPhone.trim() !== (matchedCustomer.phone || '') ||
            customerAddress.trim() !== (matchedCustomer.address || '')
          ) {
            await window.api.customers.update(customerId, {
              name: matchedCustomer.name,
              phone: customerPhone.trim(),
              address: customerAddress.trim(),
            });
            alert('Customer updated successfully.');
          }
        } else {
          // New customer typed — create it automatically
          customerId = await window.api.customers.add({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: customerAddress.trim(),
          });
        }
      }

      const result = await window.api.billing.createInvoice({
        customer_id: customerId,
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.product_id ? undefined : i.name,
          quantity: i.qty,
          rate: i.rate,
        })),
        discount: Number(discount || 0),
        payment_method: paymentMethod,
      });

      setItems([]);
      clearDraft();
      await loadData();
      onInvoiceCreated?.(result.invoiceId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'new' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            New Bill
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'history' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            History
          </button>
        </div>
        {activeTab === 'new' && items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Discard this draft bill?')) {
                clearDraft();
              }
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Discard Draft
          </button>
        )}
      </div>
                   
{activeTab === 'history' ? (
  <div>

    {/* Search + Filters */}
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search invoice, customer or phone..."
            value={historySearch}
            onChange={(e) => {
              setHistorySearch(e.target.value);
              setHistoryPage(1);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setHistoryPage(1);
          }}
          className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="all">All Payments</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
        </select>

        {/* Date Filter */}
        <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setHistoryPage(1);
       }}
        className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />

        {/* Clear */}
       {(historySearch || paymentFilter !== 'all' || dateFilter) && (
       <button
        onClick={() => {
        setHistorySearch('');
        setPaymentFilter('all');
        setDateFilter('');
        setHistoryPage(1);
        }}
        className="text-sm text-gray-500 hover:text-gray-800"
        >
          Clear
        </button>
        )}

      </div>
    </div>

    {/* Invoice History Table */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
            <th className="px-6 py-3 font-medium">Invoice No.</th>
            <th className="px-6 py-3 font-medium">Customer</th>
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium text-right">Amount</th>
            <th className="px-6 py-3 font-medium text-right">Payment</th>
          </tr>
        </thead>

        <tbody>
          {paginatedInvoices.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="px-6 py-10 text-center text-gray-400"
              >
                No invoices found
              </td>
            </tr>
          ) : (
            paginatedInvoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => onViewInvoice?.(inv.id)}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-3 font-medium text-gray-800">
                  {inv.invoice_number}
                </td>

                <td className="px-6 py-3 text-gray-500">
                  {inv.customer_name || 'Walk-in'}
                </td>

                <td className="px-6 py-3 text-gray-500">
                  {inv.invoice_date}
                </td>

                <td className="px-6 py-3 text-right text-gray-700">
                  ₹{Number(inv.grand_total || 0).toFixed(2)}
                </td>

                <td className="px-6 py-3 text-right">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      inv.payment_method === 'cash'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {inv.payment_method === 'cash' ? 'Cash' : 'Credit'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalHistoryPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            Page {safeHistoryPage} of {totalHistoryPages}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setHistoryPage((p) => Math.max(1, p - 1))
              }
              disabled={safeHistoryPage === 1}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40"
            >
              Previous
            </button>

            <button
              onClick={() =>
                setHistoryPage((p) =>
                  Math.min(totalHistoryPages, p + 1)
                )
              }
              disabled={safeHistoryPage === totalHistoryPages}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>

  </div>
) : (
  <>
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
              {errorMsg}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="w-64">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Customer</label>
                <input
                  type="text"
                  list="customer-list"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => { const value = e.target.value; setCustomerName(value);
                    const customer = customers.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());

                  if (customer) {
                    setCustomerPhone(customer.phone || '');
                      setCustomerAddress(customer.address || '');
                    } else {
                      setCustomerPhone('');
                      setCustomerAddress('');
                    }
                }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <datalist id="customer-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="w-40">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Mobile Number</label>
                <input
                  type="text"
                  placeholder="10-digit number"
                  inputMode="numeric"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
                <input
                  type="text"
                  placeholder="Customer address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
            {matchedCustomer && (
              <div className="mb-4 text-xs text-gray-500 flex gap-4">
                <span>📞 {matchedCustomer.phone || 'No phone'}</span>
                <span>📍 {matchedCustomer.address || 'No address'}</span>
              </div>
            )}
            {customerName.trim() && !matchedCustomer && (
              <div className="mb-4 text-xs text-blue-600">New customer — will be added automatically</div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Product</label>
                <input
                  ref={productInputRef}
                  type="text"
                  list="product-list"
                  placeholder="Search or type item name"
                  value={productSearch}
                  onChange={(e) => handleProductSearchChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <datalist id="product-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
              <div className="w-24">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Rate</label>
                <input
                  type="number"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="w-20">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
            {matchedProduct && quantity > matchedProduct.stock_quantity && (
              <div className="mt-2 text-xs text-red-600">
                ⚠ Only {matchedProduct.stock_quantity} units available in stock
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium w-10">Sr.</th>
                  <th className="px-2 py-3 font-medium">Product</th>
                  <th className="px-2 py-3 font-medium w-28">Rate</th>
                  <th className="px-2 py-3 font-medium w-24">Qty</th>
                  <th className="px-6 py-3 font-medium text-right w-32">Amount</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-300">
                      No items added yet
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-2 text-gray-400">{index + 1}</td>
                      <td className="px-2 py-2 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                          className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                          className="w-16 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </td>
                      <td className="px-6 py-2 text-right text-gray-800">
                        ₹{(item.qty * item.rate).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-gray-500 block">Sub Total</span>
                <span className="text-sm text-gray-700">₹{subTotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Discount</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Grand Total</span>
                <span className="text-xl font-bold text-gray-800">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleCreateInvoice}
              disabled={items.length === 0 || creating}
              className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Billing;