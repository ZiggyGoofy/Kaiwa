// Kaiwa — navigation et espace d'apprentissage hors ligne (Mot du jour, Kana, Phrases, Cartes, Quiz).
// Utilise les fonctions globales de app.js : $, esc, toRuby, toPlain, speak, newConversation, openSettings.

const LEARN = "kaiwa-learn-v1";
let learn = { known: {}, best: {}, bestPts: {}, points: 0, days: {}, dir: "ja", kanaSet: "hira", lastView: null, ...load(LEARN, {}) };
const saveLearn = () => { try { localStorage.setItem(LEARN, JSON.stringify(learn)); } catch {} };

// ---------- Points ----------
const LEVEL_STEP = 200;
const levelOf = (p) => Math.floor(p / LEVEL_STEP) + 1;
function updatePill() { $("ptsPill").textContent = "⭐ " + fmt(learn.points); }
function addPoints(n) {
  const before = levelOf(learn.points);
  learn.points += n; saveLearn(); updatePill(); pop($("ptsPill"));
  return levelOf(learn.points) > before; // vrai si on vient de passer un niveau
}

// ---------- Dates / mot du jour ----------
const pad2 = (n) => String(n).padStart(2, "0");
const dkey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayIndex = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
// pas de 23 (premier avec 62) : aucun mot ne revient avant d'avoir vu toute la liste
const wordFor = (d) => WORDS_OF_DAY[(dayIndex(d) * 23) % WORDS_OF_DAY.length];
function dayStreak() {
  let d = startOfDay(new Date()), n = 0;
  if (!learn.days[dkey(d)]) d.setDate(d.getDate() - 1);
  while (learn.days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const kanaOf = (k, set) => (set === "kata" ? toKata(k) : k);

// ---------- Paquets de cartes ----------
function kanaItems(set) {
  return [...KANA_ROWS, ...KANA_DAKUTEN, ...KANA_COMBO].flat().filter(Boolean)
    .map(([k, r]) => ({ id: k, ja: kanaOf(k, set), romaji: r, fr: "" }));
}
const listItems = (src, key) => src[key].items.map(([ja, romaji, fr], i) => ({ id: String(i), ja, romaji, fr }));

const DECKS = {};
const GROUP_NAMES = { Kana: "Kana", Particules: L("Particules", "Particles"), Vocabulaire: L("Vocabulaire", "Vocabulary"), Calendrier: L("Calendrier", "Calendar"), Phrases: "Phrases" };
DECKS["kana:hira"] = { group: "Kana", title: "Hiragana", icon: "あ", items: () => kanaItems("hira") };
DECKS["kana:kata"] = { group: "Kana", title: "Katakana", icon: "ア", items: () => kanaItems("kata") };
const particleItems = (k) => PARTICLES[k].items.map(([ja, answer, wrong, romaji, fr, why], i) => ({ id: k + i, ja, answer, wrong: wrong.split("|"), romaji, fr, why }));
for (const k in PARTICLES) DECKS["part:" + k] = { group: "Particules", kind: "particle", title: PARTICLES[k].title, icon: PARTICLES[k].icon, items: () => particleItems(k) };
DECKS["part:mix"] = { group: "Particules", kind: "particle", title: L("Tout mélangé", "All mixed"), icon: "🔀", items: () => Object.keys(PARTICLES).flatMap(particleItems) };
const VOCAB_ICONS = { nombres: "一", temps: "日", nourriture: "食", lieux: "駅", verbes: "行", adjectifs: "大", personnes: "人", liaison: "話", questions: "何", quotidien: "生", verbes2: "会", adjectifs2: "好", reactions: "笑" };
const PHRASE_ICONS = { essentiels: "👋", presentation: "🙋", cafe: "☕", courses: "🛍️", chemin: "🧭", loisirs: "🎮", journee: "🌅", voyage: "✈️" };
for (const k in VOCAB) DECKS["vocab:" + k] = { group: "Vocabulaire", title: VOCAB[k].title, icon: VOCAB_ICONS[k] || "語", items: () => listItems(VOCAB, k) };
DECKS["cal:mots"] = {
  group: "Calendrier", title: L("Mes mots du jour", "My words of the day"), icon: "暦",
  items: () => [...new Set(Object.keys(learn.days).map((k) => wordFor(fromKey(k))))].map(([ja, romaji, fr]) => ({ id: ja, ja, romaji, fr })),
};
for (const k in PHRASES) DECKS["phr:" + k] = { group: "Phrases", title: PHRASES[k].title, icon: PHRASE_ICONS[k] || "💬", items: () => listItems(PHRASES, k) };

const knownSet = (deck) => new Set(learn.known[deck] || []);

// ---------- Navigation ----------
const VIEWS = ["chat", "kana", "phrases", "cards", "quiz"];
const renderers = {};
function showView(name) {
  if (!VIEWS.includes(name)) name = "chat";
  for (const v of VIEWS) $("view-" + v).hidden = v !== name;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.body.dataset.view = name;
  learn.lastView = name; saveLearn();
  if (renderers[name]) renderers[name]();
  if (name === "chat") chat.scrollTop = chat.scrollHeight;
}
document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => showView(b.dataset.view)));

