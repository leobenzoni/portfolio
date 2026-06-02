/* ============================================================
   leonardo benzoni — retro UI script
   Photoshop-window chrome. Light/dark toggle (middle traffic light),
   editable name, live filename date (img + DDMMYY), cursor-driven
   window shadow, smooth-scroll gallery.
   ============================================================ */

(function () {
  /* ---------- Theme (dark mode) ----------
     Toggled by the middle traffic light; persisted in localStorage.
     Applied early so a saved dark theme doesn't flash light. */
  const THEME_KEY = "lb-theme";
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
  }
  const toggle = document.querySelector(".light--toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark");
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    });
  }

  /* ---------- Filename date ----------
     The title reads "img<DDMMYY>.jpg" — the date is live (day-month-year,
     no time). Set once on load; it only changes by the day. */
  const fileDate = document.getElementById("filedate");
  if (fileDate) {
    const d = new Date();
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    const stamp = pad(d.getDate()) + pad(d.getMonth() + 1) + pad(d.getFullYear() % 100);
    fileDate.textContent = "img" + stamp;
  }

  /* ---------- Editable name ----------
     Native caret hidden (CSS); the blinking ::after stroke is the only
     cursor and lives at the end of the line, so typing is pinned to the
     end — focus/click jump there and arrow keys are blocked. Single line,
     plain-text paste. */
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

  /* ---------- Cursor-driven window shadow ----------
     The cursor acts as a light source; the window casts opposite. Subtle. */
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
      const sx = (-(mx - cx) / cx) * MAX;
      const sy = (-(my - cy) / cy) * MAX;
      win.style.setProperty("--sx", sx.toFixed(1) + "px");
      win.style.setProperty("--sy", sy.toFixed(1) + "px");
    }
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- Smooth-scroll gallery ----------
     Eases wheel input toward a target. Fine pointers only. */
  const work = document.querySelector(".work");
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
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(step);
      }
    }, { passive: false });
    work.addEventListener("scroll", () => {
      if (!ticking) target = work.scrollTop;
    }, { passive: true });
  }
})();
