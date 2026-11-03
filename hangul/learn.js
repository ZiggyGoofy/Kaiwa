// SpeedHangul — navigation et espace d'apprentissage hors ligne (Mot du jour, Hangeul, Phrases, Cartes, Quiz).
// Utilise les fonctions globales de app.js : $, esc, speak, newConversation, openSettings.

const LEARN = "speedhangul-learn-v1";
let learn = { known: {}, best: {}, bestPts: {}, points: 0, days: {}, dir: "ko", lastView: null, build: { c: 0, v: 0, t: 0 }, ...load(LEARN, {}) };
const saveLearn = () => { try { localStorage.setItem(LEARN, JSON.stringify(learn)); } catch {} };

// ---------- Points ----------
const LEVEL_STEP = 200;
const levelOf = (p) => Math.floor(p / LEVEL_STEP) + 1;
function updatePill() { $("ptsPill").textContent = "⭐ " + fmt(learn.points); }
function addPoints(n) {
  const before = levelOf(learn.points);
  learn.points += n; saveLearn(); updatePill(); pop($("ptsPill"));
  return levelOf(learn.points) > before;
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
function pop(el) { if (!el) return; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }

// ---------- Les lettres ----------
const JAMO_ALL = [
  ...JAMO_CONS.map((j) => ({ kind: "cons", j })), ...JAMO_DOUBLE.map((j) => ({ kind: "double", j })),
  ...JAMO_VOW.map((j) => ({ kind: "vow", j })), ...JAMO_VOW2.map((j) => ({ kind: "vow2", j })),
].map(({ kind, j: [ch, rom, ans, name, nameRom] }) => ({ ch, rom, answers: ans.split("|"), name, nameRom, kind, vowel: kind.startsWith("vow") }));
const JAMO = Object.fromEntries(JAMO_ALL.map((j) => [j.ch, j]));
const isJamo = (s) => !!JAMO[s];
// ce qu'on fait lire à la voix : le nom des consonnes (기역), la voyelle avec ㅇ muet (아)
const sayOf = (ch) => { const j = JAMO[ch]; if (!j) return ch; return j.vowel ? composeSyl(11, JUNG.indexOf(ch)) : j.name; };
const KIND_LABEL = {
  cons: L("consonne", "consonant"), double: L("consonne double", "double consonant"),
  vow: L("voyelle", "vowel"), vow2: L("voyelle composée", "compound vowel"),
};

// ---------- Moyens mnémotechniques ----------
const DOUBLE_BASE = { "ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ" };
const DOUBLE_TIP = {
  "ㄲ": [L("comme le « k » de « skate »", "like the “k” in “skate”")], "ㄸ": [L("comme le « t » de « stop »", "like the “t” in “stop”")],
  "ㅃ": [L("comme le « p » de « spa »", "like the “p” in “spa”")], "ㅆ": [L("un « s » appuyé, bien sifflé", "a strong, hissing “s”")],
  "ㅉ": [L("un « tch » tendu", "a tense “j/tch”")],
};
const Y_BASE = { "ㅑ": "ㅏ", "ㅕ": "ㅓ", "ㅛ": "ㅗ", "ㅠ": "ㅜ" };
const COMPOUND = {
  "ㅐ": ["ㅏ", "ㅣ", L("se prononce « è »", "sounds like the “e” in “bed”")],
  "ㅒ": ["ㅑ", "ㅣ", L("se prononce « yè »", "sounds like “ye” in “yes”")],
  "ㅔ": ["ㅓ", "ㅣ", L("se prononce « é » — aujourd'hui presque comme ㅐ", "sounds like “e” in “bed” — nowadays almost the same as ㅐ")],
  "ㅖ": ["ㅕ", "ㅣ", L("se prononce « yé »", "sounds like “ye” in “yes”")],
  "ㅘ": ["ㅗ", "ㅏ", L("se prononce « oua »", "sounds like “wa” in “wow”")],
  "ㅙ": ["ㅗ", "ㅐ", L("se prononce « oué »", "sounds like “we” in “wet”")],
  "ㅚ": ["ㅗ", "ㅣ", L("se prononce « oué », comme ㅙ et ㅞ", "sounds like “we” in “wet”, like ㅙ and ㅞ")],
  "ㅝ": ["ㅜ", "ㅓ", L("se prononce « ouo »", "sounds like “wo” in “won”")],
  "ㅞ": ["ㅜ", "ㅔ", L("se prononce « oué »", "sounds like “we” in “wet”")],
  "ㅟ": ["ㅜ", "ㅣ", L("se prononce « oui »", "sounds like “wee”")],
  "ㅢ": ["ㅡ", "ㅣ", L("se prononce « eu-i », glissé rapidement", "sounds like “eu-ee”, glided quickly")],
};
function rootOf(ch) {
  while (!JAMO_MNEMO[ch]) ch = DOUBLE_BASE[ch] || Y_BASE[ch] || COMPOUND[ch]?.[0];
  return ch;
}
function jamoMnemo(ch) {
  const m = JAMO_MNEMO[ch];
  if (m) return { svg: m[4], word: L(m[0], m[1]), text: L(m[2], m[3]) };
  const j = JAMO[ch], svg = JAMO_MNEMO[rootOf(ch)]?.[4];
  if (DOUBLE_BASE[ch]) {
    const b = DOUBLE_BASE[ch];
    return { svg, word: `[${j.rom}]`, sub: `${b} + ${b}`, text: L(
      `${b} doublé : même son que ${b}, mais tendu et sans souffle, ${DOUBLE_TIP[ch]}.`,
      `${b} doubled: same sound as ${b}, but tense and with no puff of air, ${DOUBLE_TIP[ch]}.`) };
  }
  if (Y_BASE[ch]) {
    const b = Y_BASE[ch], rb = JAMO[b].rom;
    return { svg, word: `[${j.rom}]`, sub: `${b} + ${L("un trait", "one stroke")}`, text: L(
      `Un trait de plus = on ajoute un « y » devant : ${b} (${rb}) → ${ch} (${j.rom}).`,
      `One extra stroke = add a “y” in front: ${b} (${rb}) → ${ch} (${j.rom}).`) };
  }
  const [a, b, tip] = COMPOUND[ch];
  return { svg, word: `[${j.rom}]`, sub: `${a} + ${b}`, text: L(
    `${a} (${JAMO[a].rom}) + ${b} (${JAMO[b].rom}) collés ensemble → ${ch} : ${tip}.`,
    `${a} (${JAMO[a].rom}) + ${b} (${JAMO[b].rom}) stuck together → ${ch}: ${tip}.`) };
}
function mnemoColor(ch) {
  const i = JAMO_ROWS.findIndex((r) => r.jamo.includes(ch));
  return MNEMO_ROW_COLORS[Math.max(0, i)];
}
const mnemoWord = (w, color) => esc(w).replace(/\[(.+?)\]/g, `<b style="color:${color}">$1</b>`);
// Carte façon « affiche » : lettre blanche sur fond coloré | dessin + mot-clé
function mnemoHTML(ch, compact) {
  if (!isJamo(ch)) return "";
  const m = jamoMnemo(ch), color = mnemoColor(ch);
  return `<div class="mn ${compact ? "compact" : ""}">
    <div class="mn-split">
      <button class="mn-left" data-say="${esc(sayOf(ch))}" style="background:${color}" lang="ko" title="${L("Écouter", "Listen")}">${esc(ch)}</button>
      <div class="mn-right">
        <div class="mn-art"><svg viewBox="0 0 100 100" aria-hidden="true">${m.svg}</svg><span class="mn-glyph" lang="ko">${esc(ch)}</span></div>
        <div class="mn-word">${mnemoWord(m.word, color)}</div>
        ${m.sub ? `<div class="mn-sub" lang="ko">${esc(m.sub)}</div>` : ""}
      </div>
    </div>
    <p class="mn-text">${esc(m.text)}</p>
  </div>`;
}
const hl = (s) => esc(s).replace(/\[(.+?)\]/g, '<b class="hl">$1</b>');
const unbracket = (s) => s.replace(/[\[\]]/g, "");
const exWord = (ch) => KO_EX[ch] ? unbracket(KO_EX[ch][0]).split(" · ")[0] : "";

// ---------- Paquets de cartes ----------
const listItems = (src, key) => src[key].items.map(([ko, romaji, fr], i) => ({ id: String(i), ko, romaji, fr }));
const DECKS = {};
const GROUP_NAMES = { Hangeul: "Hangeul", Particules: L("Particules", "Particles"), Vocabulaire: L("Vocabulaire", "Vocabulary"), Calendrier: L("Calendrier", "Calendar"), Phrases: "Phrases" };
DECKS["jamo"] = { group: "Hangeul", title: L("Lettres (jamo)", "Letters (jamo)"), icon: "ㄱ", items: () => JAMO_ALL.map((j) => ({ id: j.ch, ko: j.ch, romaji: j.rom, fr: "" })) };
const particleItems = (k) => PARTICLES[k].items.map(([ko, answer, wrong, romaji, fr, why], i) => ({ id: k + i, ko, answer, wrong: wrong.split("|"), romaji, fr, why }));
for (const k in PARTICLES) DECKS["part:" + k] = { group: "Particules", kind: "particle", title: PARTICLES[k].title, icon: PARTICLES[k].icon, items: () => particleItems(k) };
DECKS["part:mix"] = { group: "Particules", kind: "particle", title: L("Tout mélangé", "All mixed"), icon: "🔀", items: () => Object.keys(PARTICLES).flatMap(particleItems) };
const VOCAB_ICONS = { nombres: "일", natifs: "하나", temps: "시", nourriture: "밥", lieux: "집", verbes: "가", adjectifs: "좋", personnes: "저", questions: "뭐", liaison: "또", quotidien: "돈", reactions: "와" };
const PHRASE_ICONS = { essentiels: "👋", presentation: "🙋", cafe: "☕", courses: "🛍️", chemin: "🧭", loisirs: "🎮", journee: "🌅", voyage: "✈️" };
for (const k in VOCAB) DECKS["vocab:" + k] = { group: "Vocabulaire", title: VOCAB[k].title, icon: VOCAB_ICONS[k] || "말", items: () => listItems(VOCAB, k) };
DECKS["cal:mots"] = {
  group: "Calendrier", title: L("Mes mots du jour", "My words of the day"), icon: "📅",
  items: () => [...new Set(Object.keys(learn.days).map((k) => wordFor(fromKey(k))))].map(([ko, romaji, fr]) => ({ id: ko, ko, romaji, fr })),
};
for (const k in PHRASES) DECKS["phr:" + k] = { group: "Phrases", title: PHRASES[k].title, icon: PHRASE_ICONS[k] || "💬", items: () => listItems(PHRASES, k) };
const knownSet = (deck) => new Set(learn.known[deck] || []);

// ---------- Navigation ----------
const VIEWS = ["jour", "hangeul", "phrases", "cards", "quiz"];
const renderers = {};
function showView(name) {
  if (!VIEWS.includes(name)) name = "jour";
  if (name === "jour" && document.body.dataset.view !== "jour") { cal.sel = null; cal.month = null; } // revient sur aujourd'hui
  for (const v of VIEWS) $("view-" + v).hidden = v !== name;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.body.dataset.view = name;
  learn.lastView = name; saveLearn();
  if (renderers[name]) renderers[name]();
}
document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => showView(b.dataset.view)));


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
  const m = cal.month, first = new Date(m.getFullYear(), m.getMonth(), 1);
  const nDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  let cells = L("LMMJVSD", "MTWTFSS").split("").map((d) => `<span class="cal-wd">${d}</span>`).join("");
  cells += `<span class="cal-day blank"></span>`.repeat(offset);
  for (let i = 1; i <= nDays; i++) {
    const d = new Date(m.getFullYear(), m.getMonth(), i), k = dkey(d), future = d > today;
    const cls = ["cal-day", future && "locked", learn.days[k] && "learned", k === dkey(today) && "today", k === key && "sel"].filter(Boolean).join(" ");
    cells += future
      ? `<span class="${cls}"><span class="dn">${i}</span><span class="dw">🔒</span></span>`
      : `<button class="${cls}" data-k="${k}"><span class="dn">${i}</span><span class="dw" lang="ko">${learn.days[k] ? "✓" : esc(wordFor(d)[0])}</span></button>`;
  }
  const atCurrentMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
  v.innerHTML = `
    <div class="panel-title"><h2>${isToday ? L("Mot du jour", "Word of the day") : L(`Mot du ${sel.getDate()} ${monthName(sel)}`, `Word of ${monthName(sel)} ${sel.getDate()}`)}</h2><p>${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p></div>
    <div class="wotd ${learned ? "is-learned" : ""}">
      ${learned ? `<span class="stamp">✓ ${L("Appris", "Learned")}</span>` : ""}
      <div class="big-ja" lang="ko">${esc(w[0])}</div>
      <div class="romaji">${esc(w[1])}</div>
      <div class="big-fr">${esc(w[2])}</div>
      <div class="example">
        <button class="say" id="wEx" title="${L("Écouter l'exemple", "Listen to the example")}">🔊</button>
        <div><div class="ja" lang="ko">${esc(w[3])}</div><div class="fr">${esc(w[4])}</div></div>
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
    </div>
    <h3 class="sec">${L("Raccourcis", "Shortcuts")}</h3>
    <div class="mode-list home-links">
      <button class="mode" data-go="letters"><span class="deck-icon" lang="ko">ㄱ</span><span><span class="deck-title">${L("Réviser les lettres", "Review the letters")}</span><span class="muted">${L("Cartes, par groupes de lettres", "Cards, by letter groups")}</span></span></button>
      <button class="mode speed-mode" data-go="speed"><span class="deck-icon">⚡</span><span><span class="deck-title">${L("Jeu de vitesse", "Speed game")}</span><span class="muted">${L("Contre la montre, choisis ta durée", "Against the clock, pick your duration")}</span></span></button>
      <button class="mode bf-mode" data-go="bf"><span class="deck-icon">⌨️</span><span><span class="deck-title">Brute force</span><span class="muted">${L("Tape la lecture de chaque lettre ou syllabe", "Type the reading of each letter or syllable")}</span></span></button>
    </div>`;
  $("wSay").onclick = () => speak(w[0]);
  $("wEx").onclick = (e) => { speak(w[3]); pop(e.currentTarget); };
  $("wLearn") && ($("wLearn").onclick = () => {
    learn.days[key] = true; saveLearn();
    const up = addPoints(20);
    renderers.jour(); updateWotdDot();
    pop(document.querySelector(".stamp"));
    if (up) toast(L(`🎉 Niveau ${levelOf(learn.points)} atteint !`, `🎉 Level ${levelOf(learn.points)} reached!`));
  });
  $("calPrev").onclick = () => { cal.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); renderers.jour(); };
  $("calNext").onclick = () => { if (!atCurrentMonth) { cal.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); renderers.jour(); } };
  v.querySelectorAll(".home-links [data-go]").forEach((b) => (b.onclick = () => {
    const go = b.dataset.go;
    if (go === "letters") { showView("cards"); openDeck("jamo"); }
    if (go === "speed") { showView("quiz"); openSpeed(); }
    if (go === "bf") { showView("quiz"); openBruteForce(); }
  }));
  v.querySelectorAll("button.cal-day").forEach((b) => (b.onclick = () => { cal.sel = fromKey(b.dataset.k); renderers.jour(); v.scrollTo({ top: 0, behavior: "smooth" }); }));
};
function updateWotdDot() { $("wotdDot").hidden = !!learn.days[dkey(new Date())]; }
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Hangeul ----------
const VERT = new Set([..."ㅏㅐㅑㅒㅓㅔㅕㅖㅣ"]), HORIZ = new Set([..."ㅗㅛㅜㅠㅡ"]);
const BUILD_FINALS = ["", ..."ㄱㄲㄴㄷㄹㅁㅂㅅㅆㅇㅈㅊㅋㅌㅍㅎ"].map((f) => JONG.indexOf(f));

