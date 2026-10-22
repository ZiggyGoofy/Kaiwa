// Langue de l'interface : "fr" ou "en". Choisie au premier lancement, modifiable dans les réglages.
const LANG_KEY = "kaiwa-lang";
let LANG = (() => { try { return localStorage.getItem(LANG_KEY); } catch { return null; } })();
const LANG_CHOSEN = LANG === "fr" || LANG === "en";
if (!LANG_CHOSEN) LANG = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
const LOCALE = LANG === "en" ? "en-GB" : "fr-FR";
document.documentElement.lang = LANG;

// L("texte français", "English text") → texte dans la langue choisie
const L = (fr, en) => (LANG === "en" ? en : fr);
// pluriel simple : P(n, "jour", "jours", "day", "days")
const P = (n, fr1, frN, en1, enN) => (n > 1 || (LANG === "en" && n === 0) ? L(frN, enN) : L(fr1, en1));
const fmt = (n) => n.toLocaleString(LOCALE);

function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  if (lang !== LANG) location.reload();
}

// Textes fixes de index.html (attributs data-i18n, data-i18n-title, data-i18n-ph)
const STATIC_EN = {
  tabKana: "Kana", tabPhrases: "Phrases", tabCards: "Cards", tabQuiz: "Quiz",
  theme: "Topic:", newConv: " New", wotd: "Word of the day",
  inputPh: "Write in Japanese (or in English if you're stuck)…",
  settings: "Settings", language: "Language", ai: "Artificial intelligence", apiKey: "API key",
  keyLocal: "The key stays on this device only.", model: "Model", otherModel: "Other model (optional)",
  otherModelPh: "exact model ID", autoSpeak: "Read replies aloud automatically (voice mode)",
  autoSend: "Send automatically after dictation", voiceRate: "Voice speed:", close: "Close",
  tFuri: "Show furigana", tRomaji: "Show rōmaji", tSettings: "Settings", tPoints: "Your points",
  tNew: "New conversation", tMic: "Speak (Japanese)", tSend: "Send", tClose: "Close",
};
function applyStaticText() {
  if (LANG !== "en") return;
  document.querySelectorAll("[data-i18n]").forEach((el) => { const v = STATIC_EN[el.dataset.i18n]; if (v) el.textContent = v; });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { const v = STATIC_EN[el.dataset.i18nTitle]; if (v) el.title = v; });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { const v = STATIC_EN[el.dataset.i18nPh]; if (v) el.placeholder = v; });
}
