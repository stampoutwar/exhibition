/* ===== Stamp Out War — Interactive Exhibition ===== */
"use strict";

const DATA = window.SOW_DATA;
const YEARS = DATA.stats.editions;

/* ---- augment cards with their context (year/country/flag) ---- */
const ALL_CARDS = [];
for (const year of YEARS) {
  for (const c of DATA.editions[year].countries) {
    for (const card of c.cards) {
      card.year = year;
      card.country = c.name;
      card.flag = c.flag;
      ALL_CARDS.push(card);
    }
  }
}
const STAMP_BY_IMG = new Map(DATA.stamps.map(s => [s.img, s]));
const COUNTRY_INDEX = new Map(); // "year|country" -> country entry
for (const year of YEARS)
  for (const c of DATA.editions[year].countries)
    COUNTRY_INDEX.set(`${year}|${c.name}`, c);

const imgPath = (card, side, kind = "display") =>
  `images/${card.year}/${kind === "thumb" ? "thumbs" : "display"}/${card[side]}.webp`;

const esc = s => String(s ?? "").replace(/[&<>"]/g,
  ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

/* card ids repeat the country ("Ukraine-K01-01") — show just the number part */
const shortId = card => card.id.replace(/^[A-Za-z_]+-/, "");

/* ---- passport (visited countries) ---- */
const PASSPORT_TOTAL = [...COUNTRY_INDEX.keys()].length;
let passport = new Set(JSON.parse(localStorage.getItem("sow-passport") || "[]"));
function stampPassport(year, country) {
  const key = `${year}|${country}`;
  if (passport.has(key)) return;
  passport.add(key);
  localStorage.setItem("sow-passport", JSON.stringify([...passport]));
  renderPassport();
  // ink the plaque in the currently rendered hall right away
  if (location.hash.replace(/^#\//, "") === String(year)) {
    const plq = [...document.querySelectorAll(".plaque")]
      .find(p => p.dataset.country === country);
    if (plq && !plq.querySelector(".visited-mark"))
      plq.insertAdjacentHTML("beforeend",
        `<span class="visited-mark fresh">VISITED<br>·SOW·</span>`);
  }
}
function renderPassport() {
  const el = document.getElementById("passport-count");
  el.textContent = `${passport.size}/${PASSPORT_TOTAL}`;
  document.getElementById("passport").title =
    passport.size >= PASSPORT_TOTAL
      ? "Grand tour complete — you have visited every country hall! 🏆"
      : `Your exhibition passport: ${passport.size} of ${PASSPORT_TOTAL} country halls visited`;
  if (passport.size >= PASSPORT_TOTAL)
    document.getElementById("passport").firstChild.textContent = "🏆 ";
}

/* ---- passport book overlay ---- */
const passportbox = document.getElementById("passportbox");
function openPassportBook() {
  const pct = Math.round(100 * passport.size / PASSPORT_TOTAL);
  const pages = [];
  pages.push(`
    <div class="pp-intro">
      <p><b>How the game is played:</b> every country hall you enter leaves an ink stamp
        in this passport. Visit all ${PASSPORT_TOTAL} halls across the three editions
        to complete the grand tour.</p>
      <div class="pp-progress"><span style="width:${pct}%"></span></div>
      <p class="pp-progress-label">${passport.size} of ${PASSPORT_TOTAL} halls visited · ${pct}%</p>
      ${passport.size >= PASSPORT_TOTAL
        ? `<p class="pp-complete">🏆 Grand tour complete — the postmaster salutes you!</p>` : ""}
    </div>`);
  for (const year of YEARS) {
    const stamps = DATA.editions[year].countries.map((c, i) => {
      const visited = passport.has(`${year}|${c.name}`);
      const rot = ((i * 47) % 21) - 10; // deterministic scatter
      return `<button class="pp-stamp ${visited ? "visited" : "blank"}"
        style="--rot:${rot}deg" data-year="${year}" data-country="${esc(c.name)}"
        title="${visited ? `Visited — reopen ${esc(c.name)}` : `Not yet visited — go to ${esc(c.name)}`}">
        <span class="pp-flag">${c.flag}</span>
        <span class="pp-name">${esc(c.name)}</span>
        <span class="pp-date">${visited ? `24 AUG ${year}` : "· · ·"}</span>
      </button>`;
    }).join("");
    const done = DATA.editions[year].countries
      .filter(c => passport.has(`${year}|${c.name}`)).length;
    pages.push(`
      <div class="pp-page">
        <h3>${year} · ${editionName(year)} <small>${done}/${DATA.editions[year].countries.length} stamped</small></h3>
        <div class="pp-grid">${stamps}</div>
      </div>`);
  }
  document.getElementById("passport-pages").innerHTML = pages.join("");
  document.querySelectorAll(".pp-stamp").forEach(b =>
    b.addEventListener("click", () => {
      passportbox.classList.add("hidden");
      location.hash = `#/${b.dataset.year}`;
      openVitrine(b.dataset.year, b.dataset.country);
    }));
  passportbox.classList.remove("hidden");
  passportbox.querySelector(".overlay-scroll").scrollTop = 0;
}
document.getElementById("passport").addEventListener("click", openPassportBook);

/* ---- routing ---- */
const view = document.getElementById("view");
function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  document.querySelectorAll("#nav-links a").forEach(a =>
    a.classList.toggle("active", a.dataset.route === hash));
  window.scrollTo(0, 0);
  if (hash === "/album") renderAlbum();
  else if (/^\/\d{4}$/.test(hash) && DATA.editions[hash.slice(1)]) renderHall(hash.slice(1));
  else renderLobby();
}
window.addEventListener("hashchange", route);

/* ---- nav year links ---- */
(function injectNav() {
  const albumLink = document.querySelector('#nav-links a[data-route="/album"]');
  for (const y of YEARS) {
    const a = document.createElement("a");
    a.href = `#/${y}`;
    a.dataset.route = `/${y}`;
    a.textContent = y;
    albumLink.before(a);
  }
})();

/* ---- edition names ---- */
const EDITION_NAMES = {
  2022: "The Foundation Year",
  2023: "The Global Expansion",
  2024: "The Saturday Rally",
  2025: "The Sunday Rally",
};
const editionName = year => EDITION_NAMES[year] || `Edition ${year}`;

/* ---- lobby ---- */
const BLURBS = {
  2022: "The first edition. Six months into the full-scale invasion, friends of Ukraine on four continents cancelled the first maxicards on 24 August 2022 — Ukraine's 31st Independence Day.",
  2023: "The second edition went truly global — from the Andes to South-East Asia, new posts and new flowers joined the field.",
  2024: "The third edition keeps the flame burning: same blue sky, same golden field, ever more postmarks.",
};

function pickRandom(arr, n) {
  const pool = [...arr], out = [];
  while (out.length < n && pool.length)
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function renderLobby() {
  const s = DATA.stats;
  const fanCards = pickRandom(ALL_CARDS, 5);
  const fanHtml = fanCards.map((c, i) => {
    const r = (i - 2) * 6, y = Math.abs(i - 2) * 10, x = (i - 2) * 118;
    return `<a href="#" data-card="${esc(c.year)}|${esc(c.country)}|${esc(c.id)}"
      style="--r:${r}deg; --y:${y}px; --x:${x}px" title="${esc(c.country)} — look closer">
      <img src="${imgPath(c, "front", "thumb")}" alt="Maxicard from ${esc(c.country)}"></a>`;
  }).join("");

  const doors = YEARS.map(y => {
    const ed = DATA.editions[y];
    const nCards = ed.countries.reduce((n, c) => n + c.cards.length, 0);
    const flags = ed.countries.map(c => c.flag).join(" ");
    return `<a class="door" href="#/${y}">
      <div class="door-art"><div class="postmark-deco">24 AUG<br>${y}</div></div>
      <div class="door-body">
        <h3>${editionName(y)}</h3>
        <p>Edition ${y} · ${ed.countries.length} countries · ${nCards} maxicards</p>
        <div class="flagstrip">${flags}</div>
      </div></a>`;
  }).join("");

  view.innerHTML = `
  <section class="hero">
    <video class="hero-video" autoplay muted loop playsinline
      src="media/DoveSky_v2.mp4" aria-hidden="true"></video>
    <div class="hero-veil"></div>
    <div class="hero-content">
      <h1>One field, one flag:</h1>
      <h2 class="hero-sub2">The World’s Postmarks for Ukraine</h2>
      <p class="tagline">One photograph of blue sky over a golden field, one flower stamp,
        one postmark dated 24 August — multiplied across the world in solidarity with Ukraine.</p>
      <div class="fan">${fanHtml}</div>
      <div class="stats">
        <div class="stat glass b"><b data-count="${s.cards}">0</b><span>maxicards</span></div>
        <div class="stat glass y"><b data-count="${s.countries}">0</b><span>countries</span></div>
        <div class="stat glass b"><b data-count="${s.stamps}">0</b><span>stamps</span></div>
        <div class="stat glass y"><b data-count="${s.towns}">0</b><span>postmark towns</span></div>
        <div class="stat glass b"><b data-count="${s.participants}">0</b><span>participants</span></div>
      </div>
      <div class="scroll-down-arrow">
        <a href="#halls" class="arrow-link" title="Enter the exhibition">
          <span class="scroll-label">Start your visit</span>
          <span class="arrow-glyph">↓</span>
        </a>
      </div>
    </div>
  </section>
  <section class="lobby-doors" id="halls">
    <h3 class="exhibit-title">An Interactive Exhibition for the Stamp Out War Project</h3>
    <h2>Choose a hall</h2>
    <p class="lead">The exhibition is arranged as annual editions — each released on Ukraine's
      Independence Day. Enter a hall, wander between countries, and turn the cards over:
      every one carries a handwritten note from the person who had it cancelled.</p>
    <div class="doors">
      ${doors}
      <a class="door" href="#/album">
        <div class="door-art album-art"><div class="postmark-deco">97<br>STAMPS</div></div>
        <div class="door-body">
          <h3>The Stamp Album</h3>
          <p>Every sunflower &amp; solidarity stamp</p>
          <div class="flagstrip">🌻 🌼 🕊️ 🌻 🌼 🕊️ 🌻</div>
        </div></a>
    </div>
  </section>
  <section class="howto">
    <div class="cardnote">
      <h3>What is a maxicard?</h3>
      <p>A maxicard reaches <b>maximum concordance</b> when three things agree:
        the picture on the postcard, the stamp on the picture side, and the postmark that cancels it.</p>
      <p class="hand">Here: a field photographed in Prince Edward Island, Canada — a sunflower or
        yellow-flower stamp — and a cancellation dated 24 August, wherever in the world a friend could stamp it.</p>
      <p>Each card becomes a permanent historical record of solidarity. The originals are auctioned
        to support Ukrainian refugee relief.</p>
    </div>
  </section>`;

  // count-up animation
  view.querySelectorAll("[data-count]").forEach(el => {
    const target = +el.dataset.count, t0 = performance.now(), dur = 1400;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });

  // smooth-scroll arrow (plain hash hrefs would fight the router)
  view.querySelector(".arrow-link").addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("halls").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // fan card clicks -> viewer over the whole collection
  view.querySelectorAll(".fan a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const [year, country, id] = a.dataset.card.split("|");
    const idx = ALL_CARDS.findIndex(c => c.year === year && c.country === country && c.id === id);
    openViewer(ALL_CARDS, Math.max(0, idx));
  }));
}

/* ---- hall ---- */
const CONT_ORDER = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];
function renderHall(year) {
  const ed = DATA.editions[year];
  const nCards = ed.countries.reduce((n, c) => n + c.cards.length, 0);
  const mode = localStorage.getItem("sow-hall-view") || "az";

  const plaque = c => `
    <button class="plaque" data-country="${esc(c.name)}">
      <span class="flag">${c.flag}</span>
      <span class="cname">${esc(c.name)}</span>
      <span class="ccount">${c.cards.length} ${c.cards.length === 1 ? "maxicard" : "maxicards"}</span>
      ${passport.has(`${year}|${c.name}`) ? `<span class="visited-mark">VISITED<br>·SOW·</span>` : ""}
    </button>`;

  let body;
  if (mode === "cont") {
    const byCont = new Map();
    for (const c of ed.countries) {
      if (!byCont.has(c.cont)) byCont.set(c.cont, []);
      byCont.get(c.cont).push(c);
    }
    const conts = [...byCont.keys()].sort((a, b) => {
      const ia = CONT_ORDER.indexOf(a), ib = CONT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    body = conts.map(cont => `
      <div class="continent">
        <h3>${esc(cont)} <small>${byCont.get(cont).length} ${byCont.get(cont).length === 1 ? "country" : "countries"}</small></h3>
        <div class="plaques">${byCont.get(cont).map(plaque).join("")}</div>
      </div>`).join("");
  } else {
    // ed.countries is already sorted alphabetically
    body = `<div class="continent"><div class="plaques">${ed.countries.map(plaque).join("")}</div></div>`;
  }

  view.innerHTML = `
  <section class="hall">
    <div class="hall-head">
      <p class="kicker">Edition ${year} · cancelled 24 August ${year}</p>
      <h2>${editionName(year)} — ${ed.countries.length} countries, ${nCards} maxicards</h2>
      <p class="blurb">${BLURBS[year] || ""} Step into a country to open its display case.</p>
      <div class="chips hall-toggle">
        <button data-m="az" class="${mode === "az" ? "active" : ""}">All countries A–Z</button>
        <button data-m="cont" class="${mode === "cont" ? "active" : ""}">Group by continent</button>
      </div>
    </div>
    ${body}
  </section>`;

  view.querySelectorAll(".hall-toggle button").forEach(b =>
    b.addEventListener("click", () => {
      localStorage.setItem("sow-hall-view", b.dataset.m);
      renderHall(year);
    }));
  view.querySelectorAll(".plaque").forEach(b =>
    b.addEventListener("click", () => openVitrine(year, b.dataset.country)));
}

/* ---- vitrine ---- */
const vitrine = document.getElementById("vitrine");
function openVitrine(year, countryName) {
  const c = COUNTRY_INDEX.get(`${year}|${countryName}`);
  if (!c) return;
  stampPassport(year, countryName);
  const towns = [...new Set(c.cards.map(k => k.town).filter(Boolean))];
  document.getElementById("vitrine-content").innerHTML = `
    <div class="vitrine-head">
      <span class="flag">${c.flag}</span>
      <h2>${esc(c.name)} · ${year}</h2>
      <p class="meta">${c.cards.length} ${c.cards.length === 1 ? "maxicard" : "maxicards"}
        ${towns.length ? ` · cancelled in ${esc(towns.join(", "))}` : ""}
        · click a card to pick it up, then turn it over</p>
    </div>
    <div class="vitrine-grid">
      ${c.cards.map((card, i) => `
        <button class="vcard" data-idx="${i}">
          <span class="vcard-img"><img loading="lazy"
            src="${imgPath(card, "front", "thumb")}"
            alt="Maxicard ${esc(card.id)}, ${esc(c.name)}"></span>
          <span class="vlabel"><b>№ ${esc(shortId(card))}</b>
            ${card.town ? ` · ${esc(card.town)}` : ""}
            ${card.participant ? `<br><span class="hand">with the help of ${esc(card.participant)}</span>` : ""}
          </span>
        </button>`).join("")}
    </div>`;
  vitrine.classList.remove("hidden");
  vitrine.querySelector(".overlay-scroll").scrollTop = 0;
  vitrine.querySelectorAll(".vcard").forEach(b =>
    b.addEventListener("click", () => openViewer(c.cards, +b.dataset.idx)));
}

/* ---- card viewer ---- */
const viewer = document.getElementById("viewer");
const flipCard = document.getElementById("flip-card");
let viewerList = [], viewerIdx = 0;

function openViewer(list, idx) {
  viewerList = list;
  viewerIdx = idx;
  viewer.classList.remove("hidden");
  showCard();
}
function showCard() {
  const card = viewerList[viewerIdx];
  flipCard.classList.remove("flipped");
  document.getElementById("viewer-front").src = imgPath(card, "front");
  const backImg = document.getElementById("viewer-back");
  if (card.back) backImg.src = imgPath(card, "back"); else backImg.removeAttribute("src");
  document.getElementById("flip-btn").style.visibility = card.back ? "visible" : "hidden";
  document.getElementById("viewer-title").textContent =
    `${card.flag} ${card.country} — maxicard № ${shortId(card)}`;
  document.getElementById("viewer-sub").innerHTML =
    `${card.town ? `Cancelled in <b>${esc(card.town)}</b> on 24 August ${esc(card.year)}` : `${esc(card.year)} · ${esc(editionName(card.year))}`}` +
    (card.participant ? ` &nbsp;·&nbsp; <span class="hand">with the help of ${esc(card.participant)}</span>` : "");
  const chip = document.getElementById("viewer-stampchip");
  if (card.stamp) {
    chip.innerHTML = `<button title="Open this stamp in the album">
      ${card.stampImg ? `<img src="${esc(card.stampImg)}" alt="">` : ""}
      <span>🌻 ${esc(card.stamp)}${card.stampYear ? ` (${esc(card.stampYear)})` : ""}${card.stampCat ? `<br>${esc(card.stampCat)}` : ""}</span>
    </button>`;
    chip.firstElementChild.addEventListener("click", () => {
      const s = STAMP_BY_IMG.get(card.stampImg);
      if (s) { openStampbox(s); }
    });
  } else chip.innerHTML = "";
  document.getElementById("viewer-prev").style.visibility = viewerList.length > 1 ? "visible" : "hidden";
  document.getElementById("viewer-next").style.visibility = viewerList.length > 1 ? "visible" : "hidden";
  // preload neighbours
  for (const d of [-1, 1]) {
    const n = viewerList[(viewerIdx + d + viewerList.length) % viewerList.length];
    if (n) new Image().src = imgPath(n, "front");
  }
}
function stepCard(d) {
  viewerIdx = (viewerIdx + d + viewerList.length) % viewerList.length;
  showCard();
}
flipCard.addEventListener("click", () => {
  if (viewerList[viewerIdx]?.back) flipCard.classList.toggle("flipped");
});
document.getElementById("flip-btn").addEventListener("click", () => flipCard.classList.toggle("flipped"));
document.getElementById("viewer-prev").addEventListener("click", () => stepCard(-1));
document.getElementById("viewer-next").addEventListener("click", () => stepCard(1));

/* ---- stamp album ---- */
function renderAlbum(filter = "all") {
  const stamps = DATA.stamps
    .filter(s => filter === "all" || s.year === filter)
    .sort((a, b) => (a.countries[0] || "").localeCompare(b.countries[0] || "")
      || a.title.localeCompare(b.title));
  view.innerHTML = `
  <section class="album">
    <p class="kicker">The philatelic record</p>
    <h2>The Stamp Album</h2>
    <p class="lead">Every stamp used in the project — sunflowers, yellow flowers and solidarity
      issues — cropped from the maxicards together with their cancellation marks, arranged
      alphabetically by country. Click a stamp to see which cards carry it.</p>
    <div class="chips">
      <button data-f="all" class="${filter === "all" ? "active" : ""}">All ${DATA.stamps.length}</button>
      ${YEARS.map(y => `<button data-f="${y}" class="${filter === y ? "active" : ""}"
        title="${esc(editionName(y))}">${y}</button>`).join("")}
      <button id="album-text-toggle" class="text-toggle"
        title="Toggle the captions for a purer visual experience"></button>
    </div>
    <div class="album-grid">
      ${stamps.map((s, i) => `
        <button class="stamp-cell" data-i="${i}">
          <span class="simgwrap"><img loading="lazy" src="${esc(s.img)}" alt="${esc(s.title)}"></span>
          <span class="s-country">${s.flags.join(" ")} ${esc(s.countries.join(", "))}</span>
          <span class="s-name"><b>${esc(s.title)}</b>${s.stampYear ? ` (${esc(s.stampYear)})` : ""}</span>
          <span class="s-row">
            <span class="s-cat">${esc(s.cat || "")}</span>
            <span class="s-use">${s.cards.length} card${s.cards.length > 1 ? "s" : ""}</span>
          </span>
        </button>`).join("")}
    </div>
  </section>`;
  view.querySelectorAll(".chips button[data-f]").forEach(b =>
    b.addEventListener("click", () => renderAlbum(b.dataset.f)));

  // captions on/off
  const albumEl = view.querySelector(".album");
  const toggle = view.querySelector("#album-text-toggle");
  const applyTextMode = () => {
    const off = localStorage.getItem("sow-album-text") === "off";
    albumEl.classList.toggle("no-text", off);
    toggle.textContent = off ? "🖼 Show details" : "🖼 Images only";
    toggle.classList.toggle("active", off);
  };
  applyTextMode();
  toggle.addEventListener("click", () => {
    localStorage.setItem("sow-album-text",
      localStorage.getItem("sow-album-text") === "off" ? "on" : "off");
    applyTextMode();
  });
  view.querySelectorAll(".stamp-cell").forEach(b =>
    b.addEventListener("click", () => openStampbox(stamps[+b.dataset.i])));
}

const stampbox = document.getElementById("stampbox");
function openStampbox(s) {
  document.getElementById("stampbox-img").src = s.img;
  document.getElementById("stampbox-title").textContent =
    `${s.title}${s.stampYear ? ` (${s.stampYear})` : ""}`;
  document.getElementById("stampbox-sub").textContent =
    [s.cat, `used in ${s.year} · ${editionName(s.year)}`].filter(Boolean).join(" · ");
  const holder = document.getElementById("stampbox-cards");
  const refs = [...s.cards].sort((a, b) => a.country.localeCompare(b.country)
    || a.id.localeCompare(b.id, undefined, { numeric: true }));
  holder.innerHTML = refs.map((c, i) =>
    `<button data-i="${i}">${esc(c.country)} № ${esc(c.id.replace(/^[A-Za-z_]+-/, ""))}</button>`).join("");
  holder.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const ref = refs[+b.dataset.i];
    const idx = ALL_CARDS.findIndex(c => c.id === ref.id && c.country === ref.country && c.year === s.year);
    if (idx >= 0) { stampbox.classList.add("hidden"); openViewer(ALL_CARDS, idx); }
  }));
  stampbox.classList.remove("hidden");
}

