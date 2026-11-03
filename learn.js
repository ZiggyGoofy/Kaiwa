// Kaiwa — navigation et espace d'apprentissage hors ligne (Mot du jour, Kana, Kanji, Cartes, Quiz).
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
const KJ_GROUP_SIZE = 50;
const GROUP_NAMES = { Kana: "Kana", Particules: L("Particules", "Particles"), Vocabulaire: L("Vocabulaire", "Vocabulary"), Kanji: "Kanji" };
DECKS["kana:hira"] = { group: "Kana", title: "Hiragana", icon: "あ", items: () => kanaItems("hira") };
DECKS["kana:kata"] = { group: "Kana", title: "Katakana", icon: "ア", items: () => kanaItems("kata") };
const particleItems = (k) => PARTICLES[k].items.map(([ja, answer, wrong, romaji, fr, why], i) => ({ id: k + i, ja, answer, wrong: wrong.split("|"), romaji, fr, why }));
for (const k in PARTICLES) DECKS["part:" + k] = { group: "Particules", kind: "particle", title: PARTICLES[k].title, icon: PARTICLES[k].icon, items: () => particleItems(k) };
DECKS["part:mix"] = { group: "Particules", kind: "particle", title: L("Tout mélangé", "All mixed"), icon: "🔀", items: () => Object.keys(PARTICLES).flatMap(particleItems) };
const VOCAB_ICONS = { nombres: "一", temps: "日", nourriture: "食", lieux: "駅", verbes: "行", adjectifs: "大", personnes: "人", liaison: "話", questions: "何", quotidien: "生", verbes2: "会", adjectifs2: "好", reactions: "笑" };
for (const k in VOCAB) DECKS["vocab:" + k] = { group: "Vocabulaire", title: VOCAB[k].title, icon: VOCAB_ICONS[k] || "語", items: () => listItems(VOCAB, k) };
// Kanji : un paquet par groupe de 50 (du plus fréquent au moins fréquent)
KANJI.forEach((k, i) => {
  const g = Math.floor(i / KJ_GROUP_SIZE);
  DECKS["kanji:" + g] ||= { group: "Kanji", kind: "kanji", title: `Kanji ${g * KJ_GROUP_SIZE + 1}–${Math.min(KANJI.length, (g + 1) * KJ_GROUP_SIZE)}`, icon: k[0],
    items: () => KANJI.slice(g * KJ_GROUP_SIZE, (g + 1) * KJ_GROUP_SIZE).map((x) => ({ id: x[0], ja: x[0], kanji: x, romaji: "", fr: x[0] })) };
});

const knownSet = (deck) => new Set(learn.known[deck] || []);

// ---------- Navigation ----------
const VIEWS = ["chat", "kana", "kanji", "cards", "quiz"];
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
      <p class="cal-help">${L("Touche un jour passé pour revoir son mot. Les jours appris sont marqués ✓.", "Tap a past day to see its word again. Learned days are marked ✓.")}</p>
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
    <h3 class="sec">${L("Avec dakuten (が, ぱ…)", "With dakuten (が, ぱ…)")}</h3>${grid(KANA_DAKUTEN, 5)}
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