function practiceWithSakura(theme) {
  const key = theme === "essentiels" ? "libre" : theme;
  showView("chat");
  if (!hasKey()) { openSettings(); return; }
  state.scenario = key; $("scenario").value = key; save();
  newConversation();
}

function pop(el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }

// ---------- Mot du jour + calendrier ----------
const monthName = (d) => d.toLocaleDateString(LOCALE, { month: "long" });
const cal = { month: null, sel: null };
renderers.jour = function () {
  const v = $("view-jour"), today = startOfDay(new Date());
  cal.sel ||= today;
  cal.month ||= new Date(today.getFullYear(), today.getMonth(), 1);
  const sel = cal.sel, w = wordFor(sel), key = dkey(sel), learned = !!learn.days[key];
  const isToday = key === dkey(today);
  const dateLabel = sel.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
  const nLearned = Object.keys(learn.days).length;

  // grille du mois
  const m = cal.month, first = new Date(m.getFullYear(), m.getMonth(), 1);
  const nDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // lundi en premier
  let cells = L("LMMJVSD", "MTWTFSS").split("").map((d) => `<span class="cal-wd">${d}</span>`).join("");
  cells += `<span class="cal-day blank"></span>`.repeat(offset);
  for (let i = 1; i <= nDays; i++) {
    const d = new Date(m.getFullYear(), m.getMonth(), i), k = dkey(d);
    const future = d > today;
    const cls = ["cal-day", future && "locked", learn.days[k] && "learned", k === dkey(today) && "today", k === key && "sel"].filter(Boolean).join(" ");
    cells += future
      ? `<span class="${cls}"><span class="dn">${i}</span><span class="dw">🔒</span></span>`
      : `<button class="${cls}" data-k="${k}"><span class="dn">${i}</span><span class="dw" lang="ja">${learn.days[k] ? "✓" : esc(toPlain(wordFor(d)[0]))}</span></button>`;
  }
  const atCurrentMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();

  v.innerHTML = `
    <div class="panel-title"><h2>${isToday ? L("Mot du jour", "Word of the day") : L(`Mot du ${sel.getDate()} ${monthName(sel)}`, `Word of ${monthName(sel)} ${sel.getDate()}`)}</h2><p>${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p></div>
    <div class="wotd ${learned ? "is-learned" : ""}">
      ${learned ? `<span class="stamp">✓ ${L("Appris", "Learned")}</span>` : ""}
      <div class="big-ja" lang="ja">${toRuby(w[0])}</div>
      <div class="romaji">${esc(w[1])}</div>
      <div class="big-fr">${esc(w[2])}</div>
      <div class="example">
        <button class="say" id="wEx" title="${L("Écouter l'exemple", "Listen to the example")}">🔊</button>
        <div><div class="ja" lang="ja">${toRuby(w[3])}</div><div class="fr">${esc(w[4])}</div></div>
      </div>
      <div class="cta-row">
        <button class="btn" id="wSay">🔊 ${L("Écouter", "Listen")}</button>
        ${learned ? "" : `<button class="btn gold" id="wLearn">✓ ${L("Je l'ai appris", "I learned it")} <small>+20 ⭐</small></button>`}
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>🔥 ${dayStreak()}</b><span>${P(dayStreak(), "jour d'affilée", "jours d'affilée", "day in a row", "days in a row")}</span></div>
      <div class="stat"><b>📚 ${nLearned}</b><span>${P(nLearned, "mot appris", "mots appris", "word learned", "words learned")}</span></div>
      <div class="stat"><b>⭐ ${fmt(learn.points)}</b><span>${L("niveau", "level")} ${levelOf(learn.points)}</span></div>
    </div>
    <div class="cal">
      <div class="cal-head">
        <button class="btn small" id="calPrev" title="${L("Mois précédent", "Previous month")}">‹</button>
        <strong>${monthName(m)} ${m.getFullYear()}</strong>
        <button class="btn small" id="calNext" title="${L("Mois suivant", "Next month")}" ${atCurrentMonth ? "disabled" : ""}>›</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <p class="cal-help">${L("Touche un jour passé pour revoir son mot. Les jours ✓ sont ajoutés au paquet « Mes mots du jour » dans Cartes.", "Tap a past day to see its word again. Days marked ✓ are added to the \"My words of the day\" deck in Cards.")}</p>
    </div>`;

  $("wSay").onclick = () => speak(toPlain(w[0]));
  $("wEx").onclick = (e) => { speak(toPlain(w[3])); pop(e.currentTarget); };
  $("wLearn") && ($("wLearn").onclick = () => {
    learn.days[key] = true; saveLearn();
    const up = addPoints(20);
    renderers.jour(); updateWotdDot();
    pop(document.querySelector(".stamp"));
    if (up) toast(L(`🎉 Niveau ${levelOf(learn.points)} atteint !`, `🎉 Level ${levelOf(learn.points)} reached!`));
  });
  $("calPrev").onclick = () => { cal.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); renderers.jour(); };
  $("calNext").onclick = () => { if (!atCurrentMonth) { cal.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); renderers.jour(); } };
  v.querySelectorAll("button.cal-day").forEach((b) => (b.onclick = () => { cal.sel = fromKey(b.dataset.k); renderers.jour(); v.scrollTo({ top: 0, behavior: "smooth" }); }));
};

