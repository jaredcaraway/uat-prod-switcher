const ksc = /https:\/\/.*\.kelsey-seybold\.com/;
const sitecore = /https:\/\/.*\.ksnet\.com/;
const uatPattern = /uatnew-www\./;

function isKscSite(url) {
    return url && (url.match(ksc) || url.match(sitecore));
}

function isUat(url) {
    return uatPattern.test(url);
}

async function updateBadge(tabId, url) {
    if (!isKscSite(url)) {
        await chrome.action.setBadgeText({ tabId, text: "" });
        await chrome.action.setTitle({ tabId, title: "Not on a KSC site" });
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

// Update badge when a tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateBadge(tabId, tab.url);
    }
});

// Update badge when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    updateBadge(tabId, tab.url);
});

// Single click to switch environments
chrome.action.onClicked.addListener(async (tab) => {
    if (isKscSite(tab.url)) {
        await chrome.scripting.executeScript({
            files: ["switch.js"],
            target: { tabId: tab.id },
        });
    }
});
