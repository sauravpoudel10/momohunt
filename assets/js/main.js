/* =========================================================
   Momo's Hunt — site behaviour
   ========================================================= */

/* ---------------------------------------------------------
   1. EDIT ME — paste your delivery links here.
      Leave a value as "" and the button shows a
      "link coming soon" message instead of going nowhere.
   --------------------------------------------------------- */
const ORDER_LINKS = {
  doordash: "",   // e.g. "https://www.doordash.com/store/momos-hunt-granville/"
  ubereats: ""    // e.g. "https://www.ubereats.com/au/store/momos-hunt/xxxxx"
};

/* WhatsApp number that receives orders (digits only, with country code) */
const WHATSAPP_NUMBER = "61405140747";

/* Opening hours, 24h, keyed by JS day number (0 = Sunday).
   The kitchen runs past midnight, so a closing time earlier than the
   opening time means "the small hours of the next day". */
const HOURS = {
  0: ["13:00", "02:00"],
  1: ["13:00", "02:00"],
  2: ["13:00", "02:00"],
  3: ["13:00", "02:00"],
  4: ["13:00", "02:00"],
  5: ["13:00", "02:00"],
  6: ["14:00", "02:00"]
};

/* Dining room stops half an hour before the doors do: last sit-down
   orders at 1:30am, take-away keeps going until 2:00am. */
const TAKEAWAY_ONLY_MINUTES = 30;

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================================================
   Toast
   ========================================================= */
const toastEl = $("#toast");
let toastTimer;

function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
}

/* =========================================================
   Mobile navigation
   ========================================================= */
const navToggle = $("#nav-toggle");
const primaryNav = $("#primary-nav");

function setNavOpen(open) {
  if (!navToggle || !primaryNav) return;
  primaryNav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
}

if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  $$("a", primaryNav).forEach((link) => link.addEventListener("click", () => setNavOpen(false)));

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar")) setNavOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900) setNavOpen(false);
  });
}

/* =========================================================
   Delivery buttons
   ========================================================= */
$$("[data-order]").forEach((btn) => {
  const url = ORDER_LINKS[btn.dataset.order];
  if (url) {
    btn.href = url;
    btn.target = "_blank";
    btn.rel = "noopener";
  } else {
    btn.classList.add("is-pending");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toast("Delivery link coming soon — call us on +61 405 140 747.");
    });
  }
});

/* =========================================================
   Open / closed badge (restaurant local time: Sydney)
   ========================================================= */
function sydneyNow() {
  // Read the wall clock in Sydney regardless of the visitor's timezone.
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const get = (t) => parts.find((p) => p.type === t)?.value ?? "0";
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parseInt(get("hour"), 10) % 24;

  return {
    day: days[get("weekday")] ?? new Date().getDay(),
    minutes: hour * 60 + parseInt(get("minute"), 10)
  };
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const prettyMinutes = (mins) => {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
};

const pretty = (hhmm) => prettyMinutes(toMinutes(hhmm));

/* A day's trading window, in minutes from midnight of that day.
   Past-midnight closings run over 1440. */
function windowFor(day) {
  const [openStr, closeStr] = HOURS[day];
  const open = toMinutes(openStr);
  let close = toMinutes(closeStr);
  if (close <= open) close += 1440;
  return { open, close, closeStr };
}

function renderStatus() {
  const el = $("#status");
  if (!el) return;

  const { day, minutes } = sydneyNow();
  const text = $(".status__text", el);

  const today = windowFor(day);
  /* Yesterday's session may still be running in the small hours. */
  const carry = windowFor((day + 6) % 7);
  let live = null;

  if (minutes >= today.open && minutes < today.close) {
    live = today;
  } else if (carry.close > 1440 && minutes < carry.close - 1440) {
    live = { open: carry.open - 1440, close: carry.close - 1440, closeStr: carry.closeStr };
  }

  el.classList.remove("is-open", "is-closed");

  if (live) {
    el.classList.add("is-open");
    const diningClose = live.close - TAKEAWAY_ONLY_MINUTES;
    const leftDining = diningClose - minutes;

    if (minutes >= diningClose) {
      text.textContent = `Take-away only · closes ${pretty(live.closeStr)}`;
    } else if (leftDining <= 60) {
      text.textContent = `Open now · last dine-in orders in ${leftDining} min`;
    } else {
      text.textContent = `Open now · dine-in till ${prettyMinutes(diningClose)}`;
    }
  } else {
    el.classList.add("is-closed");
    const opensToday = minutes < today.open;
    const nextOpen = HOURS[opensToday ? day : (day + 1) % 7][0];
    text.textContent = opensToday
      ? `Closed · opens ${pretty(nextOpen)} today`
      : `Closed · opens ${pretty(nextOpen)} tomorrow`;
  }

  // Highlight today's row in the hours table
  $$(".hours__row[data-days]").forEach((row) => {
    const days = row.dataset.days.split(",").map(Number);
    row.classList.toggle("is-today", days.includes(day));
  });
}

renderStatus();
setInterval(renderStatus, 60000);

/* =========================================================
   Menu category tabs
   ========================================================= */
const tabs = $$(".tab");
const menuNodes = $$("#menu-list > *");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });

    const cat = tab.dataset.cat;
    menuNodes.forEach((node) => {
      node.style.display = cat === "all" || node.dataset.cat === cat ? "" : "none";
    });
  });
});

