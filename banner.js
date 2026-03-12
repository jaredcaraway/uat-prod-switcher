(() => {
    const BANNER_ID = "uat-prod-switcher-banner";
    const STYLE_ID = "uat-prod-switcher-style";

    function removeBanner() {
        const banner = document.getElementById(BANNER_ID);
        if (!banner) return;

        banner.style.animation = "uat-banner-slide-out 0.3s cubic-bezier(0.5, 0, 0.84, 0) forwards";
        document.body.style.transition = "margin-top 0.3s cubic-bezier(0.5, 0, 0.84, 0)";
        document.body.style.marginTop = "0px";

        banner.addEventListener("animationend", () => {
            banner.remove();
            const style = document.getElementById(STYLE_ID);
            if (style) style.remove();
            document.body.style.removeProperty("margin-top");
            document.body.style.removeProperty("transition");
        }, { once: true });
    }

    function injectBanner(uatSub) {
        // Don't inject twice
        if (document.getElementById(BANNER_ID)) return;

        const isUat = window.location.href.includes(uatSub);
        if (!isUat) return;

        const banner = document.createElement("div");
        banner.id = BANNER_ID;

        const label = document.createElement("span");
        label.textContent = "UAT ENVIRONMENT";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u00D7";
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeBanner();
        });

        banner.appendChild(label);
        banner.appendChild(closeBtn);

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${BANNER_ID} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                height: 32px;
                background: #F59E0B;
                color: #000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                user-select: none;
                animation: uat-banner-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes uat-banner-slide-in {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }

            @keyframes uat-banner-slide-out {
                from { transform: translateY(0); }
                to { transform: translateY(-100%); }
            }

            #${BANNER_ID} span {
                pointer-events: none;
            }

            #${BANNER_ID} button {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                color: rgba(0, 0, 0, 0.5);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                padding: 0 4px;
                transition: color 0.15s;
            }

            #${BANNER_ID} button:hover {
                color: #000;
            }
        `;

        document.documentElement.appendChild(style);
        document.body.prepend(banner);
        document.body.style.setProperty("margin-top", "32px", "important");
    }

    // Listen for setting changes to remove banner in real time
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes.showBanner && !changes.showBanner.newValue) {
            removeBanner();
        }
    });

    chrome.storage.sync.get(
        { showBanner: true, uatSub: "uatnew-www." },
        (settings) => {
            if (!settings.showBanner) return;
            injectBanner(settings.uatSub);
        }
    );
})();
