const test = require("node:test");
const assert = require("node:assert/strict");
const Env = require("../env.js");

const mixed = { prodOrigin: "https://www.acme.com", uatOrigin: "http://localhost:3000" };
const acme = { prodOrigin: "https://www.acme.com", uatOrigin: "https://uat.acme.com" };

test("detect splits shared root from environment prefixes", () => {
    const r = Env.detect("https://www.acme.com/about", "https://uat.acme.com/about");
    assert.equal(r.prodOrigin, "https://www.acme.com");
    assert.equal(r.uatOrigin, "https://uat.acme.com");
    assert.equal(r.root, "acme.com");
    assert.equal(r.prodPrefix, "www");
    assert.equal(r.uatPrefix, "uat");
    assert.equal(r.wholeHost, false);
});

test("detect allows a bare root on one side", () => {
    const r = Env.detect("https://acme.com", "https://uat.acme.com");
    assert.equal(r.root, "acme.com");
    assert.equal(r.prodPrefix, "");
    assert.equal(r.uatPrefix, "uat");
});

test("detect handles multi-label public suffixes", () => {
    const r = Env.detect("https://shop.acme.co.uk", "https://shop-uat.acme.co.uk");
    assert.equal(r.root, "acme.co.uk");
    assert.equal(r.prodPrefix, "shop");
    assert.equal(r.uatPrefix, "shop-uat");
});

test("detect falls back to whole-host swap when only the TLD is shared", () => {
    assert.equal(Env.detect("https://acme.com", "https://acme-uat.net").wholeHost, true);
    assert.equal(Env.detect("https://acme.com", "https://acme-uat.com").wholeHost, true);
});

test("detect rejects the same host twice", () => {
    assert.ok(Env.detect("https://www.acme.com/a", "http://www.acme.com/b").error);
});

test("detect rejects non-http schemes and garbage", () => {
    assert.ok(Env.detect("chrome://extensions", "https://uat.acme.com").error);
    assert.ok(Env.detect("https://www.acme.com", "file:///tmp/x").error);
    assert.ok(Env.detect("", "https://uat.acme.com").error);
    assert.ok(Env.detect("not a url at all", "https://uat.acme.com").error);
});

test("parseUrl assumes https when the scheme is missing", () => {
    const r = Env.parseUrl("uat.acme.com/x");
    assert.equal(r.origin, "https://uat.acme.com");
    assert.equal(r.host, "uat.acme.com");
});

test("parseUrl keeps ports in host but not hostname", () => {
    const r = Env.parseUrl("http://localhost:3000/x");
    assert.equal(r.origin, "http://localhost:3000");
    assert.equal(r.host, "localhost:3000");
    assert.equal(r.hostname, "localhost");
});

test("switchUrl uses the target environment's scheme and port", () => {
    assert.equal(Env.switchUrl("https://www.acme.com/a?b=1#c", mixed), "http://localhost:3000/a?b=1#c");
    assert.equal(Env.switchUrl("http://localhost:3000/a?b=1#c", mixed), "https://www.acme.com/a?b=1#c");
});

test("switchUrl returns null on unconfigured hosts", () => {
    assert.equal(Env.switchUrl("https://api.acme.com/", acme), null);
    assert.equal(Env.switchUrl("https://www.acme.com/", { prodOrigin: "", uatOrigin: "" }), null);
});

test("envForUrl matches exact host regardless of scheme", () => {
    assert.equal(Env.envForUrl("http://www.acme.com/x", acme), "prod");
    assert.equal(Env.envForUrl("https://uat.acme.com/", acme), "uat");
    assert.equal(Env.envForUrl("https://api.acme.com/", acme), null);
    assert.equal(Env.envForUrl("chrome://newtab/", acme), null);
    assert.equal(Env.envForUrl(undefined, acme), null);
});

test("originPatterns drop ports", () => {
    assert.deepEqual(Env.originPatterns(mixed), ["*://www.acme.com/*", "*://localhost/*"]);
    assert.deepEqual(Env.originPatterns({ prodOrigin: "", uatOrigin: "" }), []);
});

test("isConfigured requires both origins", () => {
    assert.equal(Env.isConfigured(acme), true);
    assert.equal(Env.isConfigured({ prodOrigin: "https://www.acme.com", uatOrigin: "" }), false);
});

test("parseUrl treats host:port without a scheme as https", () => {
    assert.equal(Env.parseUrl("localhost:3000").origin, "https://localhost:3000");
    assert.equal(Env.parseUrl("uat.acme.com:8443/x").origin, "https://uat.acme.com:8443");
    assert.ok(Env.parseUrl("file:///tmp/x").error);
    assert.ok(Env.parseUrl("chrome://extensions").error);
});

test("parseUrl strips a trailing dot from the hostname", () => {
    const r = Env.parseUrl("https://www.acme.com./x");
    assert.equal(r.origin, "https://www.acme.com");
    assert.equal(r.host, "www.acme.com");
    assert.equal(r.hostname, "www.acme.com");
    assert.equal(Env.parseUrl("http://localhost.:3000").origin, "http://localhost:3000");
});

test("detect treats IP address pairs as a whole-host swap", () => {
    assert.equal(Env.detect("http://10.0.0.1", "http://11.0.0.1").wholeHost, true);
    assert.equal(Env.detect("http://[::1]:3000", "https://www.acme.com").wholeHost, true);
});
