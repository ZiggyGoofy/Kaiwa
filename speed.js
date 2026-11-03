// Kaiwa — Jeu de vitesse : 60 secondes pour enchaîner un maximum de bonnes réponses.
// Erreur = -3 s. Toutes les 5 bonnes réponses d'affilée = +2 s.

// durées au choix : moins de temps = plus difficile (un record par mode ET par durée)
const SPEED_TIMES = [
  { t: 30, label: L("Difficile", "Hard"), icon: "🔥" },
  { t: 60, label: L("Normal", "Normal"), icon: "⚡" },
  { t: 90, label: L("Tranquille", "Relaxed"), icon: "🙂" },
  { t: 120, label: L("Facile", "Easy"), icon: "🌱" },
];
const speedTime = () => (SPEED_TIMES.some((x) => x.t === learn.speedTime) ? learn.speedTime : 60);
// clé du record : "hira" pour 60 s (compatible avec les anciens records), "hira:30" sinon
const speedKey = (mode, t) => (t === 60 ? mode : `${mode}:${t}`) + (speedTyped() ? ":t" : "");
// façon de répondre : "choice" = cliquer sur une des 4 réponses, "type" = écrire la réponse (record séparé)
const speedTyped = () => learn.speedInput === "type";
const SPEED_PENALTY = 3, SPEED_BONUS = 2, SPEED_BONUS_EVERY = 5;
const SPEED_MODES = {
  hira: { title: "Hiragana", icon: "あ", desc: L("Trouve la lecture du kana", "Find the kana's reading") },
  kata: { title: "Katakana", icon: "ア", desc: L("Trouve la lecture du kana", "Find the kana's reading") },
  mix: { title: "Hiragana + Katakana", icon: "あア", desc: L("Les deux mélangés", "Both mixed together") },
  kanji: { title: "Kanji", icon: "漢", desc: L("Trouve le sens du kanji", "Find the kanji's meaning") },
};
let speed = null;        // partie en cours
let speedScreen = null;  // "setup" | "game" | "end" | null
const speedBest = () => (learn.speed ||= {});
const speedPool = (mode) => (mode === "mix" ? [...quizPool("hira"), ...quizPool("kata")] : quizPool(mode));