/* ---- draw a card ---- */
const draw = document.getElementById("draw");
const drawCard = document.getElementById("draw-card");
let drawn = null;
function dealCard() {
  drawn = ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
  drawCard.classList.remove("flipped");
  document.getElementById("draw-title").innerHTML = "&nbsp;";
  const img = document.getElementById("draw-img");
  img.src = imgPath(drawn, "front");
  setTimeout(() => {
    drawCard.classList.add("flipped");
    document.getElementById("draw-title").textContent =
      `${drawn.flag} ${drawn.country} — № ${shortId(drawn)}${drawn.town ? `, cancelled in ${drawn.town}` : ""} (${drawn.year})`;
  }, 650);
}
document.getElementById("draw-btn").addEventListener("click", () => {
  draw.classList.remove("hidden");
  dealCard();
});
document.getElementById("draw-again").addEventListener("click", dealCard);
document.getElementById("draw-open").addEventListener("click", () => {
  if (!drawn) return;
  draw.classList.add("hidden");
  openViewer(ALL_CARDS, ALL_CARDS.indexOf(drawn));
});
drawCard.addEventListener("click", () => drawCard.classList.toggle("flipped"));

/* ---- overlay closing ---- */
document.querySelectorAll(".overlay").forEach(ov => {
  ov.querySelectorAll("[data-close]").forEach(b =>
    b.addEventListener("click", () => ov.classList.add("hidden")));
  ov.addEventListener("click", e => { if (e.target === ov) ov.classList.add("hidden"); });
});
document.addEventListener("keydown", e => {
  const open = [...document.querySelectorAll(".overlay:not(.hidden)")].pop();
  if (!open) return;
  if (e.key === "Escape") open.classList.add("hidden");
  if (open === viewer) {
    if (e.key === "ArrowLeft") stepCard(-1);
    if (e.key === "ArrowRight") stepCard(1);
    if (e.key === " " || e.key === "Enter") {
      if (viewerList[viewerIdx]?.back) { e.preventDefault(); flipCard.classList.toggle("flipped"); }
    }
  }
});

/* ---- go ---- */
renderPassport();
route();
