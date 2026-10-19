// Chrome runs this as a service worker; Firefox loads env.js first via background.scripts.
if (typeof Env === "undefined") importScripts("env.js");

const DEFAULTS = {
    prodOrigin: "",
    uatOrigin: "",
    showBanner: true,
};

const ICONS = {
    neutral: { 16: "images/icon16.png", 32: "images/icon32.png", 48: "images/icon48.png", 128: "images/icon128.png" },
    uat: { 16: "images/uat/icon16.png", 32: "images/uat/icon32.png", 48: "images/uat/icon48.png", 128: "images/uat/icon128.png" },
    prod: { 16: "images/prod/icon16.png", 32: "images/prod/icon32.png", 48: "images/prod/icon48.png", 128: "images/prod/icon128.png" },
};

// Settings are read on every event: the background can be unloaded at any time.
function loadSettings() {
    return chrome.storage.sync.get(DEFAULTS);
}

async function hasSiteAccess(settings) {
    const origins = Env.originPatterns(settings);
    return origins.length > 0 && chrome.permissions.contains({ origins });
}

async function updateIcon(tabId, url) {
    const settings = await loadSettings();
    const env = Env.envForUrl(url, settings);
    let icon = "neutral";
    let title;

    if (!Env.isConfigured(settings)) {
        title = "Click to set up";
    } else if (!env) {
        title = "Not a configured site";
    } else {
        icon = env;
        title = env === "uat" ? "Switch to PRD" : "Switch to UAT";
        if (!(await hasSiteAccess(settings))) {
            title += " (banner needs site access: see settings)";
        }
    }

    try {
        await chrome.action.setIcon({ tabId, path: ICONS[icon] });
        await chrome.action.setTitle({ tabId, title });
    } catch (e) {
        // Tab may have closed in the meantime
    }
}

async function injectBanner(tabId, url) {
    const settings = await loadSettings();
    if (Env.envForUrl(url, settings) !== "uat") return;
    try {
        await chrome.scripting.executeScript({
            files: ["banner.js"],
            target: { tabId },
        });
    } catch (e) {
        // No site access granted, or the tab isn't injectable
    }
}

async function refreshActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) updateIcon(tab.id, tab.url);
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
        chrome.runtime.openOptionsPage();
    } else if (reason === "update") {
        // Drop settings from 1.x (fixed subdomain prefixes + domain list)
        chrome.storage.sync.remove(["prodSub", "uatSub", "domains"]);
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") refreshActiveTab();
});

chrome.permissions.onAdded.addListener(refreshActiveTab);
chrome.permissions.onRemoved.addListener(refreshActiveTab);

// Update icon and inject banner when a tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateIcon(tabId, tab.url);
    }
    if (changeInfo.status === "complete") {
        injectBanner(tabId, tab.url);
    }
});

// Update icon when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    updateIcon(tabId, tab.url);
});

// Single click (or the shortcut) switches environments
chrome.action.onClicked.addListener(async (tab) => {
    const settings = await loadSettings();
    if (!Env.isConfigured(settings)) {
        chrome.runtime.openOptionsPage();
        return;
    }
    const newUrl = Env.switchUrl(tab.url, settings);
    if (newUrl) chrome.tabs.update(tab.id, { url: newUrl });
});
