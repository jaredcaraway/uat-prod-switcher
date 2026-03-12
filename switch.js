const SW_DEFAULTS = {
    prodSub: "www.",
    uatSub: "uatnew-www.",
};

chrome.storage.sync.get(SW_DEFAULTS, (settings) => {
    const currentUrl = window.location.href;
    let newUrl;

    if (currentUrl.includes(settings.uatSub)) {
        newUrl = currentUrl.replace(settings.uatSub, settings.prodSub);
    } else {
        newUrl = currentUrl.replace(settings.prodSub, settings.uatSub);
    }

    window.location.href = newUrl;
});