// ---------- Moyens mnémotechniques ----------
const KANA_ROMAJI = Object.fromEntries([...KANA_ROWS, ...KANA_DAKUTEN, ...KANA_COMBO].flat().filter(Boolean));
const toHiraChar = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const romajiOf = (k) => KANA_ROMAJI[toHiraChar(k)] || "";
const HANDAKUTEN = new Set(KANA_DAKUTEN[4].map((c) => c[0])); // ぱ ぴ ぷ ぺ ぽ
const DAKUTEN = new Set(KANA_DAKUTEN.slice(0, 4).flat().map((c) => c[0]));
// Couleur du panneau : une par ligne du tableau (les dakuten/combinaisons prennent celle de leur kana de base)
function mnemoColor(ch) {
  let h = toHiraChar(ch[0]);
  if (DAKUTEN.has(h)) h = String.fromCharCode(h.charCodeAt(0) - 1);
  if (HANDAKUTEN.has(h)) h = String.fromCharCode(h.charCodeAt(0) - 2);
  const row = KANA_ROWS.findIndex((r) => r.some((c) => c && c[0] === h));
  return MNEMO_ROW_COLORS[Math.max(0, row)];
}
// Renvoie { svg, word, text } : dessin, mot-clé (avec [son]) et explication
function kanaMnemo(ch) {
  const m = KANA_MNEMO[ch];
  if (m) return { svg: m[4], word: L(m[0], m[1]), text: L(m[2], m[3]) };
  const r = romajiOf(ch), h = toHiraChar(ch);
  // combinaisons : き + ゃ → kya (on reprend le dessin du kana de base)
  if (ch.length === 2) {
    const base = ch[0], small = ch[1], rb = romajiOf(base), rs = { "ゃ": "ya", "ゅ": "yu", "ょ": "yo" }[toHiraChar(small)];
    return { svg: KANA_MNEMO[base]?.[4], word: `[${r}]`, sub: `${rb} + ${rs}`, text: L(
      `${base} (${rb}) + petit ${small} (${rs}) : on les fond en une seule syllabe, « ${r} ». Le ${small} est écrit en petit.`,
      `${base} (${rb}) + small ${small} (${rs}): blend them into one syllable, “${r}”. The ${small} is written small.`) };
  }
  // dakuten (k→g, s→z, t→d, h→b) et handakuten (h→p) : dessin du kana de base + les petits signes
  if (DAKUTEN.has(h) || HANDAKUTEN.has(h)) {
    const maru = HANDAKUTEN.has(h);
    const base = String.fromCharCode(ch.charCodeAt(0) - (maru ? 2 : 1)), rb = romajiOf(base);
    const tip = maru ? L("le petit rond (maru) transforme le son « h » en « p »", "the little circle (maru) turns the “h” sound into “p”")
                     : L("les deux petits traits (tenten) rendent le son plus sonore", "the two little marks (tenten) make the sound voiced");
    return { svg: KANA_MNEMO[base]?.[4], word: `[${r}]`, sub: `${rb} + ${maru ? "maru ゜" : "tenten ゛"}`, text: L(`${base} (${rb}) + ${tip}.`, `${base} (${rb}) + ${tip}.`) };
  }
  return null;
}
// [A]vocat → « A » en couleur, le reste en gris
const mnemoWord = (w, color) => esc(w).replace(/\[(.+?)\]/g, `<b style="color:${color}">$1</b>`);
// Carte mnémotechnique façon « affiche » : kana blanc sur fond coloré | dessin + mot-clé
function mnemoHTML(ch, compact) {
  const m = kanaMnemo(ch);
  if (!m) return "";
  const color = mnemoColor(ch);
  return `<div class="mn ${compact ? "compact" : ""}">
    <div class="mn-split">
      <button class="mn-left ${ch.length > 1 ? "two" : ""}" data-say="${esc(ch)}" style="background:${color}" lang="ja" title="${L("Écouter", "Listen")}">${esc(ch)}</button>
      <div class="mn-right">
        ${m.svg ? `<div class="mn-art"><svg viewBox="0 0 100 100" aria-hidden="true">${m.svg}</svg><span class="mn-glyph ${ch.length > 1 ? "two" : ""}" lang="ja">${esc(ch)}</span></div>`
                : `<div class="mn-formula" lang="ja">${m.formula}</div>`}
        <div class="mn-word">${mnemoWord(m.word, color)}</div>
        ${m.sub ? `<div class="mn-sub">${esc(m.sub)}</div>` : ""}
      </div>
    </div>
    <p class="mn-text">${esc(m.text)}</p>
  </div>`;
}

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
    ${mnemoHTML(ch) || `<button class="kd-char" data-say="${esc(ch)}" lang="ja">${esc(ch)}</button>`}
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
    <div class="kd-navrow">
      <button class="kd-nav" id="kdPrev" ${kanaPos === 0 ? "disabled" : ""} title="${L("Précédent", "Previous")}">‹</button>
      <span class="kd-count">${kanaPos + 1} / ${kanaList.length}</span>
      <button class="kd-nav" id="kdNext" ${kanaPos === kanaList.length - 1 ? "disabled" : ""} title="${L("Suivant", "Next")}">›</button>
    </div>`;
  $("kanaDetail").querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => { speak(b.dataset.say); pop(b); }));
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

// ---------- Kanji : les 500 plus fréquents ----------
const KJ_GROUP = KJ_GROUP_SIZE; // groupes de 50, du plus fréquent au moins fréquent
const kjGroups = () => Array.from({ length: Math.ceil(KANJI.length / KJ_GROUP) }, (_, g) => KANJI.slice(g * KJ_GROUP, (g + 1) * KJ_GROUP));
const kjMeanings = (k) => L(k[6], k[5]);
const kjMeaning = (k) => kjMeanings(k).slice(0, 2).join(", ");
const kjRange = (g) => `${g * KJ_GROUP + 1}–${Math.min(KANJI.length, (g + 1) * KJ_GROUP)}`;
// lecture en hiragana → rōmaji (pour le mot d'exemple)
function kanaToRomaji(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (KANA_ROMAJI[two]) { out += KANA_ROMAJI[two]; i++; continue; }
    const c = s[i];
    if (c === "っ") { const nx = KANA_ROMAJI[s.slice(i + 1, i + 3)] || KANA_ROMAJI[s[i + 1]] || ""; out += nx.startsWith("ch") ? "t" : nx[0] || ""; continue; }
    if (c === "ー") { out += out.slice(-1); continue; }
    out += c === "は" && i === s.length - 1 ? "wa" : KANA_ROMAJI[c] ?? c;
  }
  return out;
}
const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let kjFilter = { group: "all", q: "" };

renderers.kanji = function () {
  const v = $("view-kanji"), groups = kjGroups();
  const known = new Set(groups.flatMap((_, g) => learn.known["kanji:" + g] || []));
  v.innerHTML = `
    <div class="panel-title"><h2>Kanji 漢字</h2><p>${L(`Les ${KANJI.length} kanji les plus utilisés, du plus fréquent au moins fréquent. Touche un kanji pour voir sa fiche.`, `The ${KANJI.length} most used kanji, from most to least frequent. Tap a kanji to open its card.`)}</p></div>
    <input type="search" id="kjSearch" class="kj-search" placeholder="${L("Chercher : sens, lecture, kanji…", "Search: meaning, reading, kanji…")}" value="${esc(kjFilter.q)}" autocomplete="off">
    <div class="chips kj-chips">
      <button data-g="all" class="${kjFilter.group === "all" ? "on" : ""}">${L("Tous", "All")}</button>
      ${groups.map((grp, g) => `<button data-g="${g}" class="${String(g) === String(kjFilter.group) ? "on" : ""}">${kjRange(g)}</button>`).join("")}
    </div>
    <p class="kj-count muted" id="kjCount"></p>
    <div class="kj-grid" id="kjGrid"></div>
    <div class="cta-row">
      <button class="btn gold" id="kjCards">🃏 ${L("Réviser en cartes", "Review with cards")}</button>
    </div>
    <p class="cal-help">${L("Le point vert = kanji marqué « Je savais » dans les cartes. Sources : KANJIDIC2 et JMdict (EDRDG).", "Green dot = kanji marked \"I knew it\" in the cards. Sources: KANJIDIC2 and JMdict (EDRDG).")}</p>`;
  const draw = () => {
    const q = fold(kjFilter.q.trim());
    const list = KANJI.map((k, i) => [k, i]).filter(([k, i]) => {
      if (kjFilter.group !== "all" && Math.floor(i / KJ_GROUP) !== +kjFilter.group) return false;
      if (!q) return true;
      // japonais (kanji, lectures, mot d'exemple) : n'importe où ; sens : au début d'un mot (« eau » ≠ « bureau »)
      const ja = [k[0], ...k[3], ...k[4], k[7].replace(/\{([^|]+)\|[^}]+\}/g, "$1"), k[8]].join(" ").replace(/・/g, "");
      if (ja.includes(kjFilter.q.trim()) || ja.includes(toHiraChar(kjFilter.q.trim()))) return true;
      const words = [...k[5], ...k[6], k[9], k[10]].map(fold).join(" ");
      return new RegExp("(^|[^a-z0-9])" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(words);
    });
    $("kjCount").textContent = L(`${list.length} kanji`, `${list.length} kanji`);
    $("kjGrid").innerHTML = list.map(([k, i]) => `<button class="kj ${known.has(k[0]) ? "known" : ""}" data-i="${i}"><b lang="ja">${k[0]}</b><small>${esc(kjMeanings(k)[0] || "")}</small></button>`).join("")
      || `<p class="muted">${L("Aucun kanji trouvé.", "No kanji found.")}</p>`;
    $("kjGrid").querySelectorAll(".kj").forEach((b) => (b.onclick = () => { pop(b); openKanji(+b.dataset.i, list.map(([, i]) => i)); }));
  };
  draw();
  $("kjSearch").oninput = (e) => { kjFilter.q = e.target.value; draw(); };
  v.querySelectorAll(".kj-chips button").forEach((b) => (b.onclick = () => { kjFilter.group = b.dataset.g; renderers.kanji(); }));
  $("kjCards").onclick = () => { showView("cards"); openDeck("kanji:" + (kjFilter.group === "all" ? 0 : kjFilter.group)); };
};

// Fiche d'un kanji (même fenêtre que les kana, avec ‹ › pour passer au suivant)
let kjList = [], kjPos = 0;
function openKanji(i, list) {
  kjList = list && list.length ? list : KANJI.map((_, j) => j);
  kjPos = Math.max(0, kjList.indexOf(i));
  renderKanjiDetail(true);
  if (!$("kanaDialog").open) $("kanaDialog").showModal();
}
const kjBadges = (k, i) => `<span class="kj-badge">#${i + 1}</span>${k[2] ? `<span class="kj-badge jl">${k[2]}</span>` : ""}<span class="kj-badge">${k[1]} ${P(k[1], "trait", "traits", "stroke", "strokes")}</span>`;
function kanjiReadings(k) {
  return `${k[3].length ? `<div class="kj-read"><b>ON</b><span lang="ja">${esc(k[3].join("、"))}</span></div>` : ""}
    ${k[4].length ? `<div class="kj-read"><b>KUN</b><span lang="ja">${esc(k[4].join("、"))}</span></div>` : ""}`;
}
function renderKanjiDetail(sayIt) {
  const i = kjList[kjPos], k = KANJI[i];
  $("kanaDetail").innerHTML = `
    <div class="kj-top">${kjBadges(k, i)}</div>
    <div class="kj-main">
      <button class="kj-char" id="kjSay" lang="ja" title="${L("Écouter le mot d'exemple", "Listen to the example word")}">${k[0]}</button>
      <div class="kj-info">
        <div class="kj-mean">${esc(kjMeanings(k).join(", "))}</div>
        ${kanjiReadings(k)}
      </div>
    </div>
    <div class="kj-ex">
      <div class="kj-ex-label">${L("Exemple", "Example")}</div>
      <div class="kj-ex-word" lang="ja">${toRuby(k[7])}<button class="kd-say" id="kjSayEx" title="${L("Écouter", "Listen")}">🔊</button></div>
      <div class="kj-ex-rom romaji">${esc(kanaToRomaji(k[8]))}</div>
      <div class="kj-ex-tr">${esc(L(k[9], k[10]))}</div>
    </div>
    <div class="kd-navrow">
      <button class="kd-nav" id="kdPrev" ${kjPos === 0 ? "disabled" : ""} title="${L("Précédent", "Previous")}">‹</button>
      <span class="kd-count">${kjPos + 1} / ${kjList.length}</span>
      <button class="kd-nav" id="kdNext" ${kjPos === kjList.length - 1 ? "disabled" : ""} title="${L("Suivant", "Next")}">›</button>
    </div>`;
  $("kjSay").onclick = () => { speak(k[8]); pop($("kjSay")); };
  $("kjSayEx").onclick = () => speak(k[8]);
  $("kdPrev").onclick = () => { if (kjPos > 0) { kjPos--; renderKanjiDetail(true); } };
  $("kdNext").onclick = () => { if (kjPos < kjList.length - 1) { kjPos++; renderKanjiDetail(true); } };
  if (sayIt) speak(k[8]);
}

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

