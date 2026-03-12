const DEFAULTS = {
    prodSub: "www.",
    uatSub: "uatnew-www.",
    domains: ["kelsey-seybold.com", "ksnet.com"],
    showBanner: true,
};

let settings = { ...DEFAULTS };

function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULTS, (result) => {
            settings = result;
            resolve();
        });
    });
}

function matchesDomain(url) {
    if (!url) return false;
    return settings.domains.some((domain) => {
        const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`https://.*\\.${escaped}`).test(url);
    });
}

function isUat(url) {
    return url.includes(settings.uatSub);
}

async function updateIcon(tabId, url) {
    if (!matchesDomain(url)) {
        await chrome.action.setIcon({
            tabId,
            path: { 16: "images/icon16.png", 32: "images/icon32.png", 48: "images/icon48.png", 128: "images/icon128.png" },
        });
        await chrome.action.setTitle({ tabId, title: "Not on a configured site" });
        return;
    }

    if (isUat(url)) {
        await chrome.action.setIcon({
            tabId,
            path: { 16: "images/uat/icon16.png", 32: "images/uat/icon32.png", 48: "images/uat/icon48.png", 128: "images/uat/icon128.png" },
        });
        await chrome.action.setTitle({ tabId, title: "Switch to PROD" });
    } else {
        await chrome.action.setIcon({
            tabId,
            path: { 16: "images/prod/icon16.png", 32: "images/prod/icon32.png", 48: "images/prod/icon48.png", 128: "images/prod/icon128.png" },
        });
        await chrome.action.setTitle({ tabId, title: "Switch to UAT" });
    }
}

async function injectBanner(tabId, url) {
    if (!matchesDomain(url) || !isUat(url)) return;
    try {
        await chrome.scripting.executeScript({
            files: ["banner.js"],
            target: { tabId },
        });
    } catch (e) {
        // Tab may not be injectable (e.g. chrome:// pages)
    }
}

// Load settings on startup
loadSettings();

// Reload settings when they change
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
        loadSettings().then(async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) updateIcon(tab.id, tab.url);
        });
    }
});

// Update badge and inject banner when a tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateIcon(tabId, tab.url);
    }
    if (changeInfo.status === "complete") {
        injectBanner(tabId, tab.url);
    }
});

// Update badge when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    updateIcon(tabId, tab.url);
});

// Single click to switch environments
chrome.action.onClicked.addListener(async (tab) => {
    if (matchesDomain(tab.url)) {
        await chrome.scripting.executeScript({
            files: ["switch.js"],
            target: { tabId: tab.id },
        });
    }
});
