// SpeedHangul — Jiwoo, chatbot de conversation coréenne (niveau débutant). Même fonctionnement que Sakura dans Kaiwa.
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
const STORE = "speedhangul-state-v1";
const SETTINGS = "speedhangul-settings-v1";

const SCENARIOS = {
  libre: L("Conversation libre", "Free conversation"),
  presentation: L("Se présenter (자기소개)", "Introducing yourself (자기소개)"),
  cafe: L("Commander au café", "Ordering at a café"),
  courses: L("Faire des courses", "Shopping"),
  chemin: L("Demander son chemin", "Asking for directions"),
  loisirs: L("Parler de ses loisirs", "Talking about hobbies"),
  journee: L("Raconter sa journée", "Describing your day"),
  voyage: L("Voyage en Corée", "Trip to Korea"),
};

const LEARNER_LANG = L("français", "anglais");
const SYSTEM_PROMPT = (scenario) => `Tu es Jiwoo (지우), une partenaire de conversation coréenne bienveillante. Tu parles avec un apprenant DÉBUTANT (niveau TOPIK I, A1-A2) dont la langue est le ${LEARNER_LANG}.

LANGUE DE L'APPRENANT : ${LEARNER_LANG.toUpperCase()}. Traductions et explications toujours en ${LEARNER_LANG} (les noms des champs JSON restent inchangés).

QUI EST QUI — règle la plus importante :
- TOI, tu es Jiwoo : une Coréenne de 23 ans, étudiante à Séoul, qui aime le café, la K-pop, les dramas et la cuisine. Ne change jamais d'identité.
- L'APPRENANT est une autre personne. Ce qu'il dit de lui (prénom, nationalité, goûts…) le concerne LUI, jamais toi.
- Ne répète JAMAIS sa présentation comme si c'était la tienne. Réagis à ce qu'il dit, en l'appelant par son prénom + 씨. Ex. s'il dit « jeoneun Pasidi-ieyo », tu réponds « 파시디 씨, 만나서 반가워요! 저는 지우예요. ».
- Les prénoms étrangers s'écrivent en hangeul au plus proche de la prononciation (Pasidi → 파시디, Léa → 레아, Lucas → 루카스). En cas de doute, garde l'orthographe de l'apprenant.

Thème de la conversation : ${SCENARIOS[scenario]}.

Conversation :
- Réponds TOUJOURS en coréen simple, style poli 해요체 (-아요/-어요, -이에요/예요), 1 à 3 phrases courtes, vocabulaire de débutant. Jamais de hanja.
- Termine généralement par une question simple qui fait avancer la conversation.
- Si l'apprenant écrit en ${LEARNER_LANG} parce qu'il bloque : la correction montre comment le dire en coréen, puis continue en coréen.
- Reste dans le thème, mais suis l'apprenant s'il dérive.

Correction (champ "correction") — analyse le DERNIER message de l'apprenant :
- L'apprenant a le droit d'écrire en ROMANISATION (lettres latines) : ce n'est PAS une erreur. Juge uniquement la grammaire, le vocabulaire et le naturel de la phrase.
- has_error=false si la phrase est correcte (même en romanisation, même sans majuscules, ponctuation ni espaces parfaits).
- Sinon has_error=true, "corrected" = sa phrase corrigée en hangeul, en gardant SON prénom et SES informations.
- "explanation_fr" : 1 à 2 phrases en ${LEARNER_LANG}, précises et vraies. Nomme l'erreur exacte en montrant le mot fautif et sa correction. Ex. : « Après une voyelle, la particule de thème est 는 et pas 은 : 저는. Et pour « être » après une voyelle, on dit 예요 : 파시디예요. »
- Rappels de grammaire : 이에요/예요 est la copule (« être ») : 이에요 après une consonne, 예요 après une voyelle. Les particules (은/는, 이/가, 을/를, 에, 에서, 도, 의, (으)로…) changent selon que le mot finit par une consonne (batchim) ou une voyelle.
- Ne signale pas les fautes de frappe évidentes de la romanisation, l'absence de majuscules ni la façon de couper ou d'espacer les mots en romanisation (« gongbu haeyo » = « gongbuhaeyo » : c'est CORRECT). Pas de correction pour le message d'ouverture (has_error=false).

Format :
- "reply" : ta réponse en hangeul uniquement.
- "romaji" : romanisation révisée (Revised Romanization) complète de ta réponse, telle qu'elle se prononce, en lettres latines.
- "translation_fr" : traduction naturelle de ta réponse en ${LEARNER_LANG} (c'est TOI, Jiwoo, qui parles).
- "suggestions" : 2 réponses courtes que l'apprenant pourrait donner à TA question, à la 1re personne (lui qui parle), en hangeul (champ "ko"), avec leur romanisation révisée complète (champ "romaji") et leur traduction en ${LEARNER_LANG} (champ "fr").

Exemple. Message de l'apprenant : « annyeonghaseyo! jeoeun Pasidi ieyo. peurangseu saram »
Bonne réponse :
{"correction":{"has_error":true,"corrected":"안녕하세요! 저는 파시디예요. 프랑스 사람이에요.","explanation_fr":"Après une voyelle, la particule de thème est 는 (저는), pas 은. Après 파시디 (voyelle), « être » se dit 예요, et la phrase 프랑스 사람 a besoin de 이에요 à la fin."},"reply":"파시디 씨, 만나서 반가워요! 저는 지우예요. 한국 음식 좋아해요?","romaji":"Pasidi ssi, mannaseo bangawoyo! Jeoneun Jiu-yeyo. Hanguk eumsik joahaeyo?","translation_fr":"Enchantée, Pasidi ! Moi, c'est Jiwoo. Tu aimes la cuisine coréenne ?","suggestions":[{"ko":"네, 정말 좋아해요.","romaji":"Ne, jeongmal joahaeyo.","fr":"Oui, j'adore."},{"ko":"네, 김치찌개를 좋아해요.","romaji":"Ne, gimchijjigaereul joahaeyo.","fr":"Oui, j'aime le ragoût de kimchi."}]}`;

