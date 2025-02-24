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

    // Set up request interceptor for ALL requests
    session.fromPartition('persist:main').webRequest.onBeforeSendHeaders(
        { urls: ['*://*/*'] },
        async (details, callback) => {
            // Skip OPTIONS requests as they need special handling
            if (details.method === 'OPTIONS') {
                callback({ requestHeaders: details.requestHeaders });
                return;
            }

            // Always add Cloudflare Access headers
            const modifiedHeaders = {
                ...details.requestHeaders,
                'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
                'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET
            };

            // Add browser-like headers for all requests
            if (!details.url.startsWith('file://')) {
                modifiedHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
                modifiedHeaders['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            }

            console.log('\n=== REQUEST ===');
            console.log('URL:', details.url);
            console.log('Headers:', JSON.stringify(modifiedHeaders, null, 2));

            callback({ requestHeaders: modifiedHeaders });
        }
    );

    // Handle redirects
    session.fromPartition('persist:main').webRequest.onBeforeRedirect((details) => {
        console.log('\n=== REDIRECT ===');
        console.log('From:', details.url);
        console.log('To:', details.redirectURL);
    });

    // Handle responses
    session.fromPartition('persist:main').webRequest.onHeadersReceived(
        { urls: ['*://*/*'] },
        (details, callback) => {
            // Handle authentication errors
            if (details.statusCode === 403) {
                console.error('\n=== AUTHENTICATION ERROR ===');
                console.error('Failed to authenticate with Cloudflare Access');
                console.error('URL:', details.url);
                // Retry the request after a short delay
                setTimeout(() => {
                    win.reload();
                }, 1000);
            }

            console.log('\n=== RESPONSE ===');
            console.log('URL:', details.url);
            console.log('Status:', details.statusCode);
            console.log('Headers:', JSON.stringify(details.responseHeaders, null, 2));

            // For Cloudflare domains, ensure CORS headers are present
            if (!details.url.startsWith('file://')) {
                const responseHeaders = {
                    ...details.responseHeaders,
                    'Access-Control-Allow-Origin': ['*'],
                    'Access-Control-Allow-Headers': ['*'],
                    'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
                    'Access-Control-Allow-Credentials': ['true']
                };
                callback({ responseHeaders });
            } else {
                callback({ responseHeaders: details.responseHeaders });
            }
        }
    );

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

    mainWindow.webContents.on('did-navigate', (event, url) => {
        console.log('\n=== NAVIGATION ===');
        console.log('Navigated to:', url);
        mainWindow.webContents.executeJavaScript(`
            const urlDisplay = document.getElementById('url-display');
            if (urlDisplay) {
                urlDisplay.textContent = window.location.href;
                detectAssetId();
            }
        `);
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
