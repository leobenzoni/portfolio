/* ============================================================
   leonardo benzoni — retro UI script
   Photoshop-window chrome: light/dark (middle light), live filename
   date, editable name, cursor-driven shadow, smooth-scroll gallery
   with a tracking scrollbar, fullscreen, and close-to-dock.
   ============================================================ */

(function () {
  const body = document.body;

  /* ---------- Theme (dark mode) ----------
     Middle traffic light. Always opens in light — the toggle flips dark for the
     current visit only (not persisted), so every fresh load starts light. */
  const toggle = document.querySelector(".light--toggle");
  if (toggle) {
    toggle.addEventListener("click", () => body.classList.toggle("dark"));
  }

  /* ---------- Live title-bar + status-bar readouts ----------
     The filename number is the date (img + DDMMYY). The Photoshop "zoom %" is
     secretly the time (24h): HH.MM% in the status bar, HH.M% — one digit shorter
     — in the title, the same precision relationship the static 33.33% / 33.3%
     had. Refreshed on an interval so both roll over while the page is left open. */
  const fileDate = document.getElementById("filedate");
  const zoomTitle = document.getElementById("zoomtitle");
  const zoomStatus = document.querySelector(".statusbar__zoom");
  const pad = (n) => (n < 10 ? "0" + n : String(n));
  function setReadouts() {
    const d = new Date();
    if (fileDate) {
      fileDate.textContent =
        "img" + pad(d.getDate()) + pad(d.getMonth() + 1) + pad(d.getFullYear() % 100);
    }
    const mm = pad(d.getMinutes());           // zero-padded so HH.M takes the tens digit
    const h = d.getHours();                    // 24h, no leading zero
    if (zoomStatus) zoomStatus.textContent = h + "." + mm + "%";    // HH.MM%  e.g. 11.45%
    if (zoomTitle) zoomTitle.textContent = h + "." + mm[0] + "%";   // HH.M%   e.g. 11.4%
  }
  setReadouts();
  setInterval(setReadouts, 10000);

  /* ---------- Animated name (display only) ----------
     Not editable. Every 5s it deletes back to "LEO" and retypes the other
     form, toggling LEONARDO BENZONI <-> LEO BENZONI. The blinking ::after
     caret rides at the end and sells the typing effect. */
  const nameEl = document.querySelector(".name");
  if (nameEl) {
    // FLOOR = the name + its one trailing space; never deletable. Visitors
    // type/delete freely after it. Deletes that reach into the floor are
    // clamped back to it (so Cmd-backspace and select-all + delete just leave
    // the original name) rather than blocked.
    const FLOOR = nameEl.textContent;            // "LEONARDO BENZONI "
    const FULL = FLOOR.replace(/ +$/, "");  // "LEONARDO BENZONI"
    const TAIL = FLOOR.slice(FULL.length);   // the trailing space (kept so the caret stays put)
    const SHORT = "LEO BENZONI";
    let showingFull = true;

    const setName = (s) => { nameEl.textContent = s; };
    const bareName = () => {
      const t = nameEl.textContent;
      // Strip only the trailing space (TAIL); keep spaces inside the text being
      // animated, e.g. the one in "LEO BENZONI".
      return t.endsWith(TAIL) ? t.slice(0, t.length - TAIL.length) : t.replace(/\s+$/, "");
    };
    const commonLen = (a, b) => {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      return i;
    };
    function animateTo(targetName, done) {
      const common = commonLen(bareName(), targetName);
      const del = () => {
        const c = bareName();
        if (c.length > common) { setName(c.slice(0, -1) + TAIL); setTimeout(del, 45); }
        else typeUp();
      };
      const typeUp = () => {
        const c = bareName();
        if (c.length < targetName.length) { setName(targetName.slice(0, c.length + 1) + TAIL); setTimeout(typeUp, 60); }
        else if (done) done();
      };
      del();
    }
    function loop() {
      animateTo(showingFull ? SHORT : FULL, () => {
        showingFull = !showingFull;
        setTimeout(loop, 5000);
      });
    }
    setTimeout(loop, 5000);
  }

  /* ---------- Cursor-driven window shadow ---------- */
  const win = document.querySelector(".window");
  if (win && window.matchMedia("(pointer: fine)").matches) {
    const MAX = 22;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let raf = 0;
    function apply() {
      raf = 0;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      win.style.setProperty("--sx", ((-(mx - cx) / cx) * MAX).toFixed(1) + "px");
      win.style.setProperty("--sy", ((-(my - cy) / cy) * MAX).toFixed(1) + "px");
    }
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- Gallery / page scroll + tracking scrollbar ----------
     Desktop: the right-half gallery (.work) scrolls (wheel-smoothed). Stacked
     (<=1240px): the whole canvas scrolls as one page. The right-edge scrollbar
     tracks whichever is the active scroller and can be dragged. */
  const work = document.querySelector(".work");
  const canvas = document.querySelector(".canvas");
  const vThumb = document.querySelector(".scroll-v__thumb");
  const vTrack = document.querySelector(".scroll-v");
  const isStacked = () => window.matchMedia("(max-width: 1240px)").matches;
  const scroller = () => (isStacked() ? canvas : work);

  function updateThumb() {
    if (!vThumb || !vTrack) return;
    const sc = scroller();
    if (!sc) return;
    const track = vTrack.clientHeight;
    const ratio = Math.min(1, sc.clientHeight / sc.scrollHeight);
    let thumbH = Math.max(28, Math.round(track * ratio));
    const maxScroll = sc.scrollHeight - sc.clientHeight;
    let top;
    if (maxScroll <= 0) {
      top = 0;
    } else if (sc.scrollTop < 0) {
      // Rubber-band past the top (iOS): pin the thumb to the top edge and shrink
      // it by the overscroll instead of letting it slide out of the rail.
      thumbH = Math.max(14, thumbH + sc.scrollTop);
      top = 0;
    } else if (sc.scrollTop > maxScroll) {
      // Rubber-band past the bottom: keep the thumb's bottom pinned and shrink.
      thumbH = Math.max(14, thumbH - (sc.scrollTop - maxScroll));
      top = track - thumbH;
    } else {
      top = (sc.scrollTop / maxScroll) * (track - thumbH);
    }
    vThumb.style.height = thumbH + "px";
    vThumb.style.top = top + "px";
  }

  // Smooth wheel scrolling for the desktop gallery. When stacked, the canvas
  // scrolls natively so touch + trackpad behave normally.
  let target = work ? work.scrollTop : 0;
  let ticking = false;
  function step() {
    const diff = target - work.scrollTop;
    if (Math.abs(diff) < 0.5) { work.scrollTop = target; ticking = false; return; }
    work.scrollTop += diff * 0.2;
    requestAnimationFrame(step);
  }
  if (work && window.matchMedia("(pointer: fine)").matches) {
    work.addEventListener("wheel", (e) => {
      if (isStacked()) return;
      e.preventDefault();
      const max = work.scrollHeight - work.clientHeight;
      target = Math.max(0, Math.min(max, target + e.deltaY));
      if (!ticking) { ticking = true; requestAnimationFrame(step); }
    }, { passive: false });
  }

  // One scroll handler for the active scroller: keep the thumb in sync, and in
  // fullscreen reveal the title bar when scrolling up. That reveal is the TOUCH
  // exit path only — on mouse/desktop you exit via the cursor-to-top dwell, so
  // it's gated to stacked/coarse-pointer (no bar popping in on desktop scroll).
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  let lastTop = 0;
  function onScroll() {
    const sc = scroller();
    const st = sc ? sc.scrollTop : 0;
    if (!isStacked() && !ticking) target = st;
    if (body.classList.contains("is-full") && (isStacked() || coarsePointer)) {
      if (st <= 0 || st < lastTop - 1) body.classList.add("bar-peek");
      else if (st > lastTop + 1) body.classList.remove("bar-peek");
    }
    lastTop = st;
    updateThumb();
  }
  if (work) work.addEventListener("scroll", onScroll, { passive: true });
  if (canvas) canvas.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateThumb, { passive: true });
  updateThumb();

  /* Drag the scrollbar thumb (or click the track) to scroll the active area. */
  if (vThumb && vTrack && window.matchMedia("(pointer: fine)").matches) {
    let dragging = false, grabOffset = 0;
    function applyDrag(clientY) {
      const sc = scroller(); if (!sc) return;
      const usable = vTrack.clientHeight - vThumb.offsetHeight;
      if (usable <= 0) return;
      let pos = clientY - vTrack.getBoundingClientRect().top - grabOffset;
      pos = Math.max(0, Math.min(usable, pos));
      sc.scrollTop = (pos / usable) * (sc.scrollHeight - sc.clientHeight);
      // Dragging wins over the wheel-smoothing loop: sync its target so step()
      // converges to where you dragged instead of snapping the gallery back.
      if (!isStacked()) target = sc.scrollTop;
      updateThumb();
    }
    vTrack.addEventListener("mousedown", (e) => {
      const tRect = vThumb.getBoundingClientRect();
      const onThumb = e.clientY >= tRect.top && e.clientY <= tRect.bottom;
      grabOffset = onThumb ? e.clientY - tRect.top : vThumb.offsetHeight / 2;
      dragging = true;
      body.classList.add("scrubbing");
      applyDrag(e.clientY);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => { if (dragging) applyDrag(e.clientY); }, { passive: true });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      body.classList.remove("scrubbing");
    });
  }

  /* ---------- Fullscreen (fullscreen light) ----------
     Expands the window, hides the chrome. Cursor to the very top peeks
     the title bar back so you can exit; or press Escape. */
  const fullBtn = document.querySelector(".light--full");
  const exitFull = () => body.classList.remove("is-full", "bar-peek");
  if (fullBtn) {
    fullBtn.addEventListener("click", () => {
      if (body.classList.contains("is-full")) exitFull();
      else body.classList.add("is-full");
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") exitFull(); });

    let armed = false, dwell = 0;
    document.addEventListener("mousemove", (e) => {
      if (!body.classList.contains("is-full")) { armed = false; clearTimeout(dwell); dwell = 0; return; }
      if (e.clientY > 90) { armed = true; clearTimeout(dwell); dwell = 0; body.classList.remove("bar-peek"); }
      else if (e.clientY <= 14 && armed) {
        if (!dwell) dwell = setTimeout(() => { dwell = 0; body.classList.add("bar-peek"); }, 90);
      } else if (e.clientY > 14 && e.clientY <= 90) { clearTimeout(dwell); dwell = 0; }
    }, { passive: true });
  }

  /* ---------- Close → minimize to dock (close light) ----------
     Scales the window down + fades it; a dock auto-hides at the bottom
     and reveals on cursor-to-bottom. The thumbnail reopens it. */
  const closeBtn = document.querySelector(".light--close");
  const dockApp = document.querySelector(".dock__app");
  const touchLike = () => isStacked() || window.matchMedia("(pointer: coarse)").matches;
  let hintTimer = 0;
  function openWindow() {
    body.classList.remove("is-closed", "dock-peek", "hint-show");
    clearTimeout(hintTimer);
  }
  function closeWindow() {
    body.classList.add("is-closed");
    body.classList.remove("is-full", "bar-peek", "dock-peek");
    clearTimeout(hintTimer);
    // Desktop: the cursor hint fades in a few seconds after closing. Touch: the
    // screen stays bare (just the message) until a tap brings the dock up.
    if (!touchLike()) {
      hintTimer = setTimeout(() => body.classList.add("hint-show"), 5000);
    }
  }
  if (closeBtn) closeBtn.addEventListener("click", closeWindow);
  if (dockApp) dockApp.addEventListener("click", openWindow);
  // Touch: when closed the screen is bare; a tap anywhere brings the dock up,
  // then a tap on the dock reopens. Exclude the closing tap (inside the window)
  // and the dock's own tap so neither double-triggers.
  document.addEventListener("click", (e) => {
    if (!touchLike() || !body.classList.contains("is-closed")) return;
    if (e.target.closest(".window") || e.target.closest(".dock")) return;
    body.classList.add("dock-peek");
  });
  /* Dock reveals fast and over a generous zone — the whole window is gone
     when closed, so there's no reason to make it precise/slow. */
  let dArmed = false;
  document.addEventListener("mousemove", (e) => {
    if (!body.classList.contains("is-closed")) { dArmed = false; return; }
    const fromBottom = window.innerHeight - e.clientY;
    if (fromBottom > 110) { dArmed = true; body.classList.remove("dock-peek"); }
    else if (fromBottom <= 44 && dArmed) { body.classList.add("dock-peek"); }
  }, { passive: true });

  /* ---------- Gallery: auto-load cms/ + 2-col masonry + placeholder floor ----------
     Files dropped in cms/ are picked up by number (01, 02, ...; stops at the first
     missing number). Real items fill from the top; grey placeholders pad up to MIN.
     Images/video keep their natural aspect and pack into the shorter column (one
     column on phones). Drop a file, refresh — it appears. */
  (function gallery() {
    if (!work) return;
    const MIN = 10, MAX_PROBE = 60, GAP = 12, PH = 313 / 321; // PH = placeholder w/h
    const EXTS = ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"];
    const VIDEO = new Set(["mp4", "webm"]);
    const oneCol = () => window.matchMedia("(max-width: 640px)").matches;
    let TILES = [];

    // Expose the discovered media list so the load overlay knows what's coming.
    let _resolveItems;
    window.__leoItemsReady = new Promise((r) => { _resolveItems = r; });

    /* ---- Content gate ----
       The load overlay waits on these gating assets. Each is fetched ONCE via a
       streaming reader (real byte progress), turned into a blob the gallery tile
       then renders — so there is a single download per asset and the bar tracks
       true bytes on the wire (weighted by size, monotonic). The gate clears only
       once a gating asset is fully downloaded; the bytes are then local, so the
       tile paints instantly and nothing pops in or rebuffers after the open. */
    const GATE_MAX = 6;            // gate the first screenful; rest warms after
    const gateAssets = [];
    let _pending = 0, _sealed = false, _lastP = 0, _progressCb = null, _resolveReady;
    const _ready = new Promise((r) => { _resolveReady = r; });
    function _report() {
      const live = gateAssets.filter((a) => !a.dropped);
      const W = live.reduce((s, a) => s + a.weight, 0);
      const p = W ? live.reduce((s, a) => s + a.weight * a.frac, 0) / W : 1;
      _lastP = Math.max(_lastP, p);                 // never go backwards
      if (_progressCb) _progressCb(_lastP);
    }
    function _check() { if (_sealed && _pending <= 0) { _report(); _resolveReady(); } }
    window.__leoContent = {
      ready: _ready,
      onProgress(cb) { _progressCb = cb; cb(_lastP); },
    };

    function gateLoad(tile, item) {
      const isVid = item.type === "video";
      const a = { weight: item.bytes || (isVid ? 3e6 : 2e5), frac: 0, done: false, dropped: false };
      gateAssets.push(a); _pending++;
      // Stall watchdog: a slow-but-progressing download waits as long as it needs;
      // only a genuinely dead asset (no bytes for STALL ms) is dropped. No fixed
      // time cap — that would cut off a heavy asset on a slow connection.
      const STALL = 10000;
      let stall = setTimeout(drop, STALL);
      function bump() { clearTimeout(stall); stall = setTimeout(drop, STALL); }
      function drop() { if (a.done || a.dropped) return; clearTimeout(stall); a.dropped = true; _pending--; _report(); _check(); }
      function settle() { if (a.done || a.dropped) return; clearTimeout(stall); a.done = true; a.frac = 1; _pending--; _report(); _check(); }

      (async () => {
        let res;
        try { res = await fetch(item.url); if (!res.ok || !res.body) throw 0; } catch (e) { return drop(); }
        const total = +res.headers.get("content-length") || a.weight;
        const reader = res.body.getReader();
        const chunks = [];
        let loaded = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value); loaded += value.length;
            a.frac = Math.min(0.99, loaded / total);   // real bytes on the wire
            _report(); bump();                         // bytes arriving — reset the watchdog
          }
        } catch (e) { return drop(); }
        // All bytes are in — the asset is fully downloaded. Hand the blob to the
        // real tile (single download, no second request) and settle: it renders
        // from local memory, so there is nothing left to wait on and nothing can
        // pop in. (Decode finishes well within the scale-grow before content paints.)
        const url = URL.createObjectURL(new Blob(chunks, isVid ? { type: "video/mp4" } : undefined));
        const el = tile.querySelector(isVid ? "video" : "img");
        if (el) { if (!isVid) el.loading = "eager"; el.src = url; }
        settle();
      })();
    }

    function makeTile(item, gate) {
      const tile = document.createElement("div");
      tile.className = "work__tile " + (item ? "work__tile--media" : "work__tile--ph");
      tile._aspect = PH;
      if (item) {
        let el;
        if (item.type === "video") {
          el = document.createElement("video");
          // No autoplay: the loader starts playback after the window opens, so it
          // can't rebuffer in view on a slow link.
          el.muted = true; el.loop = true; el.preload = "auto";
          el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
        } else {
          el = document.createElement("img");
          el.loading = "lazy"; el.alt = "";
        }
        if (!gate) el.src = item.url;   // gating tiles get a blob src from gateLoad
        tile.appendChild(el);
      }
      return tile;
    }

    function aspectOf(tile, item) {
      return new Promise((res) => {
        if (!item) return res(PH);
        const ok = (w, h) => res(w && h ? w / h : PH);
        if (item.type === "video") {
          const v = tile.querySelector("video");
          if (v.videoWidth) return ok(v.videoWidth, v.videoHeight);
          v.addEventListener("loadedmetadata", () => ok(v.videoWidth, v.videoHeight), { once: true });
          v.addEventListener("error", () => res(PH), { once: true });
        } else {
          const im = tile.querySelector("img");
          if (im.complete && im.naturalWidth) return ok(im.naturalWidth, im.naturalHeight);
          im.addEventListener("load", () => ok(im.naturalWidth, im.naturalHeight), { once: true });
          im.addEventListener("error", () => res(PH), { once: true });
        }
      });
    }

    // Static shortest-column masonry: distribute tiles into 1–2 flex columns by
    // running height (the shorter column gets the next tile). Tiles keep their
    // natural aspect; CSS stacks them within each column. (The click-to-expand
    // version is parked on the `gallery-expand` branch.)
    function pack() {
      work.innerHTML = "";
      const n = oneCol() ? 1 : 2;
      const cols = [], h = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElement("div");
        c.className = "work__col";
        work.appendChild(c); cols.push(c); h.push(0);
      }
      const colW = cols[0].clientWidth || 1;
      TILES.forEach((t) => {
        let s = 0;
        for (let c = 1; c < n; c++) if (h[c] < h[s]) s = c;
        cols[s].appendChild(t);
        h[s] += colW / (t._aspect || PH) + GAP;
      });
      updateThumb();
    }

    function render(items) {
      const total = Math.max(MIN, items.length);
      TILES = [];
      for (let i = 0; i < total; i++) {
        const item = i < items.length ? items[i] : null;
        const gating = !!item && i < GATE_MAX;
        const tile = makeTile(item, gating);
        if (gating) gateLoad(tile, item);    // fetch -> blob -> tile (single download)
        TILES.push(tile);
      }
      if (items.length) _sealed = true;      // the gating set is now known
      pack(); // place immediately; re-pack once real media reports its size
      _check();                              // in case everything was already cached
      Promise.all(TILES.map((t, i) =>
        aspectOf(t, i < items.length ? items[i] : null).then((a) => { t._aspect = a; })
      )).then(pack);
    }

    async function probe(n) {
      const num = String(n).padStart(2, "0");
      for (const ext of EXTS) {
        const url = "cms/" + num + "." + ext;
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok) return { url: url, type: VIDEO.has(ext) ? "video" : "image", bytes: +(r.headers.get("content-length") || 0) };
        } catch (e) {}
      }
      return null;
    }

    render([]); // instant placeholders (no empty flash)
    (async () => {
      const items = [];
      for (let n = 1; n <= MAX_PROBE; n++) {
        const it = await probe(n);
        if (!it) break;
        items.push(it);
      }
      _resolveItems(items);
      if (items.length) render(items);
      else _resolveReady();         // nothing to gate — let the overlay open
    })();

    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(pack, 150); }, { passive: true });
  })();

  /* ---------- Load animation — content-gated old-Mac "opening" ----------
     A blank overlay + Photoshop progress bar holds while the gallery's media
     ACTUALLY loads (window.__leoContent), then the window grows up from the
     dock — empty — and the content paints in. Progress is real (driven by load
     events, weighted by byte size), never a timer. The dev panel (localhost)
     toggles the animation off and replays it.                                  */
  (function loader() {
    const overlay = document.getElementById("loader");
    if (!overlay) return;
    const KEY = "leo-anim";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fill = overlay.querySelector(".loader__fill");
    const fileLabel = overlay.querySelector(".loader__file");
    const status = overlay.querySelector(".loader__status");
    let animOff = localStorage.getItem(KEY) === "off";
    const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let opened = false;

    function playVideos() {
      document.querySelectorAll(".work video").forEach((v) => { const p = v.play && v.play(); if (p) p.catch(() => {}); });
    }
    function paint() { body.classList.add("content-paint"); playVideos(); }
    function snap() {        // reveal with no scale-grow (off / reduced-motion / bfcache)
      opened = true;
      body.classList.remove("is-loading", "is-opening", "is-scanning");
      body.classList.add("loaded", "content-paint");
      playVideos();
    }

    function setBar(p) {
      p = Math.min(1, Math.max(0, p));
      if (fill) fill.style.width = (p * 100).toFixed(1) + "%";
      if (status && !opened) status.textContent = "loading… " + Math.round(p * 100) + "%";
    }

    function open() {
      if (opened) return;
      opened = true;
      body.classList.remove("is-scanning");
      if (fill) fill.style.width = "100%";
      if (status) status.textContent = "opening";
      if (animOff || reduce) { snap(); return; }

      body.classList.add("is-opening");
      body.classList.remove("is-loading");

      // Paint the content AFTER the grow: earliest of the window's transform
      // transitionend / a fallback timer / a scroll — never transitionend alone
      // (a throttled or backgrounded tab may never fire it -> empty window).
      let painted = false;
      const doPaint = () => { if (painted) return; painted = true; paint(); };
      const onEnd = (e) => { if (e.propertyName === "transform") { win.removeEventListener("transitionend", onEnd); doPaint(); } };
      win.addEventListener("transitionend", onEnd);
      setTimeout(doPaint, 880);
      window.addEventListener("scroll", doPaint, { once: true, passive: true });

      setTimeout(() => { body.classList.remove("is-opening"); body.classList.add("loaded"); }, 900);
    }

    async function start() {
      if (fileLabel && fileDate) fileLabel.textContent = (fileDate.textContent || "img000000") + ".jpg";
      // Dev "off": skip the overlay entirely (fast iteration). Production never sets it.
      if (animOff) { snap(); return; }

      // Discovery: indeterminate sweep until we know what's in cms/.
      body.classList.add("is-scanning");
      if (status) status.textContent = "scanning…";
      const DISCOVERY_CAP = 12000;   // a hung HEAD probe shouldn't trap discovery
      const items = await Promise.race([window.__leoItemsReady || Promise.resolve([]), wait(DISCOVERY_CAP).then(() => [])]);
      body.classList.remove("is-scanning");

      const content = window.__leoContent;
      if (!content || !items.length) { setBar(1); return open(); }

      content.onProgress(setBar);
      await content.ready;   // opens only when the media is truly loaded — each asset
      open();                // settles, or (if dead) is dropped by its stall watchdog
    }

    function replay() {
      opened = false;
      body.classList.remove("loaded", "is-opening", "content-paint");
      if (fill) fill.style.width = "100%";
      if (status) status.textContent = "opening";
      body.classList.add("is-loading");
      void overlay.offsetWidth;          // restart transitions
      setTimeout(open, 180);             // assets are cached — replay just the motion
    }

    // Back/forward cache: a restored page is already fully loaded — never re-trap it.
    window.addEventListener("pageshow", (e) => { if (e.persisted) snap(); });

    // Dev panel — localhost only, never ships to leobenzoni.com.
    if (isLocal) {
      const panel = document.createElement("div");
      panel.className = "devpanel";
      panel.innerHTML = '<span class="devpanel__title">LOAD</span>' +
        '<button data-s="on">on</button><button data-s="off">off</button>' +
        '<button class="devpanel__replay" data-s="replay">replay</button>';
      const mark = () => {
        panel.querySelector('button[data-s="on"]').classList.toggle("is-on", !animOff);
        panel.querySelector('button[data-s="off"]').classList.toggle("is-on", animOff);
      };
      panel.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.s === "replay") { animOff = false; localStorage.removeItem(KEY); mark(); return replay(); }
        animOff = b.dataset.s === "off";
        if (animOff) { localStorage.setItem(KEY, "off"); snap(); } else { localStorage.removeItem(KEY); replay(); }
        mark();
      });
      document.body.appendChild(panel);
      mark();
    }

    start();
  })();
})();
