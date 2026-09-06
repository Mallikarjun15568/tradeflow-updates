const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    add: (product) => ipcRenderer.invoke('products:add', product),
    update: (id, product) => ipcRenderer.invoke('products:update', id, product),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
  },
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    add: (customer) => ipcRenderer.invoke('customers:add', customer),
    update: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
    getOverview: (customerId) => ipcRenderer.invoke('customers:getOverview', customerId),
    getTransactions: (customerId) => ipcRenderer.invoke('customers:getTransactions', customerId),
    getCreditCustomers: () => ipcRenderer.invoke('customers:getCreditCustomers'),
    getCreditBills: (customerId) => ipcRenderer.invoke('customers:getCreditBills', customerId),
    downloadStatementPDF: (customerId) => ipcRenderer.invoke('customers:downloadStatementPDF', customerId),
  },
  whatsapp: {
    open: (url) => ipcRenderer.invoke('whatsapp:open', url),
  },
  billing: {
    createInvoice: (invoiceData) => ipcRenderer.invoke('billing:createInvoice', invoiceData),
    getAllInvoices: () => ipcRenderer.invoke('billing:getAllInvoices'),
    getInvoiceWithItems: (id) => ipcRenderer.invoke('billing:getInvoiceWithItems', id),
    addPayment: (invoiceId, amount, method) => ipcRenderer.invoke('billing:addPayment', invoiceId, amount, method),
    getInvoicePayments: (invoiceId) => ipcRenderer.invoke('billing:getInvoicePayments', invoiceId),
  },
  dashboard: {
  getSummary: () => ipcRenderer.invoke('dashboard:getSummary'),
  },
  stock: {
    addStock: (productId, quantity, reason) => ipcRenderer.invoke('stock:addStock', productId, quantity, reason),
      adjustStock: (productId, newQuantity, reason) =>ipcRenderer.invoke('stock:adjustStock',productId,newQuantity,reason),
  },
  reports: {
    getSalesReport: (fromDate, toDate, customerId = null) =>
     ipcRenderer.invoke(
      'reports:getSalesReport',
       fromDate,
       toDate,
       customerId
    ),
    getSalesReportDetails: (fromDate, toDate, customerId = null) =>
    ipcRenderer.invoke(
      'reports:getSalesReportDetails',
      fromDate,
      toDate,
      customerId
    ),
    downloadPDF: (fromDate, toDate, customerId = null) =>
  ipcRenderer.invoke(
    'reports:downloadPDF',
    fromDate,
    toDate,
    customerId
  ),
},

  settings: {
  getAll: () => ipcRenderer.invoke('settings:getAll'),
  update: (key, value) => ipcRenderer.invoke('settings:update', key, value),
},
  backup: {

    create: () => ipcRenderer.invoke('backup:create'),
    getAll: () => ipcRenderer.invoke('backup:getAll'),
    restore: (fileName) => ipcRenderer.invoke('backup:restore', fileName),
  },
  license: {
  getDeviceId: () => ipcRenderer.invoke('license:getDeviceId'),
  getAppVersion: () => ipcRenderer.invoke('license:getAppVersion'),

  activate: (licenseKey, deviceId, appVersion) =>
    ipcRenderer.invoke(
      'license:activate',
      licenseKey,
      deviceId,
      appVersion
    ),
},
});