// ---------- Choix du mode ----------
function renderSpeedSetup() {
  speedScreen = "setup";
  const best = speedBest(), T = speedTime();
  $("view-quiz").innerHTML = `
    <div class="deck-head">
      <button class="btn small" id="spBack">← Quiz</button>
      <div><strong>⚡ ${L("Jeu de vitesse", "Speed game")}</strong><div class="muted">${L("Un maximum de bonnes réponses avant la fin du temps", "As many right answers as you can before time runs out")}</div></div>
    </div>
    <h3 class="sec">⏱ ${L("Durée", "Duration")}</h3>
    <div class="sp-times">${SPEED_TIMES.map((x) => `
      <button class="sp-tbtn ${x.t === T ? "on" : ""}" data-t="${x.t}"><b>${x.t % 60 ? x.t + " s" : x.t / 60 + " min"}</b><small>${x.icon} ${x.label}</small></button>`).join("")}
    </div>
    <h3 class="sec">✍️ ${L("Réponses", "Answers")}</h3>
    <div class="seg sp-input">
      <button data-in="choice" class="${speedTyped() ? "" : "on"}">🖱️ ${L("Choisir parmi 4", "Pick from 4")}</button>
      <button data-in="type" class="${speedTyped() ? "on" : ""}">⌨️ ${L("Écrire", "Type")}</button>
    </div>
    <h3 class="sec">${L("Mode", "Mode")}</h3>
    <div class="mode-list">${Object.entries(SPEED_MODES).map(([k, m]) => `
      <button class="mode" data-k="${k}">
        <span class="deck-icon ${m.icon.length > 1 ? "two" : ""}" lang="ja">${m.icon}</span>
        <span><span class="deck-title">${m.title}</span><span class="muted">${m.desc}</span></span>
        <span class="best">${best[speedKey(k, T)] ? `🏅 ${best[speedKey(k, T)]}<br><small>${L(`record ${T} s`, `best ${T} s`)}</small>` : L("Nouveau", "New")}</span>
      </button>`).join("")}
    </div>
    <p class="cal-help">${L(
      `⏱ ${T} s au départ · ❌ une erreur coûte ${SPEED_PENALTY} s · 🔥 ${SPEED_BONUS_EVERY} bonnes réponses d'affilée = +${SPEED_BONUS} s. `,
      `⏱ ${T} s to start · ❌ a mistake costs ${SPEED_PENALTY} s · 🔥 ${SPEED_BONUS_EVERY} right answers in a row = +${SPEED_BONUS} s. `)}${speedTyped() ? SPEED_TYPE_HELP : L("Sur PC : touches 1 à 4.", "On PC: keys 1 to 4.")}</p>`;
  $("spBack").onclick = () => renderQuizHome();
  document.querySelectorAll("#view-quiz .sp-tbtn").forEach((b) => (b.onclick = () => { learn.speedTime = +b.dataset.t; saveLearn(); renderSpeedSetup(); }));
  document.querySelectorAll("#view-quiz .sp-input button").forEach((b) => (b.onclick = () => { learn.speedInput = b.dataset.in; saveLearn(); renderSpeedSetup(); }));
  document.querySelectorAll("#view-quiz .mode[data-k]").forEach((b) => (b.onclick = () => startSpeed(b.dataset.k)));
}

// ---------- Partie ----------
function startSpeed(mode) {
  speedScreen = "game";
  const T = speedTime();
  speed = { mode, time: T, typed: speedTyped(), key: speedKey(mode, T), pool: speedPool(mode), score: 0, wrong: 0, combo: 0, bestCombo: 0, q: null, lock: true, endAt: 0, timer: null };
  $("view-quiz").innerHTML = `
    <div class="quiz-head">
      <button class="btn small" id="spQuit">✕</button>
      <div class="bar big sp-bar"><i id="spBar" style="width:100%"></i></div>
      <span class="sp-time" id="spTime">${T}</span>
    </div>
    <div class="sp-stats">
      <span>✅ <b id="spScore">0</b></span>
      <span class="streak" id="spCombo">🔥 0</span>
      <span class="muted">🏅 ${speedBest()[speed.key] || 0}</span>
    </div>
    <div class="quiz-q sp-q" id="spQ"><div class="big-ja" lang="ja" id="spText"></div><span class="sp-float" id="spFloat"></span></div>
    ${speed.typed ? `
    <div class="sp-type">
      <input id="spInput" class="bf-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${esc(SPEED_TYPE_PH())}">
      <div class="bf-feedback" id="spFeedback">&nbsp;</div>
      <button class="btn small" id="spSkip">${L("Je ne sais pas ⏎", "I don't know ⏎")}</button>
    </div>` : `<div class="options" id="spOpts"></div>`}`;
  $("spQuit").onclick = () => { stopSpeed(); renderSpeedSetup(); };
  if (speed.typed) {
    const inp = $("spInput");
    let composing = false;
    inp.addEventListener("compositionstart", () => (composing = true));
    inp.addEventListener("compositionend", () => { composing = false; checkTyped(false); });
    inp.addEventListener("input", (e) => { if (!e.isComposing) composing = false; if (!composing) checkTyped(false); });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing && !composing) { e.preventDefault(); checkTyped(true); } });
    $("spSkip").onclick = () => { failTyped(); inp.focus(); };
    setTimeout(() => inp.focus(), 50);
  }
  // compte à rebours 3, 2, 1
  let n = 3;
  const count = () => {
    if (!speed || speedScreen !== "game") return;
    if (n > 0) { $("spText").textContent = n; $("spText").className = "big-ja sp-count"; pop($("spText")); n--; setTimeout(count, 650); return; }
    $("spText").className = "big-ja";
    speed.endAt = performance.now() + speed.time * 1000;
    speed.timer = setInterval(tickSpeed, 100);
    nextSpeed();
  };
  count();
}

function nextSpeed() {
  const s = speed, pool = s.pool;
  let item;
  do item = pool[Math.floor(Math.random() * pool.length)]; while (s.q && item.q === s.q.q && pool.length > 1);
  const wrong = shuffle([...new Set(pool.map((p) => p.a).filter((a) => a !== item.a))]).slice(0, 3);
  s.q = { ...item, options: shuffle([item.a, ...wrong]) };
  s.lock = false;
  $("spQ").classList.remove("good", "bad");
  $("spText").innerHTML = toRuby(s.q.q);
  if (s.typed) {
    s.accept = speedAccept(s.q);
    $("spInput").value = ""; $("spInput").classList.remove("bad");
    $("spFeedback").innerHTML = "&nbsp;";
    $("spInput").focus();
    return;
  }
  $("spOpts").innerHTML = s.q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("");
  $("spOpts").querySelectorAll(".opt").forEach((b) => (b.onclick = () => answerSpeed(+b.dataset.i)));
}

// ---------- Réponses écrites ----------
// Normalise une réponse : minuscules, sans accents, sans parenthèses, sans article ni « to » au début
const spFold = (x) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normAnswer = (x) => spFold(x).replace(/\(.*?\)/g, " ").replace(/[’']/g, "'")
  .replace(/^\s*(to|the|an?|les?|la|l'|une?|des|du|de la|de|se|s')\s*(?=\S)/, "").replace(/^l'/, "")
  .replace(/[^a-z0-9'\-\s\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7a3\u3131-\u318e]/g, " ").replace(/\s+/g, " ").trim();
// « pays, nation » / « matin / petit-déjeuner » → chaque sens accepté séparément
function meaningSet(list) {
  const out = new Set();
  for (const m of [].concat(list)) for (const part of [m, ...String(m).split(/[,;/]|\bou\b|\bor\b/)]) { const n = normAnswer(part); if (n) out.add(n); }
  return out;
}
function okTyped(raw) {
  const a = speed.accept, r = raw.normalize("NFC").trim();
  if (!r) return false;
  return a.ok(r);
}
function checkTyped(enter) {
  const s = speed;
  if (!s || s.lock || !s.accept) return;
  const raw = $("spInput").value;
  if (okTyped(raw)) return answerSpeed(true);
  if (enter) return failTyped();
  // lettres/kana : une réponse fausse « complète » est refusée tout de suite (comme le Brute force)
  if (s.accept.wholeWrong && s.accept.wholeWrong(raw.normalize("NFC").trim().toLowerCase())) failTyped();
}
function failTyped() { if (speed && !speed.lock) answerSpeed(false); }

function floatMsg(txt, cls) {
  const f = $("spFloat"); if (!f) return;
  f.textContent = txt; f.className = "sp-float " + cls; void f.offsetWidth; f.classList.add("show");
}

// i = numéro du bouton cliqué (mode choix) ou true/false (mode écrit)
function answerSpeed(i) {
  const s = speed;
  if (!s || s.lock) return;
  s.lock = true;
  const ok = s.typed ? i === true : s.q.options[i] === s.q.a;
  const btns = s.typed ? [] : $("spOpts").querySelectorAll(".opt");
  if (ok) {
    s.score++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (s.typed) $("spFeedback").innerHTML = `<span class="bf-good">✓ ${esc(s.q.a)}</span>`;
    else btns[i].classList.add("right");
    $("spQ").classList.add("good");
    if (s.combo % SPEED_BONUS_EVERY === 0) { s.endAt += SPEED_BONUS * 1000; floatMsg(`+${SPEED_BONUS} s`, "plus"); }
    else floatMsg("+1", "plus");
    updateSpeedStats();
    setTimeout(() => { if (speed === s && speedScreen === "game") nextSpeed(); }, s.typed ? 250 : 140);
  } else {
    s.wrong++; s.combo = 0;
    s.endAt -= SPEED_PENALTY * 1000;
    if (s.typed) { $("spInput").classList.add("bad"); $("spFeedback").innerHTML = `<span class="bf-bad">${esc(s.q.q.replace(/\{([^|]+)\|[^}]+\}/g, "$1"))} = <b>${esc(s.q.a)}</b></span>`; }
    else { btns[i].classList.add("wrong"); btns[s.q.options.indexOf(s.q.a)].classList.add("right"); }
    $("spQ").classList.add("bad");
    floatMsg(`-${SPEED_PENALTY} s`, "minus");
    updateSpeedStats(); tickSpeed();
    setTimeout(() => { if (speed === s && speedScreen === "game") nextSpeed(); }, s.typed ? 1100 : 650);
  }
}

function updateSpeedStats() {
  $("spScore").textContent = speed.score;
  $("spCombo").textContent = "🔥 " + speed.combo;
  $("spCombo").classList.toggle("hot", speed.combo >= 3);
}

function tickSpeed() {
  const s = speed;
  if (!s || speedScreen !== "game") return stopSpeed();
  // on quitte l'onglet Quiz : la partie est abandonnée
  if (document.body.dataset.view !== "quiz") { stopSpeed(); speedScreen = "setup"; return; }
  const left = Math.max(0, s.endAt - performance.now());
  $("spBar").style.width = Math.min(100, (left / (s.time * 1000)) * 100) + "%";
  $("spBar").parentElement.classList.toggle("low", left < 10000);
  $("spTime").textContent = Math.ceil(left / 1000);
  if (left <= 0) finishSpeed();
}

function stopSpeed() { if (speed?.timer) clearInterval(speed.timer); if (speed) speed.timer = null; }

function finishSpeed() {
  const s = speed;
  stopSpeed();
  speedScreen = "end";
  const best = speedBest(), prev = best[s.key] || 0, record = s.score > prev;
  s.pts = s.score * 3 + (record && prev ? 20 : 0);
  if (record) best[s.key] = s.score;
  saveLearn();
  s.levelUp = s.pts ? addPoints(s.pts) : false;
  s.record = record; s.prev = prev;
  renderSpeedEnd();
}

function renderSpeedEnd() {
  const s = speed, total = s.score + s.wrong, acc = total ? Math.round((s.score / total) * 100) : 0;
  $("view-quiz").innerHTML = `<div class="finish">
    <div class="finish-icon">⚡</div>
    <p class="muted">${SPEED_MODES[s.mode].title} · ${s.time} s · ${s.typed ? L("⌨️ écrit", "⌨️ typed") : L("🖱️ choix", "🖱️ choice")}</p>
    <h2>${s.score} ${P(s.score, "bonne réponse", "bonnes réponses", "right answer", "right answers")}</h2>
    <div class="points-won">+${s.pts} ⭐</div>
    <p>${s.record ? (s.prev ? L(`🏅 Nouveau record en ${s.time} s ! (avant : ${s.prev}) +20 ⭐`, `🏅 New ${s.time} s record! (before: ${s.prev}) +20 ⭐`) : L("🏅 Premier record établi !", "🏅 First record set!"))
                  : L(`Record à battre (${s.time} s) : ${speedBest()[s.key]}`, `Record to beat (${s.time} s): ${speedBest()[s.key]}`)}</p>
    <p class="muted">${L(`Précision ${acc} % · meilleur combo 🔥 ${s.bestCombo} · ${s.wrong} erreur${s.wrong > 1 ? "s" : ""}`, `Accuracy ${acc}% · best combo 🔥 ${s.bestCombo} · ${s.wrong} mistake${s.wrong === 1 ? "" : "s"}`)}</p>
    ${s.levelUp ? `<p class="lvl-up">${L(`🎉 Niveau ${levelOf(learn.points)} atteint !`, `🎉 Level ${levelOf(learn.points)} reached!`)}</p>` : ""}
    <div class="cta-row">
      <button class="btn gold" id="spAgain">⚡ ${L("Rejouer", "Play again")}</button>
      <button class="btn" id="spModes">${L("Changer de mode", "Change mode")}</button>
    </div></div>`;
  $("spAgain").onclick = () => startSpeed(s.mode);
  $("spModes").onclick = () => renderSpeedSetup();
}

function openSpeed() { bf = null; quiz = null; renderSpeedSetup(); }

// raccourcis clavier : 1 à 4
document.addEventListener("keydown", (e) => {
  if (speedScreen !== "game" || document.body.dataset.view !== "quiz" || e.target.matches("input, textarea, select")) return;
  if (!speed?.typed && /^[1-4]$/.test(e.key)) answerSpeed(+e.key - 1);
});

// l'accueil du quiz remet le jeu de vitesse à zéro ; l'onglet Quiz réaffiche l'écran du jeu en cours
const _speedHome = renderQuizHome;
renderQuizHome = function () { stopSpeed(); speedScreen = null; _speedHome(); };
const _speedRender = renderers.quiz;
renderers.quiz = function () {
  if (speedScreen === "end") renderSpeedEnd();
  else if (speedScreen === "setup" || speedScreen === "game") renderSpeedSetup();
  else _speedRender();
};

// ---------- Kaiwa : quelles réponses écrites accepter ----------
const SPEED_TYPE_PH = () => (speed?.mode === "kanji" ? L("sens (ou lecture)…", "meaning (or reading)…") : "rōmaji");
const SPEED_TYPE_HELP = L("Mode écrit : tape la lecture en rōmaji (ou en kana) ; pour les kanji, tape le sens en français (ou une lecture). Entrée = valider / je ne sais pas.",
  "Typing mode: type the reading in rōmaji (or kana); for kanji, type the meaning in English (or a reading). Enter = check / I don't know.");
function speedAccept(it) {
  if (speed.mode === "kanji") {
    const k = KANJI.find((x) => x[0] === it.q);
    const means = meaningSet(L(k[6], k[5]));
    const reads = [k[8], ...k[3], ...k[4]].map((r) => toHiraChar(r.replace(/[・.\-]/g, "")));
    const roms = reads.map(kanaToRomaji);
    return { ok: (r) => means.has(normAnswer(r)) || reads.includes(toHiraChar(r)) || roms.includes(r.toLowerCase().replace(/\s/g, "")) };
  }
  const hira = toHira(it.q), answers = bfAnswers(hira, it.a);
  return {
    ok: (r) => answers.includes(r.toLowerCase()) || toHira(r) === hira,
    wholeWrong: (r) => (BF_ALL_ROMAJI.has(r) && !answers.some((a) => a.startsWith(r))) || (/^[ぁ-ヶ]+$/.test(r) && !hira.startsWith(toHira(r))),
  };
}