// Fenêtre « Mot du jour », ouverte depuis le bouton de la page Sakura
function openWotd() {
  cal.sel = null; cal.month = null; // revient toujours sur aujourd'hui
  renderers.jour();
  $("wotdDialog").showModal();
  $("view-jour").scrollTop = 0;
}
function updateWotdDot() { $("wotdDot").hidden = !!learn.days[dkey(new Date())]; }
$("btnWotd").onclick = openWotd;
$("wotdClose").onclick = () => $("wotdDialog").close();
$("wotdDialog").addEventListener("click", (e) => { if (e.target === $("wotdDialog")) $("wotdDialog").close(); });

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  ($("wotdDialog").open ? $("wotdDialog") : document.body).appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Kana ----------
renderers.kana = function () {
  const v = $("view-kana"), set = learn.kanaSet;
  const grid = (rows, cols) => `<div class="kana-grid" style="--cols:${cols}">` + rows.flat().map((c) =>
    c ? `<button class="kana" data-k="${kanaOf(c[0], set)}"><b lang="ja">${kanaOf(c[0], set)}</b><small>${c[1]}</small></button>` : `<span class="kana empty"></span>`
  ).join("") + "</div>";
  v.innerHTML = `
    <div class="panel-title"><h2>Kana</h2><p>${L("Touche un caractère pour voir sa fiche : prononciation, mot d'exemple et traduction.", "Tap a character to open its card: pronunciation, example word and translation.")}</p></div>
    <div class="seg">
      <button data-set="hira" class="${set === "hira" ? "on" : ""}">ひらがな Hiragana</button>
      <button data-set="kata" class="${set === "kata" ? "on" : ""}">カタカナ Katakana</button>
    </div>
    <h3 class="sec">${L("De base", "Basic")}</h3>${grid(KANA_ROWS, 5)}
    <h3 class="sec">${L("Avec ゛ et ゜ (dakuten)", "With ゛ and ゜ (dakuten)")}</h3>${grid(KANA_DAKUTEN, 5)}
    <h3 class="sec">${L("Combinaisons", "Combinations")}</h3>${grid(KANA_COMBO, 3)}
    <div class="cta-row">
      <button class="btn gold" id="kanaCards">🃏 ${L("Réviser en cartes", "Review with cards")}</button>
      <button class="btn" id="kanaQuiz">🏆 ${L("Faire le quiz", "Take the quiz")}</button>
    </div>`;
  v.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { learn.kanaSet = b.dataset.set; saveLearn(); renderers.kana(); }));
  v.querySelectorAll("button.kana").forEach((b) => (b.onclick = () => { pop(b); openKana(b.dataset.k); }));
  $("kanaCards").onclick = () => { showView("cards"); openDeck("kana:" + set); };
  $("kanaQuiz").onclick = () => { showView("quiz"); startQuiz(set); };
};

