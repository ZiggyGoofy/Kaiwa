// Kaiwa — Quiz « Brute force » des kana (inspiré de vedxyz.github.io/kana).
// Un kana s'affiche, on tape sa lecture en rōmaji : validation instantanée, les erreurs reviennent vite,
// chaque kana doit être réussi plusieurs fois pour être « éliminé ».

const BF_TARGET = 3;          // réussites nécessaires pour éliminer un kana
const BF_RETRY_GAP = 4;       // un kana raté revient environ 4 questions plus loin

// Toutes les lignes, avec un identifiant stable pour mémoriser la sélection
const BF_ROWS = [
  ...KANA_ROWS.map((r, i) => ({ id: "b" + i, group: "base", kana: r.filter(Boolean) })),
  ...KANA_DAKUTEN.map((r, i) => ({ id: "d" + i, group: "dakuten", kana: r.filter(Boolean) })),
  ...KANA_COMBO.map((r, i) => ({ id: "c" + i, group: "combo", kana: r.filter(Boolean) })),
];

// Autres orthographes acceptées (Kunrei / saisie clavier japonaise)
const BF_ALT = {
  shi: ["si"], chi: ["ti"], tsu: ["tu"], fu: ["hu"], wo: ["o"], n: ["nn"],
  sha: ["sya"], shu: ["syu"], sho: ["syo"], cha: ["tya", "cya"], chu: ["tyu", "cyu"], cho: ["tyo", "cyo"],
  ja: ["jya", "zya"], ju: ["jyu", "zyu"], jo: ["jyo", "zyo"],
};
const BF_ALT_BY_KANA = { "じ": ["zi"], "ぢ": ["di"], "づ": ["du"] };
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
function bfAnswers(hira, romaji) {
  return [romaji, ...(BF_ALT[romaji] || []), ...(BF_ALT_BY_KANA[hira] || [])];
}
// Toutes les lectures possibles : sert à repérer une réponse fausse « complète »
const BF_ALL_ROMAJI = new Set(BF_ROWS.flatMap((r) => r.kana.flatMap(([k, ro]) => bfAnswers(k, ro))));

let bf = null; // session en cours
const bfPrefs = () => (learn.bf ||= { script: "hira", rows: ["b0", "b1", "b2", "b3", "b4"], showAnswer: true });

