import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Phone,
  X,
  Search,
  Loader2,
  UsersRound,
  RefreshCw,
  Trash2,
} from 'lucide-react';
const emptyForm = { name: '', phone: '', address: '' };

function Customers({onViewCustomer}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOverview, setCustomerOverview] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [creditBills, setCreditBills] = useState({});
  const detailsRequestRef = useRef(0);
  
  useEffect(() => {
    loadCustomers();
    loadCreditCustomers();
  }, []);
    
  async function openCustomerDetails(customer) {
  const requestId = ++detailsRequestRef.current;
  setSelectedCustomer(customer);
  setCustomerOverview(null);
  setCustomerTransactions([]);
  setDetailsLoading(true);

  try {
    const [overview, transactions] = await Promise.all([
      window.api.customers.getOverview(customer.id),
      window.api.customers.getTransactions(customer.id),
    ]);

    if (requestId !== detailsRequestRef.current) return;
    setCustomerOverview(overview);
    setCustomerTransactions(transactions);
  } catch (error) {
    console.error('Failed to load customer details:', error);
  } finally {
    if (requestId === detailsRequestRef.current) {
      setDetailsLoading(false);
    }
  }
}

function closeCustomerDetails() {
  ++detailsRequestRef.current;
  setSelectedCustomer(null);
  setCustomerOverview(null);
  setCustomerTransactions([]);
}

  async function loadCreditCustomers() {
  try {
    const data = await window.api.customers.getCreditCustomers();
    setCreditCustomers(data);
  } catch (error) {
    console.error('Failed to load credit customers:', error);
  }
}
  async function loadCreditBills(customerId) {
    try {
      const bills = await window.api.customers.getCreditBills(customerId);

      setCreditBills((prev) => ({
        ...prev,
        [customerId]: bills,
      }));
    } catch (error) {
      console.error('Failed to load credit bills:', error);
    }
  }
  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await window.api.customers.getAll();
      setCustomers(data);
      const pages = Math.max(1, Math.ceil(data.length / itemsPerPage));
      setCurrentPage((p) => Math.min(p, pages));
    } catch (error) {
      console.error('Failed to load customers:', error);
      setActionError('Could not load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (saving) return;
    setActionError('');
   
    //  Validation
  if (!form.name.trim()) {
    setActionError('Customer name is required.');
    return;
  }

  if (form.phone && !/^\d{10}$/.test(form.phone.trim())) {
    setActionError('Phone number must be exactly 10 digits.');
    return;
  }
    if (!editingId) {
      const normalizedName = form.name.trim().replace(/\s+/g, ' ').toLowerCase();
      const normalizedPhone = form.phone.trim();
      const alreadyExists = customers.some((customer) =>
        customer.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedName &&
        (customer.phone || '').trim() === normalizedPhone
      );
      if (alreadyExists) {
        setActionError('Customer already exists with this name and phone number.');
        return;
      }
    }
    const payload = {
      name: form.name,
      phone: form.phone,
      address: form.address,
    };

    const handleDelete = async (customer) => {
      const confirmed = window.confirm(
        `Delete "${customer.name}"?\n\nOnly customers without invoice or payment history can be deleted.`
      );
      if (!confirmed) return;

      setActionError('');
      try {
        await window.api.customers.delete(customer.id);
        await loadCustomers();
        await loadCreditCustomers();
      } catch (error) {
        setActionError(error.message || 'Could not delete customer.');
      }
    };

    setSaving(true);
    setActionError('');
    try {
      if (editingId) {
        await window.api.customers.update(editingId, payload);
      } else {
        await window.api.customers.add(payload);
      }

      closeModal();
      await loadCustomers();
      await loadCreditCustomers();
    } catch (error) {
      console.error('Failed to save customer:', error);
      setActionError(
        error.message?.includes('already exists')
          ? 'Customer already exists with this name and phone number.'
          : error.message || 'Could not save customer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };


const filteredCustomers = (
  customerFilter === 'credit' ? creditCustomers : customers
).filter((customer) => {
  const search = searchTerm.toLowerCase().trim();

  if (!search) return true;

  return (
    customer.name?.toLowerCase().includes(search) ||
    customer.phone?.toLowerCase().includes(search) ||
    customer.address?.toLowerCase().includes(search)
  );
});

  const totalPages = Math.max(
   1,
   Math.ceil(filteredCustomers.length / itemsPerPage)
);

  const paginatedCustomers = filteredCustomers.slice(
   (currentPage - 1) * itemsPerPage,
   currentPage * itemsPerPage
);

  return (
    <div>
      {actionError && (
        <div className="ui-alert-error mb-4 px-4 py-3 text-sm">
          {actionError}
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Customers</h2>
          <p className="text-sm text-gray-500">
              {searchTerm
               ? `${filteredCustomers.length} customers found`
                    : customerFilter === 'credit'
               ? `${creditCustomers.length} credit customers`
               : `${customers.length} customers registered`}
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
  <button
    type="button"
    onClick={async () => {
      await loadCustomers();
      await loadCreditCustomers();
    }}
    disabled={loading}
    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border border-slate-200 bg-white text-slate-600 text-sm font-medium px-3.5 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
  >
    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
    {loading ? 'Refreshing...' : 'Refresh'}
  </button>
  <button
    onClick={() => {
      setCustomerFilter('all');
      setCurrentPage(1);
    }}
    className={`inline-flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium rounded-xl ${
      customerFilter === 'all'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    All Customers
  </button>

  <button
    onClick={async () => {
      setCustomerFilter('credit');
      setCurrentPage(1);

      for (const customer of creditCustomers) {
        await loadCreditBills(customer.id);
      }
    }}
    className={`inline-flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium rounded-xl ${
      customerFilter === 'credit'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Credit Customers
  </button>
          </div>
        <div className="relative w-full lg:w-72">
  <Search
    size={16}
    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
  />

  <input
    type="text"
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    }}
    placeholder="Search customers..."
    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
  />
</div>
        <button
          onClick={openAddModal}
          className="flex shrink-0 items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus size={16} />
          Add Customer
        </button>
        </div>
      </div>

      <div className="ui-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="ui-table-head border-b border-slate-200 text-left">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Address</th>
              {customerFilter === 'credit' && (
                <>
                  <th className="px-6 py-3 font-medium">Balance</th>
                  <th className="px-6 py-3 font-medium">Payment Due</th>
                </>
              )}
              <th className="px-6 py-3 font-medium text-right">Actions</th>
         
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={customerFilter === 'credit' ? 6 : 4}><div className="ui-loading"><Loader2 size={18} className="animate-spin text-blue-600" />Loading customers...</div></td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={customerFilter === 'credit' ? 6 : 4}><div className="ui-empty"><UsersRound size={28} className="text-slate-300" /><span className="ui-empty-title">No customers found</span><span>Add a customer to keep billing history organized.</span></div></td></tr>
            ) : (
              paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{customer.name}</td>
                  <td className="px-6 py-3.5 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400" />
                      {customer.phone || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">{customer.address || '—'}</td>
                  {customerFilter === 'credit' && (
  <td className="px-6 py-3.5 font-medium text-red-600">
    ₹{Number(customer.remaining || 0).toFixed(2)}
  </td>
)}
  {customerFilter === 'credit' && (
    <td className="px-6 py-3.5 text-gray-600">
      {creditBills[customer.id]?.length > 0 ? (
        <div className="space-y-1">
          {creditBills[customer.id].map((bill) => {
            const billDate = new Date(bill.invoice_date);
            const today = new Date();
            const dueDays = Math.max(
              0,
              Math.floor(
                (today - billDate) / (1000 * 60 * 60 * 24)
              )
            );

            return (
              <div key={bill.id} className="text-sm">
                {dueDays} {dueDays === 1 ? 'day' : 'days'}
              </div>
            );
          })}
        </div>
      ) : (
        '—'
      )}
    </td>
  )}
  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onViewCustomer(customer.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(customer)}
                        className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-md"
                        aria-label={`Edit ${customer.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      {!customer.has_history && (
                        <button
                          onClick={() => handleDelete(customer)}
                          className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md"
                          aria-label={`Delete ${customer.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
                {editingId ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
                  {actionError}
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
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;