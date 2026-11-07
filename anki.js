// Kaiwa — « Anki » : les 2000 mots les plus fréquents en répétition espacée (algorithme de type SM-2, comme Anki).
// Chaque jour : les cartes dont la date de révision est arrivée + quelques nouveaux mots (dans l'ordre de fréquence).
// Après avoir retourné la carte : À revoir / Difficile / Bien / Facile → la carte revient plus ou moins tard.
// Utilise learn.js (dayIndex, addPoints, shuffle, pop, renderDecks, renderers, closeDeck…) et app.js (speak, toRuby, esc).

const ANKI_KEY = "kaiwa-anki-v1";
const ANKI_NEW_CHOICES = [5, 10, 20, 30, 50];
let anki = { cards: {}, newPerDay: 10, dir: "ja", day: null, newDone: 0, extraNew: 0, revDone: 0, ...load(ANKI_KEY, {}) };
const saveAnki = () => { try { localStorage.setItem(ANKI_KEY, JSON.stringify(anki)); } catch {} };
const ankiToday = () => dayIndex(new Date());
let ankiS = null; // session en cours
let ankiOptsOpen = false;

function ankiRollDay() {
  if (anki.day === ankiToday()) return;
  anki.day = ankiToday(); anki.newDone = 0; anki.extraNew = 0; anki.revDone = 0; saveAnki();
}
const ankiDue = () => Object.entries(anki.cards).filter(([, c]) => c.due <= ankiToday()).sort((a, b) => a[1].due - b[1].due || a[0] - b[0]).map(([i]) => +i);
const ankiSeen = () => Object.keys(anki.cards).length;
const ankiNewLeft = () => Math.max(0, Math.min(anki.newPerDay + anki.extraNew - anki.newDone, ANKI_WORDS.length - ankiSeen()));
function ankiNewList(n) {
  const out = [];
  for (let i = 0; i < ANKI_WORDS.length && out.length < n; i++) if (!anki.cards[i]) out.push(i);
  return out;
}
const ankiMature = () => Object.values(anki.cards).filter((c) => c.ivl >= 21).length;
const ankiTomorrow = () => Object.values(anki.cards).filter((c) => c.due <= ankiToday() + 1).length;

// ---------- Planification ----------
// grade : 1 = À revoir, 2 = Difficile, 3 = Bien, 4 = Facile. Renvoie { card, again } (again = la carte revient dans la séance).
function ankiSchedule(item, grade) {
  const old = anki.cards[item.i];
  if (!old || item.learning) { // nouvelle carte (ou carte ratée pendant la séance)
    if (grade === 1) return { card: old || null, again: true };
    const ivl = grade === 4 ? 4 : grade === 3 ? (item.failed ? 1 : 2) : 1;
    return { card: { ivl, ease: old?.ease ?? 2.5, reps: (old?.reps ?? 0) + 1, lapses: old?.lapses ?? 0, due: ankiToday() + ivl }, again: false };
  }
  const c = { ...old, reps: old.reps + 1 };
  if (grade === 1) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 1; c.due = ankiToday() + 1; return { card: c, again: true }; }
  if (grade === 2) { c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); }
  if (grade === 3) c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * c.ease));
  if (grade === 4) { c.ivl = Math.max(c.ivl + 2, Math.round(c.ivl * c.ease * 1.3)); c.ease += 0.15; }
  c.ivl = Math.min(c.ivl, 3650); c.due = ankiToday() + c.ivl;
  return { card: c, again: false };
}
function fmtIvl(days, again) {
  if (again) return L("< 10 min", "< 10 min");
  if (days < 30) return L(`${days} j`, `${days} d`);
  if (days < 365) return L(`${Math.round(days / 30)} mois`, `${Math.round(days / 30)} mo`);
  const y = Math.round((days / 365) * 10) / 10;
  return L(`${fmt(y)} an${y >= 2 ? "s" : ""}`, `${fmt(y)} yr`);
}

