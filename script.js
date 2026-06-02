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

  /* ---------- Filename date (live) ----------
     Title reads "img<DDMMYY>.jpg" — day-month-year, no time. Refreshed
     on an interval so it rolls over at midnight if left open. */
  const fileDate = document.getElementById("filedate");
  if (fileDate) {
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    const setDate = () => {
      const d = new Date();
      fileDate.textContent =
        "img" + pad(d.getDate()) + pad(d.getMonth() + 1) + pad(d.getFullYear() % 100);
    };
    setDate();
    setInterval(setDate, 30000);
  }

  /* ---------- Editable name ----------
     Native caret hidden; the blinking ::after stroke is the only cursor
     and is pinned to the end (focus/click jump there, arrows blocked).
     Single line, plain-text paste. */
  const nameEl = document.querySelector(".name");
  if (nameEl) {
    const caretToEnd = () => {
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };
    const NAV_KEYS = new Set([
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
    ]);
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || NAV_KEYS.has(e.key)) e.preventDefault();
    });
    nameEl.addEventListener("focus", () => requestAnimationFrame(caretToEnd));
    nameEl.addEventListener("click", caretToEnd);
    nameEl.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, text.replace(/\s+/g, " "));
    });
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

  /* ---------- Gallery: smooth scroll + tracking scrollbar ----------
     The visible right-edge scrollbar mirrors the gallery's scroll
     (Photoshop-style); the gallery's own scrollbar is hidden in CSS. */
  const work = document.querySelector(".work");
  const vThumb = document.querySelector(".scroll-v__thumb");
  const vTrack = document.querySelector(".scroll-v");

  function updateThumb() {
    if (!work || !vThumb || !vTrack) return;
    const track = vTrack.clientHeight - 4; // 2px inset top + bottom
    const ratio = Math.min(1, work.clientHeight / work.scrollHeight);
    const thumbH = Math.max(28, Math.round(track * ratio));
    const maxScroll = work.scrollHeight - work.clientHeight;
    const pos = maxScroll > 0 ? (work.scrollTop / maxScroll) * (track - thumbH) : 0;
    vThumb.style.height = thumbH + "px";
    vThumb.style.top = (2 + pos) + "px";
  }

  if (work && window.matchMedia("(pointer: fine)").matches) {
    let target = work.scrollTop;
    let ticking = false;
    function step() {
      const diff = target - work.scrollTop;
      if (Math.abs(diff) < 0.5) {
        work.scrollTop = target;
        ticking = false;
        return;
      }
      work.scrollTop += diff * 0.2;
      requestAnimationFrame(step);
    }
    work.addEventListener("wheel", (e) => {
      e.preventDefault();
      const max = work.scrollHeight - work.clientHeight;
      target = Math.max(0, Math.min(max, target + e.deltaY));
      if (!ticking) { ticking = true; requestAnimationFrame(step); }
    }, { passive: false });
    work.addEventListener("scroll", () => {
      if (!ticking) target = work.scrollTop;
      updateThumb();
    }, { passive: true });
  }
  window.addEventListener("resize", updateThumb, { passive: true });
  updateThumb();

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
      if (e.clientY > 80) { armed = true; clearTimeout(dwell); dwell = 0; body.classList.remove("bar-peek"); }
      else if (e.clientY <= 3 && armed) {
        if (!dwell) dwell = setTimeout(() => { dwell = 0; body.classList.add("bar-peek"); }, 200);
      } else if (e.clientY > 3 && e.clientY <= 80) { clearTimeout(dwell); dwell = 0; }
    }, { passive: true });
  }

  /* ---------- Close → minimize to dock (close light) ----------
     Scales the window down + fades it; a dock auto-hides at the bottom
     and reveals on cursor-to-bottom. The thumbnail reopens it. */
  const closeBtn = document.querySelector(".light--close");
  const dockApp = document.querySelector(".dock__app");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      body.classList.add("is-closed");
      body.classList.remove("is-full", "bar-peek");
    });
  }
  if (dockApp) {
    dockApp.addEventListener("click", () => body.classList.remove("is-closed", "dock-peek"));
  }
  let dArmed = false, dDwell = 0;
  document.addEventListener("mousemove", (e) => {
    if (!body.classList.contains("is-closed")) { dArmed = false; clearTimeout(dDwell); dDwell = 0; return; }
    const fromBottom = window.innerHeight - e.clientY;
    if (fromBottom > 80) { dArmed = true; clearTimeout(dDwell); dDwell = 0; body.classList.remove("dock-peek"); }
    else if (fromBottom <= 3 && dArmed) {
      if (!dDwell) dDwell = setTimeout(() => { dDwell = 0; body.classList.add("dock-peek"); }, 200);
    } else if (fromBottom > 3 && fromBottom <= 80) { clearTimeout(dDwell); dDwell = 0; }
  }, { passive: true });
})();
