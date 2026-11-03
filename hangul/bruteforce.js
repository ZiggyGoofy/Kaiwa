// SpeedHangul — Quiz « Brute force » du hangeul (inspiré de vedxyz.github.io/kana).
// Une lettre ou une syllabe s'affiche, on tape sa lecture : validation instantanée, les erreurs reviennent vite,
// chaque élément doit être réussi plusieurs fois pour être « éliminé ».

const BF_TARGET = 3;
const BF_RETRY_GAP = 4;
const SYL_ALT = { si: ["shi"], swi: ["shwi"] };

const BF_ROWS = [
  ...JAMO_ROWS.map((r) => ({ id: r.id, group: r.group, label: r.jamo.join(""), items: r.jamo.map((ch) => ({ kana: ch, romaji: JAMO[ch].rom, answers: JAMO[ch].answers })) })),
  ...BASIC_CHO.map((c, i) => ({ id: "s" + i, group: "syll", label: composeSyl(c, 0), items: BASIC_JUNG.map((v) => {
    const r = romSyl(c, v);
    return { kana: composeSyl(c, v), romaji: r, answers: [r, ...(SYL_ALT[r] || [])] };
  }) })),
];
const BF_ALL_ROMAJI = new Set(BF_ROWS.flatMap((r) => r.items.flatMap((it) => it.answers)));
const HANGUL = /^[ㄱ-ㅣ가-힣]+$/;

let bf = null;
const bfPrefs = () => (learn.bf ||= { rows: ["c1", "c2", "v1", "v2"], showAnswer: true });
const bfSay = (k) => speak(sayOf(k));

