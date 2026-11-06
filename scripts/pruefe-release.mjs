// Toad's Visuals – checks releases of this repository (no dependencies, Node 20+). Used by the workflows in
// .github/workflows; it never publishes anything.
//
//   node scripts/pruefe-release.mjs neu <version> <test:true|false>
//       before a draft is created: version format, not used yet (also not as a draft), higher than every
//       published version. A test version must have a "-test.N" suffix.
//   node scripts/pruefe-release.mjs veroeffentlicht <tag> <folder with the release JARs>
//       after "Publish release": tag format, higher than every other published version, the JARs are named
//       ToadsVisuals-<version>+<minecraft>.jar and really are Toad's Visuals in exactly that version.
//
// Needs GH_TOKEN and GITHUB_REPOSITORY (both set by GitHub Actions).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GH_TOKEN;
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]{1,30}))?$/;

function fail(msg) {
  console.log(`::error::${msg}`);
  process.exit(1);
}

/** Compares two versions like the mod does (semantic versioning: 2.0.1 > 2.0.1-test.2 > 2.0.1-test.1 > 2.0.0). */
export function compare(a, b) {
  const x = a.match(VERSION);
  const y = b.match(VERSION);
  for (let i = 1; i <= 3; i++) {
    if (Number(x[i]) !== Number(y[i])) return Number(x[i]) - Number(y[i]);
  }
  if (!x[4] && !y[4]) return 0;
  if (!x[4]) return 1;
  if (!y[4]) return -1;
  const p = x[4].split(".");
  const q = y[4].split(".");
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    if (p[i] === undefined) return -1;
    if (q[i] === undefined) return 1;
    const pn = /^\d+$/.test(p[i]);
    const qn = /^\d+$/.test(q[i]);
    if (pn && qn && Number(p[i]) !== Number(q[i])) return Number(p[i]) - Number(q[i]);
    if (pn !== qn) return pn ? -1 : 1;
    if (p[i] !== q[i]) return p[i] < q[i] ? -1 : 1;
  }
  return 0;
}

/** Every release of the repository, drafts included (the token can see them). */
async function releases() {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!r.ok) fail(`GitHub API: ${r.status} ${await r.text()}`);
    const list = await r.json();
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

const strip = (tag) => String(tag).replace(/^[vV]/, "");

function readZipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    if (buf.toString("utf8", p + 46, p + 46 + nlen) === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + csize);
      return method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nlen + elen + clen;
  }
  return null;
}

const [mode, arg1, arg2] = process.argv.slice(2);

if (mode === "neu") {
  const version = strip(arg1 ?? "").trim();
  const test = arg2 === "true";
  if (!VERSION.test(version)) fail(`"${version}" ist keine gültige Versionsnummer (Beispiel: 2.0.1 oder 2.0.1-test.1).`);
  if (test && !/-test\.\d+$/.test(version)) fail(`Eine Testversion muss auf "-test.<Nummer>" enden, z. B. ${version.replace(/-.*$/, "")}-test.1.`);
  if (!test && version.includes("-")) fail(`Eine normale Version darf keinen Zusatz haben ("${version}"). Für Tests "Testversion" anhaken.`);
  const all = await releases();
  const same = all.find((r) => strip(r.tag_name) === version);
  if (same) fail(`v${version} gibt es schon (${same.draft ? "als Entwurf" : "veröffentlicht"}): ${same.html_url} – vorhandene Versionen werden nie überschrieben.`);
  const published = all.filter((r) => !r.draft && VERSION.test(strip(r.tag_name)));
  const highest = published.map((r) => strip(r.tag_name)).sort(compare).pop();
  if (highest && compare(version, highest) <= 0) fail(`v${version} ist nicht höher als die höchste veröffentlichte Version v${highest}.`);
  console.log(`OK: v${version}${test ? " (Testversion)" : ""} ist neu${highest ? ` und höher als v${highest}` : ""}.`);
} else if (mode === "veroeffentlicht") {
  const version = strip(arg1 ?? "");
  if (!VERSION.test(version)) fail(`Tag "${arg1}" ist keine gültige Version (v2.0.1 oder v2.0.1-test.1).`);
  const all = await releases();
  const self = all.find((r) => r.tag_name === arg1);
  const others = all.filter((r) => !r.draft && r.tag_name !== arg1 && VERSION.test(strip(r.tag_name))).map((r) => strip(r.tag_name));
  const higher = others.filter((v) => compare(v, version) >= 0);
  if (higher.length) fail(`v${version} ist nicht höher als schon veröffentlichte Versionen: ${higher.map((v) => "v" + v).join(", ")}.`);
  if (self && self.prerelease !== /-test\.\d+$/.test(version)) {
    fail(self.prerelease ? `v${version} ist als Pre-Release markiert, aber keine Testversion (-test.N).` : `v${version} ist eine Testversion, aber nicht als Pre-Release markiert – sonst bekämen alle Spieler sie angezeigt.`);
  }
  const jars = readdirSync(arg2).filter((f) => f.toLowerCase().endsWith(".jar"));
  if (!jars.length) fail("Am Release hängt keine JAR. Erst die JARs hochladen, dann veröffentlichen.");
  const mcs = [];
  for (const f of jars) {
    const m = f.match(/^ToadsVisuals-(.+)\+([0-9][0-9a-z.\-]*)\.jar$/);
    if (!m || m[1] !== version) fail(`"${f}" passt nicht zum Release: erwartet ToadsVisuals-${version}+<minecraft>.jar`);
    const raw = readZipEntry(readFileSync(join(arg2, f)), "fabric.mod.json");
    if (!raw) fail(`"${f}" ist keine Fabric-Mod (keine fabric.mod.json).`);
    const meta = JSON.parse(raw.toString("utf8"));
    if (meta.id !== "toadsvisuals") fail(`"${f}" ist nicht Toad's Visuals (id ${meta.id}).`);
    if (meta.version !== `${version}+${m[2]}`) fail(`"${f}" enthält Version ${meta.version}, erwartet ${version}+${m[2]}.`);
    mcs.push(m[2]);
  }
  console.log(`OK: v${version} mit ${jars.length} JAR(s) für Minecraft ${mcs.join(", ")}.`);
} else {
  fail("Aufruf: neu <version> <true|false>  oder  veroeffentlicht <tag> <ordner>");
}
