// Kaiwa — chatbot de conversation japonaise (niveau débutant).
// Fournisseurs d'IA : Groq ou OpenRouter (gratuits) ou Claude (payant).
// Tout tourne dans le navigateur : la clé API reste sur l'appareil (localStorage).

const PROVIDERS = {
  groq: {
    name: L("Groq — gratuit", "Groq — free"),
    kind: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyHint: "gsk_…",
    keyUrl: "https://console.groq.com/keys",
    help: L("Gratuit, sans carte bancaire, environ 1 000 messages par jour.", "Free, no credit card, about 1,000 messages per day."),
    models: [["openai/gpt-oss-120b", L("GPT-OSS 120B (recommandé)", "GPT-OSS 120B (recommended)")], ["qwen/qwen3.8-27b", "Qwen 3.8 27B"]],
  },
  openrouter: {
    name: L("OpenRouter — modèles gratuits", "OpenRouter — free models"),
    kind: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyHint: "sk-or-…",
    keyUrl: "https://openrouter.ai/keys",
    help: L("Gratuit, sans carte bancaire, environ 50 messages par jour avec les modèles « :free ».", "Free, no credit card, about 50 messages per day with \":free\" models."),
    models: [], // chargés depuis openrouter.ai à l'ouverture des réglages
  },
  anthropic: {
    name: L("Claude — payant", "Claude — paid"),
    kind: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    keyHint: "sk-ant-…",
    keyUrl: "https://console.anthropic.com",
    help: L("Meilleure qualité, payant à l'usage (quelques centimes par conversation).", "Best quality, pay as you go (a few cents per conversation)."),
    models: [["claude-haiku-5-5", "Claude Haiku 5.5"], ["claude-sonnet-5-5", "Claude Sonnet 5.5"]],
  },
};
const STORE = "kaiwa-state-v1";
const SETTINGS = "kaiwa-settings-v1";

const SCENARIOS = LANG === "en" ? CONTENT_EN.scenarios : {
  libre: "Conversation libre",
  presentation: "Se présenter (自己紹介)",
  cafe: "Commander au café",
  courses: "Faire des courses",
  chemin: "Demander son chemin",
  loisirs: "Parler de ses loisirs",
  journee: "Raconter sa journée",
  voyage: "Voyage au Japon",
};

const LEARNER_LANG = L("français", "anglais");
const SYSTEM_PROMPT = (scenario) => `Tu es Sakura, une partenaire de conversation japonaise bienveillante pour un apprenant de niveau DÉBUTANT (JLPT N5-N4) dont la langue est le ${LEARNER_LANG}.

LANGUE DE L'APPRENANT : ${LEARNER_LANG.toUpperCase()}. Toutes les traductions, explications et traductions de suggestions doivent être écrites en ${LEARNER_LANG} (les noms des champs JSON restent inchangés).

Thème de la conversation : ${SCENARIOS[scenario]}.

Règles de conversation :
- Réponds TOUJOURS en japonais simple, en style poli (です/ます), phrases courtes (1 à 3 phrases).
- Vocabulaire et grammaire de niveau N5-N4 ; évite les kanji rares.
- Termine généralement par une question simple pour relancer la conversation.
- Si l'apprenant écrit en ${LEARNER_LANG} (parce qu'il bloque), aide-le avec bienveillance : la correction montre comment le dire en japonais, puis continue la conversation en japonais.
- Reste dans le thème, mais suis l'apprenant s'il dérive.

Format de la réponse :
- Furigana : dans "reply" et "correction.corrected" et "suggestions[].ja", annote CHAQUE mot contenant des kanji avec la syntaxe {漢字|かんじ}. Exemples : {日本|にほん}に{行|い}きます。 / {食|た}べたいです。 Les okurigana restent hors des accolades. N'annote pas les mots en kana.
- "romaji" : transcription Hepburn complète de la réponse.
- "translation_fr" : traduction naturelle de la réponse, en ${LEARNER_LANG}.
- "correction" : analyse le DERNIER message de l'apprenant. S'il est correct et naturel, has_error=false. Sinon has_error=true, "corrected" = version corrigée et naturelle, "explanation_fr" = explication courte et claire en ${LEARNER_LANG} (1-2 phrases). Pour le message d'ouverture (pas encore de message de l'apprenant), has_error=false.
- "suggestions" : 2 réponses courtes et simples que l'apprenant pourrait donner à ta question, avec leur traduction en ${LEARNER_LANG} (champ "fr").`;

