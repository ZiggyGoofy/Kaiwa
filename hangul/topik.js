// SpeedHangul — Objectif TOPIK I : fiches de grammaire, exercices de grammaire, et panneau de progression en haut de « Cartes ».
// Utilise learn.js (DECKS, openDeck, knownSet, renderDecks, JAMO_ALL…), grammar-ko.js (GRAMMAR_TOPIK) et anki.js (anki, ANKI_TOPIK…).

// ---------- Paquets de grammaire ----------
GROUP_NAMES["Grammaire"] = L("Grammaire TOPIK I", "TOPIK I grammar");
const gramItems = (pts) => pts.flatMap((g) => g.q.map(([ko, answer, wrong, romaji, fr, en, whyFr, whyEn], i) =>
  ({ id: `${g.id}${i}`, ko, answer, wrong: wrong.split("|"), romaji, fr: L(fr, en), why: `${g.pat} — ${L(whyFr, whyEn)}` })));
// les fiches : la progression = fiches marquées « J'ai compris »
DECKS["gram:fiches"] = { group: "Grammaire", kind: "lessons", title: L("Fiches de grammaire", "Grammar notes"), icon: "📖",
  items: () => GRAMMAR_TOPIK.map((g) => ({ id: g.id })) };
DECKS["gram:all"] = { group: "Grammaire", kind: "particle", label: L("Grammaire", "Grammar"), title: L("Exercices (tout)", "Exercises (all)"), icon: "✏️",
  items: () => gramItems(GRAMMAR_TOPIK) };
// un petit paquet caché par point de grammaire (bouton « S'entraîner » d'une fiche)
for (const g of GRAMMAR_TOPIK) DECKS["gram:" + g.id] = { group: "Grammaire", kind: "particle", hidden: true, label: L("Grammaire", "Grammar"), title: g.pat, icon: "✏️", items: () => gramItems([g]) };

