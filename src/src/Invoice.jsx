  import { Fragment, useState, useEffect } from 'react';
  import { ArrowLeft, Printer } from 'lucide-react';

  const ITEMS_PER_PAGE = 18;

  function formatInvoiceDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString.replace(' ', 'T') + 'Z');

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

  function Invoice({ invoiceId, onBack }) {
    const [invoice, setInvoice] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [shopSettings, setShopSettings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadInvoice();
    }, [invoiceId]);

    const loadInvoice = async () => {
      setLoading(true);
      const data = await window.api.billing.getInvoiceWithItems(invoiceId);
      const settings = await window.api.settings.getAll();
      setInvoice(data);
      setShopSettings(settings);
      setLoading(false);
    };

    const handlePrint = () => {
      window.print();
    };

    if (loading) {
      return <div className="text-center text-gray-400 py-10">Loading...</div>;
    }

    if (!invoice) {
      return <div className="text-center text-gray-400 py-10">Invoice not found</div>;
    }

    // Split items into pages of ITEMS_PER_PAGE
    const pages = [];
    for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
      pages.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
    }
    if (pages.length === 0) pages.push([]);

    return (
      <div>
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Back to Billing
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} />
            Print Invoice
          </button>
        </div>

        <div id="invoice-print-area" className="max-w-3xl mx-auto print:max-w-none space-y-6 print:space-y-0">
          {pages.map((pageItems, pageIndex) => {
            const isLastPage = pageIndex === pages.length - 1;
            const startNumber = pageIndex * ITEMS_PER_PAGE;

            return (
              <div
                key={pageIndex}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none flex flex-col print:h-[20cm] ${
                  !isLastPage ? 'print:break-after-page' : ''
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start px-6 pt-3 pb-2 border-b-2 border-gray-900">
                  <div>
                    <div className="text-xl font-bold text-gray-800 tracking-wide">
                      {shopSettings.shop_name || 'WHOLESALE BILLING'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Phone: {shopSettings.shop_phone}</div>
                  </div>
                  <div className="text-lg font-bold text-gray-800 tracking-widest">
                    ESTIMATE{pages.length > 1 ? ` (Page ${pageIndex + 1}/${pages.length})` : ''}
                  </div>
                </div>

                {/* Customer / invoice details */}
                <div className="flex justify-between px-8 py-3 border-b border-gray-200 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">TO,</div>
                    <div className="font-semibold text-gray-800">
                      {invoice.customer_name ? invoice.customer_name.toUpperCase() : 'WALK-IN CUSTOMER'}
                    </div>
                    {invoice.customer_address && <div className="text-gray-500">{invoice.customer_address}</div>}
                    {invoice.customer_phone && <div className="text-gray-500">Phone No: {invoice.customer_phone}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">
                      Invoice No.: <span className="font-medium text-gray-800">{invoice.invoice_number}</span>
                    </div>
                    <div className="text-gray-500 mt-1">
                      Date: <span className="font-medium text-gray-800">{formatInvoiceDate(invoice.invoice_date)}</span>
                    </div>
                                       <div className="text-gray-500 mt-1">
                      Payment:{' '}
                      <span
                        className={`font-semibold ${
                          invoice.payment_method === 'cash'
                            ? 'text-green-700'
                            : 'text-orange-700'
                        }`}
                      >
                        {invoice.payment_method === 'cash' ? 'CASH' : 'CREDIT'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Grid */}
<div
  className="flex-1 grid text-sm"
 style={{
  gridTemplateColumns: '40px minmax(0, 1fr) 80px 80px 80px 100px',

  gridTemplateRows:
    pageItems.length < ITEMS_PER_PAGE
      ? `auto repeat(${pageItems.length}, auto) 1fr`
      : `auto repeat(${pageItems.length}, auto)`,

  border: '2px solid #000',
  borderBottom: 'none',
  minHeight: 0,

  alignContent: 'start',
}}
>
  {/* Header */}
  <div
    className="px-2 py-1 font-semibold text-gray-700"
    style={{
      borderRight: '1px solid #000',
      borderBottom: '1px solid #000',
    }}
  >
    Sr.
  </div>

  <div
    className="px-3 py-1 font-semibold text-gray-700"
    style={{
      borderRight: '1px solid #000',
      borderBottom: '1px solid #000',
    }}
  >
    Particulars
  </div>

  <div
    className="px-2 py-1 font-semibold text-center text-gray-700"
    style={{
      borderRight: '1px solid #000',
      borderBottom: '1px solid #000',
    }}
  >
    Size
  </div>

  <div
    className="px-2 py-1 font-semibold text-center text-gray-700"
    style={{
      borderRight: '1px solid #000',
      borderBottom: '1px solid #000',
    }}
  >
    Rate
  </div>

  <div
    className="px-2 py-1 font-semibold text-right text-gray-700"
    style={{
      borderRight: '1px solid #000',
      borderBottom: '1px solid #000',
    }}
  >
    Qty
  </div>

  <div
    className="px-3 py-1 font-semibold text-right text-gray-700"
    style={{
      borderBottom: '1px solid #000',
    }}
  >
    Amount
  </div>

  {/* Actual Items */}
  {pageItems.map((item, idx) => (
    <Fragment key={item.id}>
      <div
        className="px-2 py-1 text-gray-700"
        style={{
          borderRight: '1px solid #000',
        }}
      >
        {startNumber + idx + 1}
      </div>

      <div
        className="px-3 py-1 text-gray-900 font-medium"
        style={{
          borderRight: '1px solid #000',
        }}
      >
        {item.custom_name} 
      </div>

      <div
        className="px-2 py-1 text-center text-gray-700"
        style={{
          borderRight: '1px solid #000',
        }}
      >
        {item.size || '-'}
      </div>

      <div
        className="px-2 py-1 text-center text-gray-700"
        style={{
          borderRight: '1px solid #000',
        }}
      >
        {item.price.toFixed(2)}
      </div>

      <div
        className="px-2 py-1 text-right text-gray-700"
        style={{
          borderRight: '1px solid #000',
        }}
      >
        {item.quantity}
      </div>

      <div
        className="px-3 py-1 text-right text-gray-900"
      >
        {item.subtotal.toFixed(2)}
      </div>
    </Fragment>
  ))}

  {/* Remaining blank area — ONLY when fewer than 20 items */}
  {pageItems.length < ITEMS_PER_PAGE && (
    <>
      <div
        style={{
          borderRight: '1px solid #000',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #000',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #000',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #000',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #000',
          minHeight: 0,
        }}
      />

      <div />
    </>
  )}
</div>

                {/* Totals — only on the last page */}
                {isLastPage && (
                  <div className="border-t-2 border-gray-800 flex justify-end">
                    <table className="text-sm">
                      <tbody>
                        <tr>
                          <td className="px-3 py-1.5 text-gray-600 border-r border-gray-800 w-32">SUB TOTAL</td>
                          <td className="px-3 py-1.5 text-right w-28">{invoice.subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5 text-gray-600 border-r border-gray-800">Discount</td>
                          <td className="px-3 py-1.5 text-right">{invoice.discount.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t border-gray-800 font-bold">
                          <td className="px-3 py-1.5 border-r border-gray-800">GRAND TOTAL</td>
                          <td className="px-3 py-1.5 text-right">{invoice.grand_total.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer — on every page */}
                <div className="px-8 pb-5 pt-3 text-xs text-gray-400 border-t border-gray-100">
                  {isLastPage ? (
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-gray-500 font-medium">
                          Thank you for your business!
                        </div>

                        <div className="mt-1 text-[9px] text-gray-400">
                          TradeFlow • Support: +91 95796 88201
                        </div>
                      </div>

                      <div className="text-[9px] text-gray-400 text-right">
                        Wholesale Billing & Business Management
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>
                        TradeFlow
                      </span>

                      <span>
                        Continued on page {pageIndex + 2}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  export default Invoice;