// ---------- Fiche d'un kana (style Renshuu) ----------
let kanaList = [], kanaPos = 0;
function openKana(ch) {
  const set = learn.kanaSet;
  kanaList = [...KANA_ROWS, ...KANA_DAKUTEN, ...KANA_COMBO].flat().filter(Boolean).map(([k, r]) => [kanaOf(k, set), r]);
  kanaPos = Math.max(0, kanaList.findIndex(([k]) => k === ch));
  renderKanaDetail(true);
  if (!$("kanaDialog").open) $("kanaDialog").showModal();
}
// [と]もだち → と en surbrillance
const hl = (s) => esc(s).replace(/\[(.+?)\]/g, '<b class="hl">$1</b>');
const unbracket = (s) => s.replace(/[\[\]]/g, "");
function renderKanaDetail(sayIt) {
  const [ch, rom] = kanaList[kanaPos], ex = KANA_EX[ch];
  const script = learn.kanaSet === "kata" ? "katakana" : "hiragana";
  const word = ex ? unbracket(ex[0]) : "";
  $("kanaDetail").innerHTML = `
    <div class="kd-head"><b>${esc(rom)}</b> <span>(${script})</span></div>
    <div class="kd-main">
      <button class="kd-nav" id="kdPrev" ${kanaPos === 0 ? "disabled" : ""} title="${L("Précédent", "Previous")}">‹</button>
      <button class="kd-char" id="kdChar" lang="ja" title="${L("Écouter", "Listen")}">${esc(ch)}</button>
      <button class="kd-nav" id="kdNext" ${kanaPos === kanaList.length - 1 ? "disabled" : ""} title="${L("Suivant", "Next")}">›</button>
    </div>
    ${ex ? `
    <div class="kd-example">
      <div class="kd-word">
        <div class="kd-rom">(${hl(ex[1])})</div>
        <div class="kd-kana" lang="ja"><span class="kd-w">${hl(ex[0])}</span><button class="kd-say" id="kdSayWord" title="${L("Écouter le mot", "Listen to the word")}">🔊</button></div>
        ${ex[2] ? `<div class="kd-kanji" lang="ja">${esc(ex[2])}</div>` : ""}
      </div>
      <button class="kd-pic" id="kdPic" title="${L("Écouter le mot", "Listen to the word")}">${ex[5]}<span class="kd-say-small">🔊</span></button>
      <div class="kd-tr">${esc(L(ex[3], ex[4]))}</div>
    </div>` : `<p class="kd-none">${L("Ce kana est très rare : pas de mot courant à montrer.", "This kana is very rare: no common word to show.")}</p>`}
    <div class="kd-count">${kanaPos + 1} / ${kanaList.length}</div>`;
  $("kdChar").onclick = () => { speak(ch); pop($("kdChar")); };
  if (ex) {
    $("kdSayWord").onclick = () => speak(word);
    $("kdPic").onclick = () => { speak(word); pop($("kdPic")); };
  }
  $("kdPrev").onclick = () => { if (kanaPos > 0) { kanaPos--; renderKanaDetail(true); } };
  $("kdNext").onclick = () => { if (kanaPos < kanaList.length - 1) { kanaPos++; renderKanaDetail(true); } };
  if (sayIt) speak(ch);
}
$("kanaClose").onclick = () => $("kanaDialog").close();
$("kanaDialog").addEventListener("click", (e) => { if (e.target === $("kanaDialog")) $("kanaDialog").close(); });
document.addEventListener("keydown", (e) => {
  if (!$("kanaDialog").open) return;
  if (e.key === "ArrowLeft") $("kdPrev").click();
  if (e.key === "ArrowRight") $("kdNext").click();
});
// balayage gauche / droite sur téléphone
(() => {
  let x0 = null;
  $("kanaDialog").addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  $("kanaDialog").addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) (dx < 0 ? $("kdNext") : $("kdPrev")).click();
  });
})();

// ---------- Phrases ----------
let phraseTheme = "essentiels";
renderers.phrases = function () {
  const v = $("view-phrases"), t = PHRASES[phraseTheme];
  v.innerHTML = `
    <div class="panel-title"><h2>${L("Phrases utiles", "Useful phrases")}</h2><p>${L("Écoute, répète à voix haute, puis entraîne-toi avec Sakura.", "Listen, repeat out loud, then practice with Sakura.")}</p></div>
    <div class="chips">${Object.entries(PHRASES).map(([k, p]) => `<button data-k="${k}" class="${k === phraseTheme ? "on" : ""}">${esc(p.title)}</button>`).join("")}</div>
    <div class="phrase-list">${t.items.map(([ja, ro, fr], i) => `
      <div class="phrase">
        <button class="say" data-i="${i}" title="${L("Écouter", "Listen")}">🔊</button>
        <div><div class="ja" lang="ja">${toRuby(ja)}</div><div class="romaji">${esc(ro)}</div><div class="fr">${esc(fr)}</div></div>
      </div>`).join("")}</div>
    <div class="cta-row">
      <button class="btn gold" id="phrSakura">🌸 ${L("Pratiquer ce thème avec Sakura", "Practice this topic with Sakura")}</button>
      <button class="btn" id="phrCards">🃏 ${L("Réviser en cartes", "Review with cards")}</button>
    </div>`;
  v.querySelectorAll(".chips button").forEach((b) => (b.onclick = () => { phraseTheme = b.dataset.k; renderers.phrases(); }));
  v.querySelectorAll(".say").forEach((b) => (b.onclick = () => { speak(toPlain(t.items[b.dataset.i][0])); pop(b); }));
  $("phrSakura").onclick = () => practiceWithSakura(phraseTheme);
  $("phrCards").onclick = () => { showView("cards"); openDeck("phr:" + phraseTheme); };
};

// ---------- Cartes (flashcards) ----------
let session = null; // { deck, items, queue, flipped, done }

renderers.cards = function () { session ? renderCard() : renderDecks(); };