// Lignes du tableau des kana (mêmes identifiants que le Brute force)
const KANA_ROW_DEFS = [
  ...KANA_ROWS.map((r, i) => ({ id: "b" + i, group: "base", kana: r.filter(Boolean).map((c) => c[0]) })),
  ...KANA_DAKUTEN.map((r, i) => ({ id: "d" + i, group: "dakuten", kana: r.filter(Boolean).map((c) => c[0]) })),
  ...KANA_COMBO.map((r, i) => ({ id: "c" + i, group: "combo", kana: r.filter(Boolean).map((c) => c[0]) })),
];
const isKanaDeck = (id) => id.startsWith("kana:");
const cardRowsPref = (id) => ((learn.cardRows ||= {})[id] ||= KANA_ROW_DEFS.filter((r) => r.group === "base").map((r) => r.id));

function openDeck(id, all = false, rows = null) {
  // Kana : on choisit d'abord les lignes du tableau à réviser
  if (isKanaDeck(id) && !rows) return renderKanaRowPicker(id);
  let items = DECKS[id].items();
  if (rows) {
    const keep = new Set(KANA_ROW_DEFS.filter((r) => rows.includes(r.id)).flatMap((r) => r.kana));
    items = items.filter((it) => keep.has(it.id));
  }
  const known = knownSet(id);
  let queue = items.filter((it) => !known.has(it.id));
  const review = all || !queue.length;
  if (review) queue = items;
  session = { deck: id, items, rows, queue: shuffle(queue), flipped: false, review };
  renderCard();
}

