/* ============================================================
   leonardo benzoni — retro UI script
   Photoshop-window chrome: light/dark (middle light), live filename
   date, editable name, cursor-driven shadow, smooth-scroll gallery
   with a tracking scrollbar, fullscreen, and close-to-dock.
   ============================================================ */

(function () {
  const body = document.body;

  /* ---------- Theme (dark mode) ----------
     Middle traffic light. Persisted; applied early to avoid a flash. */
  const THEME_KEY = "lb-theme";
  if (localStorage.getItem(THEME_KEY) === "dark") body.classList.add("dark");
  const toggle = document.querySelector(".light--toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const dark = body.classList.toggle("dark");
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    });
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
    const thumbH = Math.max(28, Math.round(track * ratio));
    const maxScroll = sc.scrollHeight - sc.clientHeight;
    const pos = maxScroll > 0 ? (sc.scrollTop / maxScroll) * (track - thumbH) : 0;
    vThumb.style.height = thumbH + "px";
    vThumb.style.top = pos + "px";
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
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let TILES = [], grid = null, openIndex = null, scrollBefore = 0;

    function makeTile(item) {
      const tile = document.createElement("div");
      tile.className = "work__tile " + (item ? "work__tile--media" : "work__tile--ph");
      tile._aspect = PH;
      if (item) {
        let el;
        if (item.type === "video") {
          el = document.createElement("video");
          el.muted = true; el.loop = true; el.autoplay = true;
          el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
        } else {
          el = document.createElement("img");
          el.loading = "lazy"; el.alt = "";
        }
        el.src = item.url;
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

    // Column geometry for the current width.
    function metrics() {
      const n = oneCol() ? 1 : 2;
      const gridW = grid ? grid.clientWidth : work.clientWidth;
      const colW = n === 1 ? gridW : (gridW - GAP) / 2;
      return { n, gridW, colW };
    }
    const tileH = (t, colW) => Math.round(colW / (t._aspect || PH));

    // Per-tile box size. Depends only on column width + aspect, so it changes on
    // resize but NOT on open/close — which is why an open tile can grow purely by
    // transform: scale (no width/height thrash, no image distortion).
    function sizeTiles() {
      const { colW } = metrics();
      TILES.forEach((t) => { t.style.width = colW + "px"; t.style.height = tileH(t, colW) + "px"; });
    }

    // Masonry layout. openIdx null = plain 2-col pack. With a tile open: tiles
    // before it keep their slots, the open one spans full width on a band below
    // them, everything after reflows into 2 cols beneath it.
    function computeLayout(openIdx) {
      const { n, gridW, colW } = metrics();
      const L = new Array(TILES.length);
      const place = (i, h) => {
        let s = 0;
        for (let c = 1; c < n; c++) if (h[c] < h[s]) s = c;
        L[i] = { x: s * (colW + GAP), y: h[s], scale: 1 };
        h[s] += tileH(TILES[i], colW) + GAP;
      };
      const h = new Array(n).fill(0);
      const prefixEnd = openIdx == null ? TILES.length : openIdx;
      for (let i = 0; i < prefixEnd; i++) place(i, h);
      if (openIdx == null) { L._gridH = Math.max(0, Math.max(...h) - GAP); return L; }
      const bandTop = Math.max(...h);
      const openVisH = Math.round(gridW / (TILES[openIdx]._aspect || PH));
      L[openIdx] = { x: 0, y: bandTop, scale: gridW / colW, open: true };
      const h2 = new Array(n).fill(bandTop + openVisH + GAP);
      for (let i = openIdx + 1; i < TILES.length; i++) place(i, h2);
      L._bandTop = bandTop;
      L._gridH = Math.max(bandTop + openVisH, Math.max(...h2) - GAP);
      return L;
    }

    function apply(L, animate) {
      if (animate) { grid.classList.add("is-animating"); void grid.offsetHeight; }
      else grid.classList.remove("is-animating");
      TILES.forEach((t, i) => {
        const l = L[i];
        t.style.transform = "translate(" + l.x + "px," + l.y + "px)" + (l.scale !== 1 ? " scale(" + l.scale + ")" : "");
        t.classList.toggle("is-open", !!l.open);
      });
      grid.style.height = L._gridH + "px";
      updateThumb();
    }

    function relayout(animate) {
      sizeTiles();
      const L = computeLayout(openIndex);
      apply(L, animate);
      return L;
    }

    // Scroll position that puts the open tile's band flush at the top of the
    // gallery, so the tiles above it sit just out of view (no peeking sliver).
    // You can still scroll up to them — the band isn't locked.
    function bandToScroll(bandTop) {
      const g = grid.getBoundingClientRect(), s = work.getBoundingClientRect();
      const gridTop = work.scrollTop + (g.top - s.top);
      return clamp(gridTop + bandTop, 0, work.scrollHeight - work.clientHeight);
    }
    // Smooth-scroll the gallery to `top` (reuses the wheel-smoothing loop).
    function glideTo(top) {
      target = top;
      if (!ticking) { ticking = true; requestAnimationFrame(step); }
    }

    function openTile(k) {
      if (openIndex === null) scrollBefore = work.scrollTop;  // remember where to return on close
      openIndex = k;
      const L = relayout(true);
      glideTo(bandToScroll(L._bandTop || 0));                 // bring the open tile to the top
    }
    function closeTile() {
      openIndex = null;
      relayout(true);
      glideTo(scrollBefore);                                  // back to the exact pre-open position
    }

    function render(items) {
      const total = Math.max(MIN, items.length);
      TILES = [];
      openIndex = null;
      grid = document.createElement("div");
      grid.className = "work__grid";
      for (let i = 0; i < total; i++) {
        const t = makeTile(i < items.length ? items[i] : null);
        TILES.push(t); grid.appendChild(t);
      }
      work.innerHTML = "";
      work.appendChild(grid);
      relayout(false); // place instantly; re-pack once real media reports its size
      Promise.all(TILES.map((t, i) =>
        aspectOf(t, i < items.length ? items[i] : null).then((a) => { t._aspect = a; })
      )).then(() => relayout(false));
    }

    // Click a tile to expand — desktop only (mouse + the split layout). Touch /
    // stacked layouts skip it: tiles are already large there and it ran laggy.
    // Click it again, or another tile, to swap/close. One open at a time.
    // Delegated on .work so it survives the grid being rebuilt when cms/ loads.
    const canExpand = () => !isStacked() && window.matchMedia("(pointer: fine)").matches;
    work.addEventListener("click", (e) => {
      if (!canExpand()) return;
      const tile = e.target.closest(".work__tile");
      if (!tile) return;
      const k = TILES.indexOf(tile);
      if (k < 0) return;
      if (k === openIndex) closeTile(); else openTile(k);
    });

    async function exists(url) {
      try { return (await fetch(url, { method: "HEAD" })).ok; } catch (e) { return false; }
    }
    async function probe(n) {
      const num = String(n).padStart(2, "0");
      for (const ext of EXTS) {
        const url = "cms/" + num + "." + ext;
        if (await exists(url)) return { url: url, type: VIDEO.has(ext) ? "video" : "image" };
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
      if (items.length) render(items);
    })();

    let rt = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        openIndex = null;
        relayout(false);
      }, 150);
    }, { passive: true });
  })();
})();