function renderDecks() {
  const v = $("view-cards");
  const groups = {};
  for (const [id, d] of Object.entries(DECKS)) (groups[d.group] ||= []).push([id, d]);
  v.innerHTML = `
    <div class="panel-title"><h2>${L("Cartes", "Cards")}</h2><p>${L("Retourne la carte, puis dis si tu savais. Les cartes « à revoir » reviennent plus vite.", "Flip the card, then say whether you knew it. Cards marked \"review\" come back sooner.")}</p></div>
    <div class="seg">
      <button data-dir="ja" class="${learn.dir === "ja" ? "on" : ""}">${L("🇯🇵 JA → FR 🇫🇷", "🇯🇵 JA → EN 🇬🇧")}</button>
      <button data-dir="fr" class="${learn.dir === "fr" ? "on" : ""}">${L("🇫🇷 FR → JA 🇯🇵", "🇬🇧 EN → JA 🇯🇵")}</button>
    </div>` +
    Object.entries(groups).map(([g, decks]) => {
      decks = decks.filter(([, d]) => d.items().length);
      if (!decks.length) return "";
      return `<h3 class="sec">${GROUP_NAMES[g] || g}</h3>${g === "Particules" ? PARTICLE_MEMO : ""}<div class="deck-grid">` + decks.map(([id, d]) => {
      const total = d.items().length, known = [...knownSet(id)].filter((x) => d.items().some((it) => it.id === x)).length, pct = Math.round((known / total) * 100);
      return `<button class="deck ${known === total ? "done" : ""}" data-id="${id}">
        <span class="deck-icon" lang="ja">${esc(d.icon)}</span>
        <span class="deck-title">${esc(d.title)}</span>
        <span class="bar"><i style="width:${pct}%"></i></span>
        <span class="deck-count">${known === total ? L("★ Maîtrisé", "★ Mastered") : `${known}/${total}`}</span>
      </button>`;
    }).join("") + "</div>";
    }).join("");
  v.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { learn.dir = b.dataset.dir; saveLearn(); renderDecks(); }));
  v.querySelectorAll(".deck").forEach((b) => (b.onclick = () => openDeck(b.dataset.id)));
}

function openDeck(id, all = false) {
  const items = DECKS[id].items(), known = knownSet(id);
  let queue = items.filter((it) => !known.has(it.id));
  const review = all || !queue.length;
  if (review) queue = items;
  session = { deck: id, items, queue: shuffle(queue), flipped: false, review };
  renderCard();
}

function cardFaces(it) {
  const jaSide = `<div class="big-ja" lang="ja">${toRuby(it.ja)}</div>`;
  const kana = !it.fr;
  if (learn.dir === "ja") {
    return {
      front: jaSide,
      back: kana ? `<div class="big-ja">${esc(it.romaji)}</div>` : `${jaSide}<div class="romaji">${esc(it.romaji)}</div><div class="big-fr">${esc(it.fr)}</div>`,
    };
  }
  return {
    front: `<div class="big-fr">${esc(kana ? it.romaji : it.fr)}</div>`,
    back: `${jaSide}${kana ? "" : `<div class="romaji">${esc(it.romaji)}</div>`}`,
  };
}

function renderCard() {
  if (DECKS[session.deck].kind === "particle" && session.queue.length) return renderParticle();
  const v = $("view-cards"), s = session, d = DECKS[s.deck];
  const total = s.items.length, known = knownSet(s.deck).size;
  const head = `<div class="deck-head">
      <button class="btn small" id="cardBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>${esc(d.title)}</strong><div class="muted">${s.review ? L("Révision complète", "Full review") : `${L("Maîtrisées :", "Mastered:")} ${known}/${total}`}</div></div>
    </div>`;
  if (!s.queue.length) {
    v.innerHTML = head + `<div class="finish">
      <div class="finish-icon">🎉</div><h2>${L("Paquet terminé !", "Deck finished!")}</h2>
      <p>${known === total ? L("Tu maîtrises toutes les cartes de ce paquet.", "You've mastered every card in this deck.") : L(`${known}/${total} cartes maîtrisées.`, `${known}/${total} cards mastered.`)}</p>
      ${s.pts ? `<div class="points-won">+${s.pts} ⭐</div>` : ""}
      <div class="cta-row">
        <button class="btn gold" id="cardAgain">${known === total ? L("Tout revoir", "Review all") : L("Continuer", "Continue")}</button>
        <button class="btn" id="cardReset">${L("Réinitialiser", "Reset")}</button>
      </div></div>`;
    $("cardAgain").onclick = () => openDeck(s.deck, known === total);
    $("cardReset").onclick = () => { delete learn.known[s.deck]; saveLearn(); openDeck(s.deck); };
    $("cardBack").onclick = closeDeck;
    return;
  }
  const it = s.queue[0], f = cardFaces(it);
  v.innerHTML = head + `
    <div class="card-stage">
      <div class="left-count">${s.queue.length} ${P(s.queue.length, "restante", "restantes", "left", "left")}</div>
      <div class="flip ${s.flipped ? "flipped" : ""}" id="flip" role="button" tabindex="0" aria-label="${L("Retourner la carte", "Flip the card")}">
        <div class="face front">${f.front}<span class="hint">${L("Touche pour retourner", "Tap to flip")}</span></div>
        <div class="face back">${f.back}<button class="say-btn" id="cardSay" title="${L("Écouter", "Listen")}">🔊</button></div>
      </div>
      <div class="answer ${s.flipped ? "" : "invisible"}">
        <button class="btn red" id="cardAgainOne">😕 ${L("À revoir", "Review")}</button>
        <button class="btn green" id="cardKnow">😊 ${L("Je savais", "I knew it")}</button>
      </div>
    </div>`;
  const flip = () => { if (s.flipped) return; s.flipped = true; renderCard(); speak(toPlain(it.ja)); };
  $("flip").onclick = flip;
  $("flip").onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  $("cardSay").onclick = (e) => { e.stopPropagation(); speak(toPlain(it.ja)); };
  $("cardAgainOne").onclick = () => { s.queue.shift(); s.queue.splice(Math.min(3, s.queue.length), 0, it); s.flipped = false; renderCard(); };
  $("cardKnow").onclick = () => {
    const k = knownSet(s.deck); k.add(it.id); learn.known[s.deck] = [...k]; saveLearn();
    s.queue.shift(); s.flipped = false; renderCard();
  };
  $("cardBack").onclick = closeDeck;
}
function closeDeck() { session = null; renderDecks(); }