function renderKanaRowPicker(id) {
  session = null;
  const v = $("view-cards"), d = DECKS[id], sel = new Set(cardRowsPref(id)), known = knownSet(id);
  const script = id === "kana:kata" ? "kata" : "hira";
  const chips = (group) => KANA_ROW_DEFS.filter((r) => r.group === group).map((r) => {
    const k = r.kana.filter((x) => known.has(x)).length, full = k === r.kana.length;
    return `<button class="bf-row ${sel.has(r.id) ? "on" : ""} ${full ? "mastered" : ""}" data-id="${r.id}" lang="ja"
      title="${esc(r.kana.map((x) => kanaOf(x, script)).join(" "))}">${esc(kanaOf(r.kana[0], script))}<small>${full ? "★" : `${k}/${r.kana.length}`}</small></button>`;
  }).join("");
  const chosen = KANA_ROW_DEFS.filter((r) => sel.has(r.id)).flatMap((r) => r.kana);
  const left = chosen.filter((x) => !known.has(x)).length;
  const preview = chosen.slice(0, 30).map((x) => kanaOf(x, script)).join(" ") + (chosen.length > 30 ? " …" : "");
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="cardBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>${esc(d.title)}</strong><div class="muted">${L("Choisis les lignes à réviser", "Pick the rows to review")}</div></div>
    </div>
    <div class="bf-quick">
      <button class="btn small" data-q="base">${L("De base", "Basic")}</button>
      <button class="btn small" data-q="todo">${L("Pas encore maîtrisées", "Not mastered yet")}</button>
      <button class="btn small" data-q="all">${L("Tout", "All")}</button>
      <button class="btn small" data-q="none">${L("Aucune", "None")}</button>
    </div>
    <h3 class="sec">${L("De base", "Basic")}</h3><div class="bf-rows">${chips("base")}</div>
    <h3 class="sec">${L("Avec dakuten (が, ぱ…)", "With dakuten (が, ぱ…)")}</h3><div class="bf-rows">${chips("dakuten")}</div>
    <h3 class="sec">${L("Combinaisons", "Combinations")}</h3><div class="bf-rows">${chips("combo")}</div>
    <p class="row-preview" lang="ja">${chosen.length ? esc(preview) : L("Aucune ligne choisie", "No row selected")}</p>
    <div class="cta-row">
      <button class="btn gold" id="rowStart" ${chosen.length ? "" : "disabled"}>🃏 ${left
        ? L(`Réviser (${left} carte${left > 1 ? "s" : ""} à apprendre)`, `Review (${left} card${left > 1 ? "s" : ""} to learn)`)
        : L(`Tout revoir (${chosen.length} cartes)`, `Review all (${chosen.length} cards)`)}</button>
      ${left && left < chosen.length ? `<button class="btn" id="rowAll">${L(`Tout revoir (${chosen.length})`, `Review all (${chosen.length})`)}</button>` : ""}
    </div>
    <p class="cal-help">${L("Le chiffre sous chaque ligne = kana maîtrisés / total. ★ = ligne maîtrisée.", "The number under each row = mastered kana / total. ★ = row mastered.")}</p>`;
  const set = (rows) => { learn.cardRows[id] = rows; saveLearn(); renderKanaRowPicker(id); };
  v.querySelectorAll(".bf-row").forEach((b) => (b.onclick = () => {
    const r = b.dataset.id, cur = cardRowsPref(id);
    set(cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);
  }));
  v.querySelectorAll(".bf-quick button").forEach((b) => (b.onclick = () => {
    const q = b.dataset.q;
    set(q === "all" ? KANA_ROW_DEFS.map((r) => r.id)
      : q === "base" ? KANA_ROW_DEFS.filter((r) => r.group === "base").map((r) => r.id)
      : q === "todo" ? KANA_ROW_DEFS.filter((r) => r.kana.some((x) => !known.has(x))).map((r) => r.id)
      : []);
  }));
  $("cardBack").onclick = closeDeck;
  $("rowStart").onclick = () => openDeck(id, !left, cardRowsPref(id));
  $("rowAll") && ($("rowAll").onclick = () => openDeck(id, true, cardRowsPref(id)));
}

// Mot d'exemple d'un kana, affiché au dos de sa carte (comme dans la fiche du kana)
function kanaExample(ch) {
  const ex = KANA_EX[ch];
  const mnemo = mnemoHTML(ch, true);
  if (!ex) return mnemo;
  return mnemo + `<div class="card-ex">
    <span class="card-ex-pic">${ex[5]}</span>
    <div>
      <div class="card-ex-kana" lang="ja">${hl(ex[0])}${ex[2] ? ` <small lang="ja">${esc(ex[2])}</small>` : ""}</div>
      <div class="card-ex-rom">${hl(ex[1])} · ${esc(L(ex[3], ex[4]))}</div>
    </div>
  </div>`;
}

function cardFaces(it) {
  if (it.kanji) {
    const k = it.kanji, i = KANJI.indexOf(k);
    const big = `<div class="big-ja kj-card-char" lang="ja">${k[0]}</div>`;
    const info = `<div class="kj-card-mean">${esc(kjMeaning(k))}</div>
      <div class="kj-card-read">${kanjiReadings(k)}</div>
      <div class="card-ex kj-card-ex"><div><div class="card-ex-kana" lang="ja">${toRuby(k[7])}</div><div class="card-ex-rom"><span class="romaji">${esc(kanaToRomaji(k[8]))} · </span>${esc(L(k[9], k[10]))}</div></div></div>`;
    return learn.dir === "ja"
      ? { front: big + `<div class="kj-top">${kjBadges(k, i)}</div>`, back: big + info }
      : { front: `<div class="big-fr">${esc(kjMeaning(k))}</div><div class="kj-top">${kjBadges(k, i)}</div>`, back: big + info };
  }
  const jaSide = `<div class="big-ja" lang="ja">${toRuby(it.ja)}</div>`;
  const kana = !it.fr;
  if (learn.dir === "ja") {
    return {
      front: jaSide,
      back: kana ? `<div class="big-ja">${esc(it.romaji)}</div>${kanaExample(it.ja)}` : `${jaSide}<div class="romaji">${esc(it.romaji)}</div><div class="big-fr">${esc(it.fr)}</div>`,
    };
  }
  return {
    front: `<div class="big-fr">${esc(kana ? it.romaji : it.fr)}</div>`,
    back: `${jaSide}${kana ? kanaExample(it.ja) : `<div class="romaji">${esc(it.romaji)}</div>`}`,
  };
}

function renderCard() {
  if (DECKS[session.deck].kind === "particle" && session.queue.length) return renderParticle();
  const v = $("view-cards"), s = session, d = DECKS[s.deck];
  const ks = knownSet(s.deck), total = s.items.length, known = s.items.filter((it) => ks.has(it.id)).length;
  const head = `<div class="deck-head">
      <button class="btn small" id="cardBack">← ${s.rows ? L("Lignes", "Rows") : L("Paquets", "Decks")}</button>
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
    $("cardAgain").onclick = () => openDeck(s.deck, known === total, s.rows);
    $("cardReset").onclick = () => {
      // ne réinitialise que les cartes révisées (les lignes choisies pour les kana)
      const ids = new Set(s.items.map((it) => it.id));
      learn.known[s.deck] = [...knownSet(s.deck)].filter((x) => !ids.has(x)); saveLearn();
      openDeck(s.deck, false, s.rows);
    };
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
  const flip = () => {
    if (s.flipped) return; s.flipped = true; renderCard();
    if (it.kanji) return speak(it.kanji[8]);
    const ex = !it.fr && KANA_EX[it.ja];
    speak(ex ? `${it.ja}、${unbracket(ex[0])}` : toPlain(it.ja));
  };
  $("flip").onclick = flip;
  $("flip").onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  v.querySelectorAll(".face [data-say]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say); }));
  $("cardSay").onclick = (e) => { e.stopPropagation(); if (it.kanji) return speak(it.kanji[8]); const ex = !it.fr && KANA_EX[it.ja]; speak(ex ? `${it.ja}、${unbracket(ex[0])}` : toPlain(it.ja)); };
  $("cardAgainOne").onclick = () => { s.queue.shift(); s.queue.splice(Math.min(3, s.queue.length), 0, it); s.flipped = false; renderCard(); };
  $("cardKnow").onclick = () => {
    const k = knownSet(s.deck); k.add(it.id); learn.known[s.deck] = [...k]; saveLearn();
    s.queue.shift(); s.flipped = false; renderCard();
  };
  $("cardBack").onclick = closeDeck;
}
function closeDeck() {
  const back = session && session.rows && session.deck;
  session = null;
  back ? renderKanaRowPicker(back) : renderDecks();
}

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
const QUIZ_LEN = 10;                    // longueur par défaut
const QUIZ_LENS = [10, 30, 60, 90];     // hiragana / katakana : nombre de cartes au choix
const isKanaQuiz = (mode) => mode === "hira" || mode === "kata" || mode === "kanji"; // nombre de cartes au choix
const quizLen = () => (QUIZ_LENS.includes(learn.quizLen) ? learn.quizLen : 10);
// clé du record : "hira" pour 10 cartes (compatible avec les anciens records), "hira:30" sinon
const quizKey = (mode, n) => (isKanaQuiz(mode) && n !== 10 ? `${mode}:${n}` : mode);
// bonus de série : paliers à 5, 10, 15, 20 bonnes réponses d'affilée, puis tous les 10
function streakBonus(n) {
  if (n % 5) return 0;
  return { 5: 10, 10: 25, 15: 40, 20: 60 }[n] || (n % 10 === 0 ? 100 : 50);
}
const QUIZ_MODES = {
  hira: { title: "Hiragana", icon: "あ", desc: L("Trouve la bonne lecture", "Find the right reading") },
  kata: { title: "Katakana", icon: "ア", desc: L("Trouve la bonne lecture", "Find the right reading") },
  kanji: { title: "Kanji", icon: "漢", desc: L("Trouve le sens du kanji (500 kanji)", "Find the kanji's meaning (500 kanji)") },
};
let quiz = null;

renderers.quiz = function () { quiz ? renderQuestion() : renderQuizHome(); };

function renderQuizHome() {
  $("view-quiz").innerHTML = `
    <div class="panel-title"><h2>Quiz</h2><p>${L("Bonne réponse : 10 ⭐ (jusqu'à 20 ⭐ en série). 🔥 Bonus de série à 5, 10, 15, 20… bonnes réponses d'affilée. Sans faute : 5 ⭐ par carte en plus !", "Right answer: 10 ⭐ (up to 20 ⭐ on a streak). 🔥 Streak bonus at 5, 10, 15, 20… right answers in a row. Perfect score: 5 ⭐ per card on top!")}</p></div>
    <div class="level-card">
      <div class="lvl-badge"><small>${L("NIV.", "LVL")}</small>${levelOf(learn.points)}</div>
      <div class="lvl-info">
        <strong>⭐ ${fmt(learn.points)} points</strong>
        <span class="bar"><i style="width:${((learn.points % LEVEL_STEP) / LEVEL_STEP) * 100}%"></i></span>
        <span class="muted">${L(`${LEVEL_STEP - (learn.points % LEVEL_STEP)} points avant le niveau ${levelOf(learn.points) + 1}`, `${LEVEL_STEP - (learn.points % LEVEL_STEP)} points to level ${levelOf(learn.points) + 1}`)}</span>
      </div>
    </div>
    <h3 class="sec">🃏 ${L("Nombre de cartes", "Number of cards")}</h3>
    <div class="seg q-lens">${QUIZ_LENS.map((n) => `<button data-len="${n}" class="${n === quizLen() ? "on" : ""}">${n}</button>`).join("")}</div>
    <div class="mode-list">${Object.entries(QUIZ_MODES).map(([k, m]) => {
      const n = isKanaQuiz(k) ? quizLen() : QUIZ_LEN, key = quizKey(k, n);
      return `
      <button class="mode" data-k="${k}">
        <span class="deck-icon" lang="ja">${m.icon}</span>
        <span><span class="deck-title">${m.title}</span><span class="muted">${m.desc} · ${n} ${L("cartes", "cards")}</span></span>
        <span class="best">${learn.best[key] != null ? `${stars(learn.best[key], n)}<br><small>${L("Record :", "Best:")} ${learn.bestPts[key] ?? 0} ⭐</small>` : L("Nouveau", "New")}</span>
      </button>`;
    }).join("")}
      <button class="mode bf-mode" id="bfOpen">
        <span class="deck-icon">⌨️</span>
        <span><span class="deck-title">Brute force (kana)</span><span class="muted">${L("Tape la lecture de chaque kana · choisis lesquels", "Type each kana's reading · pick which ones")}</span></span>
        <span class="best">${L("Entraînement", "Training")}</span>
      </button>
      <button class="mode speed-mode" id="speedOpen">
        <span class="deck-icon">⚡</span>
        <span><span class="deck-title">${L("Jeu de vitesse", "Speed game")}</span><span class="muted">${L("Contre la montre, choisis ta durée", "Against the clock, pick your duration")}</span></span>
        <span class="best">⏱ 30 s – 2 min</span>
      </button></div>`;
  document.querySelectorAll(".mode[data-k]").forEach((b) => (b.onclick = () => startQuiz(b.dataset.k)));
  document.querySelectorAll(".q-lens button").forEach((b) => (b.onclick = () => { learn.quizLen = +b.dataset.len; saveLearn(); renderQuizHome(); }));
  $("bfOpen").onclick = () => openBruteForce();
  $("speedOpen").onclick = () => openSpeed();
}

function stars(score, total = QUIZ_LEN) {
  const r = score / total, n = r >= 1 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
  return "★".repeat(n) + "☆".repeat(3 - n);
}

function quizPool(mode) {
  if (mode === "vocab") return Object.values(VOCAB).flatMap((c) => c.items.map(([ja, romaji, fr]) => ({ q: ja, a: fr, say: toPlain(ja), sub: romaji })));
  // kanji → sens ; après la réponse : lectures + mot d'exemple (lu à voix haute)
  if (mode === "kanji") return KANJI.map((k) => ({ q: k[0], a: kjMeaning(k), say: k[8], kj: true,
    sub: `${[...k[3], ...k[4]].slice(0, 3).join("、")} · ${toPlain(k[7])} (${k[8]}) = ${L(k[9], k[10])}` }));
  return [...KANA_ROWS, ...KANA_DAKUTEN].flat().filter(Boolean)
    .filter(([k]) => k !== "ぢ" && k !== "づ") // même lecture que じ / ず
    .map(([k, r]) => ({ q: kanaOf(k, mode), a: r, say: kanaOf(k, mode) }));
}

function startQuiz(mode) {
  const pool = quizPool(mode), len = isKanaQuiz(mode) ? quizLen() : QUIZ_LEN;
  // plus de cartes que de kana (ex. 90) : on refait un tour du paquet mélangé, sans répéter deux fois de suite
  let list = [];
  while (list.length < len) {
    let round = shuffle(pool);
    if (list.length && round[0] === list[list.length - 1]) round.push(round.shift());
    list = list.concat(round);
  }
  const qs = list.slice(0, len).map((item) => {
    const wrong = shuffle([...new Set(pool.map((p) => p.a).filter((a) => a !== item.a))]).slice(0, 3);
    return { ...item, options: shuffle([item.a, ...wrong]) };
  });
  quiz = { mode, len, key: quizKey(mode, len), qs, i: 0, score: 0, streak: 0, bestStreak: 0, streakPts: 0, pts: 0, gain: 0, sbonus: 0, answered: null };
  renderQuestion();
}

function renderQuestion() {
  const v = $("view-quiz"), z = quiz;
  if (z.i >= z.qs.length) {
    if (!z.finished) {
      z.finished = true;
      z.bonus = z.score === z.len ? z.len * 5 : 0;
      z.pts += z.bonus;
      z.levelUp = addPoints(z.pts);
      z.prevPts = learn.bestPts[z.key] ?? -1;
      if (z.score > (learn.best[z.key] ?? -1)) learn.best[z.key] = z.score;
      if (z.pts > z.prevPts) learn.bestPts[z.key] = z.pts;
      saveLearn();
    }
    const record = z.pts > z.prevPts && z.prevPts >= 0;
    v.innerHTML = `<div class="finish">
      <div class="stars">${stars(z.score, z.len)}</div>
      <h2>${z.score}/${z.len} ${L("bonnes réponses", "correct answers")}</h2>
      <div class="points-won">+${z.pts} ⭐</div>
      <p class="muted">🔥 ${L(`Meilleure série : ${z.bestStreak}`, `Best streak: ${z.bestStreak}`)}${z.streakPts ? ` · ${L(`bonus de série : +${z.streakPts} ⭐`, `streak bonus: +${z.streakPts} ⭐`)}` : ""}</p>
      ${z.bonus ? `<p>${L(`Dont +${z.bonus} ⭐ de bonus sans faute !`, `Including a +${z.bonus} ⭐ perfect-score bonus!`)}</p>` : ""}
      <p>${record ? L("🏅 Nouveau record de points ! ", "🏅 New points record! ") : ""}${z.score === z.len ? L("Parfait !", "Perfect!") : z.score / z.len >= 0.7 ? L("Très bien !", "Great job!") : L("Continue, ça vient !", "Keep going, you're getting there!")}</p>
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
      <div class="bar big"><i style="width:${(z.i / z.len) * 100}%"></i></div>
      <span class="q-count">${z.i + 1}/${z.len}</span>
      <span class="streak ${z.streak >= 3 ? "hot" : ""}">🔥 ${z.streak}</span>
      <span class="qpts">⭐ ${z.pts}</span>
    </div>
    <div class="quiz-q ${a ? (a === q.a ? "good" : "bad") : ""}">
      <div class="big-ja" lang="ja">${toRuby(q.q)}</div>
      ${a && q.sub ? `<div class="${q.kj ? "kj-sub" : "romaji"}" lang="ja">${esc(q.sub)}</div>` : ""}
      ${a && a === q.a ? `<span class="gain">+${z.gain}</span>` : ""}
      ${a && a === q.a && z.sbonus ? `<div class="streak-bonus">🔥 ${L(`Série de ${z.streak} !`, `${z.streak} in a row!`)} <b>+${z.sbonus} ⭐</b></div>` : ""}
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
      z.score++; z.streak++; z.bestStreak = Math.max(z.bestStreak, z.streak);
      z.gain = 10 + Math.min(z.streak - 1, 5) * 2; // chaque bonne réponse vaut plus en série : jusqu'à 20
      z.sbonus = streakBonus(z.streak);            // gros bonus aux paliers 5, 10, 15, 20…
      z.streakPts += z.sbonus;
      z.pts += z.gain + z.sbonus;
      renderQuestion();
      if (z.sbonus) pop(document.querySelector(".streak-bonus"));
      setTimeout(() => { if (quiz === z && z.answered) { z.i++; z.answered = null; z.sbonus = 0; renderQuestion(); } }, z.sbonus ? 1400 : 900);
    } else {
      z.streak = 0; z.sbonus = 0;
      renderQuestion();
    }
  }));
  $("qNext") && ($("qNext").onclick = () => { z.i++; z.answered = null; renderQuestion(); });
}

// ---------- Démarrage ----------
updatePill();
showView(learn.lastView || "chat");
updateWotdDot();