const RESPOND_TOOL = {
  name: "respond",
  description: "Envoie la réponse de Sakura à l'apprenant, avec la correction de son dernier message.",
  input_schema: {
    type: "object",
    properties: {
      correction: {
        type: "object",
        properties: {
          has_error: { type: "boolean" },
          corrected: { type: "string", description: "Version corrigée en japonais avec furigana {漢字|かな}" },
          explanation_fr: { type: "string" },
        },
        required: ["has_error"],
      },
      reply: { type: "string", description: "Réponse en japonais avec furigana {漢字|かな}" },
      romaji: { type: "string" },
      translation_fr: { type: "string" },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: { ja: { type: "string" }, fr: { type: "string" } },
          required: ["ja", "fr"],
        },
      },
    },
    required: ["correction", "reply", "romaji", "translation_fr", "suggestions"],
  },
};

// ---------- État ----------
const defaults = {
  provider: "groq", keys: {}, models: { groq: "openai/gpt-oss-120b", openrouter: "", anthropic: "claude-haiku-5-5" },
  autoSpeak: true, autoSend: false, rate: 0.85, furi: true, romaji: false,
};
let settings = { ...defaults, ...load(SETTINGS, {}) };
// migration de l'ancienne version (une seule clé Claude)
if (settings.apiKey) { settings.keys = { ...settings.keys, anthropic: settings.apiKey }; settings.provider = "anthropic"; delete settings.apiKey; delete settings.model; }
settings.keys ||= {}; settings.models = { ...defaults.models, ...settings.models };
const provider = () => PROVIDERS[settings.provider] || PROVIDERS.groq;
const hasKey = () => !!settings.keys[settings.provider];
let state = load(STORE, { scenario: "libre", messages: [] });
let busy = false;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
    localStorage.setItem(SETTINGS, JSON.stringify(settings));
  } catch {}
}

// ---------- Utilitaires texte ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FURI = /\{([^{}|]+)\|([^{}]+)\}/g;
const toRuby = (s) => esc(s).replace(FURI, "<ruby>$1<rt>$2</rt></ruby>");
const toPlain = (s) => String(s ?? "").replace(FURI, "$1");

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const chat = $("chat"), input = $("input"), sugBox = $("suggestions");

function render() {
  chat.innerHTML = "";
  const visible = state.messages.filter((m) => !m.hidden);
  if (!visible.length && !busy) {
    chat.innerHTML = `<div class="welcome"><p><strong>こんにちは！</strong></p>
      <p>${L("Choisis un thème, puis appuie sur <strong>＋ Nouvelle</strong> pour que Sakura lance la conversation — ou écris-lui directement.", "Pick a topic, then tap <strong>＋ New</strong> so Sakura starts the conversation — or just write to her.")}</p>
      ${hasKey() ? "" : `<p>${L("⚙ Pour discuter avec Sakura, ajoute une clé dans les réglages. <strong>Groq est gratuit</strong> (sans carte bancaire). Les autres onglets fonctionnent sans clé.", "⚙ To chat with Sakura, add a key in the settings. <strong>Groq is free</strong> (no credit card). The other tabs work without a key.")}</p><p><button class="btn gold" onclick="openSettings()">⚙ ${L("Configurer", "Set up")}</button></p>`}</div>`;
  }
  state.messages.forEach((m, i) => {
    if (m.hidden) return;
    chat.appendChild(m.role === "user" ? userNode(m) : botNode(m, i));
  });
  if (busy) chat.insertAdjacentHTML("beforeend", `<div class="typing">${L("Sakura écrit…", "Sakura is typing…")}</div>`);
  renderSuggestions();
  chat.scrollTop = chat.scrollHeight;
}

function userNode(m) {
  const el = document.createElement("div");
  el.className = "msg user";
  el.innerHTML = `<div class="bubble" lang="ja">${esc(m.text)}</div>`;
  const c = m.correction;
  if (c) {
    if (c.has_error && c.corrected) {
      el.insertAdjacentHTML("beforeend", `<div class="correction">
        <div class="label">✏️ ${L("Plus naturel :", "More natural:")}</div>
        <div class="fixed" lang="ja">${toRuby(c.corrected)}</div>
        ${c.explanation_fr ? `<div>${esc(c.explanation_fr)}</div>` : ""}</div>`);
    } else if (!c.has_error) {
      el.insertAdjacentHTML("beforeend", `<div class="correction good">✓ Correct</div>`);
    }
  }
  return el;
}

