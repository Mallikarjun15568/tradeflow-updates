const { app, BrowserWindow, Menu } = require("electron");
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