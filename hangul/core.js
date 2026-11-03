// SpeedHangul — fonctions de base : réglages, voix coréenne, langue, choix de l'app.
// (Équivalent de app.js de Kaiwa, sans la partie conversation avec l'IA.)

const SETTINGS = "speedhangul-settings-v1";
const defaults = { rate: 0.85, romaji: true };
let settings = { ...defaults, ...load(SETTINGS, {}) };

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save() { try { localStorage.setItem(SETTINGS, JSON.stringify(settings)); } catch {} }

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = (id) => document.getElementById(id);

// ---------- Voix coréenne ----------
let koVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().replace("_", "-").startsWith("ko"));
  koVoice = voices.find((v) => /google|natural|online/i.test(v.name)) || voices[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  if (koVoice) u.voice = koVoice;
  u.rate = settings.rate;
  speechSynthesis.speak(u);
}

// ---------- Romanisation affichée ou non ----------
function applyToggles() {
  document.body.classList.toggle("no-romaji", !settings.romaji);
  $("tgRomaji").setAttribute("aria-pressed", settings.romaji);
}
$("tgRomaji").onclick = () => { settings.romaji = !settings.romaji; applyToggles(); save(); };

// ---------- Réglages ----------
function openSettings() {
  $("rate").value = settings.rate;
  $("rateVal").textContent = "×" + settings.rate;
  $("langSelect").value = LANG;
  if (!$("settings").open) $("settings").showModal();
}
$("btnSettings").onclick = openSettings;
$("langSelect").onchange = (e) => { save(); setLang(e.target.value); };
$("rate").oninput = (e) => { $("rateVal").textContent = "×" + e.target.value; };
$("btnTestVoice").onclick = () => { settings.rate = parseFloat($("rate").value); speak("안녕하세요! 반가워요."); };
$("settings").addEventListener("close", () => { settings.rate = parseFloat($("rate").value); save(); });

// ---------- Démarrage ----------
applyStaticText();
applyToggles();
document.querySelectorAll(".lang-btn[data-lang]").forEach((b) => (b.onclick = () => { $("langDialog").close(); setLang(b.dataset.lang); }));
$("langDialog").addEventListener("cancel", (e) => e.preventDefault());
if (!LANG_CHOSEN) $("langDialog").showModal();
else if (!appChosen()) showAppChooser();
initAppSelect();

// Hors ligne : le service worker de Kaiwa (dossier parent) met aussi SpeedHangul en cache
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("../sw.js", { scope: "../", updateViaCache: "none" }).then((reg) => reg.update()).catch(() => {});
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