function botNode(m, i) {
  const d = m.data;
  const el = document.createElement("div");
  el.className = "msg bot";
  el.innerHTML = `<div class="bubble" lang="ja">${toRuby(d.reply)}</div>
    <div class="romaji">${esc(d.romaji)}</div>
    ${m.showFr ? `<div class="translation">${esc(d.translation_fr)}</div>` : ""}
    <div class="tools">
      <button data-act="speak">🔊 ${L("Écouter", "Listen")}</button>
      <button data-act="fr">${m.showFr ? L("Masquer", "Hide") : L("🇫🇷 Traduire", "🇬🇧 Translate")}</button>
    </div>`;
  el.querySelector('[data-act="speak"]').onclick = () => speak(toPlain(d.reply));
  el.querySelector('[data-act="fr"]').onclick = () => { m.showFr = !m.showFr; save(); render(); };
  return el;
}

function renderSuggestions() {
  sugBox.innerHTML = "";
  const last = state.messages[state.messages.length - 1];
  if (busy || !last || last.role !== "assistant") return;
  (last.data.suggestions || []).slice(0, 3).forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span lang="ja">${toRuby(s.ja)}</span><small>${esc(s.fr)}</small>`;
    b.onclick = () => { input.value = toPlain(s.ja); autosize(); input.focus(); };
    sugBox.appendChild(b);
  });
}

function showError(msg) {
  chat.insertAdjacentHTML("beforeend", `<div class="error">${esc(msg)}</div>`);
  chat.scrollTop = chat.scrollHeight;
}

// ---------- Appel à l'IA ----------
const JSON_FORMAT = `

IMPORTANT : réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises \`\`\`, exactement de cette forme :
{"correction":{"has_error":false,"corrected":"","explanation_fr":""},"reply":"…","romaji":"…","translation_fr":"…","suggestions":[{"ja":"…","fr":"…"},{"ja":"…","fr":"…"}]}`;

async function askAI() {
  const p = provider();
  if (!hasKey()) { openSettings(); throw new Error(L("Ajoute une clé API dans les réglages (Groq est gratuit).", "Add an API key in the settings (Groq is free).")); }
  const history = state.messages.map((m) => ({ role: m.role, content: m.text }));
  const data = p.kind === "anthropic" ? await askAnthropic(p, history) : await askOpenAI(p, history);
  return normalize(data);
}

async function post(p, url, headers, body) {
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch {
    throw new Error(L(`Impossible de joindre ${p.name.split(" —")[0]} depuis le navigateur (pas de réseau, ou appel bloqué). `, `Can't reach ${p.name.split(" —")[0]} from the browser (no network, or the call is blocked). `) +
      (settings.provider === "groq" ? L("Essaie OpenRouter dans ⚙ Réglages.", "Try OpenRouter in ⚙ Settings.") : L("Vérifie ta connexion.", "Check your connection.")));
  }
  if (res.ok) return res.json();
  let detail = "";
  try { const j = await res.json(); detail = j.error?.message || j.message || ""; } catch {}
  const err = new Error(
    res.status === 401 || res.status === 403 ? L("Clé API refusée. Vérifie-la dans ⚙ Réglages.", "API key rejected. Check it in ⚙ Settings.") :
    res.status === 429 ? L("Limite gratuite atteinte pour le moment. Attends une minute (ou demain si c'est la limite du jour), ou change de fournisseur dans ⚙.", "Free limit reached for now. Wait a minute (or until tomorrow if it's the daily limit), or switch provider in ⚙.") :
    res.status === 402 ? L("Ce modèle n'est pas gratuit ou ton solde est à zéro. Choisis un modèle « :free » dans ⚙.", "This model isn't free or your balance is zero. Pick a \":free\" model in ⚙.") :
    L(`Erreur API (${res.status}) `, `API error (${res.status}) `) + detail);
  err.status = res.status;
  throw err;
}

async function askAnthropic(p, messages) {
  const json = await post(p, p.url, {
    "x-api-key": settings.keys.anthropic,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  }, {
    model: settings.models.anthropic, max_tokens: 1500, system: SYSTEM_PROMPT(state.scenario),
    tools: [RESPOND_TOOL], tool_choice: { type: "tool", name: "respond" }, messages,
  });
  const block = json.content?.find((b) => b.type === "tool_use");
  if (!block) throw new Error(L("Réponse inattendue du modèle.", "Unexpected response from the model."));
  return block.input;
}

async function askOpenAI(p, history) {
  const model = settings.models[settings.provider];
  if (!model) { openSettings(); throw new Error(L("Choisis un modèle dans ⚙ Réglages.", "Pick a model in ⚙ Settings.")); }
  const headers = { authorization: "Bearer " + settings.keys[settings.provider] };
  if (settings.provider === "openrouter") { headers["HTTP-Referer"] = location.origin; headers["X-Title"] = "Kaiwa"; }
  const body = {
    model, temperature: 0.6, max_tokens: 2000,
    messages: [{ role: "system", content: SYSTEM_PROMPT(state.scenario) + JSON_FORMAT }, ...history],
    response_format: { type: "json_object" },
  };
  if (settings.provider === "groq" && model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";
  let json;
  try {
    json = await post(p, p.url, headers, body);
  } catch (e) {
    if (e.status !== 400) throw e;
    delete body.response_format; delete body.reasoning_effort; // certains modèles ne gèrent pas le mode JSON
    json = await post(p, p.url, headers, body);
  }
  return parseJSON(json.choices?.[0]?.message?.content || "");
}

function parseJSON(text) {
  const t = text.replace(/```(?:json)?/g, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  // le modèle n'a pas respecté le format : on affiche au moins sa réponse
  return { reply: text.trim() || "…", romaji: "", translation_fr: "", correction: { has_error: false }, suggestions: [] };
}

function normalize(d) {
  d = d && typeof d === "object" ? d : {};
  return {
    reply: String(d.reply || "…"),
    romaji: String(d.romaji || ""),
    translation_fr: String(d.translation_fr || ""),
    correction: d.correction && typeof d.correction === "object" ? d.correction : { has_error: false },
    suggestions: Array.isArray(d.suggestions) ? d.suggestions.filter((x) => x && x.ja) : [],
  };
}

async function turn() {
  busy = true; $("btnSend").disabled = true; render();
  try {
    const data = await askAI();
    // la correction concerne le dernier message de l'apprenant
    const lastUser = [...state.messages].reverse().find((m) => m.role === "user" && !m.hidden);
    if (lastUser && data.correction && !lastUser.correction) lastUser.correction = data.correction;
    state.messages.push({ role: "assistant", text: toPlain(data.reply), data });
    save();
    busy = false; render();
    if (settings.autoSpeak) speak(toPlain(data.reply));
  } catch (e) {
    busy = false;
    // retire le message utilisateur resté sans réponse pour garder l'alternance user/assistant
    const last = state.messages[state.messages.length - 1];
    if (last?.role === "user") {
      state.messages.pop();
      if (!last.hidden) { input.value = last.text; autosize(); }
      save();
    }
    render(); showError(e.message);
  } finally {
    $("btnSend").disabled = false;
  }
}

function send(text) {
  text = text.trim();
  if (!text || busy) return;
  state.messages.push({ role: "user", text });
  input.value = ""; autosize(); save();
  turn();
}

function newConversation() {
  if (busy) return;
  speechSynthesis?.cancel();
  state.messages = [{ role: "user", hidden: true, text: "（会話を始めてください。挨拶して、テーマについて簡単な質問をしてください。）" }];
  save();
  turn();
}

// ---------- Voix : synthèse ----------
let jaVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("ja"));
  jaVoice = voices.find((v) => /google|natural|online/i.test(v.name)) || voices[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  if (jaVoice) u.voice = jaVoice;
  u.rate = settings.rate;
  speechSynthesis.speak(u);
}

// ---------- Voix : reconnaissance ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false;
if (!SR) {
  $("btnMic").title = L("Dictée non disponible sur ce navigateur (utilise Chrome ou Edge)", "Dictation isn't available in this browser (use Chrome or Edge)");
  $("btnMic").style.opacity = .4;
}
$("btnMic").onclick = () => {
  if (!SR) return showError(L("La dictée vocale n'est pas disponible ici. Utilise Chrome ou Edge.", "Voice dictation isn't available here. Use Chrome or Edge."));
  if (listening) return rec.stop();
  speechSynthesis?.cancel();
  rec = new SR();
  rec.lang = "ja-JP";
  rec.interimResults = true;
  rec.continuous = false;
  const before = input.value;
  rec.onresult = (e) => {
    const t = Array.from(e.results).map((r) => r[0].transcript).join("");
    input.value = before + t; autosize();
  };
  rec.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") showError(L("Micro : ", "Microphone: ") + e.error); };
  rec.onend = () => {
    listening = false; $("btnMic").classList.remove("listening");
    if (settings.autoSend && input.value.trim() && input.value !== before) send(input.value);
  };
  listening = true; $("btnMic").classList.add("listening");
  rec.start();
};

// ---------- Interface ----------
function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; }
input.addEventListener("input", autosize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
});
$("composer").onsubmit = (e) => { e.preventDefault(); send(input.value); };
$("btnNew").onclick = newConversation;

const sel = $("scenario");
for (const [k, v] of Object.entries(SCENARIOS)) sel.add(new Option(v, k));
sel.value = state.scenario;
sel.onchange = () => { state.scenario = sel.value; save(); newConversation(); };

function applyToggles() {
  document.body.classList.toggle("no-furi", !settings.furi);
  document.body.classList.toggle("no-romaji", !settings.romaji);
  $("tgFuri").setAttribute("aria-pressed", settings.furi);
  $("tgRomaji").setAttribute("aria-pressed", settings.romaji);
}
$("tgFuri").onclick = () => { settings.furi = !settings.furi; applyToggles(); save(); };
$("tgRomaji").onclick = () => { settings.romaji = !settings.romaji; applyToggles(); save(); };

let orModelsLoaded = false;
async function loadOpenRouterModels() {
  if (orModelsLoaded) return;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    const list = (await res.json()).data || [];
    const free = list.filter((m) => m.id.endsWith(":free") && (m.architecture?.output_modalities || ["text"]).includes("text"));
    // les modèles les plus gros (meilleurs en japonais) d'abord
    free.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
    PROVIDERS.openrouter.models = free.map((m) => [m.id, m.name || m.id]);
    orModelsLoaded = true;
  } catch {}
}

let shownProvider = null;
function fillProviderFields() {
  const key = $("provider").value, p = PROVIDERS[key];
  shownProvider = key;
  $("keyLabel").textContent = L("Clé API " + p.name.split(" —")[0], p.name.split(" —")[0] + " API key");
  $("apiKey").placeholder = p.keyHint;
  $("apiKey").value = settings.keys[key] || "";
  $("keyHelp").innerHTML = `${esc(p.help)} <a href="${p.keyUrl}" target="_blank" rel="noopener">${L("Obtenir une clé", "Get a key")}</a>`;
  const msel = $("model");
  msel.innerHTML = "";
  p.models.forEach(([id, name]) => msel.add(new Option(name, id)));
  const current = settings.models[key];
  $("customModel").value = current && !p.models.some(([id]) => id === current) ? current : "";
  if (current && p.models.some(([id]) => id === current)) msel.value = current;
  $("modelRow").hidden = !p.models.length;
  if (key === "openrouter" && !orModelsLoaded) {
    $("keyHelp").insertAdjacentHTML("beforeend", `<br><em>${L("Chargement de la liste des modèles gratuits…", "Loading the list of free models…")}</em>`);
    loadOpenRouterModels().then(() => { if ($("provider").value === "openrouter") fillProviderFields(); });
  }
}

function storeProviderFields() {
  const key = shownProvider;
  if (!key) return;
  settings.keys[key] = $("apiKey").value.trim();
  settings.models[key] = $("customModel").value.trim() || $("model").value || settings.models[key];
}

function openSettings() {
  const ps = $("provider");
  if (!ps.options.length) for (const [k, p] of Object.entries(PROVIDERS)) ps.add(new Option(p.name, k));
  ps.value = settings.provider;
  fillProviderFields();
  $("autoSpeak").checked = settings.autoSpeak;
  $("autoSend").checked = settings.autoSend;
  $("rate").value = settings.rate;
  $("rateVal").textContent = "×" + settings.rate;
  $("langSelect").value = LANG;
  if (!$("settings").open) $("settings").showModal();
}
$("provider").onchange = () => { storeProviderFields(); fillProviderFields(); };
$("btnSettings").onclick = openSettings;
$("langSelect").onchange = (e) => { storeProviderFields(); save(); setLang(e.target.value); };
$("rate").oninput = (e) => { $("rateVal").textContent = "×" + e.target.value; };
$("settings").addEventListener("close", () => {
  storeProviderFields();
  settings.provider = $("provider").value;
  settings.autoSpeak = $("autoSpeak").checked;
  settings.autoSend = $("autoSend").checked;
  settings.rate = parseFloat($("rate").value);
  save(); render();
});

// ---------- Démarrage ----------
applyStaticText();
applyToggles();
document.querySelectorAll(".lang-btn").forEach((b) => (b.onclick = () => { $("langDialog").close(); setLang(b.dataset.lang); }));
$("langDialog").addEventListener("cancel", (e) => e.preventDefault()); // on doit choisir une langue
if (!LANG_CHOSEN) $("langDialog").showModal();
// nettoie un éventuel tour inachevé (fermeture pendant une requête)
if (state.messages.at(-1)?.role === "user") state.messages.pop();
render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
