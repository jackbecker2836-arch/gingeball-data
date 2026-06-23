// scripts/render-cockpit-static.tsx — SSR the cockpit to standalone HTML for a browserless raster.
// Run: npx tsx --tsconfig tsconfig.check.json scripts/render-cockpit-static.tsx
// then: wkhtmltoimage --width 1280 /tmp/cockpit.html out-desktop.png (and --width 390 for mobile).
// A lighter pixel-render path than full Next + Chromium; verifies content/colors/overflow.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildPressureLabView } from "@/lib/pressure-lab-view-model";
import { PressureLabCockpit } from "@/components/court-handicap/PressureLabCockpit";
import fs from "node:fs";
const view = buildPressureLabView();
const body = renderToStaticMarkup(React.createElement(PressureLabCockpit, { view }));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--f-title:'Bricolage Grotesque',sans-serif;--f-num:'Anton',sans-serif;--f-serif:'Fraunces',serif;--f-mono:'Space Mono',monospace;--f-stamp:'Rubik Dirt',sans-serif;}
html,body{margin:0;background:#09090B;}
</style></head><body>${body}</body></html>`;
fs.writeFileSync("/tmp/cockpit.html", html);
console.log("html bytes:", html.length, "| deployment:", view.deployment.status, "| scenarios:", view.scenarios.length);
