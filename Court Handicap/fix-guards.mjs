// fix-guards.mjs  (encoding-aware)
// Rewrites the unsafe Node-CLI self-check guard
//   if (typeof require !== "undefined" && require.main === module) {
// into a browser-safe form, across the WHOLE app, regardless of whether each
// file is saved as UTF-8 or UTF-16 (LE/BE). The old guard throws
// "module is not defined" in the browser bundle and crashes any page that
// imports the file. The new guard never references module/require, is false
// in browsers (no process.argv there), and still fires when the file is run
// directly under tsx/node (but not when merely imported).
//
// Run from your app root:   node fix-guards.mjs
// Safe to run repeatedly (idempotent). Preserves each file's original encoding.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const OLD = 'if (typeof require !== "undefined" && require.main === module) {';
const SKIP = new Set(["node_modules", ".next", ".git", "dist", "build"]);

function walk(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function detectEncoding(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return "utf16le-bom";
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return "utf16be-bom";
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return "utf8-bom";
  const n = Math.min(buf.length, 200);
  let zeros = 0;
  for (let i = 0; i < n; i++) if (buf[i] === 0x00) zeros++;
  if (zeros > n / 4) return "utf16le";
  return "utf8";
}

function decode(buf, enc) {
  switch (enc) {
    case "utf16le-bom": return buf.slice(2).toString("utf16le");
    case "utf16be-bom": { const s = Buffer.from(buf.slice(2)); s.swap16(); return s.toString("utf16le"); }
    case "utf8-bom": return buf.slice(3).toString("utf8");
    case "utf16le": return buf.toString("utf16le");
    default: return buf.toString("utf8");
  }
}

function encode(str, enc) {
  switch (enc) {
    case "utf16le-bom": return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(str, "utf16le")]);
    case "utf16be-bom": { const b = Buffer.from(str, "utf16le"); b.swap16(); return Buffer.concat([Buffer.from([0xfe, 0xff]), b]); }
    case "utf8-bom": return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(str, "utf8")]);
    case "utf16le": return Buffer.from(str, "utf16le");
    default: return Buffer.from(str, "utf8");
  }
}

const files = walk(process.cwd());
let changed = 0;

for (const f of files) {
  const buf = readFileSync(f);
  const enc = detectEncoding(buf);
  const src = decode(buf, enc);
  if (!src.includes(OLD)) continue;

  const base = basename(f);
  const NEW =
    'const __isCliEntry =\n' +
    '  typeof process !== "undefined" &&\n' +
    '  Array.isArray(process.argv) &&\n' +
    '  (process.argv[1] ?? "").replace(/\\\\/g, "/").endsWith("' + base + '");\n' +
    'if (__isCliEntry) {';

  const out = src.split(OLD).join(NEW);
  writeFileSync(f, encode(out, enc));
  changed++;
  console.log("patched [" + enc + "] " + f);
}

console.log("TOTAL PATCHED: " + changed);
