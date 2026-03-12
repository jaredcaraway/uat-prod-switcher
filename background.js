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

async function updateBadge(tabId, url) {
    if (!matchesDomain(url)) {
        await chrome.action.setBadgeText({ tabId, text: "" });
        await chrome.action.setTitle({ tabId, title: "Not on a configured site" });
        return;
    }

    if (isUat(url)) {
        await chrome.action.setBadgeText({ tabId, text: "UAT" });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: "#F59E0B" });
        await chrome.action.setTitle({ tabId, title: "Switch to PROD" });
    } else {
        await chrome.action.setBadgeText({ tabId, text: "PRD" });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: "#10B981" });
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
            if (tab) updateBadge(tab.id, tab.url);
        });
    }
});

// Update badge and inject banner when a tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateBadge(tabId, tab.url);
    }
    if (changeInfo.status === "complete") {
        injectBanner(tabId, tab.url);
    }
});

// Update badge when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    updateBadge(tabId, tab.url);
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
