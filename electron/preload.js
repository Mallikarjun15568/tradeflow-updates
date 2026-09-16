const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).catch((error) => {
    const message = String(error?.message || 'Operation failed.')
      .replace(/^Error invoking remote method '[^']+':\s*Error:\s*/i, '')
      .replace(/^Error:\s*/i, '');
    throw new Error(message);
  });
}

contextBridge.exposeInMainWorld('api', {
  products: {
    getAll: () => invoke('products:getAll'),
    add: (product) => invoke('products:add', product),
    update: (id, product) => invoke('products:update', id, product),
    delete: (id) => invoke('products:delete', id),
  },
  customers: {
    getAll: () => invoke('customers:getAll'),
    add: (customer) => invoke('customers:add', customer),
    update: (id, customer) => invoke('customers:update', id, customer),
    delete: (id) => invoke('customers:delete', id),
    getOverview: (customerId) => invoke('customers:getOverview', customerId),
    getTransactions: (customerId) => invoke('customers:getTransactions', customerId),
    getCreditCustomers: () => invoke('customers:getCreditCustomers'),
    getCreditBills: (customerId) => invoke('customers:getCreditBills', customerId),
    downloadStatementPDF: (customerId) => invoke('customers:downloadStatementPDF', customerId),
  },
  whatsapp: {
    open: (url) => invoke('whatsapp:open', url),
  },
  billing: {
    createInvoice: (invoiceData) => invoke('billing:createInvoice', invoiceData),
    getAllInvoices: () => invoke('billing:getAllInvoices'),
    updateInvoice: (id, invoiceData) => invoke('billing:updateInvoice', id, invoiceData),
    deleteInvoice: (id) => invoke('billing:deleteInvoice', id),
    getInvoiceWithItems: (id) => invoke('billing:getInvoiceWithItems', id),
    addPayment: (invoiceId, amount, method) => invoke('billing:addPayment', invoiceId, amount, method),
    getInvoicePayments: (invoiceId) => invoke('billing:getInvoicePayments', invoiceId),
    print: () => invoke('billing:print'),
    quickPrint: () => invoke('billing:quickPrint'),
  },
  dashboard: {
  getSummary: () => invoke('dashboard:getSummary'),
  },
  stock: {
    addStock: (productId, quantity, reason) => invoke('stock:addStock', productId, quantity, reason),
    adjustStock: (productId, newQuantity, reason) => invoke('stock:adjustStock', productId, newQuantity, reason),
  },
  reports: {
    getSalesReport: (fromDate, toDate, customerId = null) =>
     invoke(
      'reports:getSalesReport',
       fromDate,
       toDate,
       customerId
    ),
    getSalesReportDetails: (fromDate, toDate, customerId = null) =>
    invoke(
      'reports:getSalesReportDetails',
      fromDate,
      toDate,
      customerId
    ),
    downloadPDF: (fromDate, toDate, customerId = null) =>
  invoke(
    'reports:downloadPDF',
    fromDate,
    toDate,
    customerId
  ),
},

  settings: {
  getAll: () => invoke('settings:getAll'),
  update: (key, value) => invoke('settings:update', key, value),
},
  backup: {

    create: () => invoke('backup:create'),
    getAll: () => invoke('backup:getAll'),
    restore: (fileName) => invoke('backup:restore', fileName),
  },
  license: {
  getDeviceId: () => invoke('license:getDeviceId'),
  getAppVersion: () => invoke('license:getAppVersion'),

  activate: (licenseKey, deviceId, appVersion) =>
    invoke(
      'license:activate',
      licenseKey,
      deviceId,
      appVersion
    ),
},
});