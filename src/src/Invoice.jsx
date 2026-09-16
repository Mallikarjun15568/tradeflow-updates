  import { Fragment, useState, useEffect, useRef } from 'react';
  import { ArrowLeft, Printer, Zap, Pencil, Trash2, Save, X } from 'lucide-react';

  const ITEMS_PER_PAGE = 29;
  const LAST_PAGE_ITEM_LIMIT = 24;

  function formatInvoiceDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString.replace(' ', 'T'));

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

  function Invoice({ invoiceId, onBack, onEdit }) {
    const [invoice, setInvoice] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [shopSettings, setShopSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [printError, setPrintError] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState('');
    const [deletePending, setDeletePending] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const printInProgressRef = useRef(false);
    const invoiceRequestRef = useRef(0);

    useEffect(() => {
      const requestId = ++invoiceRequestRef.current;
      loadInvoice(requestId);

      return () => {
        ++invoiceRequestRef.current;
      };
    }, [invoiceId]);

    const loadInvoice = async (requestId) => {
      setLoading(true);
      try {
        const [data, settings] = await Promise.all([
          window.api.billing.getInvoiceWithItems(invoiceId),
          window.api.settings.getAll(),
        ]);
        if (requestId !== invoiceRequestRef.current) return;
        setInvoice(data);
        setShopSettings(settings);
        setEditForm({
          customerName: data.customer_name || '',
          customerPhone: data.customer_phone || '',
          customerAddress: data.customer_address || '',
          discount: data.discount || 0,
          items: data.items.map((item) => ({
            ...item,
            rate: item.price,
            name: item.custom_name,
            quantity: item.quantity,
          })),
        });
      } catch (error) {
        console.error('Failed to load invoice:', error);
        if (requestId === invoiceRequestRef.current) {
          setPrintError(error.message || 'Could not load invoice.');
        }
      } finally {
        if (requestId === invoiceRequestRef.current) {
          setLoading(false);
        }
      }
    };

    const handleDelete = async () => {
      setActionError('');
      try {
        await window.api.billing.deleteInvoice(invoiceId);
        setDeletePending(false);
        onBack();
      } catch (error) {
        setActionError(error.message || 'Could not delete invoice.');
      }
    };

    const handleSaveEdit = async () => {
      setSaving(true);
      setActionError('');
      try {
        await window.api.billing.updateInvoice(invoiceId, {
          customer_id: invoice.customer_id,
          customer_name: editForm.customerName.trim(),
          customer_phone: editForm.customerPhone.trim(),
          customer_address: editForm.customerAddress.trim(),
          discount: Number(editForm.discount || 0),
          payment_method: invoice.payment_method,
          items: editForm.items.map((item) => ({
            product_id: item.product_id,
            name: item.name,
            quantity: Number(item.quantity),
            rate: Number(item.rate),
            size: item.size,
          })),
        });
        setEditing(false);
        await loadInvoice(invoiceRequestRef.current);
      } catch (error) {
        setActionError(error.message || 'Could not update invoice.');
      } finally {
        setSaving(false);
      }
    };

    const handlePrint = async () => {
      if (printInProgressRef.current) return;

      printInProgressRef.current = true;
      setPrinting(true);
      setPrintError('');

      try {
        const result = await window.api.billing.print();
        if (!result.success) {
          setPrintError(result.failureReason || 'Print job cancelled.');
          return;
        }

        onBack();
      } catch (error) {
        setPrintError(error.message || 'Print failed.');
      } finally {
        printInProgressRef.current = false;
        setPrinting(false);
      }
    };

    const handleQuickPrint = async () => {
      if (printInProgressRef.current) return;

      printInProgressRef.current = true;
      setPrintError('');
      setPrinting(true);

      try {
        const result = await window.api.billing.quickPrint();
        if (!result.success) {
          setPrintError(result.failureReason || 'Quick print failed.');
          return;
        }

        onBack();
      } catch (error) {
        setPrintError(error.message || 'Quick print failed.');
      } finally {
        printInProgressRef.current = false;
        setPrinting(false);
      }
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

    // Keep full item pages. If the final page is full, use a separate totals page.
    const lastPage = pages[pages.length - 1];
    if (pages.length === 1 && lastPage.length > LAST_PAGE_ITEM_LIMIT) {
      pages.push([]);
    } else if (pages.length > 1 && lastPage.length > LAST_PAGE_ITEM_LIMIT) {
      pages.push(lastPage.splice(LAST_PAGE_ITEM_LIMIT));
    }

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
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer size={16} />
              Print Invoice
            </button>
            <button
              onClick={handleQuickPrint}
              disabled={printing}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Zap size={16} />
              {printing ? 'Printing...' : 'Quick Print'}
            </button>
          </div>
        </div>
        {printError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg print:hidden">
            {printError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg print:hidden">
            {actionError}
          </div>
        )}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          {editing ? (
            <>
              <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg text-sm">
                <X size={15} /> Cancel
              </button>
              <button type="button" onClick={() => void handleSaveEdit()} disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50">
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                <Pencil size={15} /> Edit Invoice
              </button>
              <button type="button" onClick={() => setDeletePending(true)} className="inline-flex items-center gap-2 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50">
                <Trash2 size={15} /> Delete Invoice
              </button>
            </>
          )}
        </div>
        {deletePending && !editing && (
          <div className="mb-4 flex items-center justify-end gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm print:hidden">
            <div className="text-red-700">
              <div className="font-semibold">Delete this invoice?</div>
              <div className="text-xs mt-0.5">
                This will remove the invoice and its payments and restore sold stock.
              </div>
            </div>
            <button type="button" onClick={() => void handleDelete()} className="font-semibold text-red-700 hover:underline">Yes, delete</button>
            <button type="button" onClick={() => setDeletePending(false)} className="text-gray-600 hover:underline">Cancel</button>
          </div>
        )}
        {editing && editForm && (
          <div className="mb-5 p-4 bg-white border border-gray-200 rounded-xl print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} placeholder="Customer name" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={editForm.customerPhone} onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })} placeholder="Phone" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={editForm.customerAddress} onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })} placeholder="Address" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              {editForm.items.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2">
                  <input value={item.name} readOnly className="border rounded-lg px-3 py-2 text-sm bg-gray-50" />
                  <input type="number" min="0" value={item.rate} onChange={(e) => setEditForm({ ...editForm, items: editForm.items.map((entry, i) => i === index ? { ...entry, rate: e.target.value } : entry) })} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" min="1" value={item.quantity} onChange={(e) => setEditForm({ ...editForm, items: editForm.items.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry) })} className="border rounded-lg px-3 py-2 text-sm" />
                  <button type="button" onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== index) })} className="text-red-500 px-2"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <input type="number" min="0" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} placeholder="Discount" className="border rounded-lg px-3 py-2 text-sm mt-3" />
          </div>
        )}

        <div id="invoice-print-area" className="max-w-3xl mx-auto print:max-w-none space-y-6 print:space-y-0">
          {pages.map((pageItems, pageIndex) => {
            const isLastPage = pageIndex === pages.length - 1;
            const startNumber = pages
              .slice(0, pageIndex)
              .reduce((total, page) => total + page.length, 0);

            return (
              <div
                key={pageIndex}
                className={`invoice-print-page bg-white border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 flex flex-col ${
                  !isLastPage ? 'print:break-after-page' : ''
                }`}
              >
                {/* Header */}
                <div
                  className="flex justify-between items-start px-6 pt-3 pb-2 border-t border-b border-gray-900"
                  style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}
                >
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
                <div
                  className="flex justify-between px-8 py-3 border-b border-gray-200 text-sm"
                  style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}
                >
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
   gridTemplateColumns: '40px minmax(0, 1fr) 90px 80px 110px',

  gridTemplateRows:
    pageItems.length < ITEMS_PER_PAGE
      ? `auto repeat(${pageItems.length}, auto) 1fr`
      : `auto repeat(${pageItems.length}, auto)`,

  border: '1px solid #000',
  borderBottom: 'none',
  minHeight: 0,

  alignContent: 'start',
}}
>
  {/* Header */}
  <div
    className="px-2 py-1 font-semibold text-gray-700"
    style={{
      borderRight: '1px solid #999',
      borderBottom: '1px solid #999',
    }}
  >
    Sr.
  </div>

  <div
    className="px-3 py-1 font-semibold text-gray-700"
    style={{
      borderRight: '1px solid #999',
      borderBottom: '1px solid #999',
    }}
  >
    Particulars
  </div>

  <div
    className="px-2 py-1 font-semibold text-center text-gray-700"
    style={{
      borderRight: '1px solid #999',
      borderBottom: '1px solid #999',
    }}
  >
    Rate
  </div>

  <div
    className="px-2 py-1 font-semibold text-right text-gray-700"
    style={{
      borderRight: '1px solid #999',
      borderBottom: '1px solid #999',
    }}
  >
    Qty
  </div>

  <div
    className="px-3 py-1 font-semibold text-right text-gray-700"
    style={{
      borderBottom: '1px solid #999',
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
          borderRight: '1px solid #999',
        }}
      >
        {startNumber + idx + 1}
      </div>

      <div
        className="px-3 py-1 text-gray-900 font-medium"
        style={{
          borderRight: '1px solid #999',
        }}
      >
        {item.custom_name} 
      </div>

      <div
        className="px-2 py-1 text-center text-gray-700"
        style={{
          borderRight: '1px solid #999',
        }}
      >
        {item.price.toFixed(2)}
      </div>

      <div
        className="px-2 py-1 text-right text-gray-700"
        style={{
          borderRight: '1px solid #999',
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

  {/* Remaining blank area on the final item page */}
  {pageItems.length < ITEMS_PER_PAGE && (
    <>
      <div
        style={{
          borderRight: '1px solid #999',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #999',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #999',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #999',
          minHeight: 0,
        }}
      />

      <div
        style={{
          borderRight: '1px solid #999',
          minHeight: 0,
        }}
      />

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
                        {invoice.payment_method === 'credit' && (
                          <>
                            <tr>
                              <td className="px-3 py-1.5 text-gray-600 border-r border-gray-800">Cash Received</td>
                              <td className="px-3 py-1.5 text-right">{Number(invoice.cash_received || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-1.5 text-gray-600 border-r border-gray-800">Online Received</td>
                              <td className="px-3 py-1.5 text-right">{Number(invoice.online_received || 0).toFixed(2)}</td>
                            </tr>
                            <tr className="font-bold text-orange-700">
                              <td className="px-3 py-1.5 border-r border-gray-800">DUE</td>
                              <td className="px-3 py-1.5 text-right">{Math.max(0, Number(invoice.amount_due || 0)).toFixed(2)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer — on every page */}
                <div className="invoice-footer px-8 pb-5 pt-3 text-xs text-gray-400 border-t border-gray-100">
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