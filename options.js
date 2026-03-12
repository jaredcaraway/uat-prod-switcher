const DEFAULTS = {
    prodSub: "www.",
    uatSub: "uatnew-www.",
    domains: ["kelsey-seybold.com", "ksnet.com"],
    showBanner: true,
};

const domainListEl = document.getElementById("domainList");
const prodSubEl = document.getElementById("prodSub");
const uatSubEl = document.getElementById("uatSub");
const previewProdEl = document.getElementById("previewProd");
const previewUatEl = document.getElementById("previewUat");
const showBannerEl = document.getElementById("showBanner");
const bannerPreviewEl = document.getElementById("bannerPreview");

function createDomainRow(value, canRemove) {
    const row = document.createElement("div");
    row.className = "domain-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = "example.com";
    row.appendChild(input);

    const btn = document.createElement("button");
    btn.className = "btn-remove";
    btn.textContent = "\u00D7";
    btn.disabled = !canRemove;
    btn.addEventListener("click", () => {
        row.remove();
        updateRemoveButtons();
    });
    row.appendChild(btn);

    return row;
}

function updateRemoveButtons() {
    const rows = domainListEl.querySelectorAll(".domain-item");
    rows.forEach((row) => {
        const btn = row.querySelector(".btn-remove");
        btn.disabled = rows.length <= 1;
    });
}

function renderDomains(domains) {
    domainListEl.innerHTML = "";
    domains.forEach((d) => {
        domainListEl.appendChild(createDomainRow(d, domains.length > 1));
    });
}

function getDomains() {
    return Array.from(domainListEl.querySelectorAll("input"))
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function updatePreview() {
    previewProdEl.textContent = prodSubEl.value || DEFAULTS.prodSub;
    previewUatEl.textContent = uatSubEl.value || DEFAULTS.uatSub;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
}

// Load saved settings
chrome.storage.sync.get(DEFAULTS, (settings) => {
    prodSubEl.value = settings.prodSub;
    uatSubEl.value = settings.uatSub;
    showBannerEl.checked = settings.showBanner;
    bannerPreviewEl.style.opacity = settings.showBanner ? "1" : "0.3";
    renderDomains(settings.domains);
    updatePreview();
});

// Live preview
prodSubEl.addEventListener("input", updatePreview);
uatSubEl.addEventListener("input", updatePreview);

// Banner toggle preview
showBannerEl.addEventListener("change", () => {
    bannerPreviewEl.style.opacity = showBannerEl.checked ? "1" : "0.3";
});

// Add domain
document.getElementById("addDomain").addEventListener("click", () => {
    domainListEl.appendChild(createDomainRow("", true));
    updateRemoveButtons();
    const inputs = domainListEl.querySelectorAll("input");
    inputs[inputs.length - 1].focus();
});

// Save
document.getElementById("save").addEventListener("click", () => {
    const domains = getDomains();
    if (domains.length === 0) {
        showToast("Add at least one domain");
        return;
    }

    chrome.storage.sync.set(
        {
            prodSub: prodSubEl.value.trim() || DEFAULTS.prodSub,
            uatSub: uatSubEl.value.trim() || DEFAULTS.uatSub,
            domains,
            showBanner: showBannerEl.checked,
        },
        () => showToast("Settings saved")
    );
});

// Reset
document.getElementById("reset").addEventListener("click", () => {
    prodSubEl.value = DEFAULTS.prodSub;
    uatSubEl.value = DEFAULTS.uatSub;
    showBannerEl.checked = DEFAULTS.showBanner;
    bannerPreviewEl.style.opacity = "1";
    renderDomains(DEFAULTS.domains);
    updatePreview();
    chrome.storage.sync.set(DEFAULTS, () => showToast("Defaults restored"));
});

// Open Chrome shortcuts page
document.getElementById("openShortcuts").addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
