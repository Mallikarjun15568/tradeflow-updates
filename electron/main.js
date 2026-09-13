const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const { machineIdSync } = require("node-machine-id");
const { autoUpdater } = require("electron-updater");

const { registerIpcHandlers } = require("../backend/ipc/ipcHandlers");
const initSchema = require("../backend/database/schema");

const customerService = require("../backend/services/customerService");
const productService = require("../backend/services/productService");
const billingService = require("../backend/services/billingService");
const backupService = require("../backend/services/backupService");

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

    autoUpdater.checkForUpdatesAndNotify();
}

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
        }, silent ? 30000 : 120000);

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
            };

            // The normal Windows print dialog should control paper and margins.
            // Supplying these options there can prevent the dialog callback from
            // completing on some Windows printer drivers.
            if (silent) {
                Object.assign(printOptions, {
                    pageSize: "A5",
                    margins: {
                        marginType: "custom",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                    },
                });
            }

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

ipcMain.handle("billing:print", (event) => printCurrentPage(event, false));
ipcMain.handle("billing:quickPrint", (event) => printCurrentPage(event, true));

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