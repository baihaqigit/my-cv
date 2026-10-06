document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  /* ---------- Theme toggle (remembers choice) ---------- */
  const themeBtn = document.getElementById("themeToggle");

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1418" : "#0B6E5B");
  };

  let savedTheme = null;
  try { savedTheme = localStorage.getItem("theme"); } catch (e) { /* storage unavailable */ }
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (systemDark ? "dark" : "light"));

  themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.getElementById("menuToggle");
  const nav = document.getElementById("siteNav");

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Smooth scroll for in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- Scroll progress bar ---------- */
  const bar = document.getElementById("progressBar");
  let ticking = false;

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + "%";
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });
  updateProgress();

  /* ---------- Highlight current section in the nav ---------- */
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => {
        const active = a.getAttribute("href") === "#" + entry.target.id;
        a.classList.toggle("is-active", active);
        if (active) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- Ledger count-up ---------- */
  const ledger = document.getElementById("ledger");
  const counters = [...ledger.querySelectorAll("[data-count]")];

  const formatValue = (el, value) => {
    const decimals = Number(el.dataset.decimals || 0);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const text = el.dataset.format
      ? Math.round(value).toLocaleString("en-US")
      : value.toFixed(decimals);
    return prefix + text + suffix;
  };

  const runCounters = () => {
    if (prefersReducedMotion) {
      counters.forEach((el) => { el.textContent = formatValue(el, Number(el.dataset.count)); });
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach((el) => {
        el.textContent = formatValue(el, Number(el.dataset.count) * eased);
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  counters.forEach((el) => { el.textContent = formatValue(el, 0); });
  const ledgerObserver = new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      runCounters();
      obs.disconnect();
    }
  }, { threshold: 0.4 });
  ledgerObserver.observe(ledger);

  /* ---------- Experience accordion ---------- */
  const jobHeads = [...document.querySelectorAll(".job-head")];
  const toggleAllBtn = document.getElementById("toggleAllJobs");

  const syncToggleAll = () => {
    const allOpen = jobHeads.every((h) => h.getAttribute("aria-expanded") === "true");
    toggleAllBtn.textContent = allOpen ? "Collapse all" : "Expand all";
  };

  jobHeads.forEach((head) => {
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      syncToggleAll();
    });
  });

  toggleAllBtn.addEventListener("click", () => {
    const allOpen = jobHeads.every((h) => h.getAttribute("aria-expanded") === "true");
    jobHeads.forEach((h) => h.setAttribute("aria-expanded", String(!allOpen)));
    syncToggleAll();
  });

  /* ---------- Skill filters ---------- */
  const filterBtns = [...document.querySelectorAll(".chip-filter")];
  const chips = [...document.querySelectorAll("#chips .chip")];
  const chipCount = document.getElementById("chipCount");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });

      let shown = 0;
      chips.forEach((chip) => {
        const match = filter === "all" || chip.dataset.cat === filter;
        chip.hidden = !match;
        if (match) {
          shown += 1;
          // restart the small pop animation
          chip.style.animation = "none";
          void chip.offsetWidth;
          chip.style.animation = "";
        }
      });

      const label = btn.textContent.trim().toLowerCase();
      chipCount.textContent = filter === "all"
        ? `Showing all ${shown} skills`
        : `Showing ${shown} ${label} skills`;
    });
  });

  /* ---------- Language bars fill when visible ---------- */
  const langs = document.querySelector(".langs");
  if (langs) {
    const langObserver = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        langs.classList.add("is-visible");
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    langObserver.observe(langs);
  }

  /* ---------- Toast + copy email ---------- */
  const toast = document.getElementById("toast");
  let toastTimer;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  const EMAIL = "Abaihaqihamim@gmail.com";

  document.getElementById("copyEmail").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      showToast("Email copied");
    } catch (e) {
      // Fallback for browsers without clipboard permission
      const temp = document.createElement("textarea");
      temp.value = EMAIL;
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand("copy");
        showToast("Email copied");
      } catch (err) {
        showToast("Copy failed. Select the email and copy it manually.");
      }
      temp.remove();
    }
  });

  /* ---------- Contact form (Netlify Forms) ---------- */
  const form = document.getElementById("contactForm");
  const formBtn = document.getElementById("formBtn");
  const formStatus = document.getElementById("formStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formBtn.disabled = true;
    formBtn.textContent = "Sending...";
    formStatus.className = "form-status";
    formStatus.textContent = "";

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);

      form.reset();
      formStatus.classList.add("ok");
      formStatus.textContent = "Message sent. I'll reply by email soon.";
      showToast("Message sent");
    } catch (err) {
      formStatus.classList.add("err");
      formStatus.textContent = "Couldn't send the message. Please email me directly at " + EMAIL + ".";
    } finally {
      formBtn.disabled = false;
      formBtn.textContent = "Send message";
    }
  });

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
});