// ---------- Écran de configuration ----------
function renderBFSetup() {
  const p = bfPrefs(), v = $("view-quiz"), sel = new Set(p.rows);
  const sample = (k) => (p.script === "kata" ? toKata(k) : k);
  const chips = (group) => BF_ROWS.filter((r) => r.group === group).map((r) =>
    `<button class="bf-row ${sel.has(r.id) ? "on" : ""}" data-id="${r.id}" lang="ja">${esc(sample(r.kana[0][0]))}<small>${r.kana.length}</small></button>`).join("");
  const count = BF_ROWS.filter((r) => sel.has(r.id)).reduce((n, r) => n + r.kana.length, 0) * (p.script === "both" ? 2 : 1);
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="bfBack">← Quiz</button>
      <div><strong>⌨️ Brute force</strong><div class="muted">${L("Tape la lecture de chaque kana", "Type the reading of each kana")}</div></div>
    </div>
    <div class="seg">
      <button data-s="hira" class="${p.script === "hira" ? "on" : ""}">ひらがな</button>
      <button data-s="kata" class="${p.script === "kata" ? "on" : ""}">カタカナ</button>
      <button data-s="both" class="${p.script === "both" ? "on" : ""}">${L("Les deux", "Both")}</button>
    </div>
    <div class="bf-quick">
      <button class="btn small" data-q="base">${L("De base", "Basic")}</button>
      <button class="btn small" data-q="all">${L("Tout", "All")}</button>
      <button class="btn small" data-q="none">${L("Aucun", "None")}</button>
    </div>
    <h3 class="sec">${L("De base", "Basic")}</h3><div class="bf-rows">${chips("base")}</div>
    <h3 class="sec">${L("Avec ゛ et ゜ (dakuten)", "With ゛ and ゜ (dakuten)")}</h3><div class="bf-rows">${chips("dakuten")}</div>
    <h3 class="sec">${L("Combinaisons", "Combinations")}</h3><div class="bf-rows">${chips("combo")}</div>
    <label class="bf-opt"><input type="checkbox" id="bfShow" ${p.showAnswer ? "checked" : ""}> ${L("Montrer la bonne réponse quand je me trompe", "Show the right answer when I'm wrong")}</label>
    <div class="cta-row">
      <button class="btn gold" id="bfStart" ${count ? "" : "disabled"}>▶ ${L(`Commencer (${count} kana)`, `Start (${count} kana)`)}</button>
    </div>
    <p class="cal-help bf-help">${L(
      `Tape la lecture en rōmaji (ou en kana) : la réponse est validée toute seule. Chaque kana doit être réussi ${BF_TARGET} fois pour être éliminé ; ceux que tu rates reviennent vite. Entrée = je ne sais pas.`,
      `Type the reading in rōmaji (or kana): it's checked automatically. Each kana must be answered right ${BF_TARGET} times to be eliminated; the ones you miss come back soon. Enter = I don't know.`)}</p>`;
  v.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { p.script = b.dataset.s; saveLearn(); renderBFSetup(); }));
  v.querySelectorAll(".bf-row").forEach((b) => (b.onclick = () => {
    const id = b.dataset.id;
    p.rows = sel.has(id) ? p.rows.filter((x) => x !== id) : [...p.rows, id];
    saveLearn(); renderBFSetup();
  }));
  v.querySelectorAll(".bf-quick button").forEach((b) => (b.onclick = () => {
    p.rows = b.dataset.q === "all" ? BF_ROWS.map((r) => r.id) : b.dataset.q === "base" ? BF_ROWS.filter((r) => r.group === "base").map((r) => r.id) : [];
    saveLearn(); renderBFSetup();
  }));
  $("bfShow").onchange = (e) => { p.showAnswer = e.target.checked; saveLearn(); };
  $("bfBack").onclick = () => { bf = null; renderQuizHome(); };
  $("bfStart").onclick = startBF;
}

// ---------- Session ----------
function startBF() {
  const p = bfPrefs(), sel = new Set(p.rows);
  const base = BF_ROWS.filter((r) => sel.has(r.id)).flatMap((r) => r.kana);
  const scripts = p.script === "both" ? ["hira", "kata"] : [p.script];
  const items = scripts.flatMap((sc) => base.map(([k, ro]) => ({
    kana: sc === "kata" ? toKata(k) : k, hira: k, romaji: ro, answers: bfAnswers(k, ro), left: BF_TARGET,
  })));
  bf = { items, queue: shuffle(items), retry: [], current: null, prev: null, correct: 0, total: 0, streak: 0, best: 0, pts: 0, missed: false, done: false };
  renderBFPractice();
  nextBF();
}

function nextBF() {
  const s = bf, alive = s.items.filter((it) => it.left > 0);
  if (!alive.length && !s.endless) return finishBF();
  // les kana ratés reviennent en priorité quand leur délai est écoulé
  s.retry.forEach((r) => r.wait--);
  const due = s.retry.findIndex((r) => r.wait <= 0);
  let it;
  if (due >= 0) it = s.retry.splice(due, 1)[0].item;
  else {
    const pool = s.endless ? s.items : alive;
    if (!s.queue.length || !s.queue.some((x) => pool.includes(x))) s.queue = shuffle(pool);
    s.queue = s.queue.filter((x) => pool.includes(x));
    it = s.queue.shift();
    if (it === s.prev && pool.length > 1) { s.queue.push(it); it = s.queue.shift(); }
  }
  s.prev = s.current = it; s.missed = false; s.resolved = false;
  showBFCurrent();
}

function showBFCurrent() {
  const it = bf.current;
  $("bfKana").textContent = it.kana;
  $("bfKana").classList.remove("good", "bad"); void $("bfKana").offsetWidth;
  $("bfFeedback").innerHTML = "&nbsp;";
  $("bfInput").value = ""; $("bfInput").classList.remove("bad");
  updateBFStats();
}

function bfFail(shown) {
  const s = bf, it = s.current;
  if (!s.missed) {
    s.missed = true; s.streak = 0;
    it.left = Math.min(BF_TARGET, it.left + 1); // une erreur coûte une réussite de plus
    s.retry.push({ item: it, wait: Math.min(BF_RETRY_GAP, Math.max(1, s.items.length - 1)) });
  }
  $("bfKana").classList.add("bad");
  $("bfInput").classList.add("bad");
  $("bfFeedback").innerHTML = shown || bfPrefs().showAnswer
    ? `<span class="bf-bad">${esc(it.kana)} = <b>${esc(it.romaji)}</b></span>`
    : `<span class="bf-bad">✗</span>`;
  speak(it.kana);
  updateBFStats();
}

function bfSuccess() {
  const s = bf, it = s.current;
  if (s.resolved) return;
  s.resolved = true; s.total++;
  if (!s.missed) {
    s.correct++; s.streak++; s.best = Math.max(s.best, s.streak);
    if (it.left > 0) it.left--;
    s.pts += 2; addPoints(2);
  }
  $("bfKana").classList.add("good");
  $("bfFeedback").innerHTML = `<span class="bf-good">✓ ${esc(it.romaji)}</span>`;
  updateBFStats();
  setTimeout(() => { if (bf === s) nextBF(); }, s.missed ? 700 : 250);
}

function bfCheck() {
  const s = bf; if (!s || !s.current || s.resolved) return;
  const inp = $("bfInput"), raw = inp.value.normalize("NFC").trim().toLowerCase();
  if (!raw) return;
  const it = s.current;
  if (it.answers.includes(raw) || toHira(raw) === it.hira) { inp.value = ""; return bfSuccess(); }
  // réponse fausse « complète » (une autre lecture existante, ou un autre kana) qui n'est pas le début de la bonne
  const isPrefix = it.answers.some((a) => a.startsWith(raw)) || it.hira.startsWith(toHira(raw));
  const isWholeWrong = (BF_ALL_ROMAJI.has(raw) || /^[ぁ-ヶ]+$/.test(raw)) && !isPrefix;
  if (isWholeWrong) { bfFail(); setTimeout(() => { if (bf === s) inp.value = ""; }, 500); }
}

function updateBFStats() {
  const s = bf, n = s.items.length, alive = s.items.filter((it) => it.left > 0).length;
  // la barre avance à chaque bonne réponse (et recule un peu après une erreur)
  const goal = n * BF_TARGET, got = s.items.reduce((a, it) => a + (BF_TARGET - it.left), 0);
  const pct = s.endless ? 100 : Math.round((got / goal) * 100);
  $("bfStats").innerHTML = `
    <div class="bf-progress">
      <div class="bar big"><i style="width:${pct}%"></i></div>
      <b>${pct} %</b>
    </div>
    <div class="bf-nums">
      <span>${s.endless ? L("Révision libre", "Free review") : `✅ ${n - alive}/${n} ${L("éliminés", "done")}`}</span>
      <span>🔥 ${s.streak}</span>
      <span>🎯 ${s.total ? Math.round((s.correct / s.total) * 100) : 0} %</span>
      <span class="qpts">⭐ ${s.pts}</span>
    </div>`;
  // progression du kana affiché : ●●○ = encore 1 réussite pour l'éliminer
  const it = s.current;
  if (it && $("bfDots")) {
    const done = BF_TARGET - it.left;
    $("bfDots").innerHTML = s.endless ? "" : Array.from({ length: BF_TARGET }, (_, i) => `<i class="${i < done ? "on" : ""}"></i>`).join("");
    $("bfDots").title = L(`${done} / ${BF_TARGET} réussites pour ce kana`, `${done} / ${BF_TARGET} correct for this kana`);
  }
}

function renderBFPractice() {
  const v = $("view-quiz");
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="bfQuit">✕</button>
      <div><strong>⌨️ Brute force</strong><div class="muted" id="bfSub">${bf.items.length} kana</div></div>
    </div>
    <div id="bfStats"></div>
    <div class="bf-card">
      <div class="bf-dots" id="bfDots"></div>
      <div class="bf-kana" id="bfKana" lang="ja"></div>
      <div class="bf-feedback" id="bfFeedback">&nbsp;</div>
      <input id="bfInput" class="bf-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="rōmaji" aria-label="rōmaji">
      <div class="bf-tools">
        <button class="btn small" id="bfSay">🔊</button>
        <button class="btn small" id="bfHint">💡 ${L("Réponse", "Answer")}</button>
        <button class="btn small" id="bfSkip">${L("Je ne sais pas ⏎", "I don't know ⏎")}</button>
      </div>
    </div>`;
  const inp = $("bfInput");
  let composing = false;
  inp.addEventListener("compositionstart", () => (composing = true));
  inp.addEventListener("compositionend", () => { composing = false; bfCheck(); });
  inp.addEventListener("input", (e) => { if (!e.isComposing) composing = false; if (!composing) bfCheck(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing || composing) return;
    e.preventDefault(); bfSkip();
  });
  $("bfSay").onclick = () => { speak(bf.current.kana); inp.focus(); };
  $("bfHint").onclick = () => { bfFail(true); inp.focus(); };
  $("bfSkip").onclick = () => { bfSkip(); inp.focus(); };
  $("bfQuit").onclick = () => { bf = null; renderBFSetup(); };
  setTimeout(() => inp.focus(), 50);
}

