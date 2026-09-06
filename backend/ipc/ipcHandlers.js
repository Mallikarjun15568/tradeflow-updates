const { ipcMain, app, dialog, BrowserWindow, shell } = require('electron');

const productService = require('../services/productService');
const customerService = require('../services/customerService');
const billingService = require('../services/billingService');
const stockService = require('../services/stockService');
const settingsService = require('../services/settingsService');
const dashboardService = require('../services/dashboardService');
const reportService = require('../services/reportService');
const backupService = require('../services/backupService');
const reportPdfService = require('../services/reportPdfService');
const customerStatementPdfService = require('../services/customerStatementPdfService');
const licenseService = require('../services/licenseService');

function registerIpcHandlers() {
    ipcMain.handle('whatsapp:open', async (event, url) => {
        await shell.openExternal(url);
        return { success: true };
    });

    // License
    ipcMain.handle('license:getDeviceId', () => {
        const { machineIdSync } = require('node-machine-id');
        return machineIdSync();
    });

    ipcMain.handle('license:getAppVersion', () => {
        return app.getVersion();
    });

    ipcMain.handle(
        'license:activate',
        async (event, licenseKey, deviceId, appVersion) => {
            return await licenseService.activateLicense({
                licenseKey,
                deviceId,
                appVersion,
            });
        }
    );

    // Products
    ipcMain.handle('products:getAll', () => productService.getAllProducts());
    ipcMain.handle('products:add', (event, product) => productService.addProduct(product));
    ipcMain.handle('products:update', (event, id, product) => productService.updateProduct(id, product));
    ipcMain.handle('products:delete', (event, id) => productService.deleteProduct(id));

    // Customers
    ipcMain.handle('customers:getAll', () => customerService.getAllCustomers());
    ipcMain.handle('customers:add', (event, customer) => customerService.addCustomer(customer));
    ipcMain.handle('customers:update', (event, id, customer) => customerService.updateCustomer(id, customer));
    ipcMain.handle('customers:delete', (event, id) => customerService.deleteCustomer(id));
    ipcMain.handle('customers:getPaymentSummary', (event, customerId) => customerService.getCustomerPaymentSummary(customerId));
    ipcMain.handle('customers:getOverview',(event, customerId) => customerService.getCustomerOverview(customerId));
    ipcMain.handle('customers:getTransactions',(event, customerId) => customerService.getCustomerTransactions(customerId));
    ipcMain.handle('customers:getCreditCustomers',() => customerService.getCreditCustomers());
    ipcMain.handle('customers:getCreditBills', async (event, customerId) => { return customerService.getCustomerCreditBills(customerId);});
   
    // Billing
    ipcMain.handle('billing:createInvoice', (event, invoiceData) => billingService.createInvoice(invoiceData));
    ipcMain.handle('billing:getAllInvoices', () => billingService.getAllInvoices());
    ipcMain.handle('billing:getInvoiceWithItems', (event, id) => billingService.getInvoiceWithItems(id));
    ipcMain.handle('billing:addPayment', (event, invoiceId, amount, method) => billingService.addPayment(invoiceId, amount, method));
    ipcMain.handle('billing:getInvoicePayments',(event, invoiceId) => billingService.getInvoicePayments(invoiceId));
    
    // Dashboard
    ipcMain.handle('dashboard:getSummary',() => dashboardService.getDashboardSummary());

    // Stock
    ipcMain.handle('stock:addStock', (event, productId, quantity, reason) => stockService.addStock(productId, quantity, reason));
    ipcMain.handle('stock:adjustStock',(event, productId, newQuantity, reason) => stockService.adjustStock(productId,newQuantity,reason));

    // Reports
    ipcMain.handle('reports:getSalesReport',(event, fromDate, toDate, customerId) => reportService.getSalesReport(fromDate, toDate, customerId));
    ipcMain.handle('reports:getSalesReportDetails',(event, fromDate, toDate, customerId) => reportService.getSalesReportDetails(fromDate, toDate, customerId));
    ipcMain.handle(
    'reports:downloadPDF',
    async (event, fromDate, toDate, customerId = null) => {
        const parentWindow = BrowserWindow.fromWebContents(event.sender);

        const result = await dialog.showSaveDialog(parentWindow, {
            title: 'Save Sales Report',
            defaultPath: `Sales-Report-${fromDate}-to-${toDate}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (result.canceled || !result.filePath) {
            return { canceled: true };
        }

        await reportPdfService.generateSalesReportPDF({
            filePath: result.filePath,
            fromDate,
            toDate,
            customerId,
        });

        return {
            success: true,
            filePath: result.filePath,
        };
    }
);

    // Customer Statement PDF
    ipcMain.handle(
        'customers:downloadStatementPDF',
        async (event, customerId) => {
            const customer = customerService.getCustomerById(customerId);

            if (!customer) {
                throw new Error('Customer not found');
            }

            const overview = customerService.getCustomerOverview(customerId);
            const transactions = customerService.getCustomerTransactions(customerId);
            const creditBills = customerService.getCustomerCreditBills(customerId);

            return await customerStatementPdfService.generateCustomerStatementPDF({
                customer,
                overview,
                transactions,
                creditBills,
            });
        }
    );

    // Settings
    ipcMain.handle('settings:getAll', () => settingsService.getAllSettings());
    ipcMain.handle('settings:update', (event, key, value) => settingsService.updateSetting(key, value));

    // Backup
    ipcMain.handle('backup:create', async () => {return await backupService.createBackup();});
    ipcMain.handle('backup:getAll', () => {return backupService.getAvailableBackups();});
    ipcMain.handle('backup:restore', async (event, fileName) => {const result = await backupService.restoreBackup(fileName);

  // Restart application after restore
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);

  return result;
});
    return true;
}

module.exports = {
    registerIpcHandlers
};