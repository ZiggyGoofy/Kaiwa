// Choix de l'application : Kaiwa (japonais) ou SpeedHangul (coréen).
// Partagé par les deux apps (même site, donc même localStorage). Nécessite i18n.js (fonction L).
// La page indique laquelle elle est avec <html data-app="kaiwa"> ou <html data-app="hangul">.

const APP_KEY = "kaiwa-app";
const APP_HERE = document.documentElement.dataset.app;
const APP_URL = { kaiwa: APP_HERE === "hangul" ? "../" : "./", hangul: APP_HERE === "hangul" ? "./" : "hangul/" };
const appChoice = () => { try { return localStorage.getItem(APP_KEY); } catch { return null; } };
const appChosen = () => appChoice() === "kaiwa" || appChoice() === "hangul";

function setApp(app) {
  try { localStorage.setItem(APP_KEY, app); } catch {}
  if (app !== APP_HERE) location.href = APP_URL[app];
}

// Fenêtre « Que veux-tu apprendre ? » (premier lancement)
function showAppChooser() {
  let d = document.getElementById("appDialog");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "appDialog"; d.className = "lang-dialog app-dialog";
    d.innerHTML = `
      <div class="lang-box">
        <h2>${L("Que veux-tu apprendre ?", "What do you want to learn?")}</h2>
        <p>${L("Tu pourras changer plus tard dans ⚙ Réglages.", "You can change this later in ⚙ Settings.")}</p>
        <div class="lang-choices app-choices">
          <button class="lang-btn app-btn" data-app="kaiwa"><span class="app-logo" lang="ja">会話</span><b>Kaiwa</b><small>${L("Japonais 🇯🇵", "Japanese 🇯🇵")}</small></button>
          <button class="lang-btn app-btn" data-app="hangul"><span class="app-logo" lang="ko">한글</span><b>SpeedHangul</b><small>${L("Coréen 🇰🇷", "Korean 🇰🇷")}</small></button>
        </div>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener("cancel", (e) => e.preventDefault()); // on doit choisir
    d.querySelectorAll(".app-btn").forEach((b) => (b.onclick = () => { d.close(); setApp(b.dataset.app); }));
  }
  if (!d.open) d.showModal();
}

// Sélecteur dans les réglages (<select id="appSelect">)
function initAppSelect() {
  const s = document.getElementById("appSelect");
  if (!s) return;
  s.value = APP_HERE;
  s.onchange = () => setApp(s.value);
}
