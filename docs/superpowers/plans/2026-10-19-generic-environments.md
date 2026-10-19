# Generic Environments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Kelsey-Seybold-specific config with paste-two-URLs setup, per-site permissions, a neutral icon, and Chrome + Firefox packages.

**Architecture:** A pure `env.js` module (URL parsing, detection, matching, switching) shared by the background script, the options page and the Node tests. The background switches tabs with `tabs.update` and injects only the banner. A no-dependency Node build script merges the base manifest with a per-browser patch and zips `dist/`.

**Tech Stack:** Vanilla JS, MV3 WebExtensions (`chrome.*`), Node ≥18 (`node --test`, build), Python + Pillow (icons).

**Spec:** `docs/superpowers/specs/2026-10-19-generic-environments-design.md`

## Global Constraints

- No Kelsey-Seybold references anywhere (`grep -ri "kelsey\|ksnet\|uatnew" --exclude-dir=.git --exclude-dir=docs .` is empty).
- Settings shape: `{ prodOrigin: "", uatOrigin: "", showBanner: true }` in `chrome.storage.sync`; old keys `prodSub`, `uatSub`, `domains` removed on update.
- No `host_permissions`; `optional_host_permissions: ["*://*/*"]`; patterns `*://<hostname>/*` (no port).
- Version `2.0.0`; Firefox gecko id `uat-prod-switcher@jaredcaraway.com`.
- No npm dependencies.

## Review Focus

- Mixed schemes (`https` prod, `http://localhost:3000` UAT): the switch must use the target's scheme and port. (Task 1 test)
- A URL pasted without a scheme (`uat.acme.com/x`) is accepted as `https`. (Task 1 test)
- The same host pasted twice, or a `chrome://`/`file:` URL, gives an inline error and doesn't save. (Task 1 test)
- A page on a different subdomain of the same root (`api.acme.com`) is treated as unconfigured. (Task 1 test)
- Path, query and hash survive a switch. (Task 1 test)

---

### Task 1: `env.js` pure module

**Files:** Create `env.js`, `test/env.test.js`, `package.json` (only `"scripts": {"test": "node --test test/", "build": "node build.js"}`)

**Interfaces — Produces** (global `Env` in the browser; `module.exports` in Node):
- `Env.parseUrl(input: string) -> {origin, host, hostname} | {error: string}`
- `Env.detect(prodInput, uatInput) -> {prodOrigin, uatOrigin, root, prodPrefix, uatPrefix, wholeHost: boolean} | {error: string}`
- `Env.envForUrl(url, settings) -> "prod" | "uat" | null` (matches by `host`, ignoring scheme)
- `Env.switchUrl(url, settings) -> string | null`
- `Env.originPatterns(settings) -> string[]`
- `Env.isConfigured(settings) -> boolean`

- [ ] Tests: `detect("https://www.acme.com/about","https://uat.acme.com/about")` → root `acme.com`, prefixes `www`/`uat`; `acme.com` vs `uat.acme.com` → prefix `""`/`uat`; `shop.acme.co.uk` vs `shop-uat.acme.co.uk` → root `acme.co.uk`; `acme.com` vs `acme-uat.net` → `wholeHost: true`; `www.acme.com` both → error; `chrome://x` → error; `uat.acme.com/x` → origin `https://uat.acme.com`. `switchUrl("https://www.acme.com/a?b=1#c", {prodOrigin:"https://www.acme.com", uatOrigin:"http://localhost:3000"})` → `http://localhost:3000/a?b=1#c` and back; `envForUrl("https://api.acme.com/", s)` → `null`; `originPatterns` → `["*://www.acme.com/*","*://localhost/*"]`.
- [ ] Run `npm test` → fails; implement; run → passes. Detection compares dot-split hostname labels from the right; a shared tail of fewer than 2 labels means `wholeHost`.
- [ ] Commit.

### Task 2: Neutral icon