// ---------- Particules : phrases à trous ----------
const MEMO_ROWS = [
  ["は", "wa", "thème : « quant à… »", "topic: \"as for…\""],
  ["が", "ga", "sujet ; avec 好き, 分かる, いる/ある ; après 誰, 何", "subject; with 好き, 分かる, いる/ある; after 誰, 何"],
  ["を", "o", "complément d'objet direct", "direct object"],
  ["に", "ni", "heure précise, destination, lieu où l'on est, « à qui »", "specific time, destination, where something is, \"to whom\""],
  ["で", "de", "lieu d'une action, moyen, outil", "place of an action, means, tool"],
  ["へ", "e", "direction (« vers »)", "direction (\"towards\")"],
  ["と", "to", "« avec » une personne ; « et » (liste complète)", "\"with\" a person; \"and\" (complete list)"],
  ["や", "ya", "« et » (liste incomplète)", "\"and\" (incomplete list)"],
  ["も", "mo", "« aussi » (remplace は, が, を)", "\"too / also\" (replaces は, が, を)"],
  ["の", "no", "« de » entre deux noms (possession)", "links two nouns (possession: \"'s\")"],
  ["から / まで", "kara / made", "« depuis » / « jusqu'à » ; から = « parce que »", "\"from\" / \"until\"; から = \"because\""],
  ["か / ね", "ka / ne", "fin de phrase : question / « n'est-ce pas ? »", "end of sentence: question / \"right?\""],
];
const PARTICLE_MEMO = `<details class="memo">
  <summary>📖 ${L("Mémo des particules", "Particle cheat sheet")}</summary>
  <table>${MEMO_ROWS.map(([p, r, fr, en]) => `<tr><td lang="ja">${p}</td><td>${r}</td><td>${esc(L(fr, en))}</td></tr>`).join("")}</table>
</details>`;

