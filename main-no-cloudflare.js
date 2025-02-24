const { app, BrowserWindow, session, Tray, Menu, globalShortcut } = require('electron');
const Store = require('electron-store');
const path = require('path');

const store = new Store();
let tray = null;
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            partition: 'persist:main'
        },
        icon: path.join(__dirname, 'icons', 'image-256.png')
    });

    // Start at the main URL
    mainWindow.loadURL(`${process.env.HOMEBOX_URL}`);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('\n=== LOAD ERROR ===');
        console.error('Failed:', errorDescription);
        console.error('Code:', errorCode);
        
        // Retry on connection errors
        if (errorCode === -102 || errorCode === -106) {
            console.log('Retrying connection...');
            setTimeout(() => {
                mainWindow.reload();
            }, 2000);
        }
    });

    // Handle window minimize to tray
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    // Handle window close to tray
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
        return true;
    });
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'icons', 'image-256.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Homebox',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Homebox Desktop');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

function registerShortcuts() {
    // Toggle window visibility
    globalShortcut.register('Alt+H', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Reload page
    globalShortcut.register('Alt+R', () => {
        if (mainWindow.isFocused()) {
            mainWindow.reload();
        }
    });

    // Toggle DevTools
    globalShortcut.register('Alt+D', () => {
        if (mainWindow.isFocused()) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    // Quit application
    globalShortcut.register('Alt+Q', () => {
        app.isQuitting = true;
        app.quit();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    registerShortcuts();
});

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