renderers.hangeul = function () {
  const v = $("view-hangeul");
  const grid = (list, cols) => `<div class="kana-grid" style="--cols:${cols}">` + list.map(([ch, rom]) =>
    `<button class="kana" data-k="${ch}"><b lang="ko">${ch}</b><small>${esc(rom)}</small></button>`).join("") + "</div>";
  const head = BASIC_JUNG.map((vi) => `<th lang="ko">${JUNG[vi]}</th>`).join("");
  const rows = BASIC_CHO.map((ci) => `<tr><th lang="ko">${CHO[ci]}</th>${BASIC_JUNG.map((vi) =>
    `<td><button class="syl-cell" data-s="${composeSyl(ci, vi)}"><b lang="ko">${composeSyl(ci, vi)}</b><small>${romSyl(ci, vi)}</small></button></td>`).join("")}</tr>`).join("");
  v.innerHTML = `
    <div class="panel-title"><h2>Hangeul 한글</h2><p>${L("Touche une lettre pour voir sa fiche : prononciation, moyen mnémotechnique et mot d'exemple.", "Tap a letter to open its card: pronunciation, memory trick and example word.")}</p></div>
    <h3 class="sec">${L("Consonnes de base", "Basic consonants")}</h3>${grid(JAMO_CONS, 7)}
    <h3 class="sec">${L("Consonnes doubles (son tendu)", "Double consonants (tense sound)")}</h3>${grid(JAMO_DOUBLE, 5)}
    <h3 class="sec">${L("Voyelles de base", "Basic vowels")}</h3>${grid(JAMO_VOW, 5)}
    <h3 class="sec">${L("Voyelles composées", "Compound vowels")}</h3>${grid(JAMO_VOW2, 6)}

    <h3 class="sec">${L("Assembler une syllabe", "Build a syllable")}</h3>
    <div class="builder" id="builder"></div>

    <details class="memo syl-table">
      <summary>📋 ${L("Tableau des syllabes (consonne + voyelle)", "Syllable chart (consonant + vowel)")}</summary>
      <div class="syl-wrap"><table><tr><th></th>${head}</tr>${rows}</table></div>
    </details>

    <div class="cta-row">
      <button class="btn gold" id="hgCards">🃏 ${L("Réviser en cartes", "Review with cards")}</button>
      <button class="btn" id="hgQuiz">🏆 ${L("Faire le quiz", "Take the quiz")}</button>
    </div>`;
  v.querySelectorAll("button.kana").forEach((b) => (b.onclick = () => { pop(b); openJamo(b.dataset.k); }));
  v.querySelectorAll(".syl-cell").forEach((b) => (b.onclick = () => { pop(b); speak(b.dataset.s); }));
  $("hgCards").onclick = () => { showView("cards"); openDeck("jamo"); };
  $("hgQuiz").onclick = () => { showView("quiz"); startQuiz("jamo"); };
  renderBuilder();
};

