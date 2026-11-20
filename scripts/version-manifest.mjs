// VitePWA injects its own manifest link after Vite's transform hooks.
// Add a cache-busting query string to the built HTML once the build is done.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../dist/client/index.html", import.meta.url);
const html = readFileSync(file, "utf8");
const versioned = html.replace('href="/manifest.webmanifest"', 'href="/manifest.webmanifest?v=2"');
if (versioned !== html) writeFileSync(file, versioned);
console.log("manifest link versioned");
