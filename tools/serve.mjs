// Local preview. Serves the site and builds cms/manifest.json live from the
// folder, so a file dropped in cms/ shows up on refresh.
//   node tools/serve.mjs [port]   (default 4317)
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { ROOT, listCms } from "./cms.mjs";

const PORT = +process.argv[2] || 4317;
const MIME = {
  html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", mjs: "text/javascript",
  json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", avif: "image/avif", gif: "image/gif", mp4: "video/mp4", webm: "video/webm",
  ttf: "font/ttf", woff2: "font/woff2",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (path === "/cms/manifest.json") {
    res.writeHead(200, { "content-type": MIME.json, "cache-control": "no-store" });
    return res.end(JSON.stringify(listCms()));
  }
  const file = normalize(join(ROOT, path.endsWith("/") ? path + "index.html" : path));
  let st;
  try { st = statSync(file); if (!file.startsWith(ROOT) || st.isDirectory()) throw 0; }
  catch { res.writeHead(404); return res.end(); }

  const head = { "content-type": MIME[extname(file).slice(1).toLowerCase()] || "application/octet-stream",
                 "accept-ranges": "bytes", "cache-control": "no-cache" };
  // Byte ranges, so Safari will play video straight from a URL.
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  let start = 0, end = st.size - 1;
  if (m) {
    start = m[1] ? +m[1] : st.size - +m[2];
    end = m[1] && m[2] ? Math.min(+m[2], end) : end;
    res.writeHead(206, { ...head, "content-range": `bytes ${start}-${end}/${st.size}`, "content-length": end - start + 1 });
  } else {
    res.writeHead(200, { ...head, "content-length": st.size });
  }
  if (req.method === "HEAD") return res.end();
  createReadStream(file, { start, end }).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`http://localhost:${PORT}`));