const RESPOND_TOOL = {
  name: "respond",
  description: "Envoie la réponse de Jiwoo à l'apprenant, avec la correction de son dernier message.",
  input_schema: {
    type: "object",
    properties: {
      correction: {
        type: "object",
        properties: {
          has_error: { type: "boolean" },
          corrected: { type: "string", description: "Version corrigée en hangeul" },
          explanation_fr: { type: "string" },
        },
        required: ["has_error"],
      },
      reply: { type: "string", description: "Réponse en coréen (hangeul)" },
      romaji: { type: "string" },
      translation_fr: { type: "string" },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: { ko: { type: "string" }, romaji: { type: "string" }, fr: { type: "string" } },
          required: ["ko", "romaji", "fr"],
        },
      },
    },
    required: ["correction", "reply", "romaji", "translation_fr", "suggestions"],
  },
};

// ---------- État ----------
const defaults = {
  provider: "groq", keys: {}, models: { groq: "openai/gpt-oss-120b", openrouter: "", anthropic: "claude-haiku-5-5" },
  voice: "text", autoSpeak: true, autoSend: false, rate: 0.85, romaji: true,
};
let settings = { ...defaults, ...load(SETTINGS, {}) };
if (!Object.values(settings.keys || {}).some(Boolean)) {
  const k = load("kaiwa-settings-v1", null);
  if (k && k.keys && Object.values(k.keys).some(Boolean)) {
    settings.keys = { ...k.keys }; settings.provider = k.provider || settings.provider;
    settings.models = { ...settings.models, ...(k.models || {}) };
  }
}
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
    chat.innerHTML = `<div class="welcome"><p><strong lang="ko">안녕하세요!</strong></p>
      <p>${L("Choisis un thème, puis appuie sur <strong>＋ Nouvelle</strong> pour que Jiwoo lance la conversation — ou écris-lui directement.", "Pick a topic, then tap <strong>＋ New</strong> so Jiwoo starts the conversation — or just write to her.")}</p>
      ${hasKey() ? "" : `<p>${L("⚙ Pour discuter avec Jiwoo, ajoute une clé dans les réglages. <strong>Groq est gratuit</strong> (sans carte bancaire). Les autres onglets fonctionnent sans clé.", "⚙ To chat with Jiwoo, add a key in the settings. <strong>Groq is free</strong> (no credit card). The other tabs work without a key.")}</p><p><button class="btn gold" onclick="openSettings()">⚙ ${L("Configurer", "Set up")}</button></p>`}</div>`;
  }
  state.messages.forEach((m, i) => {
    if (m.hidden) return;
    chat.appendChild(m.role === "user" ? userNode(m) : botNode(m, i));
  });
  if (busy) chat.insertAdjacentHTML("beforeend", `<div class="typing">${L("Jiwoo écrit…", "Jiwoo is typing…")}</div>`);
  renderSuggestions();
  chat.scrollTop = chat.scrollHeight;
}

