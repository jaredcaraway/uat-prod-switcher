# UAT-PROD Switcher

A Chrome and Firefox extension that toggles between your production and UAT sites with a single click or keyboard shortcut, keeping you on the same page.

## Features

- **One-click switching**: click the toolbar icon to jump between production and UAT. The path, query string and `#hash` carry over.
- **Keyboard shortcut**: `Alt+Shift+U` switches without leaving the keyboard.
- **UAT banner**: an amber banner at the top of UAT pages so you always know where you are.
- **Toggle icon**: amber **UAT** or green **PRD** on your sites, grey everywhere else.
- **Setup by example**: paste one link from each site and the extension works out the rest.

## Installation

### From source

```bash
npm run build   # creates dist/chrome.zip and dist/firefox.zip (needs Node 18+ and zip)
```

**Chrome:** open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/chrome` (or this repo's root folder).

**Firefox (128+):** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and select `dist/firefox/manifest.json`.

## Setup

The settings page opens when you first install. You can reopen it any time by right-clicking the toolbar icon and choosing **Options**, or by clicking the icon before anything is set up.

1. Paste a link to any page on your **production** site, e.g. `https://www.example.com/about`.
2. Paste a link to any page on your **UAT** site, e.g. `https://uat.example.com/about`.
3. Check the preview, which shows what changes between them (`www` ↔ `uat` on `example.com`), then click **Save settings**.
4. Allow the extension to access those two sites when your browser asks.

A few things worth knowing:

- Links without `http://` or `https://` are treated as `https`.
- Each site keeps its own scheme and port, so `https://www.example.com` ↔ `http://localhost:3000` works.
- If the two sites share nothing but the TLD (e.g. `example.com` ↔ `example-uat.net`), the whole hostname is swapped.
- One production/UAT pair is supported. Other subdomains of the same domain are ignored.

### Using more than one browser

Your settings sync to other browsers you're signed in to, but site access has to be approved in each browser separately. Until you approve it, switching still works but the banner doesn't appear, and the settings page shows a **Grant access** button.

## Development

```bash
npm test        # unit tests for env.js (Node's built-in test runner)
npm run build   # package both browsers into dist/
python3 generate_icons.py   # regenerate icons (needs Pillow)
```

- `env.js`: URL parsing, environment detection and switching, shared by the background script, the settings page and the tests.
- `manifest.json` is the Chrome manifest. `manifest.firefox.json` overrides top-level keys for the Firefox build (a `null` value removes a key).

## Permissions

- `tabs` / `activeTab`: read the current tab's URL to know which environment you're on, and switch it.
- `scripting`: show the UAT banner.
- `storage`: save your settings.
- Optional site access, requested only for the two sites you configure: needed to show the banner.
