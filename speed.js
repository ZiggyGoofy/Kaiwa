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
const speedKey = (mode, t) => (t === 60 ? mode : `${mode}:${t}`);
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
    <h3 class="sec">${L("Mode", "Mode")}</h3>
    <div class="mode-list">${Object.entries(SPEED_MODES).map(([k, m]) => `
      <button class="mode" data-k="${k}">
        <span class="deck-icon ${m.icon.length > 1 ? "two" : ""}" lang="ja">${m.icon}</span>
        <span><span class="deck-title">${m.title}</span><span class="muted">${m.desc}</span></span>
        <span class="best">${best[speedKey(k, T)] ? `🏅 ${best[speedKey(k, T)]}<br><small>${L(`record ${T} s`, `best ${T} s`)}</small>` : L("Nouveau", "New")}</span>
      </button>`).join("")}
    </div>
    <p class="cal-help">${L(
      `⏱ ${T} s au départ · ❌ une erreur coûte ${SPEED_PENALTY} s · 🔥 ${SPEED_BONUS_EVERY} bonnes réponses d'affilée = +${SPEED_BONUS} s. Sur PC : touches 1 à 4.`,
      `⏱ ${T} s to start · ❌ a mistake costs ${SPEED_PENALTY} s · 🔥 ${SPEED_BONUS_EVERY} right answers in a row = +${SPEED_BONUS} s. On PC: keys 1 to 4.`)}</p>`;
  $("spBack").onclick = () => renderQuizHome();
  document.querySelectorAll("#view-quiz .sp-tbtn").forEach((b) => (b.onclick = () => { learn.speedTime = +b.dataset.t; saveLearn(); renderSpeedSetup(); }));
  document.querySelectorAll("#view-quiz .mode[data-k]").forEach((b) => (b.onclick = () => startSpeed(b.dataset.k)));
}

// ---------- Partie ----------
function startSpeed(mode) {
  speedScreen = "game";
  const T = speedTime();
  speed = { mode, time: T, key: speedKey(mode, T), pool: speedPool(mode), score: 0, wrong: 0, combo: 0, bestCombo: 0, q: null, lock: true, endAt: 0, timer: null };
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
    <div class="options" id="spOpts"></div>`;
  $("spQuit").onclick = () => { stopSpeed(); renderSpeedSetup(); };
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
  $("spOpts").innerHTML = s.q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("");
  $("spOpts").querySelectorAll(".opt").forEach((b) => (b.onclick = () => answerSpeed(+b.dataset.i)));
}

function floatMsg(txt, cls) {
  const f = $("spFloat"); if (!f) return;
  f.textContent = txt; f.className = "sp-float " + cls; void f.offsetWidth; f.classList.add("show");
}

function answerSpeed(i) {
  const s = speed;
  if (!s || s.lock) return;
  s.lock = true;
  const pick = s.q.options[i], ok = pick === s.q.a;
  const btns = $("spOpts").querySelectorAll(".opt");
  if (ok) {
    s.score++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    btns[i].classList.add("right");
    $("spQ").classList.add("good");
    if (s.combo % SPEED_BONUS_EVERY === 0) { s.endAt += SPEED_BONUS * 1000; floatMsg(`+${SPEED_BONUS} s`, "plus"); }
    else floatMsg("+1", "plus");
    updateSpeedStats();
    setTimeout(() => { if (speed === s && speedScreen === "game") nextSpeed(); }, 140);
  } else {
    s.wrong++; s.combo = 0;
    s.endAt -= SPEED_PENALTY * 1000;
    btns[i].classList.add("wrong");
    btns[s.q.options.indexOf(s.q.a)].classList.add("right");
    $("spQ").classList.add("bad");
    floatMsg(`-${SPEED_PENALTY} s`, "minus");
    updateSpeedStats(); tickSpeed();
    setTimeout(() => { if (speed === s && speedScreen === "game") nextSpeed(); }, 650);
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
    <p class="muted">${SPEED_MODES[s.mode].title} · ${s.time} s</p>
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
  if (/^[1-4]$/.test(e.key)) answerSpeed(+e.key - 1);
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
