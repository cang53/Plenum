// plenumtool.eu behaviour. Everything degrades to a finished, static page without it.
import { MIN_SEATS, formatEuro, teamPrice } from "./pricing.mjs";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 900px)").matches;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage can be blocked */ } },
};

/* Header: compact on scroll, sliding underline, mobile menu, theme wipe */
const header = $("[data-header]");
const onScroll = () => header.classList.toggle("scrolled", scrollY > 24);
onScroll();
addEventListener("scroll", onScroll, { passive: true });

const navList = $("[data-nav-list]");
const mark = $(".nav-mark", navList);
const moveMark = (el) => {
  if (!el) { mark.style.opacity = 0; return; }
  mark.style.opacity = 1;
  mark.style.width = el.offsetWidth - 28 + "px";
  mark.style.transform = `translateX(${el.offsetLeft + 14}px)`;
};
const current = $("a[aria-current]", navList);
moveMark(current);
$$("a", navList).forEach((a) => {
  a.addEventListener("pointerenter", () => moveMark(a));
  a.addEventListener("focus", () => moveMark(a));
});
navList.addEventListener("pointerleave", () => moveMark(current));
addEventListener("resize", () => moveMark(current));

const menuBtn = $("[data-menu]");
const menu = $("[data-mobile-menu]");
menuBtn.addEventListener("click", () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
  document.body.style.overflow = open ? "hidden" : "";
});

$("[data-theme-toggle]").addEventListener("click", (e) => {
  const root = document.documentElement;
  const dark = getComputedStyle(root).colorScheme.startsWith("dark");
  const next = dark ? "light" : "dark";
  const apply = () => { root.dataset.theme = next; store.set("plenum-theme", next); };
  if (!document.startViewTransition || reduced) return apply();
  const r = e.currentTarget.getBoundingClientRect();
  root.style.setProperty("--tx", r.left + r.width / 2 + "px");
  root.style.setProperty("--ty", r.top + r.height / 2 + "px");
  root.dataset.vt = "theme";
  document.startViewTransition(apply).finished.finally(() => delete root.dataset.vt);
});

/* Blueprint grid follows the pointer */
$$("[data-spot]").forEach((el) => {
  const host = el.parentElement;
  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  });
});

/* Looping product demos. data-loop lists the wait (ms) at each step; steps add classes s1, s2, ... */
function line(frame, fromEl, toEl, pathEl, mode) {
  const f = frame.querySelector(".frame-in").getBoundingClientRect();
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  let x1, y1, x2, y2;
  if (mode === "mail") { x1 = a.right - f.left; y1 = a.top + a.height / 2 - f.top; x2 = b.right - f.left; y2 = b.top + b.height / 2 - f.top; }
  else { x1 = a.right - f.left; y1 = a.top + a.height / 2 - f.top; x2 = b.left - f.left; y2 = b.top + b.height / 2 - f.top; }
  const mx = Math.max(x1, x2) + 18;
  pathEl.setAttribute("d", mode === "mail" ? `M${x1} ${y1} C${x1 + 60} ${y1} ${x2 + 40} ${y2 - 40} ${x2 - 4} ${y2 - 4}` : `M${x1} ${y1} H${mx - 8} Q${mx} ${y1} ${mx} ${y1 + 8} V${y2 - 8} Q${mx} ${y2} ${mx - 8} ${y2} H${x2 - 6}`);
}

function runLoop(frame) {
  const waits = frame.dataset.loop.split(",").map(Number);
  const last = waits.length - 1;
  const pauseBtn = $("[data-pause]", frame);
  let step = 0, timer = 0, paused = false, visible = false;
  const set = (n) => {
    step = n;
    for (let i = 1; i <= last; i++) frame.classList.toggle("s" + i, i <= n);
  };
  const place = () => {
    if (frame.hasAttribute("data-hero")) line(frame, $("[data-mail]", frame), $("[data-t]", frame), $("[data-link]", frame), "mail");
  };
  const tick = () => {
    clearTimeout(timer);
    if (paused || !visible) return;
    timer = setTimeout(() => { set(step >= last ? 0 : step + 1); tick(); }, waits[step]);
  };
  if (reduced) { set(last); place(); return; }
  place();
  addEventListener("resize", place);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; place(); tick(); }, { threshold: 0.25 }).observe(frame);
  pauseBtn?.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Play" : "Pause";
    tick();
  });
}
$$("[data-loop]").forEach(runLoop);

/* Pinned story: scroll progress drives four steps */
const story = $("[data-story]");
if (story) {
  const frame = $("[data-story-frame]", story);
  const steps = $$("[data-steps] li", story);
  const dep = $("[data-dep]", story);
  const place = () => line(frame, $("[data-dep-a]", story), $("[data-dep-b]", story), dep, "dep");
  const paint = (s) => {
    s.forEach((v, i) => frame.style.setProperty("--s" + (i + 1), v.toFixed(3)));
    const idx = s.findLastIndex((v) => v > 0.02);
    steps.forEach((li, i) => li.classList.toggle("on", i <= idx));
  };
  const clamp = (v) => Math.min(1, Math.max(0, v));
  if (reduced || phone) { paint([1, 1, 1, 1]); }
  else {
    const update = () => {
      const r = story.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      paint([clamp(p / 0.2), clamp((p - 0.2) / 0.2), clamp((p - 0.4) / 0.2), clamp((p - 0.65) / 0.2)]);
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }
  place();
  addEventListener("resize", place);
  document.fonts?.ready.then(place);
}

/* Section index */
const index = $("[data-index]");
if (index) {
  const links = $$("a", index);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const t = $(a.getAttribute("href")); if (t) io.observe(t); });
}

