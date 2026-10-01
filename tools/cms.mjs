// Lists the drop folder (cms/) for the gallery, newest first. A file's date is
// its own modified date the first time it's listed; after that the date stays
// in cms/manifest.json, so the order never reshuffles on another checkout.
//   node tools/cms.mjs   -> rewrites cms/manifest.json (the pre-commit hook runs it)
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CMS = join(ROOT, "cms");
const MANIFEST = join(CMS, "manifest.json");
const TYPES = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", avif: "image", gif: "image",
  mp4: "video", webm: "video",
};
const typeOf = (file) => TYPES[extname(file).slice(1).toLowerCase()];

export function listCms() {
  const known = {};
  try { for (const f of JSON.parse(readFileSync(MANIFEST, "utf8"))) known[f.file] = f.date; } catch {}
  return readdirSync(CMS)
    .filter((file) => !file.startsWith(".") && typeOf(file))
    .map((file) => {
      const st = statSync(join(CMS, file));
      return { file, type: typeOf(file), bytes: st.size, date: known[file] || st.mtime.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(MANIFEST, JSON.stringify(listCms(), null, 2) + "\n");
}
