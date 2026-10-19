// Shared environment logic: used by background.js, options.js and the Node tests.
const Env = (() => {
    function parseUrl(input) {
        const raw = (input || "").trim();
        if (!raw) return { error: "Enter a URL" };

        // "host:port" looks like a scheme to URL(), so treat it as scheme-less
        const isHostPort = /^[^/:?#]+:\d+(?:[/?#]|$)/.test(raw);
        const hasScheme = !isHostPort && /^[a-z][a-z0-9+.-]*:/i.test(raw);
        const withScheme = hasScheme ? raw : `https://${raw}`;
        let url;
        try {
            url = new URL(withScheme);
        } catch (e) {
            return { error: `"${raw}" isn't a valid URL` };
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return { error: "Only http and https sites are supported" };
        }
        // "www.acme.com." is the same site as "www.acme.com"
        if (url.hostname.endsWith(".")) url.hostname = url.hostname.slice(0, -1);
        if (!url.hostname || /\s/.test(raw)) {
            return { error: `"${raw}" isn't a valid URL` };
        }
        return { origin: url.origin, host: url.host, hostname: url.hostname };
    }

    function isIpAddress(hostname) {
        return hostname.startsWith("[") || /^\d+(\.\d+){3}$/.test(hostname);
    }

    function detect(prodInput, uatInput) {
        const prod = parseUrl(prodInput);
        if (prod.error) return { error: `Production: ${prod.error}` };
        const uat = parseUrl(uatInput);
        if (uat.error) return { error: `UAT: ${uat.error}` };
        if (prod.host === uat.host) {
            return { error: "Production and UAT must be different sites" };
        }

        // Compare hostname labels from the right to find the shared root domain.
        const prodLabels = prod.hostname.split(".");
        const uatLabels = uat.hostname.split(".");
        let shared = 0;
        while (
            shared < prodLabels.length &&
            shared < uatLabels.length &&
            prodLabels[prodLabels.length - 1 - shared] === uatLabels[uatLabels.length - 1 - shared]
        ) {
            shared++;
        }

        const result = { prodOrigin: prod.origin, uatOrigin: uat.origin };
        // Sharing only the TLD (or nothing) isn't a meaningful root, and IPs have no root at all.
        if (shared < 2 || isIpAddress(prod.hostname) || isIpAddress(uat.hostname)) {
            return { ...result, root: "", prodPrefix: prod.host, uatPrefix: uat.host, wholeHost: true };
        }
        return {
            ...result,
            root: prodLabels.slice(prodLabels.length - shared).join("."),
            prodPrefix: prodLabels.slice(0, prodLabels.length - shared).join("."),
            uatPrefix: uatLabels.slice(0, uatLabels.length - shared).join("."),
            wholeHost: false,
        };
    }

    function hostOf(origin) {
        try {
            return new URL(origin).host;
        } catch (e) {
            return null;
        }
    }

    function isConfigured(settings) {
        return Boolean(hostOf(settings.prodOrigin) && hostOf(settings.uatOrigin));
    }

    function envForUrl(url, settings) {
        if (!url || !isConfigured(settings)) return null;
        let page;
        try {
            page = new URL(url);
        } catch (e) {
            return null;
        }
        if (page.protocol !== "http:" && page.protocol !== "https:") return null;
        if (page.host === hostOf(settings.prodOrigin)) return "prod";
        if (page.host === hostOf(settings.uatOrigin)) return "uat";
        return null;
    }

    function switchUrl(url, settings) {
        const env = envForUrl(url, settings);
        if (!env) return null;
        const page = new URL(url);
        const target = env === "prod" ? settings.uatOrigin : settings.prodOrigin;
        return target + page.pathname + page.search + page.hash;
    }

    function originPatterns(settings) {
        if (!isConfigured(settings)) return [];
        return [settings.prodOrigin, settings.uatOrigin].map((o) => `*://${new URL(o).hostname}/*`);
    }

    return { parseUrl, detect, isConfigured, envForUrl, switchUrl, originPatterns };
})();

if (typeof module !== "undefined") module.exports = Env;
