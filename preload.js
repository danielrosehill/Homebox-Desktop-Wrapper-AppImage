const { contextBridge, ipcRenderer } = require('electron');

// Create the UI bar element
function createUIBar() {
    const bar = document.createElement('div');
    bar.id = 'homebox-ui-bar';
    bar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 30px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        padding: 0 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        z-index: 999999;
    `;

    const urlDisplay = document.createElement('div');
    urlDisplay.id = 'url-display';
    urlDisplay.style.cssText = `
        flex: 1;
        overflow-x: auto;
        margin-right: 10px;
    `;

    const copyButton = document.createElement('button');
    copyButton.innerHTML = '📋';
    copyButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        margin-right: 10px;
        font-size: 14px;
    `;
    copyButton.title = 'Copy URL';

    const assetIdDisplay = document.createElement('div');
    assetIdDisplay.id = 'asset-id-display';
    assetIdDisplay.style.cssText = `
        margin-left: 10px;
        padding: 2px 6px;
        background: #e9ecef;
        border-radius: 3px;
    `;

    // Add search input
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-right: 10px;
    `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by Asset ID...';
    searchInput.style.cssText = `
        padding: 2px 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 12px;
        width: 150px;
    `;

    bar.appendChild(urlDisplay);
    bar.appendChild(copyButton);
    searchContainer.appendChild(searchInput);
    bar.appendChild(searchContainer);
    bar.appendChild(assetIdDisplay);
    
    setupSearchFunctionality(searchInput);

    // Add 30px padding to body to account for the bar
    document.body.style.paddingTop = '30px';

    // Update URL display
    urlDisplay.textContent = window.location.href;

    // Copy URL functionality
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        copyButton.innerHTML = '✓';
        setTimeout(() => {
            copyButton.innerHTML = '📋';
        }, 1000);
    });

    return bar;
}

// Setup search functionality
function setupSearchFunctionality(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchValue = searchInput.value.trim();
            if (searchValue) {
                // Remove any existing # symbol
                const cleanId = searchValue.replace('#', '');
                // Construct search URL
                const searchUrl = `https://homebox.residencejlm.com/items?q=%23${cleanId}&page=1`;
                window.location.href = searchUrl;
            }
        }
    });
}

// Detect asset ID from the page
function detectAssetId() {
    // Look for asset ID in table cells
    const cells = document.querySelectorAll('td');
    let assetIdMatch = null;
    
    for (const cell of cells) {
        const match = cell.textContent.match(/^(\d{3}-\d{3}|\d{2}-\d{3}|\d{3}-\d{2}|\d{2}-\d{2})$/);
        if (match) {
            assetIdMatch = match;
            break;
        }
    }

    
    if (assetIdMatch) {
        const assetIdDisplay = document.getElementById('asset-id-display');
        if (assetIdDisplay) {
            assetIdDisplay.textContent = `Asset ID: ${assetIdMatch[1]}`;
        }
    }
}

// Initialize UI when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const bar = createUIBar();
    document.body.prepend(bar);
    detectAssetId();
});

// Update UI on navigation
window.addEventListener('popstate', () => {
    const urlDisplay = document.getElementById('url-display');
    if (urlDisplay) {
        urlDisplay.textContent = window.location.href;
    }
    detectAssetId();
});