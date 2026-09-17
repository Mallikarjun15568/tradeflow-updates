import { useEffect, useState } from 'react';
import {
  IndianRupee,
  Banknote,
  CreditCard,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString.replace(' ', 'T'));

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await window.api.dashboard.getSummary();

      setData(result);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>

        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentBills = data?.recentBills || [];
  const todayPayments = data?.todayPayments || [];
  const lowStock = data?.lowStock || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Today's business overview
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Today's Sales */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Today's Sales
              </p>

              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {formatAmount(stats.todaySales)}
              </p>
            </div>

            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <IndianRupee
                size={20}
                className="text-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Cash Received */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Cash Received
              </p>

              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {formatAmount(stats.cashReceived)}
              </p>
              {Number(stats.onlineReceived || 0) > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Online: {formatAmount(stats.onlineReceived)}
                </p>
              )}
            </div>

            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Banknote
                size={20}
                className="text-green-600"
              />
            </div>
          </div>
        </div>

        {/* Credit Sales */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Credit Sales
              </p>

              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {formatAmount(stats.creditSales)}
              </p>
            </div>

            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <CreditCard
                size={20}
                className="text-orange-600"
              />
            </div>
          </div>
        </div>

        {/* Today's Bills */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Today's Bills
              </p>

              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {stats.todayBills || 0}
              </p>
            </div>

            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileText
                size={20}
                className="text-purple-600"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Bills */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Recent Bills
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Latest invoices
              </p>
            </div>

            <FileText
              size={18}
              className="text-gray-400"
            />
          </div>

          {recentBills.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No bills yet
            </div>
          ) : (
            <div>
              {recentBills.map((bill) => (
                <div
                  key={bill.id}
                  className="px-5 py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {bill.invoice_number}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            bill.payment_method === 'cash'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          {bill.payment_method === 'cash'
                            ? 'Cash'
                            : 'Credit'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {bill.customer_name || 'Walk-in Customer'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-800">
                        {formatAmount(bill.grand_total)}
                      </p>

                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(bill.invoice_date)}
                      </p>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Payments */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Today's Payments
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Cash received today
              </p>
            </div>

            <Clock
              size={18}
              className="text-gray-400"
            />
          </div>

          {todayPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No payments today
            </div>
          ) : (
            <div>
              {todayPayments.map((payment, index) => (
                <div
                  key={`${payment.invoice_number}-${index}`}
                  className="px-5 py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {payment.customer_name || 'Walk-in Customer'}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {payment.invoice_number}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{formatAmount(payment.amount)}
                      </p>

                      <p className="text-[10px] text-gray-400 mt-1">
                        Cash
                      </p>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Low Stock */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Low Stock
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Products with 5 or fewer units
            </p>
          </div>

          <AlertTriangle
            size={18}
            className="text-orange-500"
          />
        </div>

        {lowStock.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No low stock products
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">
                    Product
                  </th>

                  <th className="text-left px-5 py-3 font-medium">
                    Size
                  </th>

                  <th className="text-right px-5 py-3 font-medium">
                    Stock
                  </th>
                </tr>
              </thead>

              <tbody>
                {lowStock.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-gray-100"
                  >
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {product.name}
                    </td>

                    <td className="px-5 py-3 text-gray-500">
                      {product.size || '-'}
                    </td>

                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                        {product.stock_quantity}
                        {product.unit
                          ? ` ${product.unit}`
                          : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}

export default Dashboard;