function renderParticle() {
  const v = $("view-cards"), s = session, d = DECKS[s.deck], it = s.queue[0];
  const total = s.items.length, known = knownSet(s.deck).size;
  if (!it.options) it.options = shuffle([it.answer, ...it.wrong]);
  const pick = s.picked, done = pick != null, ok = pick === it.answer;
  const blank = done
    ? `<span class="blank filled ${ok ? "good" : "bad"}">${esc(it.answer)}</span>`
    : `<span class="blank">？</span>`;
  const sentence = toRuby(it.ja).replace("＿", blank);
  const romaji = esc(it.romaji).replace("__", done ? `<b>${PARTICLE_ROMAJI[it.answer]}</b>` : "___");
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="cardBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>${L("Particules", "Particles")} · ${esc(d.title)}</strong><div class="muted">${s.review ? L("Révision complète", "Full review") : `${L("Maîtrisées :", "Mastered:")} ${known}/${total}`} · ${s.queue.length} ${P(s.queue.length, "restante", "restantes", "left", "left")}</div></div>
      <span class="qpts">⭐ ${s.pts || 0}</span>
    </div>
    <div class="part-card ${done ? (ok ? "good" : "bad") : ""}">
      <div class="part-ja" lang="ja">${sentence}</div>
      <div class="romaji">${romaji}</div>
      <div class="part-fr">${esc(it.fr)}</div>
      ${done && ok ? `<span class="gain">+5</span>` : ""}
    </div>
    <div class="options part-opts">${it.options.map((o) => {
      const cls = !done ? "" : o === it.answer ? "right" : o === pick ? "wrong" : "dim";
      return `<button class="opt ${cls}" ${done ? "disabled" : ""}><span lang="ja">${esc(o)}</span><small>${PARTICLE_ROMAJI[o]}</small></button>`;
    }).join("")}</div>
    ${done ? `
      <div class="why ${ok ? "good" : "bad"}"><b>${ok ? L("✓ Bravo !", "✓ Well done!") : L("✗ Pas tout à fait.", "✗ Not quite.")}</b> ${esc(it.why)}</div>
      <div class="cta-row">
        <button class="btn" id="partSay">🔊 ${L("Écouter", "Listen")}</button>
        <button class="btn gold" id="partNext">${L("Suivant →", "Next →")}</button>
      </div>` : ""}`;

  v.querySelectorAll(".opt").forEach((b, i) => (b.onclick = () => {
    s.picked = it.options[i];
    if (s.picked === it.answer) {
      const k = knownSet(s.deck); k.add(it.id); learn.known[s.deck] = [...k]; saveLearn();
      s.pts = (s.pts || 0) + 5; addPoints(5);
    }
    renderParticle();
    speakParticle(it);
  }));
  if (done) {
    $("partSay").onclick = () => speakParticle(it);
    $("partNext").onclick = () => {
      s.queue.shift();
      if (!ok) s.queue.splice(Math.min(3, s.queue.length), 0, it); // une erreur revient 3 phrases plus loin
      it.options = null; s.picked = null;
      renderCard();
    };
  }
  $("cardBack").onclick = closeDeck;
}

function speakParticle(it) {
  speak(toPlain(it.ja.replace("＿", it.answer)).replace(/[AB]：/g, ""));
}

// Raccourcis clavier sur PC : espace = retourner, ← = à revoir, → = je savais
document.addEventListener("keydown", (e) => {
  if (document.body.dataset.view !== "cards" || !session || e.target.matches("input, textarea, select")) return;
  if (e.key === "ArrowLeft") $("cardAgainOne")?.click();
  if (e.key === "ArrowRight") $("cardKnow")?.click();
  if (e.key === " " && !session.flipped) { e.preventDefault(); $("flip")?.click(); }
  if (DECKS[session.deck].kind === "particle") {
    if (/^[1-4]$/.test(e.key)) document.querySelectorAll(".part-opts .opt")[e.key - 1]?.click();
    if (e.key === "Enter") $("partNext")?.click();
  }
});

// ---------- Quiz ----------
const QUIZ_LEN = 10;
const QUIZ_MODES = {
  hira: { title: "Hiragana", icon: "あ", desc: L("Trouve la bonne lecture", "Find the right reading") },
  kata: { title: "Katakana", icon: "ア", desc: L("Trouve la bonne lecture", "Find the right reading") },
  vocab: { title: L("Vocabulaire", "Vocabulary"), icon: "語", desc: L("Trouve la bonne traduction", "Find the right translation") },
};
let quiz = null;

renderers.quiz = function () { quiz ? renderQuestion() : renderQuizHome(); };

function renderQuizHome() {
  $("view-quiz").innerHTML = `
    <div class="panel-title"><h2>Quiz</h2><p>${L(`${QUIZ_LEN} questions. Bonne réponse : 10 ⭐, plus un bonus de série. Sans faute : +50 ⭐ !`, `${QUIZ_LEN} questions. Right answer: 10 ⭐, plus a streak bonus. Perfect score: +50 ⭐!`)}</p></div>
    <div class="level-card">
      <div class="lvl-badge"><small>${L("NIV.", "LVL")}</small>${levelOf(learn.points)}</div>
      <div class="lvl-info">
        <strong>⭐ ${fmt(learn.points)} points</strong>
        <span class="bar"><i style="width:${((learn.points % LEVEL_STEP) / LEVEL_STEP) * 100}%"></i></span>
        <span class="muted">${L(`${LEVEL_STEP - (learn.points % LEVEL_STEP)} points avant le niveau ${levelOf(learn.points) + 1}`, `${LEVEL_STEP - (learn.points % LEVEL_STEP)} points to level ${levelOf(learn.points) + 1}`)}</span>
      </div>
    </div>
    <div class="mode-list">${Object.entries(QUIZ_MODES).map(([k, m]) => `
      <button class="mode" data-k="${k}">
        <span class="deck-icon" lang="ja">${m.icon}</span>
        <span><span class="deck-title">${m.title}</span><span class="muted">${m.desc}</span></span>
        <span class="best">${learn.best[k] != null ? `${stars(learn.best[k])}<br><small>${L("Record :", "Best:")} ${learn.bestPts[k] ?? 0} ⭐</small>` : L("Nouveau", "New")}</span>
      </button>`).join("")}</div>`;
  document.querySelectorAll(".mode").forEach((b) => (b.onclick = () => startQuiz(b.dataset.k)));
}

function stars(score) {
  const n = score >= QUIZ_LEN ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0;
  return "★".repeat(n) + "☆".repeat(3 - n);
}

function quizPool(mode) {
  if (mode === "vocab") return Object.values(VOCAB).flatMap((c) => c.items.map(([ja, romaji, fr]) => ({ q: ja, a: fr, say: toPlain(ja), sub: romaji })));
  return [...KANA_ROWS, ...KANA_DAKUTEN].flat().filter(Boolean)
    .filter(([k]) => k !== "ぢ" && k !== "づ") // même lecture que じ / ず
    .map(([k, r]) => ({ q: kanaOf(k, mode), a: r, say: kanaOf(k, mode) }));
}

function startQuiz(mode) {
  const pool = quizPool(mode);
  const qs = shuffle(pool).slice(0, QUIZ_LEN).map((item) => {
    const wrong = shuffle([...new Set(pool.map((p) => p.a).filter((a) => a !== item.a))]).slice(0, 3);
    return { ...item, options: shuffle([item.a, ...wrong]) };
  });
  quiz = { mode, qs, i: 0, score: 0, streak: 0, pts: 0, gain: 0, answered: null };
  renderQuestion();
}

function renderQuestion() {
  const v = $("view-quiz"), z = quiz;
  if (z.i >= z.qs.length) {
    if (!z.finished) {
      z.finished = true;
      z.bonus = z.score === QUIZ_LEN ? 50 : 0;
      z.pts += z.bonus;
      z.levelUp = addPoints(z.pts);
      z.prevPts = learn.bestPts[z.mode] ?? -1;
      if (z.score > (learn.best[z.mode] ?? -1)) learn.best[z.mode] = z.score;
      if (z.pts > z.prevPts) learn.bestPts[z.mode] = z.pts;
      saveLearn();
    }
    const record = z.pts > z.prevPts && z.prevPts >= 0;
    v.innerHTML = `<div class="finish">
      <div class="stars">${stars(z.score)}</div>
      <h2>${z.score}/${QUIZ_LEN} ${L("bonnes réponses", "correct answers")}</h2>
      <div class="points-won">+${z.pts} ⭐</div>
      ${z.bonus ? `<p>${L(`Dont +${z.bonus} ⭐ de bonus sans faute !`, `Including a +${z.bonus} ⭐ perfect-score bonus!`)}</p>` : ""}
      <p>${record ? L("🏅 Nouveau record de points ! ", "🏅 New points record! ") : ""}${z.score === QUIZ_LEN ? L("Parfait !", "Perfect!") : z.score >= 7 ? L("Très bien !", "Great job!") : L("Continue, ça vient !", "Keep going, you're getting there!")}</p>
      ${z.levelUp ? `<p class="lvl-up">${L(`🎉 Niveau ${levelOf(learn.points)} atteint !`, `🎉 Level ${levelOf(learn.points)} reached!`)}</p>` : ""}
      <p class="muted">${L("Total :", "Total:")} ${fmt(learn.points)} ⭐ · ${L("niveau", "level")} ${levelOf(learn.points)}</p>
      <div class="cta-row">
        <button class="btn gold" id="qAgain">${L("Rejouer", "Play again")}</button>
        <button class="btn" id="qHome">${L("Autres quiz", "Other quizzes")}</button>
      </div></div>`;
    $("qAgain").onclick = () => startQuiz(z.mode);
    $("qHome").onclick = () => { quiz = null; renderQuizHome(); };
    return;
  }
  const q = z.qs[z.i], a = z.answered;
  v.innerHTML = `
    <div class="quiz-head">
      <button class="btn small" id="qQuit">✕</button>
      <div class="bar big"><i style="width:${(z.i / QUIZ_LEN) * 100}%"></i></div>
      <span class="streak ${z.streak >= 3 ? "hot" : ""}">🔥 ${z.streak}</span>
      <span class="qpts">⭐ ${z.pts}</span>
    </div>
    <div class="quiz-q ${a ? (a === q.a ? "good" : "bad") : ""}">
      <div class="big-ja" lang="ja">${toRuby(q.q)}</div>
      ${a && q.sub ? `<div class="romaji">${esc(q.sub)}</div>` : ""}
      ${a && a === q.a ? `<span class="gain">+${z.gain}</span>` : ""}
    </div>
    <div class="options">${q.options.map((o) => {
      const cls = !a ? "" : o === q.a ? "right" : o === a ? "wrong" : "dim";
      return `<button class="opt ${cls}" ${a ? "disabled" : ""}>${esc(o)}</button>`;
    }).join("")}</div>
    ${a && a !== q.a ? `<div class="cta-row"><button class="btn gold" id="qNext">${L("Suivant →", "Next →")}</button></div>` : ""}`;
  $("qQuit").onclick = () => {
    if (z.pts && !confirm(L(`Quitter ? Les ${z.pts} ⭐ de cette partie seront perdus.`, `Quit? The ${z.pts} ⭐ from this round will be lost.`))) return;
    quiz = null; renderQuizHome();
  };
  v.querySelectorAll(".opt").forEach((b, idx) => (b.onclick = () => {
    const pick = q.options[idx];
    z.answered = pick;
    speak(q.say);
    if (pick === q.a) {
      z.score++; z.streak++;
      z.gain = 10 + Math.min(z.streak - 1, 5) * 2; // bonus de série : jusqu'à +10
      z.pts += z.gain;
      renderQuestion();
      setTimeout(() => { if (quiz === z && z.answered) { z.i++; z.answered = null; renderQuestion(); } }, 900);
    } else {
      z.streak = 0;
      renderQuestion();
    }
  }));
  $("qNext") && ($("qNext").onclick = () => { z.i++; z.answered = null; renderQuestion(); });
}

// ---------- Démarrage ----------
updatePill();
showView(learn.lastView || "chat");
updateWotdDot();
