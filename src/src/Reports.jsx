import { useEffect, useState } from 'react';
import { IndianRupee, Receipt, Wallet, CreditCard, RefreshCw, Download } from 'lucide-react';

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-semibold text-gray-800 mt-2">
            {value}
          </p>
        </div>

        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const [report, setReport] = useState(null);
  const [customers, setCustomers] = useState([]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerId, setCustomerId] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState('');
  const [reportDetails, setReportDetails] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    setFromDate(today);
    setToDate(today);
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      loadReport();
    }
  }, [fromDate, toDate, customerId]);

  async function loadCustomers() {
    try {
      const data = await window.api.customers.getAll();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadReport() {
  try {
    setLoading(true);
    setError('');

    const [summary, details] = await Promise.all([
      window.api.reports.getSalesReport(
        fromDate,
        toDate,
        customerId || null
      ),
      window.api.reports.getSalesReportDetails(
        fromDate,
        toDate,
        customerId || null
      ),
    ]);

    setReport(summary);
    setReportDetails(details);
  } catch (err) {
    console.error('Failed to load report:', err);
    setError(err.message || 'Failed to load report');
  } finally {
    setLoading(false);
  }
}

async function handleDownloadPDF() {
  try {
    if (!fromDate || !toDate) {
      setError('Please select date range');
      return;
    }

    if (fromDate > toDate) {
      setError('From date cannot be after To date');
      return;
    }

    setError('');

    const result = await window.api.reports.downloadPDF(
      fromDate,
      toDate,
      customerId || null
    );

    if (result?.success) {
      alert('Sales report PDF saved successfully.');
    }
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    setError(err.message || 'Failed to generate PDF');
  }
}

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Reports
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            View sales summary for a selected period
          </p>
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-3 gap-4">

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Customer
            </label>

            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">All Customers</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || 'Unnamed Customer'}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Report */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          Loading report...
        </div>
      ) : report ? (
        <>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Sales Summary
            </h3>

            <div className="grid grid-cols-4 gap-4">

              <StatCard
                title="Total Sales"
                value={formatMoney(report.totalSales)}
                icon={IndianRupee}
                iconClass="bg-blue-50 text-blue-600"
              />

              <StatCard
                title="Cash Sales"
                value={formatMoney(report.cashSales)}
                icon={Wallet}
                iconClass="bg-green-50 text-green-600"
              />

              <StatCard
                title="Credit Sales"
                value={formatMoney(report.creditSales)}
                icon={CreditCard}
                iconClass="bg-orange-50 text-orange-600"
              />

              <StatCard
                title="Total Bills"
                value={report.totalBills}
                icon={Receipt}
                iconClass="bg-purple-50 text-purple-600"
              />

            </div>
          </div>
            {/* Report Details */}
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
  <div className="px-5 py-4 border-b border-gray-200">
    <h3 className="text-sm font-semibold text-gray-700">
      Report Details
    </h3>
    <p className="text-xs text-gray-400 mt-1">
      Invoices included in this report
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
          <th className="px-5 py-3 font-medium">Invoice No.</th>
          <th className="px-5 py-3 font-medium">Customer</th>
          <th className="px-5 py-3 font-medium">Date</th>
          <th className="px-5 py-3 font-medium">Amount</th>
          <th className="px-5 py-3 font-medium">Payment</th>
        </tr>
      </thead>

      <tbody>
        {reportDetails.length === 0 ? (
          <tr>
            <td
              colSpan="5"
              className="px-5 py-8 text-center text-gray-400"
            >
              No invoices found for this period
            </td>
          </tr>
        ) : (
          reportDetails.map((invoice) => (
            <tr
              key={invoice.id}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <td className="px-5 py-3.5 font-medium text-gray-800">
                {invoice.invoice_number}
              </td>

              <td className="px-5 py-3.5 text-gray-600">
                {invoice.customer_name || 'Walk-in'}
              </td>

              <td className="px-5 py-3.5 text-gray-500">
                {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
              </td>

              <td className="px-5 py-3.5 font-medium text-gray-800">
                {formatMoney(invoice.grand_total)}
              </td>

              <td className="px-5 py-3.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    invoice.payment_method === 'cash'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  {invoice.payment_method === 'cash'
                    ? 'Cash'
                    : 'Credit'}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
          {/* Download */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </>
      ) : null}

    </div>
  );
}

export default Reports;