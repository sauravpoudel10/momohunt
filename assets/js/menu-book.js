/* =========================================================
   Momo's Hunt — catering menu book
   Full-resolution originals, with two-page desktop spreads
   and single-page mobile reading. Shared by the home page
   and the booking page; it quietly does nothing on a page
   without the modal markup.
   ========================================================= */
(function () {
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const menuBookModal = $("#menu-book-modal");
if (!menuBookModal) return;

const menuBookPages = [
  { src: "assets/img/catering-menu/cover.jpeg", alt: "Momo's Hunt catering menu cover", label: "Cover" },
  { src: "assets/img/catering-menu/simple-22.jpeg", alt: "Simple catering menu, $22", label: "Simple · $22" },
  { src: "assets/img/catering-menu/set-1-25.jpeg", alt: "Catering set menu 1, $25", label: "Set 1 · $25" },
  { src: "assets/img/catering-menu/set-2-30.jpeg", alt: "Catering set menu 2, $30", label: "Set 2 · $30" },
  { src: "assets/img/catering-menu/set-3-35.jpeg", alt: "Catering set menu 3, $35", label: "Set 3 · $35" },
  { src: "assets/img/catering-menu/set-4-40.jpeg", alt: "Catering set menu 4, $40", label: "Set 4 · $40" }
];

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

document.addEventListener("keydown", (event) => {
  if (menuBookModal.hidden) return;
  if (event.key === "Escape") closeMenuBook();
  if (event.key === "ArrowLeft") menuBookPrev.click();
  if (event.key === "ArrowRight") menuBookNext.click();
});
})();