function userNode(m) {
  const el = document.createElement("div");
  el.className = "msg user";
  el.innerHTML = `<div class="bubble" lang="ko">${esc(m.text)}</div>`;
  const c = m.correction;
  if (c) {
    if (c.has_error && c.corrected) {
      el.insertAdjacentHTML("beforeend", `<div class="correction">
        <div class="label">✏️ ${L("Plus naturel :", "More natural:")}</div>
        <div class="fixed" lang="ko">${toRuby(c.corrected)}</div>
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
  el.innerHTML = `<div class="bubble" lang="ko">${toRuby(d.reply)}</div>
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
    b.innerHTML = `<span lang="ko">${esc(s.ko)}</span>${s.romaji ? `<span class="sug-rom">${esc(s.romaji)}</span>` : ""}<small>${esc(s.fr)}</small>`;
    b.onclick = () => { input.value = s.ko; autosize(); input.focus(); };
    sugBox.appendChild(b);
  });
}

function showError(msg) {
  chat.insertAdjacentHTML("beforeend", `<div class="error">${esc(msg)}</div>`);
  chat.scrollTop = chat.scrollHeight;
}

// ---------- Appel à l'IA ----------
const JSON_FORMAT = `

IMPORTANT : réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises \`\`\`. Chaque texte s'ouvre et se ferme avec des guillemets droits " (jamais 「」 ni “ ”) ; à l'intérieur d'un texte, utilise 「」 si tu dois citer. Exactement de cette forme :
{"correction":{"has_error":false,"corrected":"","explanation_fr":""},"reply":"…","romaji":"…","translation_fr":"…","suggestions":[{"ko":"…","romaji":"…","fr":"…"},{"ko":"…","romaji":"…","fr":"…"}]}`;

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
  if (settings.provider === "openrouter") { if (location.origin.startsWith("http")) headers["HTTP-Referer"] = location.origin; headers["X-Title"] = "SpeedHangul"; }
  const body = {
    model, temperature: 0.5, max_tokens: 4000,
    messages: [{ role: "system", content: SYSTEM_PROMPT(state.scenario) + JSON_FORMAT }, ...history],
    response_format: { type: "json_object" },
  };
  // un peu plus de réflexion = des corrections plus justes (Groq reste très rapide)
  if (settings.provider === "groq" && model.startsWith("openai/gpt-oss")) body.reasoning_effort = "medium";
  let json;
  try {
    json = await post(p, p.url, headers, body);
  } catch (e) {
    if (e.status !== 400) throw e;
    delete body.response_format; delete body.reasoning_effort; // certains modèles ne gèrent pas le mode JSON
    json = await post(p, p.url, headers, body);
  }
  let data = parseJSON(json.choices?.[0]?.message?.content || "");
  if (!data) { // réponse illisible : on redemande une fois
    json = await post(p, p.url, headers, body);
    data = parseJSON(json.choices?.[0]?.message?.content || "");
  }
  // toujours rien : on montre au moins le texte, sans fausse correction
  return data || { reply: (json.choices?.[0]?.message?.content || "…").trim(), romaji: "", translation_fr: "", correction: null, suggestions: [] };
}

