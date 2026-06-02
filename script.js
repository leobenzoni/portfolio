/* ============================================================
   leonardo benzoni — script
   Live clock with subtle digit-flip animation.
   Format: DDMMYYHHMM (e.g. 0206260928)
   ============================================================ */

(function () {
  /* ---------- Theme (dark mode) ----------
     Applied first so a saved dark theme doesn't flash light on load.
     Toggled by the moon icon, persisted in localStorage. */
  const THEME_KEY = "lb-theme";
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
  }
  const moonBtn = document.querySelector(".icon-btn--moon");
  if (moonBtn) {
    moonBtn.addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark");
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    });
  }

  /* ---------- Editable name ----------
     Single line only; paste arrives as plain text. Uppercase + the
     width cap are handled in CSS. The native caret is hidden (CSS);
     the blinking stroke is the only cursor, and it lives at the end of
     the line (it's a ::after). So we pin the real caret to the end too
     — focus/click jump there and arrow keys are blocked — keeping the
     visible stroke and the insertion point in sync. */
  const nameEl = document.querySelector(".identity__name");
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
    // Defer on focus so it lands after the browser's own caret placement
    // (which would otherwise drop the caret at the start). Click fires
    // after placement already, so it can run straight away.
    nameEl.addEventListener("focus", () => requestAnimationFrame(caretToEnd));
    nameEl.addEventListener("click", caretToEnd);
    nameEl.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, text.replace(/\s+/g, " "));
    });
  }

  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  // Build 10 digit columns. Each column has a strip of 0-9 stacked
  // vertically; we translateY to expose the current digit. When the
  // digit changes, the strip animates downward (top → bottom).
  const NUM_DIGITS = 10;
  const digitNodes = [];

  for (let i = 0; i < NUM_DIGITS; i++) {
    const col = document.createElement("span");
    col.className = "clock__digit";

    const strip = document.createElement("span");
    strip.className = "clock__strip";
    for (let n = 0; n < 10; n++) {
      const cell = document.createElement("span");
      cell.textContent = String(n);
      strip.appendChild(cell);
    }
    col.appendChild(strip);
    clockEl.appendChild(col);

    digitNodes.push({ strip, current: null });
  }

  // Pin each column to the real tabular digit advance. `ch` (the "0"
  // advance) runs wider than the tabular figure in SF Pro, leaving
  // dead space between digits; measuring the actual font kills it.
  (function setDigitWidth() {
    const probe = document.createElement("span");
    const cs = getComputedStyle(clockEl);
    probe.style.cssText =
      "position:absolute;visibility:hidden;white-space:pre;" +
      "font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1;";
    probe.style.font = cs.font;
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontSize = cs.fontSize;
    probe.textContent = "0000000000";
    clockEl.appendChild(probe);
    const advance = probe.getBoundingClientRect().width / 10;
    clockEl.removeChild(probe);
    if (advance > 0) {
      clockEl.style.setProperty("--digit-w", advance.toFixed(3) + "px");
    }
  })();

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatNow() {
    const d = new Date();
    const DD = pad2(d.getDate());
    const MM = pad2(d.getMonth() + 1);
    const YY = pad2(d.getFullYear() % 100);
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return (DD + MM + YY + hh + mm).split("");
  }

  function render(initial) {
    const digits = formatNow();
    for (let i = 0; i < NUM_DIGITS; i++) {
      const n = parseInt(digits[i], 10);
      const node = digitNodes[i];
      if (node.current === n) continue;
      node.current = n;
      // No transition on first paint — snap into place.
      if (initial) {
        const prevTransition = node.strip.style.transition;
        node.strip.style.transition = "none";
        node.strip.style.transform = `translateY(${-n}em)`;
        // Force reflow so the next assignment animates normally.
        // eslint-disable-next-line no-unused-expressions
        node.strip.offsetHeight;
        node.strip.style.transition = prevTransition;
      } else {
        node.strip.style.transform = `translateY(${-n}em)`;
      }
    }
  }

  render(true);
  // Tick every second so the clock feels alive; only changed digits
  // animate (the diff is guarded above).
  setInterval(() => render(false), 1000);

  /* ----------------------------------------------------------
     Cursor-driven shadow.
     The cursor acts as the light source: when it's top-left,
     the window casts its shadow toward the bottom-right (and
     vice versa). Kept very subtle — max ~14px offset.
     ---------------------------------------------------------- */
  const win = document.querySelector(".window");
  if (win && window.matchMedia("(pointer: fine)").matches) {
    const MAX = 24;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let raf = 0;

    function applyShadow() {
      raf = 0;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      // shadow casts opposite to the cursor
      const sx = (-(mx - cx) / cx) * MAX;
      const sy = (-(my - cy) / cy) * MAX;
      win.style.setProperty("--sx", sx.toFixed(1) + "px");
      win.style.setProperty("--sy", sy.toFixed(1) + "px");
    }

    window.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!raf) raf = requestAnimationFrame(applyShadow);
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------
     Fullscreen toggle (macOS-style).
     The icon expands the window to fill the viewport edge-to-edge
     and hides the title bar. Moving the cursor to the top peeks
     the bar back down; clicking the icon there (or Escape) exits.
     In-page expand, not the browser Fullscreen API.
     ---------------------------------------------------------- */
  const body = document.body;
  const fullBtn = document.querySelector('.icon-btn[aria-label="fullscreen"]');

  function exitFull() {
    body.classList.remove("is-full", "bar-peek");
  }

  if (fullBtn) {
    fullBtn.addEventListener("click", () => {
      if (body.classList.contains("is-full")) exitFull();
      else body.classList.add("is-full");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") exitFull();
    });

    // Peek the bar like the real macOS menu bar: the cursor has to
    // reach the very top edge and dwell there briefly before it slides
    // in. peekArmed stops it re-summoning right after you enter
    // fullscreen (cursor still up top on the icon).
    let peekArmed = false;
    let dwell = 0;
    document.addEventListener(
      "mousemove",
      (e) => {
        if (!body.classList.contains("is-full")) {
          peekArmed = false;
          clearTimeout(dwell);
          return;
        }
        if (e.clientY > 80) {
          // moved away from the top → arm, and hide the bar
          peekArmed = true;
          clearTimeout(dwell);
          body.classList.remove("bar-peek");
        } else if (e.clientY <= 3 && peekArmed) {
          // at the very edge → wait a beat, then reveal
          if (!dwell) {
            dwell = setTimeout(() => {
              dwell = 0;
              body.classList.add("bar-peek");
            }, 200);
          }
        } else if (e.clientY > 3 && e.clientY <= 80) {
          // between edge and the hide line → cancel a pending reveal
          clearTimeout(dwell);
          dwell = 0;
        }
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------
     Close → minimize to dock.
     The close icon scales the window down and fades it; a dock
     auto-hides at the bottom and reveals when the cursor reaches
     the bottom edge (short dwell). The thumbnail reopens it.
     ---------------------------------------------------------- */
  const closeBtn = document.querySelector('.icon-btn[aria-label="close"]');
  const dockApp = document.querySelector(".dock__app");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      body.classList.add("is-closed");
      body.classList.remove("is-full", "bar-peek");
    });
  }
  if (dockApp) {
    dockApp.addEventListener("click", () => {
      body.classList.remove("is-closed", "dock-peek");
    });
  }

  let dockArmed = false;
  let dockDwell = 0;
  document.addEventListener(
    "mousemove",
    (e) => {
      if (!body.classList.contains("is-closed")) {
        dockArmed = false;
        clearTimeout(dockDwell);
        dockDwell = 0;
        return;
      }
      const fromBottom = window.innerHeight - e.clientY;
      if (fromBottom > 80) {
        dockArmed = true;
        clearTimeout(dockDwell);
        dockDwell = 0;
        body.classList.remove("dock-peek");
      } else if (fromBottom <= 3 && dockArmed) {
        if (!dockDwell) {
          dockDwell = setTimeout(() => {
            dockDwell = 0;
            body.classList.add("dock-peek");
          }, 200);
        }
      } else if (fromBottom > 3 && fromBottom <= 80) {
        clearTimeout(dockDwell);
        dockDwell = 0;
      }
    },
    { passive: true }
  );

  /* ----------------------------------------------------------
     Subtle smooth scrolling for the gallery.
     Eases wheel input toward a target scroll position. Fine
     pointers only. Lerp 0.2 = responsive, not floaty.
     ---------------------------------------------------------- */
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

    work.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const max = work.scrollHeight - work.clientHeight;
        target = Math.max(0, Math.min(max, target + e.deltaY));
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(step);
        }
      },
      { passive: false }
    );

    // Resync if anything else moves the scroll position.
    work.addEventListener(
      "scroll",
      () => {
        if (!ticking) target = work.scrollTop;
      },
      { passive: true }
    );
  }
})();
