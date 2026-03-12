# UAT-PROD Switcher

A Chrome extension that lets you toggle between UAT and production environments with a single click or keyboard shortcut.

## Features

- **One-click switching** — Click the toolbar icon to swap between UAT and PROD URLs
- **Keyboard shortcut** — `Alt+Shift+U` to switch without leaving the keyboard
- **UAT banner** — An amber banner appears at the top of UAT pages so you always know which environment you're on
- **Badge indicator** — The extension icon shows a colored badge: amber **UAT** or green **PRD**
- **Configurable** — Customize subdomains, target domains, and banner visibility from the options page

## Installation

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select this directory

## Configuration

Right-click the extension icon and select **Options**, or go to the extension's details page in `chrome://extensions`.

From the options page you can:

- Set the **production** and **UAT subdomain** prefixes (defaults: `www.` and `uatnew-www.`)
- Add or remove **target domains** the extension should activate on
- Toggle the **UAT environment banner** on or off
- Change the **keyboard shortcut** via Chrome's shortcut settings

## How It Works

The extension swaps the subdomain prefix in the current tab's URL. For example:

```
https://www.example.com/page  ↔  https://uatnew-www.example.com/page
```

It only activates on domains you've configured in the options page.

## Permissions

- `activeTab` / `tabs` — Read the current tab URL to determine the environment
- `scripting` — Inject the URL switch and UAT banner scripts
- `storage` — Persist your settings across sessions
- `host_permissions` (`https://*/*`) — Required to run scripts on matched pages