function renderBuilder() {
  const b = learn.build, el = $("builder");
  const syl = composeSyl(b.c, b.v, b.t), rom = romSyl(b.c, b.v, b.t), vow = JUNG[b.v];
  const opt = (list, cur, label) => list.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${label(x, i)}</option>`).join("");
  const place = VERT.has(vow) ? L("voyelle verticale → elle se met à <b>droite</b> de la consonne", "vertical vowel → it goes to the <b>right</b> of the consonant")
    : HORIZ.has(vow) ? L("voyelle horizontale → elle se met <b>sous</b> la consonne", "horizontal vowel → it goes <b>under</b> the consonant")
    : L("voyelle mixte → elle entoure la consonne (dessous + à droite)", "mixed vowel → it wraps the consonant (below + right)");
  const parts = [CHO[b.c], vow, b.t ? JONG[b.t] : ""].filter(Boolean);
  el.innerHTML = `
    <div class="bd-selects">
      <label>${L("Consonne", "Consonant")}<select id="bdC" lang="ko">${opt(CHO, b.c, (x, i) => `${x}  ${ROM_CHO[i] || "∅"}`)}</select></label>
      <label>${L("Voyelle", "Vowel")}<select id="bdV" lang="ko">${opt(JUNG, b.v, (x, i) => `${x}  ${ROM_JUNG[i]}`)}</select></label>
      <label>${L("Finale (batchim)", "Final (batchim)")}<select id="bdT" lang="ko">${BUILD_FINALS.map((ti) => `<option value="${ti}" ${ti === b.t ? "selected" : ""}>${ti ? `${JONG[ti]}  ${ROM_JONG[ti]}` : L("— aucune", "— none")}</option>`).join("")}</select></label>
    </div>
    <div class="bd-result">
      <div class="bd-formula" lang="ko">${parts.join(" + ")} =</div>
      <button class="bd-syl" id="bdSay" lang="ko" title="${L("Écouter", "Listen")}">${syl}</button>
      <div class="bd-rom">${esc(rom)}</div>
    </div>
    <p class="bd-help">${b.c === 11 ? L("ㅇ au début ne se prononce pas : il sert juste à « porter » la voyelle. ", "ㅇ at the start is silent: it just “holds” the vowel. ") : ""}${place}.${b.t ? " " + L(`La consonne finale (batchim) se place tout en bas et se prononce « ${ROM_JONG[b.t]} ».`, `The final consonant (batchim) goes at the very bottom and is pronounced “${ROM_JONG[b.t]}”.`) : ""}</p>
    <div class="cta-row"><button class="btn small" id="bdRand">🎲 ${L("Au hasard", "Random")}</button><button class="btn small" id="bdSay2">🔊 ${L("Écouter", "Listen")}</button></div>`;
  const upd = () => { b.c = +$("bdC").value; b.v = +$("bdV").value; b.t = +$("bdT").value; saveLearn(); renderBuilder(); speak(composeSyl(b.c, b.v, b.t)); };
  ["bdC", "bdV", "bdT"].forEach((id) => ($(id).onchange = upd));
  $("bdSay").onclick = () => { speak(syl); pop($("bdSay")); };
  $("bdSay2").onclick = () => speak(syl);
  $("bdRand").onclick = () => {
    b.c = BASIC_CHO[Math.floor(Math.random() * BASIC_CHO.length)];
    b.v = Math.floor(Math.random() * JUNG.length);
    b.t = Math.random() < 0.4 ? BUILD_FINALS[1 + Math.floor(Math.random() * (BUILD_FINALS.length - 1))] : 0;
    saveLearn(); renderBuilder(); speak(composeSyl(b.c, b.v, b.t)); pop($("bdSay"));
  };
}

// ---------- Fiche d'une lettre ----------
let jamoPos = 0;
function openJamo(ch) {
  jamoPos = Math.max(0, JAMO_ALL.findIndex((j) => j.ch === ch));
  renderJamoDetail(true);
  if (!$("kanaDialog").open) $("kanaDialog").showModal();
}
function renderJamoDetail(sayIt) {
  const j = JAMO_ALL[jamoPos], ex = KO_EX[j.ch], word = exWord(j.ch);
  $("kanaDetail").innerHTML = `
    <div class="kd-head"><b>${esc(j.rom)}</b> <span>(${KIND_LABEL[j.kind]}${j.name ? ` · <span lang="ko">${j.name}</span> ${j.nameRom}` : ""})</span></div>
    ${mnemoHTML(j.ch)}
    ${ex ? `
    <div class="kd-example">
      <div class="kd-word">
        <div class="kd-rom">(${hl(ex[1])})</div>
        <div class="kd-kana" lang="ko"><span class="kd-w">${hl(ex[0])}</span><button class="kd-say" id="kdSayWord" title="${L("Écouter le mot", "Listen to the word")}">🔊</button></div>
      </div>
      <button class="kd-pic" id="kdPic" title="${L("Écouter le mot", "Listen to the word")}">${ex[5]}<span class="kd-say-small">🔊</span></button>
      <div class="kd-tr">${esc(L(ex[3], ex[4]))}</div>
    </div>` : ""}
    <div class="kd-navrow">
      <button class="kd-nav" id="kdPrev" ${jamoPos === 0 ? "disabled" : ""} title="${L("Précédent", "Previous")}">‹</button>
      <span class="kd-count">${jamoPos + 1} / ${JAMO_ALL.length}</span>
      <button class="kd-nav" id="kdNext" ${jamoPos === JAMO_ALL.length - 1 ? "disabled" : ""} title="${L("Suivant", "Next")}">›</button>
    </div>`;
  $("kanaDetail").querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => { speak(b.dataset.say); pop(b); }));
  if (ex) {
    $("kdSayWord").onclick = () => speak(word);
    $("kdPic").onclick = () => { speak(word); pop($("kdPic")); };
  }
  $("kdPrev").onclick = () => { if (jamoPos > 0) { jamoPos--; renderJamoDetail(true); } };
  $("kdNext").onclick = () => { if (jamoPos < JAMO_ALL.length - 1) { jamoPos++; renderJamoDetail(true); } };
  if (sayIt) speak(sayOf(j.ch));
}
$("kanaClose").onclick = () => $("kanaDialog").close();
$("kanaDialog").addEventListener("click", (e) => { if (e.target === $("kanaDialog")) $("kanaDialog").close(); });
document.addEventListener("keydown", (e) => {
  if (!$("kanaDialog").open) return;
  if (e.key === "ArrowLeft") $("kdPrev").click();
  if (e.key === "ArrowRight") $("kdNext").click();
});
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
    <div class="panel-title"><h2>${L("Phrases utiles", "Useful phrases")}</h2><p>${L("Écoute, répète à voix haute, puis révise-les en cartes.", "Listen, repeat out loud, then review them with cards.")}</p></div>
    <div class="chips">${Object.entries(PHRASES).map(([k, p]) => `<button data-k="${k}" class="${k === phraseTheme ? "on" : ""}">${esc(p.title)}</button>`).join("")}</div>
    <div class="phrase-list">${t.items.map(([ko, ro, fr], i) => `
      <div class="phrase">
        <button class="say" data-i="${i}" title="${L("Écouter", "Listen")}">🔊</button>
        <div><div class="ja" lang="ko">${esc(ko)}</div><div class="romaji">${esc(ro)}</div><div class="fr">${esc(fr)}</div></div>
      </div>`).join("")}</div>
    <div class="cta-row">
      <button class="btn gold" id="phrCards">🃏 ${L("Réviser en cartes", "Review with cards")}</button>
    </div>`;
  v.querySelectorAll(".chips button").forEach((b) => (b.onclick = () => { phraseTheme = b.dataset.k; renderers.phrases(); }));
  v.querySelectorAll(".say").forEach((b) => (b.onclick = () => { speak(t.items[b.dataset.i][0]); pop(b); }));
  $("phrCards").onclick = () => { showView("cards"); openDeck("phr:" + phraseTheme); };
};