/* =========================================================
   Order builder (cart)
   ========================================================= */
const CART_KEY = "momoshunt.cart.v1";
let cart = [];

try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
} catch (_) {
  cart = [];
}

const orderbar   = $("#orderbar");
const stickybar  = $("#stickybar");
const cartPanel  = $("#cart-panel");
const cartToggle = $("#cart-toggle");
const cartLines  = $("#cart-lines");
const money = (n) => `$${n.toFixed(2)}`;

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (_) {
    /* private browsing — the cart just won't persist */
  }
}

function addToCart(name, price) {
  const line = cart.find((l) => l.name === name);
  if (line) line.qty += 1;
  else cart.push({ name, price, qty: 1 });
  saveCart();
  renderCart();
}

function changeQty(name, delta) {
  const line = cart.find((l) => l.name === name);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((l) => l.name !== name);
  saveCart();
  renderCart();
}

function orderMessage() {
  const lines = cart.map((l) => `• ${l.qty} × ${l.name} — ${money(l.price * l.qty)}`);
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  return [
    "Namaste Momo's Hunt! I'd like to order:",
    "",
    ...lines,
    "",
    `Total: ${money(total)}`,
    "",
    "Name:",
    "Pick-up or delivery:",
    "Time:"
  ].join("\n");
}

function renderCart() {
  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const empty = count === 0;

  orderbar.classList.toggle("is-hidden", empty);
  stickybar.classList.toggle("is-hidden", !empty);

  $("#cart-count").textContent = count;
  $("#cart-total").textContent = money(total);
  cartToggle.querySelector(".orderbar__label").textContent =
    count === 1 ? "1 item" : `${count} items`;

  cartLines.innerHTML = "";
  cart.forEach((line) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = line.name;

    const qty = document.createElement("span");
    qty.className = "cart__qty";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Remove one ${line.name}`);
    minus.addEventListener("click", () => changeQty(line.name, -1));

    const qtyLabel = document.createElement("b");
    qtyLabel.textContent = line.qty;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Add one ${line.name}`);
    plus.addEventListener("click", () => changeQty(line.name, 1));

    qty.append(minus, qtyLabel, plus);

    const lineTotal = document.createElement("span");
    lineTotal.className = "cart__line-total";
    lineTotal.textContent = money(line.price * line.qty);

    li.append(name, qty, lineTotal);
    cartLines.append(li);
  });

  $("#send-order").href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;

  if (empty) {
    cartPanel.hidden = true;
    cartToggle.setAttribute("aria-expanded", "false");
  }
}

$$(".mitem .add").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".mitem");
    addToCart(item.dataset.name, parseFloat(item.dataset.price));
    item.classList.remove("is-added");
    void item.offsetWidth; // restart the flash animation
    item.classList.add("is-added");
    toast(`${item.dataset.name} added`);
  });
});

cartToggle.addEventListener("click", () => {
  const open = cartPanel.hidden;
  cartPanel.hidden = !open;
  cartToggle.setAttribute("aria-expanded", String(open));
});