/* Approval card demo */
const demo = $("[data-approval]");
if (demo) {
  const card = $("[data-card]", demo), when = $("[data-when]", demo), count = $("[data-count]", demo);
  const row = when.closest(".task"), note = $("[data-note]", demo);
  const after = () => { note.hidden = false; };
  $("[data-apply]", demo).addEventListener("click", () => {
    card.classList.add("applied");
    when.textContent = "Finish " + (date.textContent.trim().slice(0, 12) || "28 Nov");
    row.classList.remove("changed"); void row.offsetWidth; row.classList.add("changed");
    count.textContent = String(Number(count.textContent) + 1);
    after();
  });
  $("[data-dismiss]", demo).addEventListener("click", () => { card.classList.add("gone"); after(); });
  const date = $("[data-date]", demo);
  $("[data-edit]", demo).addEventListener("click", () => {
    date.focus();
    getSelection().selectAllChildren(date);
  });
  $("[data-reset]", demo).addEventListener("click", () => {
    card.classList.remove("applied", "gone");
    when.textContent = "Finish 21 Nov";
    date.textContent = "28 Nov";
    row.classList.remove("changed");
    note.hidden = true;
  });
}

/* Word highlight statement */
const statement = $("[data-statement]");
if (statement) {
  const words = statement.textContent.trim().split(/\s+/);
  statement.setAttribute("aria-label", words.join(" "));
  statement.textContent = "";
  const spans = words.map((w, i) => {
    const s = document.createElement("span");
    s.className = "w" + (i >= words.length - 3 ? " acc" : "");
    s.setAttribute("aria-hidden", "true");
    s.textContent = w + " ";
    statement.append(s);
    return s;
  });
  const host = statement.closest("section");
  const paint = () => {
    const r = host.getBoundingClientRect();
    const p = reduced ? 1 : Math.min(1, Math.max(0, (-r.top + innerHeight * 0.15) / (r.height - innerHeight * 0.9)));
    spans.forEach((s, i) => s.classList.toggle("on", i < Math.round(p * spans.length)));
  };
  addEventListener("scroll", paint, { passive: true });
  paint();
}

/* Icons draw once when they enter */
const icons = $$(".ico");
if (icons.length) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.6 });
  icons.forEach((i) => io.observe(i));
}

/* Seat calculator with an odometer */
const calc = $("[data-calc]");
if (calc) {
  const range = $("input[type=range]", calc), seatsOut = $("[data-seats]", calc);
  const odos = $$("[data-odo]", calc);
  const build = (el, text) => {
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch) => {
      const col = document.createElement("span");
      col.className = "odo-col";
      col.setAttribute("aria-hidden", "true");
      if (/\d/.test(ch)) {
        for (let d = 0; d < 10; d++) { const s = document.createElement("span"); s.textContent = d; col.append(s); }
        col.dataset.digit = ch;
        col.style.transform = `translateY(${-Number(ch) * 1.05}em)`;
      } else { const s = document.createElement("span"); s.textContent = ch; col.append(s); }
      el.append(col);
    });
  };
  const show = (el, text) => {
    const cols = $$(".odo-col", el);
    if (cols.length !== text.length) return build(el, text);
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => { if (/\d/.test(ch) && cols[i].dataset.digit) { cols[i].dataset.digit = ch; cols[i].style.transform = `translateY(${-Number(ch) * 1.05}em)`; } });
  };
  const update = () => {
    const p = teamPrice(range.value);
    seatsOut.textContent = p.seats + " paid seats";
    show(odos[0], formatEuro(p.monthly));
    show(odos[1], formatEuro(p.yearly));
  };
  range.min = MIN_SEATS;
  range.addEventListener("input", update);
  odos.forEach((o) => build(o, "€0"));
  update();
}

/* Pilot form: validate, then hand the request to the visitor's mail app */
const form = $("[data-pilot-form]");
if (form) {
  const fields = $$(".field", form);
  const ok = { name: (v) => v.trim().length > 1, email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), company: (v) => v.trim().length > 1 };
  fields.forEach((f) => $("input", f).addEventListener("input", () => f.classList.remove("bad")));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let bad = 0;
    const data = {};
    fields.forEach((f) => {
      const i = $("input", f);
      data[i.name] = i.value.trim();
      const good = ok[i.name](i.value);
      f.classList.toggle("bad", !good);
      if (!good) bad++;
    });
    if (bad) {
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      $(".bad input", form)?.focus();
      return;
    }
    form.dataset.state = "loading";
    const body = `Please start a pilot for ${data.company}.\n\nName: ${data.name}\nWork email: ${data.email}\nCompany: ${data.company}\n`;
    setTimeout(() => {
      form.dataset.state = "done";
      $("[data-mailto]", form).href = `mailto:hello@plenumtool.eu?subject=${encodeURIComponent("Plenum pilot request")}&body=${encodeURIComponent(body)}`;
      $("[data-mailto]", form).click();
    }, 700);
  });
}