// « Je ne sais pas » : montre la réponse, puis passe au suivant
function bfSkip() {
  const s = bf;
  if (s.resolved) return;
  if (!s.missed) bfFail(true);
  s.resolved = true; s.total++; updateBFStats();
  setTimeout(() => { if (bf === s) nextBF(); }, 900);
}

function finishBF() {
  const s = bf;
  if (!s.done) { s.done = true; s.pts += 30; addPoints(30); }
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  $("view-quiz").innerHTML = `<div class="finish">
    <div class="finish-icon">🏆</div>
    <h2>${L("Tous les kana sont éliminés !", "All kana eliminated!")}</h2>
    <div class="points-won">+${s.pts} ⭐</div>
    <p>${L(`${s.correct} bonnes réponses sur ${s.total} (${acc} %) · meilleure série : ${s.best}`, `${s.correct} correct out of ${s.total} (${acc}%) · best streak: ${s.best}`)}</p>
    <p class="muted">${L("Dont +30 ⭐ de bonus de fin.", "Including a +30 ⭐ completion bonus.")}</p>
    <div class="cta-row">
      <button class="btn gold" id="bfEndless">${L("Continuer en révision libre", "Keep going (free review)")}</button>
      <button class="btn" id="bfAgain">${L("Recommencer", "Start over")}</button>
      <button class="btn" id="bfSetup">${L("Changer la sélection", "Change selection")}</button>
    </div></div>`;
  $("bfEndless").onclick = () => { s.endless = true; s.queue = []; renderBFPractice(); nextBF(); };
  $("bfAgain").onclick = startBF;
  $("bfSetup").onclick = () => { bf = null; renderBFSetup(); };
}

function openBruteForce() { bf = null; quiz = null; renderBFSetup(); }

// L'onglet Quiz affiche la session brute force si elle est en cours
const _renderQuiz = renderers.quiz;
renderers.quiz = function () {
  if (bf && !bf.done) { renderBFPractice(); bf.current && !bf.resolved ? showBFCurrent() : nextBF(); }
  else if (bf && bf.done) finishBF();
  else _renderQuiz();
};