// ---------- Cartes ----------
let session = null;
renderers.cards = function () { session ? renderCard() : renderDecks(); };

function renderDecks() {
  const v = $("view-cards"), groups = {};
  for (const [id, d] of Object.entries(DECKS)) (groups[d.group] ||= []).push([id, d]);
  v.innerHTML = `
    <div class="panel-title"><h2>${L("Cartes", "Cards")}</h2><p>${L("Retourne la carte, puis dis si tu savais. Les cartes « à revoir » reviennent plus vite.", "Flip the card, then say whether you knew it. Cards marked \"review\" come back sooner.")}</p></div>
    <div class="seg">
      <button data-dir="ko" class="${learn.dir === "ko" ? "on" : ""}">${L("🇰🇷 KO → FR 🇫🇷", "🇰🇷 KO → EN 🇬🇧")}</button>
      <button data-dir="fr" class="${learn.dir === "fr" ? "on" : ""}">${L("🇫🇷 FR → KO 🇰🇷", "🇬🇧 EN → KO 🇰🇷")}</button>
    </div>` +
    Object.entries(groups).map(([g, decks]) => {
      decks = decks.filter(([, d]) => d.items().length);
      if (!decks.length) return "";
      return `<h3 class="sec">${GROUP_NAMES[g] || g}</h3>${g === "Particules" ? PARTICLE_MEMO : ""}<div class="deck-grid">` + decks.map(([id, d]) => {
        const items = d.items(), total = items.length, ks = knownSet(id), known = items.filter((it) => ks.has(it.id)).length, pct = Math.round((known / total) * 100);
        return `<button class="deck ${known === total ? "done" : ""}" data-id="${id}">
          <span class="deck-icon" lang="ko">${esc(d.icon)}</span>
          <span class="deck-title">${esc(d.title)}</span>
          <span class="bar"><i style="width:${pct}%"></i></span>
          <span class="deck-count">${known === total ? L("★ Maîtrisé", "★ Mastered") : `${known}/${total}`}</span>
        </button>`;
      }).join("") + "</div>";
    }).join("");
  v.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { learn.dir = b.dataset.dir; saveLearn(); renderDecks(); }));
  v.querySelectorAll(".deck").forEach((b) => (b.onclick = () => openDeck(b.dataset.id)));
}