$("#cart-clear").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  toast("Order cleared");
});

renderCart();

/* =========================================================
   Photo rails (food + gallery)
   A horizontal strip of cards: hover pops a card out,
   click opens the full-size photo.
   ========================================================= */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setupRail(rail) {
  const track = $(".rail__track", rail);
  const prev  = $(".rail__nav--prev", rail);
  const next  = $(".rail__nav--next", rail);
  if (!track) return;

  /* One card plus the gap between cards. */
  const step = () => {
    const card = $(".shot", track);
    if (!card) return track.clientWidth * 0.8;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const scrollBy = (dir) => track.scrollBy({ left: dir * step(), behavior: "smooth" });

  /* Grey out an arrow once that end is reached. */
  const syncNav = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
  };

  if (prev) prev.addEventListener("click", () => scrollBy(-1));
  if (next) next.addEventListener("click", () => scrollBy(1));
  track.addEventListener("scroll", syncNav, { passive: true });
  window.addEventListener("resize", syncNav);
  syncNav();
}

$$(".rail").forEach(setupRail);

/* =========================================================
   Catering menu book
   Full-resolution originals, with two-page desktop spreads
   and single-page mobile reading.
   ========================================================= */
const menuBookPages = [
  { src: "assets/img/catering-menu/cover.jpeg", alt: "Momo's Hunt catering menu cover", label: "Cover" },
  { src: "assets/img/catering-menu/simple-22.jpeg", alt: "Simple catering menu, $22", label: "Simple · $22" },
  { src: "assets/img/catering-menu/set-1-25.jpeg", alt: "Catering set menu 1, $25", label: "Set 1 · $25" },
  { src: "assets/img/catering-menu/set-2-30.jpeg", alt: "Catering set menu 2, $30", label: "Set 2 · $30" },
  { src: "assets/img/catering-menu/set-3-35.jpeg", alt: "Catering set menu 3, $35", label: "Set 3 · $35" },
  { src: "assets/img/catering-menu/set-4-40.jpeg", alt: "Catering set menu 4, $40", label: "Set 4 · $40" }
];

const menuBookModal = $("#menu-book-modal");
const menuBook = $("#menu-book");
const menuBookLeft = $("#menu-book-left");
const menuBookRight = $("#menu-book-right");
const menuBookPrev = $("#menu-book-prev");
const menuBookNext = $("#menu-book-next");
const menuBookStatus = $("#menu-book-status");
const menuBookFull = $("#menu-book-full");
const menuBookDots = $("#menu-book-dots");
const menuBookMobile = window.matchMedia("(max-width: 699px)");
let menuBookIndex = 0;
let menuBookLastFocus = null;
let menuBookAnimating = false;

function setBookFigure(figure, page) {
  const img = $("img", figure);
  if (!page) {
    figure.hidden = true;
    img.src = "";
    img.alt = "";
    return;
  }
  img.src = page.src;
  img.alt = page.alt;
  figure.hidden = false;
}

function normalizedBookIndex(index) {
  const bounded = Math.max(0, Math.min(index, menuBookPages.length - 1));
  if (!menuBookMobile.matches && bounded > 0 && bounded % 2 === 0) return bounded - 1;
  return bounded;
}

function renderMenuBook() {
  menuBookIndex = normalizedBookIndex(menuBookIndex);
  const cover = menuBookIndex === 0;
  menuBook.dataset.mode = cover ? "cover" : "spread";

  setBookFigure(menuBookLeft, menuBookPages[menuBookIndex]);
  setBookFigure(
    menuBookRight,
    !cover && !menuBookMobile.matches ? menuBookPages[menuBookIndex + 1] : null
  );

  const secondPage = !cover && !menuBookMobile.matches ? menuBookPages[menuBookIndex + 1] : null;
  menuBookStatus.textContent = secondPage
    ? `${menuBookPages[menuBookIndex].label} — ${secondPage.label}`
    : menuBookPages[menuBookIndex].label;
  menuBookFull.href = menuBookPages[menuBookIndex].src;
  menuBookFull.setAttribute("aria-label", `Open ${menuBookPages[menuBookIndex].label} as a full-size image`);
  menuBookPrev.disabled = menuBookIndex === 0;
  menuBookNext.disabled = menuBookIndex === menuBookPages.length - 1;
  menuBookNext.setAttribute("aria-label", cover ? "Open menu book" : "Next menu page");

  $$(".menu-book-dot", menuBookDots).forEach((dot, index) => {
    const active = index === menuBookIndex || Boolean(secondPage && index === menuBookIndex + 1);
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-current", active ? "page" : "false");
  });
}