// ---------- Bandeau dans l'onglet Cartes ----------
function ankiBanner() {
  ankiRollDay();
  const due = ankiDue().length, nw = ankiNewLeft(), seen = ankiSeen(), total = due + nw;
  const pct = (seen / ANKI_WORDS.length) * 100;
  const opts = ankiOptsOpen ? `
    <div class="anki-opts">
      <div class="anki-opt-row"><span>${L("Nouveaux mots par jour", "New words per day")}</span>
        <div class="seg small">${ANKI_NEW_CHOICES.map((n) => `<button data-n="${n}" class="${n === anki.newPerDay ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div class="anki-opt-row"><span>${L("Sens des cartes", "Card direction")}</span>
        <div class="seg small">
          <button data-d="ja" class="${anki.dir === "ja" ? "on" : ""}">${L("JA → FR", "JA → EN")}</button>
          <button data-d="fr" class="${anki.dir === "fr" ? "on" : ""}">${L("FR → JA", "EN → JA")}</button>
        </div></div>
      <button class="btn small red" id="ankiReset">${L("Remettre à zéro", "Reset progress")}</button>
    </div>` : "";
  return `
    <div class="anki-banner">
      <div class="anki-top">
        <span class="deck-icon">📚</span>
        <div><b>Anki · ${L("2000 mots", "2,000 words")}</b><small>${L("Les mots les plus fréquents, en répétition espacée", "The most frequent words, with spaced repetition")}</small></div>
        <button class="icon anki-gear" id="ankiOpts" title="${L("Options", "Options")}">⚙</button>
      </div>
      <div class="anki-counts">
        <span class="c-due"><b>${due}</b><small>${L("à revoir", "to review")}</small></span>
        <span class="c-new"><b>${nw}</b><small>${L("nouveaux", "new")}</small></span>
        <span class="c-seen"><b>${fmt(seen)}</b><small>/ ${fmt(ANKI_WORDS.length)} ${L("vus", "seen")}</small></span>
        <span class="c-mat"><b>${ankiMature()}</b><small>${L("acquis", "mature")}</small></span>
      </div>
      <span class="bar"><i style="width:${pct}%"></i></span>
      ${total ? `<div class="cta-row"><button class="btn gold" id="ankiStart">▶ ${L(`Réviser (${total})`, `Study (${total})`)}</button></div>`
        : `<p class="anki-done">✅ ${L("Tout est fait pour aujourd'hui !", "All done for today!")} <span class="muted">${L(`Demain : ${ankiTomorrow()} carte${ankiTomorrow() > 1 ? "s" : ""}`, `Tomorrow: ${ankiTomorrow()} card${ankiTomorrow() === 1 ? "" : "s"}`)}</span></p>
           ${seen < ANKI_WORDS.length ? `<div class="cta-row"><button class="btn small" id="ankiMore">＋ ${L("10 nouveaux mots de plus", "10 more new words")}</button></div>` : ""}`}
      ${opts}
    </div>`;
}
function wireAnkiBanner() {
  const v = $("view-cards");
  $("ankiStart") && ($("ankiStart").onclick = startAnki);
  $("ankiMore") && ($("ankiMore").onclick = () => { anki.extraNew += 10; saveAnki(); startAnki(); });
  $("ankiOpts").onclick = () => { ankiOptsOpen = !ankiOptsOpen; renderDecks(); };
  v.querySelectorAll(".anki-opts [data-n]").forEach((b) => (b.onclick = () => { anki.newPerDay = +b.dataset.n; saveAnki(); renderDecks(); }));
  v.querySelectorAll(".anki-opts [data-d]").forEach((b) => (b.onclick = () => { anki.dir = b.dataset.d; saveAnki(); renderDecks(); }));
  $("ankiReset") && ($("ankiReset").onclick = () => {
    if (!confirm(L("Effacer toute la progression Anki (2000 mots) ?", "Erase all Anki progress (2,000 words)?"))) return;
    anki.cards = {}; anki.newDone = 0; anki.extraNew = 0; anki.revDone = 0; saveAnki(); renderDecks();
  });
}

// ---------- Séance ----------
function startAnki() {
  ankiRollDay();
  const rev = ankiDue().map((i) => ({ i })), nw = ankiNewList(ankiNewLeft()).map((i) => ({ i, isNew: true }));
  // on mélange un nouveau mot toutes les 3 révisions environ
  const queue = [];
  while (rev.length || nw.length) {
    for (let k = 0; k < 3 && rev.length; k++) queue.push(rev.shift());
    if (nw.length) queue.push(nw.shift());
  }
  ankiS = { queue, flipped: false, done: 0, pts: 0, counted: new Set() };
  session = null;
  renderAnki();
}
function ankiCounts() {
  const q = ankiS.queue;
  return { nw: q.filter((x) => x.isNew && !x.learning).length, lrn: q.filter((x) => x.learning).length, rev: q.filter((x) => !x.isNew && !x.learning).length };
}
function renderAnki() {
  const v = $("view-cards"), s = ankiS;
  const head = (c) => `<div class="deck-head">
      <button class="btn small" id="ankiBack">← ${L("Paquets", "Decks")}</button>
      <div><strong>Anki · ${L("2000 mots", "2,000 words")}</strong><div class="muted">${L(`${s.done} carte${s.done > 1 ? "s" : ""} revue${s.done > 1 ? "s" : ""}`, `${s.done} card${s.done === 1 ? "" : "s"} done`)}</div></div>
      ${c ? `<span class="anki-mini"><b class="c-new">${c.nw}</b><b class="c-lrn">${c.lrn}</b><b class="c-due">${c.rev}</b></span>` : ""}
    </div>`;
  if (!s.queue.length) {
    v.innerHTML = head() + `<div class="finish">
      <div class="finish-icon">🎉</div><h2>${L("Séance terminée !", "Session complete!")}</h2>
      <p>${L(`${s.done} carte${s.done > 1 ? "s" : ""} revue${s.done > 1 ? "s" : ""} aujourd'hui.`, `${s.done} card${s.done === 1 ? "" : "s"} studied today.`)}</p>
      ${s.pts ? `<div class="points-won">+${s.pts} ⭐</div>` : ""}
      <p class="muted">${L(`Demain : ${ankiTomorrow()} carte${ankiTomorrow() > 1 ? "s" : ""} à revoir · ${fmt(ankiSeen())} / ${fmt(ANKI_WORDS.length)} mots vus`, `Tomorrow: ${ankiTomorrow()} card${ankiTomorrow() === 1 ? "" : "s"} due · ${fmt(ankiSeen())} / ${fmt(ANKI_WORDS.length)} words seen`)}</p>
      <div class="cta-row"><button class="btn gold" id="ankiEnd">${L("Retour aux paquets", "Back to decks")}</button></div></div>`;
    $("ankiEnd").onclick = $("ankiBack").onclick = closeAnki;
    return;
  }
  const it = s.queue[0], w = ANKI_WORDS[it.i], meaning = L(w[3], w[4]);
  const rom = kanaToRomaji(toHiraChar(w[1]));
  const front = anki.dir === "ja"
    ? `<div class="big-ja anki-word" lang="ja">${esc(w[0])}</div>`
    : `<div class="big-fr">${esc(meaning)}</div>`;
  const back = `<div class="big-ja anki-word" lang="ja">${toRuby(w[2])}</div>
    <div class="anki-read" lang="ja">${esc(w[1])} <span class="anki-rom">· ${esc(rom)}</span></div>
    <div class="big-fr">${esc(meaning)}</div>
    <div class="anki-rank">#${it.i + 1} ${L("en fréquence", "by frequency")}${it.isNew && !it.learning ? ` · <b class="c-new">${L("nouveau", "new")}</b>` : ""}</div>`;
  // intervalles proposés sur chaque bouton
  const btns = [1, 2, 3, 4].map((g) => { const r = ankiSchedule(it, g); return { g, txt: fmtIvl(r.card?.ivl ?? 0, r.again) }; });
  const LBL = { 1: L("À revoir", "Again"), 2: L("Difficile", "Hard"), 3: L("Bien", "Good"), 4: L("Facile", "Easy") };
  v.innerHTML = head(ankiCounts()) + `
    <div class="card-stage">
      <div class="flip ${s.flipped ? "flipped" : ""}" id="flip" role="button" tabindex="0" aria-label="${L("Retourner la carte", "Flip the card")}">
        <div class="face front">${front}<span class="hint">${L("Touche pour retourner", "Tap to flip")}</span></div>
        <div class="face back">${back}<button class="say-btn" id="cardSay" title="${L("Écouter", "Listen")}">🔊</button></div>
      </div>
      <div class="anki-answers ${s.flipped ? "" : "invisible"}">
        ${btns.map((b) => `<button class="anki-btn g${b.g}" data-g="${b.g}"><small>${b.txt}</small>${LBL[b.g]}</button>`).join("")}
      </div>
    </div>`;
  const flip = () => { if (s.flipped) return; s.flipped = true; renderAnki(); speak(w[1]); };
  $("flip").onclick = flip;
  $("flip").onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  $("cardSay").onclick = (e) => { e.stopPropagation(); speak(w[1]); };
  v.querySelectorAll(".anki-btn").forEach((b) => (b.onclick = () => answerAnki(+b.dataset.g)));
  $("ankiBack").onclick = closeAnki;
}
function answerAnki(g) {
  const s = ankiS; if (!s || !s.flipped) return;
  const it = s.queue.shift(), r = ankiSchedule(it, g);
  if (it.isNew && !s.counted.has(it.i)) { s.counted.add(it.i); anki.newDone++; }
  if (r.card) anki.cards[it.i] = r.card;
  if (r.again) s.queue.splice(Math.min(3, s.queue.length), 0, { ...it, learning: true, failed: true });
  else { s.done++; const p = g >= 3 ? 2 : 1; s.pts += p; addPoints(p); }
  saveAnki();
  s.flipped = false;
  renderAnki();
}
function closeAnki() { ankiS = null; renderDecks(); }

document.addEventListener("keydown", (e) => {
  if (!ankiS || document.body.dataset.view !== "cards" || e.target.matches("input, textarea, select")) return;
  if (e.key === " " && !ankiS.flipped) { e.preventDefault(); $("flip")?.click(); }
  if (ankiS.flipped && /^[1-4]$/.test(e.key)) answerAnki(+e.key);
});

// ---------- Branchement dans l'onglet Cartes ----------
const _ankiRenderDecks = renderDecks;
renderDecks = function () {
  ankiS = null;
  _ankiRenderDecks();
  const title = $("view-cards").querySelector(".panel-title");
  title.insertAdjacentHTML("afterend", ankiBanner());
  wireAnkiBanner();
};
const _ankiRenderCards = renderers.cards;
renderers.cards = function () { ankiS ? renderAnki() : _ankiRenderCards(); };
const _ankiOpenDeck = openDeck;
openDeck = function (...a) { ankiS = null; return _ankiOpenDeck(...a); };
if (document.body.dataset.view === "cards" && !session) renderDecks();