// Lit la réponse JSON du modèle. Les modèles gratuits la cassent parfois (ex. 」 à la place de " pour fermer un texte) :
// 1) lecture normale, 2) réparation des guillemets japonais mal placés, 3) extraction champ par champ.
// Renvoie null si rien d'exploitable (askOpenAI redemande alors une fois).
function parseJSON(text) {
  const t = text.replace(/```(?:json)?/g, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  const raw = t.slice(a, b + 1);
  const tries = [raw,
    raw.replace(/[」』”“]\s*(?=[,}\]]\s*["}\]]?)/g, '"'),          // 」, → ",
    raw.replace(/[」』”“]\s*(?=[,}\]])/g, '"').replace(/,\s*([}\]])/g, "$1")];
  for (const s of tries) { try { return JSON.parse(s); } catch {} }
  // extraction champ par champ
  const field = (k, src = raw) => {
    const m = src.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return "";
    let v = m[1].replace(/[」』”]?\s*,?\s*$/, "");
    try { v = JSON.parse(`"${v}"`); } catch { v = v.replace(/\\"/g, '"').replace(/\\n/g, "\n"); }
    return v;
  };
  const reply = field("reply");
  if (!reply) return null;
  const err = /"has_error"\s*:\s*true/.test(raw);
  const sugs = [...raw.matchAll(/\{\s*"(?:ja|ko)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*(?:"romaji"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*)?"fr"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g)].map((m) => ({ ja: m[1], ko: m[1], romaji: m[2] || "", fr: m[3] }));
  return { reply, romaji: field("romaji"), translation_fr: field("translation_fr"),
    correction: { has_error: err, corrected: field("corrected"), explanation_fr: field("explanation_fr") }, suggestions: sugs };
}

function normalize(d) {
  d = d && typeof d === "object" ? d : {};
  return {
    reply: String(d.reply || "…"),
    romaji: String(d.romaji || ""),
    translation_fr: String(d.translation_fr || ""),
    correction: d.correction && typeof d.correction === "object" ? d.correction : null, // pas de correction lisible : on n'affiche rien (pas de faux « ✓ Correct »)
    suggestions: Array.isArray(d.suggestions) ? d.suggestions.filter((x) => x && (x.ko || x.ja)).map((x) => ({ ko: x.ko || x.ja, romaji: x.romaji || "", fr: x.fr || "" })) : [],
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
    if (settings.voice === "oral" && settings.autoSpeak) speak(toPlain(data.reply));
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
  state.messages = [{ role: "user", hidden: true, text: "(대화를 시작해 주세요. 인사하고 주제에 대해 간단한 질문을 해 주세요.)" }];
  save();
  turn();
}

// ---------- Voix : synthèse ----------
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
  rec.lang = "ko-KR";
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

// Mode écrit (par défaut) : pas de lecture automatique, pas de micro.
// Mode oral : Jiwoo lit ses réponses et le micro est disponible. Le bouton 🔊 reste là dans les deux cas.
function applyVoiceMode() {
  const oral = settings.voice === "oral";
  document.body.classList.toggle("voice-text", !oral);
  $("btnVoice").innerHTML = oral ? `🎙️<span class="vb-tl"> ${L("Oral", "Voice")}</span>` : `⌨️<span class="vb-tl"> ${L("Écrit", "Text")}</span>`;
  $("btnVoice").title = oral
    ? L("Mode oral : Jiwoo lit ses réponses, micro activé. Touche pour passer à l'écrit.", "Voice mode: Jiwoo reads her replies, microphone on. Tap for text mode.")
    : L("Mode écrit : pas de lecture automatique ni de micro. Touche pour passer à l'oral.", "Text mode: no auto-reading, no microphone. Tap for voice mode.");
  $("btnVoice").classList.toggle("gold", oral);
}
$("btnVoice").onclick = () => {
  settings.voice = settings.voice === "oral" ? "text" : "oral";
  if (settings.voice === "text") { speechSynthesis?.cancel(); if (listening) rec.stop(); }
  save(); applyVoiceMode();
};

const sel = $("scenario");
for (const [k, v] of Object.entries(SCENARIOS)) sel.add(new Option(v, k));
sel.value = state.scenario;
sel.onchange = () => { state.scenario = sel.value; save(); newConversation(); };

function applyToggles() {
  document.body.classList.toggle("no-romaji", !settings.romaji);
  $("tgRomaji").setAttribute("aria-pressed", settings.romaji);
}
$("tgRomaji").onclick = () => { settings.romaji = !settings.romaji; applyToggles(); save(); };

let orModelsLoaded = false;
async function loadOpenRouterModels() {
  if (orModelsLoaded) return;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    const list = (await res.json()).data || [];
    const free = list.filter((m) => m.id.endsWith(":free") && (m.architecture?.output_modalities || ["text"]).includes("text"));
    // les modèles les plus gros (meilleurs en coréen) d'abord
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
applyVoiceMode();
document.querySelectorAll(".lang-btn[data-lang]").forEach((b) => (b.onclick = () => { $("langDialog").close(); setLang(b.dataset.lang); }));
$("langDialog").addEventListener("cancel", (e) => e.preventDefault()); // on doit choisir une langue
if (!LANG_CHOSEN) $("langDialog").showModal();
else if (!appChosen()) showAppChooser();
initAppSelect();
$("btnTestVoice").onclick = () => { settings.rate = parseFloat($("rate").value); speak("안녕하세요! 반가워요."); };
// nettoie un éventuel tour inachevé (fermeture pendant une requête)
if (state.messages.at(-1)?.role === "user") state.messages.pop();
render();

// Hors ligne : le service worker de Kaiwa (dossier parent) met aussi SpeedHangul en cache
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("../sw.js", { scope: "../", updateViaCache: "none" }).then((reg) => reg.update()).catch(() => {});
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