menuBookPages.forEach((page, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "menu-book-dot";
  dot.setAttribute("aria-label", `Show ${page.label}`);
  dot.addEventListener("click", () => turnMenuBook(index, index < menuBookIndex ? "prev" : "next"));
  menuBookDots.append(dot);
});

function turnMenuBook(target, direction) {
  if (menuBookAnimating) return;
  const nextIndex = normalizedBookIndex(target);
  if (nextIndex === menuBookIndex) return;

  menuBookIndex = nextIndex;
  renderMenuBook();
  menuBookAnimating = true;
  menuBook.classList.add(direction === "prev" ? "is-turning-prev" : "is-turning-next");
  window.setTimeout(() => {
    menuBook.classList.remove("is-turning-prev", "is-turning-next");
    menuBookAnimating = false;
  }, 500);
}

function openMenuBook(event) {
  menuBookLastFocus = event?.currentTarget || document.activeElement;
  menuBookIndex = 0;
  renderMenuBook();
  menuBookModal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#menu-book-close").focus();
}

function closeMenuBook() {
  menuBookModal.hidden = true;
  document.body.style.overflow = "";
  if (menuBookLastFocus) menuBookLastFocus.focus();
}

$$(".js-open-menu-book").forEach((button) => button.addEventListener("click", openMenuBook));
$("#menu-book-close").addEventListener("click", closeMenuBook);
menuBookPrev.addEventListener("click", () => {
  const step = menuBookMobile.matches || menuBookIndex <= 1 ? 1 : 2;
  turnMenuBook(menuBookIndex - step, "prev");
});
menuBookNext.addEventListener("click", () => {
  const step = menuBookIndex === 0 || menuBookMobile.matches ? 1 : 2;
  turnMenuBook(menuBookIndex + step, "next");
});
menuBookModal.addEventListener("click", (event) => {
  if (event.target === menuBookModal) closeMenuBook();
});
menuBookMobile.addEventListener("change", renderMenuBook);
renderMenuBook();

/* --- full-size view --- */
const lightbox = $("#lightbox");
const lbImg = $("#lb-img");

function openLightbox(card) {
  const img = $(".shot__photo", card);
  lbImg.src = card.dataset.full || img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  $("#lb-close").focus();
}

$$(".shot__card").forEach((card) => {
  card.addEventListener("click", () => openLightbox(card));
});

function closeLightbox() {
  lightbox.hidden = true;
  lbImg.src = "";
  document.body.style.overflow = "";
}
$("#lb-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
    setNavOpen(false);
    navToggle.focus();
  }
  if (!menuBookModal.hidden) {
    if (e.key === "Escape") closeMenuBook();
    if (e.key === "ArrowRight") menuBookNext.click();
    if (e.key === "ArrowLeft") menuBookPrev.click();
    return;
  }
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

/* =========================================================
   Nav highlighting + reveal on scroll
   ========================================================= */
const navLinks = $$(".nav a");
const sections = navLinks
  .map((link) => $(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((section) => spy.observe(section));
}

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealTargets = [
    ...$$(".pick"),
    ...$$(".sechead"),
    ...$$(".trays li"),
    ...$$(".visit > *")
  ];
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
      entry.target.classList.add("is-in");
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  revealTargets.forEach((el) => revealer.observe(el));

  // Safety net: nothing stays invisible if the observer never fires
  // (print, screenshot tools, an unusual scroll container).
  setTimeout(() => {
    revealTargets.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.2) {
        el.classList.add("is-in");
      }
    });
  }, 1800);
  window.addEventListener("beforeprint", () =>
    revealTargets.forEach((el) => el.classList.add("is-in"))
  );
}

/* Footer year */
$("#year").textContent = new Date().getFullYear();
