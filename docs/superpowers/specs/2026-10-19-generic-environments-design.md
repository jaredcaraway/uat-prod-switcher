# Generic UAT/PROD Switcher — Design

Date: 2026-10-19
Status: Draft

## Why

The extension was built for Kelsey-Seybold's sites (`www.` ↔ `uatnew-www.` on
`kelsey-seybold.com` / `ksnet.com`). The author no longer works there and wants
anyone who bounces between a production and a UAT site to be able to use it,
installed from the Chrome Web Store and Firefox Add-ons.

## Goals

- No company-specific defaults anywhere: code, settings, UI copy, README.
- Setup by example: the user pastes one production URL and one UAT URL, and the
  extension works out the mapping and shows it back in plain terms.
- The mapping stays easy to change later from the settings page, either by
  pasting new example links or by editing the detected values directly.
- Ships for both Chrome and Firefox from one codebase.
- Asks for site access only for the configured hosts, not every HTTPS site.

## Non-goals (MVP)

- More than one environment pair. One production host ↔ one UAT host per user.
- Environments beyond two (dev/staging/UAT/prod chains).
- Custom environment names; "UAT" and "PRD" labels stay.
- Actually submitting to the stores (packaging only).

## Anti-goals

- A fresh install that silently does nothing, or that looks "on" for sites the
  user never configured.
- Showing the amber UAT icon on unconfigured sites (it falsely implies "you're in UAT").
- A setup that requires the user to understand regexes or "subdomain prefixes"
  before it works.

## Current state

- `background.js`: settings `{prodSub, uatSub, domains[], showBanner}`; matches
  any `https://*.<domain>` in the list; UAT detected by `url.includes(uatSub)`;
  toggles via injecting `switch.js`, which does a string replace on the whole URL;
  injects `banner.js` on UAT page loads.
- `options.html/js`: subdomain fields, a domain list (copy mentions Kelsey-Seybold),
  banner toggle, shortcut info.
- Icons from `generate_icons.py`: amber "UAT" toggle and green "PRD" toggle. These
  are already generic. The top-level/default icon is currently the UAT one.
- Manifest V3, Chrome-only (`background.service_worker`), `host_permissions: https://*/*`.

## Decisions

### Settings model

Store an origin (scheme + host) for each environment:

```
{ prodOrigin: "https://www.acme.com", uatOrigin: "http://localhost:3000",
  showBanner: true }
```

- "Host" means hostname plus port if the user's URL had one (e.g. `localhost:3000`).
- A page is "configured" if its host equals the prod or UAT host exactly.
  Other subdomains of the same root do not match (one pattern for the MVP).
- Both `http` and `https` are supported. A switch uses the **target
  environment's own scheme** from its stored origin, not the current page's.
  This handles an `http` local/UAT box paired with `https` production. A page
  matches by host regardless of scheme. (My call.)
- A pasted URL with no scheme gets `https://` prepended. (My call.)
- The example URLs are not stored separately; the fields show the stored
  origins. Editing a host by hand just edits that origin. (My call.)
- Defaults are empty, so a fresh install is unconfigured. "Reset" clears the
  environments back to unconfigured and turns the banner on. (My call.)
- Old keys (`prodSub`, `uatSub`, `domains`) are removed on update; no migration
  (only the author has existing settings).

### Detection (shown to the user, drives the editable fields)

Compare the two hostnames label by label from the right:

- The shared tail is the **root domain**; the differing front parts are the
  **environment prefixes**.
  - `www.acme.com` vs `uat.acme.com` → root `acme.com`, `www` ↔ `uat`
  - `acme.com` vs `uat.acme.com` → root `acme.com`, (none) ↔ `uat`
  - `shop.acme.co.uk` vs `shop-uat.acme.co.uk` → root `acme.co.uk`, `shop` ↔ `shop-uat`
- If the shared tail is only the TLD (one label) or nothing, e.g. `acme.com` vs
  `acme-uat.net`, show it as a whole-hostname swap.
- Ports must match or be treated as part of the host. Builder's call on display.
- Errors shown inline: invalid URL, the same host pasted twice, a non-http(s) scheme.

