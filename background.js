chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({
        text: "OFF",
    });
});

const ksc = /https:\/\/.*\.kelsey-seybold\.com/;
const sitecore = /https:\/\/.*\.ksnet\.com'/;

chrome.action.onClicked.addListener(async(tab) => {
    if (tab.url.search(sitecore) || tab.url.search(ksc)) {
        // Retrieve the action badge to check if the extension is on or off
        const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
        // Next state will always be the opposite
        const nextState = prevState === 'ON' ? 'OFF' : 'ON'

        // Set the action badge to the next state
        await chrome.action.setBadgeText({
            tabId: tab.id,
            text: nextState,
        });

        if (nextState === "ON") {
            await chrome.scripting.executeScript({
                files: ["switch.js"],
                target: { tabId: tab.id },
            })
        }
    }

})