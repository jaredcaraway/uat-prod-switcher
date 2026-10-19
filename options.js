const DEFAULTS = {
    prodOrigin: "",
    uatOrigin: "",
    showBanner: true,
};

const prodUrlEl = document.getElementById("prodUrl");
const uatUrlEl = document.getElementById("uatUrl");
const previewEl = document.getElementById("preview");
const previewProdEl = document.getElementById("previewProd");
const previewUatEl = document.getElementById("previewUat");
const previewHintEl = document.getElementById("previewHint");
const envErrorEl = document.getElementById("envError");
const accessNoticeEl = document.getElementById("accessNotice");
const showBannerEl = document.getElementById("showBanner");
const bannerPreviewEl = document.getElementById("bannerPreview");

// Last saved settings, kept in memory so permission requests can run
// synchronously inside click handlers (Firefox requires a direct user gesture).
let saved = { ...DEFAULTS };

// Render a host as <em>prefix.</em>root:port, highlighting the part that changes
function renderHost(el, origin, prefix, root) {
    el.textContent = "";
    const port = new URL(origin).port;
    const em = document.createElement("em");
    if (root) {
        em.textContent = prefix ? `${prefix}.` : "";
        el.append(em, root + (port ? `:${port}` : ""));
    } else {
        em.textContent = prefix;
        el.append(em);
    }
}

function updatePreview() {
    const prodInput = prodUrlEl.value.trim();
    const uatInput = uatUrlEl.value.trim();

    if (!prodInput && !uatInput) {
        renderHost(previewProdEl, "https://www.example.com", "www", "example.com");
        renderHost(previewUatEl, "https://uat.example.com", "uat", "example.com");
        previewHintEl.textContent = "Example";
        previewEl.style.opacity = "0.4";
        envErrorEl.textContent = "";
        return null;
    }

    const result = Env.detect(prodInput, uatInput);
    if (result.error) {
        // Only complain once both fields have something in them
        envErrorEl.textContent = prodInput && uatInput ? result.error : "";
        previewEl.style.opacity = "0.4";
        return result;
    }

    renderHost(previewProdEl, result.prodOrigin, result.prodPrefix, result.root);
    renderHost(previewUatEl, result.uatOrigin, result.uatPrefix, result.root);
    previewHintEl.textContent = result.wholeHost ? "Whole hostname swap" : `Root domain: ${result.root}`;
    previewEl.style.opacity = "1";
    envErrorEl.textContent = "";
    return result;
}

async function updateAccessNotice() {
    const origins = Env.originPatterns(saved);
    const granted = origins.length === 0 || (await chrome.permissions.contains({ origins }));
    accessNoticeEl.hidden = granted;
}

// Drop access to sites that are no longer configured
function removeStaleAccess(newSettings) {
    const keep = new Set(Env.originPatterns(newSettings));
    const stale = Env.originPatterns(saved).filter((o) => !keep.has(o));
    if (stale.length) chrome.permissions.remove({ origins: stale });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
}

function applySettings(settings) {
    saved = settings;
    prodUrlEl.value = settings.prodOrigin;
    uatUrlEl.value = settings.uatOrigin;
    showBannerEl.checked = settings.showBanner;
    bannerPreviewEl.style.opacity = settings.showBanner ? "1" : "0.3";
    updatePreview();
    updateAccessNotice();
}

// Load saved settings
chrome.storage.sync.get(DEFAULTS, applySettings);

// Live preview
prodUrlEl.addEventListener("input", updatePreview);
uatUrlEl.addEventListener("input", updatePreview);

// Banner toggle preview
showBannerEl.addEventListener("change", () => {
    bannerPreviewEl.style.opacity = showBannerEl.checked ? "1" : "0.3";
});

// Grant access for already-configured sites (e.g. settings synced from another browser)
document.getElementById("grantAccess").addEventListener("click", () => {
    chrome.permissions.request({ origins: Env.originPatterns(saved) }).then(updateAccessNotice);
});

// Save
document.getElementById("save").addEventListener("click", () => {
    const result = Env.detect(prodUrlEl.value, uatUrlEl.value);
    if (result.error) {
        envErrorEl.textContent = result.error;
        showToast("Fix the environment links first");
        return;
    }

    const settings = {
        prodOrigin: result.prodOrigin,
        uatOrigin: result.uatOrigin,
        showBanner: showBannerEl.checked,
    };

    // Must be the first async call in the handler to keep the user gesture
    chrome.permissions.request({ origins: Env.originPatterns(settings) }).then((granted) => {
        if (!granted) {
            showToast("Site access is needed for these two sites");
            return;
        }
        removeStaleAccess(settings);
        chrome.storage.sync.set(settings, () => {
            applySettings(settings);
            showToast("Settings saved");
        });
    });
});

// Reset
document.getElementById("reset").addEventListener("click", () => {
    removeStaleAccess(DEFAULTS);
    chrome.storage.sync.set(DEFAULTS, () => {
        applySettings({ ...DEFAULTS });
        showToast("Defaults restored");
    });
});

// Shortcut settings live in different places per browser
const shortcutLinkEl = document.getElementById("openShortcuts");
const isFirefox = typeof browser !== "undefined" && typeof browser.runtime.getBrowserInfo === "function";
if (chrome.commands && typeof chrome.commands.openShortcutSettings === "function") {
    shortcutLinkEl.addEventListener("click", () => chrome.commands.openShortcutSettings());
} else if (isFirefox) {
    const hint = document.createElement("span");
    hint.className = "toggle-row-hint";
    hint.textContent = "Change it in about:addons → ⚙ → Manage Extension Shortcuts";
    shortcutLinkEl.replaceWith(hint);
} else {
    shortcutLinkEl.addEventListener("click", () => {
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
}
