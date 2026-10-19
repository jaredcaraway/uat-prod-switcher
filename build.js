// Builds dist/chrome.zip and dist/firefox.zip from the same source.
// manifest.json is the Chrome manifest; manifest.firefox.json overrides
// top-level keys for Firefox (a null value removes the key).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const FILES = ["background.js", "banner.js", "env.js", "options.html", "options.js"];

function readJson(file) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function manifestFor(browser) {
    const manifest = readJson("manifest.json");
    if (browser === "firefox") {
        for (const [key, value] of Object.entries(readJson("manifest.firefox.json"))) {
            if (value === null) delete manifest[key];
            else manifest[key] = value;
        }
    }
    return manifest;
}

function build(browser) {
    const outDir = path.join(DIST, browser);
    fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifestFor(browser), null, 4) + "\n");
    for (const file of FILES) {
        fs.copyFileSync(path.join(ROOT, file), path.join(outDir, file));
    }
    fs.cpSync(path.join(ROOT, "images"), path.join(outDir, "images"), {
        recursive: true,
        filter: (src) => fs.statSync(src).isDirectory() || src.endsWith(".png"),
    });

    const zip = path.join(DIST, `${browser}.zip`);
    execFileSync("zip", ["-qr", zip, "."], { cwd: outDir });
    console.log(`Built ${path.relative(ROOT, zip)}`);
}

fs.rmSync(DIST, { recursive: true, force: true });
build("chrome");
build("firefox");