// ---------- Fiches de grammaire ----------
let gramPos = null; // null = liste ; sinon numéro de la fiche ouverte
function renderGrammar() {
  const v = $("view-cards"), done = knownSet("gram:fiches");
  if (gramPos == null) {
    v.innerHTML = `
      <div class="deck-head">
        <button class="btn small" id="gramBack">← ${L("Paquets", "Decks")}</button>
        <div><strong>📖 ${L("Grammaire du TOPIK I", "TOPIK I grammar")}</strong><div class="muted">${L(`${done.size}/${GRAMMAR_TOPIK.length} fiches comprises`, `${done.size}/${GRAMMAR_TOPIK.length} notes understood`)}</div></div>
      </div>
      <p class="cal-help gram-hint">${L("Lis chaque fiche, écoute les exemples, puis entraîne-toi. Coche « J'ai compris » quand c'est acquis.", "Read each note, listen to the examples, then practise. Tick “Got it” once it's clear.")}</p>
      <div class="gram-list">${GRAMMAR_TOPIK.map((g, i) => `
        <button class="gram-item ${done.has(g.id) ? "done" : ""}" data-i="${i}">
          <span class="gram-n">${done.has(g.id) ? "✓" : i + 1}</span>
          <span><b lang="ko">${esc(g.pat)}</b><small>${esc(L(g.fr[0], g.en[0]))}</small></span>
        </button>`).join("")}</div>
      <div class="cta-row"><button class="btn gold" id="gramAll">✏️ ${L("Tous les exercices", "All exercises")}</button></div>`;
    v.querySelectorAll(".gram-item").forEach((b) => (b.onclick = () => { gramPos = +b.dataset.i; renderGrammar(); v.scrollTop = 0; }));
    $("gramBack").onclick = closeGrammar;
    $("gramAll").onclick = () => { gramPos = null; inGrammar = false; openDeck("gram:all"); };
    return;
  }
  const g = GRAMMAR_TOPIK[gramPos], ok = done.has(g.id);
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="gramList">← ${L("Fiches", "Notes")}</button>
      <div><strong>${L("Fiche", "Note")} ${gramPos + 1}/${GRAMMAR_TOPIK.length}</strong><div class="muted">${L("Grammaire du TOPIK I", "TOPIK I grammar")}</div></div>
    </div>
    <div class="gram-card">
      <div class="gram-pat" lang="ko">${esc(g.pat)}</div>
      <div class="gram-title">${esc(L(g.fr[0], g.en[0]))}</div>
      <p class="gram-expl">${esc(L(g.fr[1], g.en[1]))}</p>
      <div class="gram-ex">${g.ex.map(([ja, ro, fr, en], i) => `
        <div class="phrase">
          <button class="say" data-i="${i}" title="${L("Écouter", "Listen")}">🔊</button>
          <div><div class="ja" lang="ko">${esc(ja)}</div><div class="romaji">${esc(ro)}</div><div class="fr">${esc(L(fr, en))}</div></div>
        </div>`).join("")}</div>
    </div>
    <div class="cta-row">
      <button class="btn ${ok ? "green" : ""}" id="gramOk">${ok ? L("✓ Compris", "✓ Got it") : L("☐ J'ai compris", "☐ Got it")}</button>
      <button class="btn gold" id="gramTrain">✏️ ${L("S'entraîner", "Practise")}</button>
    </div>
    <div class="kd-navrow gram-nav">
      <button class="kd-nav" id="gramPrev" ${gramPos === 0 ? "disabled" : ""}>‹</button>
      <span class="kd-count">${gramPos + 1} / ${GRAMMAR_TOPIK.length}</span>
      <button class="kd-nav" id="gramNext" ${gramPos === GRAMMAR_TOPIK.length - 1 ? "disabled" : ""}>›</button>
    </div>`;
  v.querySelectorAll(".gram-ex .say").forEach((b) => (b.onclick = () => { speak(g.ex[b.dataset.i][0]); pop(b); }));
  $("gramOk").onclick = () => {
    const k = knownSet("gram:fiches");
    if (k.has(g.id)) k.delete(g.id); else { k.add(g.id); addPoints(5); }
    learn.known["gram:fiches"] = [...k]; saveLearn(); renderGrammar();
  };
  $("gramTrain").onclick = () => { inGrammar = false; openDeck("gram:" + g.id, true); };
  $("gramList").onclick = () => { gramPos = null; renderGrammar(); };
  $("gramPrev").onclick = () => { gramPos--; renderGrammar(); };
  $("gramNext").onclick = () => { gramPos++; renderGrammar(); };
}
let inGrammar = false;
function openGrammar(i = null) { session = null; inGrammar = true; gramPos = i; renderGrammar(); $("view-cards").scrollTop = 0; }
function closeGrammar() { inGrammar = false; gramPos = null; renderDecks(); }

// ---------- Panneau « Objectif TOPIK I » ----------
function n5Stats() {
  const jamoIds = new Set(JAMO_ALL.map((j) => j.ch));
  const jamoKnown = [...knownSet("jamo")].filter((x) => jamoIds.has(x)).length;
  const vocab = ANKI_TOPIK.map((w) => anki.cards[ankiKey(w)]).filter(Boolean);
  const exTotal = gramItems(GRAMMAR_TOPIK).length, exDone = new Set([...knownSet("gram:all"), ...GRAMMAR_TOPIK.flatMap((g) => [...knownSet("gram:" + g.id)])]).size;
  const partTotal = DECKS["part:mix"].items().length, partDone = Object.keys(PARTICLES).reduce((n, k) => n + knownSet("part:" + k).size, 0);
  return [
    { k: "vocab", icon: "🗂️", t: L("Vocabulaire", "Vocabulary"), n: vocab.filter((c) => c.ivl >= 7).length, tot: ANKI_TOPIK.length, sub: L(`${vocab.length} vus`, `${vocab.length} seen`) },
    { k: "jamo", icon: "한", t: "Hangeul", n: jamoKnown, tot: jamoIds.size },
    { k: "gram", icon: "📖", t: L("Grammaire", "Grammar"), n: knownSet("gram:fiches").size, tot: GRAMMAR_TOPIK.length },
    { k: "ex", icon: "✏️", t: L("Exercices", "Exercises"), n: Math.min(exDone, exTotal), tot: exTotal },
    { k: "part", icon: "은", t: L("Particules", "Particles"), n: Math.min(partDone, partTotal), tot: partTotal },
  ];
}
function n5Panel() {
  const st = n5Stats();
  const pct = Math.round((st.reduce((a, s) => a + s.n / s.tot, 0) / st.length) * 100);
  return `
    <div class="n5-panel">
      <div class="n5-head"><span class="n5-badge">TOPIK I</span><div><b>${L("Objectif TOPIK I", "Goal: TOPIK I")}</b><small>${L("Tout ce qu'il faut pour les niveaux 1 et 2", "Everything you need for levels 1 and 2")}</small></div><span class="n5-pct">${pct} %</span></div>
      <div class="n5-rows">${st.map((s) => `
        <button class="n5-row" data-k="${s.k}">
          <span class="n5-ic" lang="ko">${s.icon}</span>
          <span class="n5-t">${s.t}<small>${s.n}/${s.tot}${s.sub ? ` · ${s.sub}` : ""}</small></span>
          <span class="bar"><i style="width:${(s.n / s.tot) * 100}%"></i></span>
          <span class="n5-go">›</span>
        </button>`).join("")}</div>
      <p class="cal-help">${L("Vocabulaire : mots revus à plus d'une semaine d'intervalle dans l'Anki TOPIK I. Hangeul : lettres marquées « Je savais » dans le paquet Lettres.", "Vocabulary: words reviewed at intervals over a week in the TOPIK I Anki deck. Hangeul: letters marked “I knew it” in the Letters deck.")}</p>
    </div>`;
}
function wireN5Panel() {
  document.querySelectorAll(".n5-row").forEach((b) => (b.onclick = () => {
    const k = b.dataset.k;
    if (k === "vocab") { anki.deck = "topik"; saveAnki(); renderDecks(); document.querySelector(".anki-banner")?.scrollIntoView({ behavior: "smooth" }); }
    if (k === "jamo") openDeck("jamo");
    if (k === "gram") openGrammar();
    if (k === "ex") openDeck("gram:all");
    if (k === "part") openDeck("part:mix");
  }));
}

// ---------- Branchement ----------
const _n5RenderDecks = renderDecks;
renderDecks = function () {
  inGrammar = false;
  _n5RenderDecks();
  $("view-cards").querySelector(".panel-title").insertAdjacentHTML("afterend", n5Panel());
  wireN5Panel();
};
const _n5OpenDeck = openDeck;
openDeck = function (id, ...a) {
  if (DECKS[id]?.kind === "lessons") return openGrammar();
  inGrammar = false;
  return _n5OpenDeck(id, ...a);
};
const _n5RenderCards = renderers.cards;
renderers.cards = function () { inGrammar ? renderGrammar() : _n5RenderCards(); };
if (document.body.dataset.view === "cards" && !session) renderDecks();
