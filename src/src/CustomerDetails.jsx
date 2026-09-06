import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Receipt,
  IndianRupee,
  Wallet,
  Clock,
  CreditCard,
  X,
  MessageCircle,
  Pencil,
} from 'lucide-react';

function CustomerDetails({ customerId, onBack }) {
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditBills, setCreditBills] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  async function loadCustomerDetails() {
    setLoading(true);

    try {
      const [overviewData, transactionData, creditBillsData] =
        await Promise.all([
          window.api.customers.getOverview(customerId),
          window.api.customers.getTransactions(customerId),
          window.api.customers.getCreditBills(customerId),
        ]);

      setOverview(overviewData);
      setTransactions(transactionData);
      setCreditBills(creditBillsData || []);
    } catch (error) {
      console.error('Failed to load customer details:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  const formatMoney = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return '—';

    const parsed = new Date(date.replace(' ', 'T'));

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const openPaymentModal = () => {
    setPaymentAmount('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (paymentSaving) return;

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentError('');
  };

  const handleReceivePayment = async () => {
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a valid payment amount.');
      return;
    }

    const balance = Number(overview?.balanceDue || 0);

    if (balance <= 0) {
      setPaymentError('This customer has no pending balance.');
      return;
    }

    if (amount > balance) {
      setPaymentError(
        `Payment cannot be greater than remaining amount ${formatMoney(balance)}.`
      );
      return;
    }

    setPaymentSaving(true);
    setPaymentError('');

    try {
      // Find the oldest unpaid/partial credit invoice.
      // Payment is currently recorded against an invoice.
      const invoices = await window.api.billing.getAllInvoices();

      const customerInvoices = invoices
        .filter(
          (invoice) =>
            invoice.customer_id === customerId &&
            invoice.payment_method === 'credit' &&
            invoice.payment_status !== 'paid'
        )
        .sort(
          (a, b) =>
            new Date(a.invoice_date) - new Date(b.invoice_date)
        );

      if (customerInvoices.length === 0) {
        setPaymentError('No pending credit invoice found.');
        return;
      }

      let remainingPayment = amount;

      for (const invoice of customerInvoices) {
        if (remainingPayment <= 0) break;

        const invoiceDetails =
          await window.api.billing.getInvoiceWithItems(invoice.id);

        const invoicePayments = await getInvoicePayments(invoice.id);

        const paid = invoicePayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        );

        const invoiceRemaining =
          Number(invoiceDetails.grand_total || 0) - paid;

        if (invoiceRemaining <= 0) continue;

        const paymentForInvoice = Math.min(
          remainingPayment,
          invoiceRemaining
        );

        await window.api.billing.addPayment(
          invoice.id,
          paymentForInvoice,
          'cash'
        );

        remainingPayment -= paymentForInvoice;
      }

      setShowPaymentModal(false);
      setPaymentAmount('');

      await loadCustomerDetails();
    } catch (error) {
      console.error('Failed to receive payment:', error);

      setPaymentError(
        error?.message || 'Failed to receive payment.'
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  async function getInvoicePayments(invoiceId) {
    if (window.api.billing.getInvoicePayments) {
      return await window.api.billing.getInvoicePayments(invoiceId);
    }

    return [];
  }

  const openEditModal = () => {
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editSaving) return;

    setShowEditModal(false);
    setEditError('');
  };

  const handleCustomerUpdate = async () => {
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();

    if (!name) {
      setEditError('Customer name is required.');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      setEditError('Phone number must be exactly 10 digits.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      await window.api.customers.update(customerId, {
        name,
        phone,
        address: editForm.address.trim(),
      });
      alert('Customer updated successfully.');
      setShowEditModal(false);
      await loadCustomerDetails();
    } catch (error) {
      console.error('Failed to update customer:', error);
      setEditError(error?.message || 'Failed to update customer.');
    } finally {
      setEditSaving(false);
    }
  };

  async function handleShareViaWhatsApp() {
    try {
      if (!customer.phone) {
        alert('Customer phone number is not available.');
        return;
      }

      const pdfResult =
        await window.api.customers.downloadStatementPDF(customer.id);

      if (!pdfResult?.success) {
        alert('Failed to generate customer statement.');
        return;
      }

      const shopSettings = await window.api.settings.getAll();
      const pending = Number(overview?.balanceDue || 0).toFixed(2);
      const shopName = shopSettings.shop_name || 'TradeFlow';
      const message =
        `Dear ${customer.name},\n\n` +
        `Your account statement from ${shopName} is attached.\n` +
        `Outstanding: ₹${pending}\n\n` +
        `Regards,\n${shopName}`;
      const phone = customer.phone.replace(/\D/g, '');
      const whatsappUrl =
        `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

      await window.api.whatsapp.open(whatsappUrl);
    } catch (error) {
      console.error('Failed to share statement:', error);
      alert('Failed to generate or share statement.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">
          Loading customer details...
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </button>

        <div className="mt-10 text-center text-gray-400">
          Customer not found.
        </div>
      </div>
    );
  }

  const customer = overview.customer;

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Customers
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={openEditModal}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50"
          >
            <Pencil size={16} />
            Edit Customer
          </button>
          <button
            onClick={openPaymentModal}
            disabled={Number(overview.balanceDue || 0) <= 0}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Wallet size={16} />
            Receive Payment
          </button>
          <button
            onClick={handleShareViaWhatsApp}
            className="flex items-center gap-2 border border-green-200 text-green-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-50"
          >
            <MessageCircle size={16} />
            Share via WhatsApp
          </button>
        </div>
      </div>

      {/* Customer Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
            {customer.name
              ? customer.name
                  .split(' ')
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join('')
                  .toUpperCase()
              : 'C'}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {customer.name}
            </h2>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">

              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={14} />
                  {customer.phone}
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {customer.address}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <Receipt size={17} />
            Total Sales
          </div>

          <div className="text-xl font-semibold text-gray-800">
            {formatMoney(overview.totalSales)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <Wallet size={17} />
            Received
          </div>

          <div className="text-xl font-semibold text-green-600">
            {formatMoney(overview.totalReceived)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <IndianRupee size={17} />
            Balance Due
          </div>

          <div className="text-xl font-semibold text-red-600">
            {formatMoney(overview.balanceDue)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <CreditCard size={17} />
            Total Bills
          </div>

          <div className="text-xl font-semibold text-gray-800">
            {overview.totalBills}
          </div>
        </div>

      </div>

      {/* Transactions */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />

            <div>
              <h3 className="font-semibold text-gray-800">
                Transaction History
              </h3>

              <p className="text-xs text-gray-400 mt-0.5">
                Credit sales and payments received
              </p>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No transactions found.
          </div>
        ) : (
          <table className="w-full text-sm">

            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">
                  Date
                </th>

                <th className="px-6 py-3 font-medium">
                  Type
                </th>

                <th className="px-6 py-3 font-medium">
                  Reference
                </th>

                <th className="px-6 py-3 font-medium text-right">
                  Amount
                </th>

                <th className="px-6 py-3 font-medium text-right">
                  Due
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction, index) => (
                <tr
                  key={`${transaction.reference}-${index}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-6 py-3.5 text-gray-500">
                    {formatDate(transaction.date)}
                  </td>

                  <td className="px-6 py-3.5">
                    <span
                      className={
                        transaction.type === 'Payment Received'
                          ? 'text-green-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {transaction.type}
                    </span>
                  </td>

                  <td className="px-6 py-3.5 text-gray-600">
                    {transaction.reference}
                  </td>

                  <td className="px-6 py-3.5 text-right font-medium text-gray-800">
                    {formatMoney(transaction.amount)}
                  </td>

                  <td className="px-6 py-3.5 text-right text-gray-600">
                    {transaction.type === 'Credit Sale' &&
                    transaction.reference ? (
                      (() => {
                        const bill = creditBills.find(
                          (item) =>
                            item.invoice_number === transaction.reference
                        );

                        if (!bill) return '—';

                        const billDate = new Date(
                          bill.invoice_date.replace(' ', 'T')
                        );
                        const today = new Date();
                        const dueDays = Math.max(
                          0,
                          Math.floor(
                            (today - billDate) /
                              (1000 * 60 * 60 * 24)
                          )
                        );

                        return `${dueDays} ${
                          dueDays === 1 ? 'day' : 'days'
                        }`;
                      })()
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Customer
              </h3>
              <button
                onClick={closeEditModal}
                disabled={editSaving}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Phone
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-600 mt-2">{editError}</p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeEditModal}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomerUpdate}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Receive Payment
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  {customer.name}
                </p>
              </div>

              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>

            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Balance Due
                </span>

                <span className="font-semibold text-red-600">
                  {formatMoney(overview.balanceDue)}
                </span>
              </div>
            </div>

            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Payment Amount
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₹
              </span>

              <input
                type="number"
                min="1"
                max={overview.balanceDue}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setPaymentError('');
                }}
                placeholder="Enter amount"
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                autoFocus
              />
            </div>

            {paymentError && (
              <p className="text-xs text-red-600 mt-2">
                {paymentError}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-6">

              <button
                onClick={closePaymentModal}
                disabled={paymentSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleReceivePayment}
                disabled={paymentSaving}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {paymentSaving ? 'Saving...' : 'Receive Payment'}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default CustomerDetails;