// Groupes de lettres pour réviser (comme les lignes du tableau)
const isJamoDeck = (id) => id === "jamo";
const cardRowsPref = (id) => ((learn.cardRows ||= {})[id] ||= ["c1", "c2", "v1", "v2"]);

function openDeck(id, all = false, rows = null) {
  if (isJamoDeck(id) && !rows) return renderRowPicker(id);
  let items = DECKS[id].items();
  if (rows) {
    const keep = new Set(JAMO_ROWS.filter((r) => rows.includes(r.id)).flatMap((r) => r.jamo));
    items = items.filter((it) => keep.has(it.id));
  }
  const known = knownSet(id);
  let queue = items.filter((it) => !known.has(it.id));
  const review = all || !queue.length;
  if (review) queue = items;
  session = { deck: id, items, rows, queue: shuffle(queue), flipped: false, review };
  renderCard();
}

function renderRowPicker(id) {
  session = null;
  const v = $("view-cards"), d = DECKS[id], sel = new Set(cardRowsPref(id)), known = knownSet(id);
  const chips = (group) => JAMO_ROWS.filter((r) => r.group === group).map((r) => {
    const k = r.jamo.filter((x) => known.has(x)).length, full = k === r.jamo.length;
    return `<button class="bf-row wide ${sel.has(r.id) ? "on" : ""} ${full ? "mastered" : ""}" data-id="${r.id}" lang="ko">${esc(r.jamo.join(""))}<small>${full ? "★" : `${k}/${r.jamo.length}`}</small></button>`;
  }).join("");
  const chosen = JAMO_ROWS.filter((r) => sel.has(r.id)).flatMap((r) => r.jamo);
  const left = chosen.filter((x) => !known.has(x)).length;
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="cardBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>${esc(d.title)}</strong><div class="muted">${L("Choisis les groupes de lettres à réviser", "Pick the letter groups to review")}</div></div>
    </div>
    <div class="bf-quick">
      <button class="btn small" data-q="cons">${L("Consonnes", "Consonants")}</button>
      <button class="btn small" data-q="vow">${L("Voyelles", "Vowels")}</button>
      <button class="btn small" data-q="todo">${L("Pas encore maîtrisés", "Not mastered yet")}</button>
      <button class="btn small" data-q="all">${L("Tout", "All")}</button>
      <button class="btn small" data-q="none">${L("Aucun", "None")}</button>
    </div>
    <h3 class="sec">${L("Consonnes", "Consonants")}</h3><div class="bf-rows">${chips("cons")}</div>
    <h3 class="sec">${L("Voyelles", "Vowels")}</h3><div class="bf-rows">${chips("vow")}</div>
    <p class="row-preview" lang="ko">${chosen.length ? esc(chosen.join(" ")) : L("Aucun groupe choisi", "No group selected")}</p>
    <div class="cta-row">
      <button class="btn gold" id="rowStart" ${chosen.length ? "" : "disabled"}>🃏 ${left
        ? L(`Réviser (${left} carte${left > 1 ? "s" : ""} à apprendre)`, `Review (${left} card${left > 1 ? "s" : ""} to learn)`)
        : L(`Tout revoir (${chosen.length} cartes)`, `Review all (${chosen.length} cards)`)}</button>
      ${left && left < chosen.length ? `<button class="btn" id="rowAll">${L(`Tout revoir (${chosen.length})`, `Review all (${chosen.length})`)}</button>` : ""}
    </div>
    <p class="cal-help">${L("Le chiffre sous chaque groupe = lettres maîtrisées / total. ★ = groupe maîtrisé.", "The number under each group = letters mastered / total. ★ = group mastered.")}</p>`;
  const set = (rows) => { learn.cardRows[id] = rows; saveLearn(); renderRowPicker(id); };
  v.querySelectorAll(".bf-row").forEach((b) => (b.onclick = () => {
    const r = b.dataset.id, cur = cardRowsPref(id);
    set(cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);
  }));
  v.querySelectorAll(".bf-quick button").forEach((b) => (b.onclick = () => {
    const q = b.dataset.q;
    set(q === "all" ? JAMO_ROWS.map((r) => r.id)
      : q === "cons" || q === "vow" ? JAMO_ROWS.filter((r) => r.group === q).map((r) => r.id)
      : q === "todo" ? JAMO_ROWS.filter((r) => r.jamo.some((x) => !known.has(x))).map((r) => r.id)
      : []);
  }));
  $("cardBack").onclick = closeDeck;
  $("rowStart").onclick = () => openDeck(id, !left, cardRowsPref(id));
  $("rowAll") && ($("rowAll").onclick = () => openDeck(id, true, cardRowsPref(id)));
}

// Au dos d'une carte de lettre : affiche mnémotechnique + mot d'exemple
function jamoExample(ch) {
  const ex = KO_EX[ch], mnemo = mnemoHTML(ch, true);
  if (!ex) return mnemo;
  return mnemo + `<div class="card-ex">
    <span class="card-ex-pic">${ex[5]}</span>
    <div>
      <div class="card-ex-kana" lang="ko">${hl(ex[0])}</div>
      <div class="card-ex-rom">${hl(ex[1])} · ${esc(L(ex[3], ex[4]))}</div>
    </div>
  </div>`;
}
const cardSay = (it) => (isJamo(it.ko) ? `${sayOf(it.ko)}. ${exWord(it.ko)}` : it.ko);

function cardFaces(it) {
  const koSide = `<div class="big-ja ${isJamo(it.ko) ? "jamo" : ""}" lang="ko">${esc(it.ko)}</div>`;
  const letter = !it.fr;
  if (learn.dir === "ko") {
    return {
      front: koSide,
      back: letter ? `<div class="big-ja">${esc(it.romaji)}</div>${jamoExample(it.ko)}` : `${koSide}<div class="romaji">${esc(it.romaji)}</div><div class="big-fr">${esc(it.fr)}</div>`,
    };
  }
  return {
    front: `<div class="big-fr">${esc(letter ? it.romaji : it.fr)}</div>`,
    back: `${koSide}${letter ? jamoExample(it.ko) : `<div class="romaji">${esc(it.romaji)}</div>`}`,
  };
}

function renderCard() {
  if (DECKS[session.deck].kind === "particle" && session.queue.length) return renderParticle();
  const v = $("view-cards"), s = session, d = DECKS[s.deck];
  const ks = knownSet(s.deck), total = s.items.length, known = s.items.filter((it) => ks.has(it.id)).length;
  const head = `<div class="deck-head">
      <button class="btn small" id="cardBack">← ${s.rows ? L("Groupes", "Groups") : L("Paquets", "Decks")}</button>
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
  const flip = () => { if (s.flipped) return; s.flipped = true; renderCard(); speak(cardSay(it)); };
  $("flip").onclick = flip;
  $("flip").onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  v.querySelectorAll(".face [data-say]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say); }));
  $("cardSay").onclick = (e) => { e.stopPropagation(); speak(cardSay(it)); };
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
  back ? renderRowPicker(back) : renderDecks();
}

// ---------- Particules : phrases à trous ----------
const MEMO_ROWS = [
  ["은 / 는", "eun / neun", "thème : « quant à… » (은 après consonne, 는 après voyelle)", "topic: “as for…” (은 after a consonant, 는 after a vowel)"],
  ["이 / 가", "i / ga", "sujet ; avec 있다, 없다, 좋다 ; après 누가, 뭐가", "subject; with 있다, 없다, 좋다; after 누가, 뭐가"],
  ["을 / 를", "eul / reul", "complément d'objet direct", "direct object"],
  ["에", "e", "destination, lieu où l'on est (있다), moment précis", "destination, where something is (있다), specific time"],
  ["에서", "eseo", "lieu d'une action ; « depuis » un lieu", "place of an action; “from” a place"],
  ["(으)로", "(eu)ro", "moyen, outil, direction (로 après voyelle ou ㄹ)", "means, tool, direction (로 after a vowel or ㄹ)"],
  ["에게 / 한테", "ege / hante", "« à » une personne (한테 = oral)", "“to” a person (한테 = spoken)"],
  ["하고 / 와·과", "hago / wa·gwa", "« et », « avec » (와 après voyelle, 과 après consonne)", "“and”, “with” (와 after a vowel, 과 after a consonant)"],
  ["도", "do", "« aussi » (remplace 은/는, 이/가, 을/를)", "“too / also” (replaces 은/는, 이/가, 을/를)"],
  ["의", "ui (e)", "« de » (possession), prononcé « e »", "possession (“'s”), pronounced “e”"],
  ["부터 / 까지", "buteo / kkaji", "« à partir de » / « jusqu'à »", "“from” / “until”"],
  ["보다 · 만", "boda · man", "« plus que » · « seulement »", "“more than” · “only”"],
];
const PARTICLE_MEMO = `<details class="memo">
  <summary>📖 ${L("Mémo des particules", "Particle cheat sheet")}</summary>
  <table>${MEMO_ROWS.map(([p, r, fr, en]) => `<tr><td lang="ko">${p}</td><td>${r}</td><td>${esc(L(fr, en))}</td></tr>`).join("")}</table>
  <p class="cal-help">${L("Astuce : beaucoup de particules changent selon que le mot finit par une consonne (batchim) ou par une voyelle : 책<b>을</b> / 커피<b>를</b>.", "Tip: many particles change depending on whether the word ends in a consonant (batchim) or a vowel: 책<b>을</b> / 커피<b>를</b>.")}</p>
</details>`;

function renderParticle() {
  const v = $("view-cards"), s = session, d = DECKS[s.deck], it = s.queue[0];
  const total = s.items.length, known = knownSet(s.deck).size;
  if (!it.options) it.options = shuffle([it.answer, ...it.wrong]);
  const pick = s.picked, done = pick != null, ok = pick === it.answer;
  const blank = done ? `<span class="blank filled ${ok ? "good" : "bad"}">${esc(it.answer)}</span>` : `<span class="blank">？</span>`;
  const sentence = esc(it.ko).replace("＿", blank).replace(/B：/, "<br>B：");
  const romaji = esc(it.romaji).replace("__", done ? `<b>${PARTICLE_ROMAJI[it.answer]}</b>` : "___");
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="cardBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>${L("Particules", "Particles")} · ${esc(d.title)}</strong><div class="muted">${s.review ? L("Révision complète", "Full review") : `${L("Maîtrisées :", "Mastered:")} ${known}/${total}`} · ${s.queue.length} ${P(s.queue.length, "restante", "restantes", "left", "left")}</div></div>
      <span class="qpts">⭐ ${s.pts || 0}</span>
    </div>
    <div class="part-card ${done ? (ok ? "good" : "bad") : ""}">
      <div class="part-ja" lang="ko">${sentence}</div>
      <div class="romaji">${romaji}</div>
      <div class="part-fr">${esc(it.fr)}</div>
      ${done && ok ? `<span class="gain">+5</span>` : ""}
    </div>
    <div class="options part-opts">${it.options.map((o) => {
      const cls = !done ? "" : o === it.answer ? "right" : o === pick ? "wrong" : "dim";
      return `<button class="opt ${cls}" ${done ? "disabled" : ""}><span lang="ko">${esc(o)}</span><small>${PARTICLE_ROMAJI[o]}</small></button>`;
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
      if (!ok) s.queue.splice(Math.min(3, s.queue.length), 0, it);
      it.options = null; s.picked = null;
      renderCard();
    };
  }
  $("cardBack").onclick = closeDeck;
}
function speakParticle(it) { speak(it.ko.replace("＿", it.answer).replace(/[AB]：/g, "")); }

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
const QUIZ_LEN = 10;                    // vocabulaire : toujours 10 questions
const QUIZ_LENS = [10, 30, 60, 90];     // lettres / syllabes : nombre de cartes au choix
const isKanaQuiz = (mode) => mode === "jamo" || mode === "syll";
const quizLen = () => (QUIZ_LENS.includes(learn.quizLen) ? learn.quizLen : 10);
// clé du record : "jamo" pour 10 cartes, "jamo:30" sinon
const quizKey = (mode, n) => (isKanaQuiz(mode) && n !== 10 ? `${mode}:${n}` : mode);
// bonus de série : paliers à 5, 10, 15, 20 bonnes réponses d'affilée, puis tous les 10
function streakBonus(n) {
  if (n % 5) return 0;
  return { 5: 10, 10: 25, 15: 40, 20: 60 }[n] || (n % 10 === 0 ? 100 : 50);
}
const QUIZ_MODES = {
  jamo: { title: L("Lettres (jamo)", "Letters (jamo)"), icon: "ㄱ", desc: L("Trouve la bonne prononciation", "Find the right sound") },
  syll: { title: L("Syllabes", "Syllables"), icon: "가", desc: L("Lis la syllabe : consonne + voyelle", "Read the syllable: consonant + vowel") },
  vocab: { title: L("Vocabulaire", "Vocabulary"), icon: "말", desc: L("Trouve la bonne traduction", "Find the right translation") },
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
    <h3 class="sec">🃏 ${L("Nombre de cartes (lettres / syllabes)", "Number of cards (letters / syllables)")}</h3>
    <div class="seg q-lens">${QUIZ_LENS.map((n) => `<button data-len="${n}" class="${n === quizLen() ? "on" : ""}">${n}</button>`).join("")}</div>
    <div class="mode-list">${Object.entries(QUIZ_MODES).map(([k, m]) => {
      const n = isKanaQuiz(k) ? quizLen() : QUIZ_LEN, key = quizKey(k, n);
      return `
      <button class="mode" data-k="${k}">
        <span class="deck-icon" lang="ko">${m.icon}</span>
        <span><span class="deck-title">${m.title}</span><span class="muted">${m.desc} · ${n} ${L("cartes", "cards")}</span></span>
        <span class="best">${learn.best[key] != null ? `${stars(learn.best[key], n)}<br><small>${L("Record :", "Best:")} ${learn.bestPts[key] ?? 0} ⭐</small>` : L("Nouveau", "New")}</span>
      </button>`;
    }).join("")}
      <button class="mode bf-mode" id="bfOpen">
        <span class="deck-icon">⌨️</span>
        <span><span class="deck-title">Brute force (hangeul)</span><span class="muted">${L("Tape la lecture de chaque lettre ou syllabe · choisis lesquelles", "Type the reading of each letter or syllable · pick which ones")}</span></span>
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
  if (mode === "vocab") return Object.values(VOCAB).flatMap((c) => c.items.map(([ko, romaji, fr]) => ({ q: ko, a: fr, say: ko, sub: romaji })));
  if (mode === "syll") return BASIC_CHO.flatMap((c) => BASIC_JUNG.map((v) => ({ q: composeSyl(c, v), a: romSyl(c, v), say: composeSyl(c, v) })));
  return JAMO_ALL.map((j) => ({ q: j.ch, a: j.rom, say: sayOf(j.ch) }));
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
      <div class="big-ja ${isJamo(q.q) ? "jamo" : ""}" lang="ko">${esc(q.q)}</div>
      ${a && q.sub ? `<div class="romaji">${esc(q.sub)}</div>` : ""}
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
showView(learn.lastView || "jour");
updateWotdDot();
