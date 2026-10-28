const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { machineIdSync } = require("node-machine-id");
const { autoUpdater } = require("electron-updater");

const { registerIpcHandlers } = require("../backend/ipc/ipcHandlers");
const initSchema = require("../backend/database/schema");

const customerService = require("../backend/services/customerService");
const productService = require("../backend/services/productService");
const billingService = require("../backend/services/billingService");
const backupService = require("../backend/services/backupService");

let mainWindow = null;

function getDeviceId() {
    return machineIdSync();
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "TradeFlow",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    mainWindow = win;
    win.on("closed", () => {
        if (mainWindow === win) mainWindow = null;
    });

    if (app.isPackaged) {
        // Production / Installed app
        win.loadFile(
            path.join(__dirname, '..', 'src', 'dist', 'index.html')
        );
    } else {
        // Development
        win.loadURL("http://localhost:5173");
    }
}

function checkForUpdates() {
    if (!app.isPackaged) {
        return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.checkForUpdates().catch((error) => {
        console.error("Update check failed:", error);
    });
}

autoUpdater.on("error", (error) => {
    console.error("Application update failed:", error);
});

autoUpdater.on("update-available", async (info) => {
    try {
        await backupService.createBackup();
        await autoUpdater.downloadUpdate();
    } catch (error) {
        console.error("Pre-update backup or download failed:", error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            await dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "Update not installed",
                message: "TradeFlow could not prepare the update safely.",
                detail: "Your current app and data were not changed. Please try again later.",
            });
        }
    }
});

autoUpdater.on("update-not-available", () => {
    console.log("TradeFlow is up to date.");
});

autoUpdater.on("update-downloaded", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const result = await dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Install Update", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update ready",
        message: "A new TradeFlow update is ready.",
        detail: "A fresh backup was created before downloading this update. Install now?",
    });

    if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
    }
});

function printCurrentPage(event, silent) {
    return new Promise((resolve, reject) => {
        if (event.sender.isDestroyed()) {
            reject(new Error("Print window is no longer available"));
            return;
        }

        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error("Print timed out. Please try again."));
            }
        }, 180000);

        const finish = (callback) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            callback();
        };

        try {
            const printOptions = {
                silent,
                printBackground: true,
                pageSize: "A5",
                margins: {
                    marginType: "custom",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            };

            event.sender.print(
                printOptions,
                (success, failureReason) => {
                    finish(() => resolve({ success, failureReason }));
                }
            );
        } catch (error) {
            finish(() => reject(error));
        }
    });
}

async function downloadCurrentInvoice(event, invoiceNumber) {
    if (event.sender.isDestroyed()) {
        throw new Error("Invoice window is no longer available");
    }

    const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
    if (!normalizedInvoiceNumber || !/^[a-zA-Z0-9._-]+$/.test(normalizedInvoiceNumber)) {
        throw new Error("Invalid invoice number");
    }

    const invoicesDirectory = path.join(
        app.getPath("downloads"),
        "TradeFlow",
        "Invoices"
    );
    fs.mkdirSync(invoicesDirectory, { recursive: true });

    const filePath = path.join(invoicesDirectory, `${normalizedInvoiceNumber}.pdf`);
    const pdfData = await event.sender.printToPDF({
        printBackground: true,
        pageSize: "A5",
        margins: {
            marginType: "custom",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
    });

    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
}

ipcMain.handle("billing:print", (event) => printCurrentPage(event, false));
ipcMain.handle("billing:quickPrint", (event) => printCurrentPage(event, true));
ipcMain.handle("billing:downloadPDF", (event, invoiceNumber) =>
    downloadCurrentInvoice(event, invoiceNumber)
);

app.whenReady().then(async () => {

    // Electron default menu remove
    Menu.setApplicationMenu(null);

    initSchema();
    registerIpcHandlers();
    console.log("TradeFlow Device ID:", getDeviceId());

    try {
        await backupService.createAutomaticBackupIfNeeded();
    } catch (error) {
        console.error("Automatic backup failed:", error);
    }

    createWindow();
    checkForUpdates();
});