// ---------- Configuration ----------
function renderBFSetup() {
  const p = bfPrefs(), v = $("view-quiz"), sel = new Set(p.rows);
  const chips = (group) => BF_ROWS.filter((r) => r.group === group).map((r) =>
    `<button class="bf-row ${group === "syll" ? "" : "wide"} ${sel.has(r.id) ? "on" : ""}" data-id="${r.id}" lang="ko">${esc(r.label)}<small>${r.items.length}</small></button>`).join("");
  const count = BF_ROWS.filter((r) => sel.has(r.id)).reduce((n, r) => n + r.items.length, 0);
  v.innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="bfBack">← Quiz</button>
      <div><strong>⌨️ Brute force</strong><div class="muted">${L("Tape la lecture de chaque lettre ou syllabe", "Type the reading of each letter or syllable")}</div></div>
    </div>
    <div class="bf-quick">
      <button class="btn small" data-q="cons">${L("Consonnes", "Consonants")}</button>
      <button class="btn small" data-q="vow">${L("Voyelles", "Vowels")}</button>
      <button class="btn small" data-q="syll">${L("Syllabes", "Syllables")}</button>
      <button class="btn small" data-q="all">${L("Tout", "All")}</button>
      <button class="btn small" data-q="none">${L("Aucun", "None")}</button>
    </div>
    <h3 class="sec">${L("Consonnes", "Consonants")}</h3><div class="bf-rows">${chips("cons")}</div>
    <h3 class="sec">${L("Voyelles", "Vowels")}</h3><div class="bf-rows">${chips("vow")}</div>
    <h3 class="sec">${L("Syllabes (consonne + les 10 voyelles de base)", "Syllables (consonant + the 10 basic vowels)")}</h3><div class="bf-rows">${chips("syll")}</div>
    <label class="bf-opt"><input type="checkbox" id="bfShow" ${p.showAnswer ? "checked" : ""}> ${L("Montrer la bonne réponse quand je me trompe", "Show the right answer when I'm wrong")}</label>
    <div class="cta-row">
      <button class="btn gold" id="bfStart" ${count ? "" : "disabled"}>▶ ${L(`Commencer (${count})`, `Start (${count})`)}</button>
    </div>
    <p class="cal-help bf-help">${L(
      `Tape la lecture en lettres latines (romanisation : ㄱ = g, ㅓ = eo, 가 = ga…) : la réponse est validée toute seule. Pour ㅇ, tape « ng ». Chaque élément doit être réussi ${BF_TARGET} fois pour être éliminé ; ceux que tu rates reviennent vite. Entrée = je ne sais pas.`,
      `Type the reading in Latin letters (romanization: ㄱ = g, ㅓ = eo, 가 = ga…): it's checked automatically. For ㅇ, type “ng”. Each item must be answered right ${BF_TARGET} times to be eliminated; the ones you miss come back soon. Enter = I don't know.`)}</p>`;
  v.querySelectorAll(".bf-row").forEach((b) => (b.onclick = () => {
    const id = b.dataset.id;
    p.rows = sel.has(id) ? p.rows.filter((x) => x !== id) : [...p.rows, id];
    saveLearn(); renderBFSetup();
  }));
  v.querySelectorAll(".bf-quick button").forEach((b) => (b.onclick = () => {
    const q = b.dataset.q;
    p.rows = q === "all" ? BF_ROWS.map((r) => r.id) : q === "none" ? [] : BF_ROWS.filter((r) => r.group === q).map((r) => r.id);
    saveLearn(); renderBFSetup();
  }));
  $("bfShow").onchange = (e) => { p.showAnswer = e.target.checked; saveLearn(); };
  $("bfBack").onclick = () => { bf = null; renderQuizHome(); };
  $("bfStart").onclick = startBF;
}

// ---------- Session ----------
function startBF() {
  const sel = new Set(bfPrefs().rows);
  const items = BF_ROWS.filter((r) => sel.has(r.id)).flatMap((r) => r.items.map((it) => ({ ...it, left: BF_TARGET })));
  bf = { items, queue: shuffle(items), retry: [], current: null, prev: null, correct: 0, total: 0, streak: 0, best: 0, pts: 0, missed: false, done: false };
  renderBFPractice();
  nextBF();
}
function nextBF() {
  const s = bf, alive = s.items.filter((it) => it.left > 0);
  if (!alive.length && !s.endless) return finishBF();
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
  $("bfKana").classList.remove("good", "bad"); $("bfKana").classList.toggle("jamo", isJamo(it.kana)); void $("bfKana").offsetWidth;
  $("bfFeedback").innerHTML = "&nbsp;";
  $("bfInput").value = ""; $("bfInput").classList.remove("bad");
  updateBFStats();
}
function bfFail(shown) {
  const s = bf, it = s.current;
  if (!s.missed) {
    s.missed = true; s.streak = 0;
    it.left = Math.min(BF_TARGET, it.left + 1);
    s.retry.push({ item: it, wait: Math.min(BF_RETRY_GAP, Math.max(1, s.items.length - 1)) });
  }
  $("bfKana").classList.add("bad");
  $("bfInput").classList.add("bad");
  $("bfFeedback").innerHTML = shown || bfPrefs().showAnswer
    ? `<span class="bf-bad">${esc(it.kana)} = <b>${esc(it.romaji)}</b></span>`
    : `<span class="bf-bad">✗</span>`;
  bfSay(it.kana);
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
  const inp = $("bfInput"), raw = inp.value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return;
  const it = s.current;
  if (it.answers.includes(raw) || raw === it.kana) { inp.value = ""; return bfSuccess(); }
  const isPrefix = it.answers.some((a) => a.startsWith(raw));
  // une syllabe hangeul complète (ou une lettre isolée face à une lettre) qui n'est pas la bonne
  const wrongHangul = HANGUL.test(raw) && (/[가-힣]/.test(raw) || isJamo(it.kana));
  const isWholeWrong = (BF_ALL_ROMAJI.has(raw) && !isPrefix) || wrongHangul;
  if (isWholeWrong) { bfFail(); setTimeout(() => { if (bf === s) inp.value = ""; }, 500); }
}
function updateBFStats() {
  const s = bf, n = s.items.length, alive = s.items.filter((it) => it.left > 0).length;
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
  const it = s.current;
  if (it && $("bfDots")) {
    const done = BF_TARGET - it.left;
    $("bfDots").innerHTML = s.endless ? "" : Array.from({ length: BF_TARGET }, (_, i) => `<i class="${i < done ? "on" : ""}"></i>`).join("");
    $("bfDots").title = L(`${done} / ${BF_TARGET} réussites pour cet élément`, `${done} / ${BF_TARGET} correct for this item`);
  }
}
function renderBFPractice() {
  $("view-quiz").innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="bfQuit">✕</button>
      <div><strong>⌨️ Brute force</strong><div class="muted" id="bfSub">${bf.items.length} ${L("éléments", "items")}</div></div>
    </div>
    <div id="bfStats"></div>
    <div class="bf-card">
      <div class="bf-dots" id="bfDots"></div>
      <div class="bf-kana" id="bfKana" lang="ko"></div>
      <div class="bf-feedback" id="bfFeedback">&nbsp;</div>
      <input id="bfInput" class="bf-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${L("romanisation", "romanization")}" aria-label="${L("romanisation", "romanization")}">
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
  $("bfSay").onclick = () => { bfSay(bf.current.kana); inp.focus(); };
  $("bfHint").onclick = () => { bfFail(true); inp.focus(); };
  $("bfSkip").onclick = () => { bfSkip(); inp.focus(); };
  $("bfQuit").onclick = () => { bf = null; renderBFSetup(); };
  setTimeout(() => inp.focus(), 50);
}
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
    <h2>${L("Tout est éliminé !", "Everything eliminated!")}</h2>
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

const _renderQuiz = renderers.quiz;
renderers.quiz = function () {
  if (bf && !bf.done) { renderBFPractice(); bf.current && !bf.resolved ? showBFCurrent() : nextBF(); }
  else if (bf && bf.done) finishBF();
  else _renderQuiz();
};