Under the stored model, switching is always "replace this page's host with the
other host, keep scheme/path/query/hash", so the root/prefix breakdown is for
display only. Editing the detected values means editing the two hosts (prefix +
root shown as separate fields or as two host fields: builder's call, as long as
it stays obvious).

### Switching

The background script computes the new URL itself and calls `chrome.tabs.update`.
`switch.js` goes away; no page injection is needed for switching. Clicking the
toolbar button or pressing the shortcut on an unconfigured page does nothing,
except when nothing is configured at all: then it opens the settings page.

### Permissions

- Remove `host_permissions: https://*/*`. Declare
  `optional_host_permissions: ["*://*/*"]` (Chrome and Firefox MV3).
- On save, call `chrome.permissions.request` for the origins of the two hosts
  (`*://<hostname>/*`, without the port: Firefox doesn't accept ports in
  match patterns, and a port-less pattern covers every port in Chrome), triggered by the Save click (a user gesture is required). If
  denied, don't save, and explain that the extension needs access to those two sites.
- When the hosts change, remove permission for origins no longer configured.
- Settings stay in `storage.sync`, so they follow the user across browsers, but
  granted permissions don't. The background checks `chrome.permissions.contains`
  for the configured origins. If access is missing, clicking still switches
  (`tabs.update` needs no host access), but the banner can't appear. The icon
  title then adds "(banner needs site access: see settings)", and the settings
  page shows a "Grant access" prompt at the top.
- Keep `activeTab`, `scripting`, `storage`, `tabs`. The banner is injected with
  `scripting.executeScript`, which needs the granted host permission.

### First run

On install (`runtime.onInstalled`, reason `install`), open the settings page.
The settings page leads with a "Your environments" card: two URL fields
(Production example, UAT example), a live detected-result line such as
"Production `www.acme.com` ↔ UAT `uat.acme.com`", and the editable values
below it. The banner and shortcut cards stay as they are.

### Icons

Add a third, **neutral grey** variant to `generate_icons.py`: the same toggle shape,
with a grey track and the knob centred or left, and no label or a neutral one
(builder's call). Use it:
- as the manifest/store icon (top-level `images/icon*.png`)
- as the toolbar icon on unconfigured pages, with the title "Not a configured site"
  (or "Click to set up" when nothing is configured).
The amber UAT and green PRD variants are unchanged. Regenerate all PNGs.

### Cross-browser build

- One source tree using the `chrome.*` namespace (Firefox supports it in MV3).
- A build script with no npm dependencies produces `dist/chrome.zip` and
  `dist/firefox.zip`. Only the manifests differ:
  - Chrome: `background.service_worker: "background.js"`.
  - Firefox: `background.scripts: ["background.js"]` plus
    `browser_specific_settings.gecko.id` (default
    `uat-prod-switcher@jaredcaraway.com`, my call) and a `strict_min_version`
    high enough for MV3 + `optional_host_permissions` + `scripting`.
- Suggested approach: a base `manifest.json` plus a small per-browser patch,
  merged by the script. Builder's call.
- The "Change in browser settings" shortcut link opens `chrome://extensions/shortcuts`
  on Chrome. On Firefox, use `commands.openShortcutSettings()` if available;
  otherwise show a short text instruction (about:addons → gear → Manage Extension Shortcuts).
- `background.js` must work both as a service worker (Chrome) and as an event
  page (Firefox): no reliance on module-level state surviving. Reload settings
  from storage on each event, or cache them carefully.

### Copy and metadata

- Remove all Kelsey-Seybold references (options copy, defaults, README).
- Manifest name stays "UAT-PROD Switcher"; description is generic.
- Version bump to 2.0.0.
- README: rewrite setup for the paste-two-URLs flow, Chrome + Firefox install
  (store and load-unpacked/temporary add-on), and the build script.

## Left to the builder

- Exact layout and wording of the environments card, within the existing visual style.
- Whether detection lives in a shared pure module (recommended: `env.js`, used by
  options and background, unit-tested with `node --test`).
- Manifest merge mechanics, the exact Firefox `strict_min_version`, and the neutral icon's details.
- Handling for a tab whose page is open while permissions or settings change.