**Files:** Modify `generate_icons.py`; regenerate `images/**`.
- [ ] Add a `neutral` variant: slate-400 `(148,163,184)` track, knob centred, no label. Top-level `images/icon*.png` come from `neutral`.
- [ ] Run `python3 generate_icons.py`; view `images/icon128.png`. Commit.

### Task 3: Background + manifest + banner

**Files:** Modify `background.js`, `banner.js`, `manifest.json`; delete `switch.js`.
**Consumes:** `Env.*` (via `importScripts("env.js")` in the Chrome SW; Firefox lists `["env.js","background.js"]`).
- [ ] `background.js`: read settings from storage on each event (no reliance on module state). Icon: neutral + "Click to set up" if unconfigured; neutral + "Not a configured site" on other hosts; UAT/PRD + "Switch to PRD/UAT" otherwise, with " (banner needs site access: see settings)" appended when `chrome.permissions.contains({origins})` is false. Click: unconfigured → `runtime.openOptionsPage()`; configured env → `tabs.update(tab.id, {url: Env.switchUrl(...)})`; else nothing. `onInstalled` with reason `install` → open options; reason `update` → `storage.sync.remove(["prodSub","uatSub","domains"])`. Inject the banner on `status === "complete"` when the env is `uat`, in a try/catch.
- [ ] `banner.js`: drop its own URL check and `uatSub` (the background only injects on UAT); keep the `showBanner` read and live-removal listener.
- [ ] Manifest: version `2.0.0`, generic description, `optional_host_permissions`, no `host_permissions`.
- [ ] Load unpacked in Chrome; run a smoke check after Task 4. Commit.

### Task 4: Options page

**Files:** Modify `options.html`, `options.js`. Load `env.js` before `options.js`.
- [ ] Replace the Subdomains and Domains cards with a "Your environments" card: Production URL and UAT URL inputs (prefilled from the stored origins), a live detected line (`Production www.acme.com ↔ UAT uat.acme.com`, or the root/prefix breakdown, or "Whole hostname swap"), and an inline error line. Hand edits = editing these two fields.
- [ ] A "Grant access" notice at the top, shown when configured but `permissions.contains` is false; its button calls `permissions.request`.
- [ ] Save: `detect` → on error show it and stop; `permissions.request({origins})` directly inside the click handler (no awaits before it); denied → toast "Site access is needed for these two sites" and stop; otherwise remove permissions for previously stored origins not in the new set, then save `{prodOrigin, uatOrigin, showBanner}`.
- [ ] Reset: set the defaults (empty origins, banner on), remove the old origin permissions, clear the fields.
- [ ] Shortcut link: on Chrome open `chrome://extensions/shortcuts`; if `chrome.commands.openShortcutSettings` exists, call it; otherwise (Firefox) replace the link with the text "about:addons → ⚙ → Manage Extension Shortcuts". Detect Firefox with `typeof browser !== "undefined" && browser.runtime.getBrowserInfo`.
- [ ] Manual check in Chrome: fresh install opens settings; paste two URLs; save grants; switching and the banner work. Commit.

### Task 5: Build, Firefox, README

**Files:** Create `build.js`, `manifest.firefox.json` (patch); modify `.gitignore` (`dist/`), `README.md`.
- [ ] `manifest.json` is the Chrome manifest (`background.service_worker`). `manifest.firefox.json` holds `{"background":{"scripts":["env.js","background.js"]},"browser_specific_settings":{"gecko":{"id":"uat-prod-switcher@jaredcaraway.com","strict_min_version":"128.0"}}}`, which replaces `background` wholesale.
- [ ] `build.js`: copy the runtime files (`manifest.json` merged, `*.js` except `build.js`, `options.html`, `images/**/*.png`) into `dist/chrome/` and `dist/firefox/`, then `zip -r` each to `dist/<browser>.zip`.
- [ ] Run `npm run build`; check that both zips list the expected files and the Firefox manifest has `background.scripts`.
- [ ] Rewrite the README for the new setup, both browsers, and the build. Run the grep from Global Constraints. Commit.
