# Kaiwa 会話 — Parler japonais avec un chatbot

Application web pour pratiquer le japonais (niveau débutant N5-N4) : conversation avec « Sakura », un chatbot IA, et exercices hors ligne.

**Avec Sakura (clé API gratuite Groq/OpenRouter, ou Claude payant)** : conversation par thèmes · correction de tes phrases avec explication en français · furigana et rōmaji (activables) · traduction au clic · dictée vocale en japonais · lecture audio · suggestions de réponses.

**Sans clé API (hors ligne)** :
- **Mot du jour** (bouton doré sur la page Sakura) — un mot par jour avec phrase d'exemple et audio, calendrier (✓ sur les jours appris, jours passés à rattraper), série de jours d'affilée. Pastille rouge tant que le mot du jour n'est pas appris
- **Kana** — tableaux hiragana / katakana (base, dakuten, combinaisons). Touche un caractère pour ouvrir sa fiche : grand caractère, audio, mot d'exemple avec le kana surligné (ex. **と**もだち – tomodachi – ami), kanji, illustration et traduction. Flèches ou balayage pour passer au suivant
- **Phrases** — 8 thèmes de phrases utiles avec audio, et bouton « Pratiquer avec Sakura »
- **Cartes** — flashcards qui se retournent (kana, 13 catégories de vocabulaire, phrases), sens JA→FR ou FR→JA, progression sauvegardée. Sur PC : espace = retourner, ← = à revoir, → = je savais
- **Particules** (dans Cartes) — 38 phrases à trous pour choisir la bonne particule (は・が・を, に・で・へ…, と・も・の・か…, ou tout mélangé), avec explication en français, audio, rōmaji et mémo des particules. +5 ⭐ par bonne réponse ; une erreur revient 3 phrases plus loin. Sur PC : touches 1-4 pour répondre, Entrée pour continuer
- **Quiz** — 10 questions (hiragana, katakana ou vocabulaire). Points : 10 ⭐ par bonne réponse + bonus de série (jusqu'à +10), +50 ⭐ sans faute. Record par quiz, niveau tous les 200 ⭐
- **Brute force (kana)** (dans Quiz) — un kana s'affiche, tu tapes sa lecture en rōmaji (ou en kana) : validation instantanée, une réponse fausse est signalée tout de suite avec la correction. Choix hiragana / katakana / les deux, et des lignes à inclure (あ, か, … dakuten, combinaisons). Chaque kana doit être réussi 3 fois pour être éliminé ; les ratés reviennent ~4 questions plus loin. Entrée = « je ne sais pas ». +2 ⭐ par bonne réponse, +30 ⭐ à la fin, puis révision libre possible. Inspiré de vedxyz.github.io/kana
- **Points ⭐** — affichés en haut de l'écran ; on en gagne aussi avec le mot du jour (+20 ⭐)

Sur téléphone, l'interface passe en mode « menu de jeu » : barre d'onglets en bas, gros boutons en relief.

**Langues** : au premier lancement, l'app demande de choisir entre **français** et **anglais** (interface et tout le contenu : traductions, explications, Sakura). On peut changer ensuite dans ⚙ Réglages → Langue.

Une seule base de code : elle tourne dans le navigateur sur PC et s'installe comme une app sur téléphone (PWA).

---

## 1. Choisir une IA pour Sakura (gratuit possible)

Seul l'onglet **Sakura** a besoin d'une clé. Tout le reste fonctionne sans.

| Fournisseur | Prix | Limite | Clé |
|---|---|---|---|
| **Groq** (recommandé) | Gratuit, sans carte bancaire | ~1 000 messages / jour | https://console.groq.com/keys |
| **OpenRouter** | Gratuit avec les modèles « :free » | ~50 messages / jour | https://openrouter.ai/keys |
| Claude | Payant à l'usage (quelques centimes par conversation) | — | https://console.anthropic.com |

1. Crée un compte chez le fournisseur choisi et génère une clé API.
2. Dans l'app : ⚙ Réglages → choisis le fournisseur → colle la clé.
3. Si Groq affiche « Impossible de joindre Groq depuis le navigateur », passe sur OpenRouter (certains services refusent les appels directs depuis une page web).

La clé est stockée **uniquement dans le navigateur de ton appareil** (jamais sur GitHub). Ne l'écris dans aucun fichier du dépôt.

Les limites gratuites peuvent changer : vérifie-les sur le site du fournisseur. Les offres gratuites utilisent souvent tes messages pour améliorer leurs modèles, donc n'y écris rien de personnel.

## 2. Utiliser sur PC

**Option A (simple)** : une fois l'app publiée sur GitHub Pages (étape 3), ouvre l'URL dans Chrome ou Edge, puis clique sur l'icône « Installer » dans la barre d'adresse. Kaiwa s'ouvre alors dans sa propre fenêtre, comme une application.

**Option B (en local)** : double-clique sur `lancer.bat` (Windows, nécessite Python), ou dans un terminal :

```
cd kaiwa
python -m http.server 8080
```

puis ouvre http://localhost:8080. (Ouvrir `index.html` directement par double-clic marche aussi, mais le micro et l'installation fonctionnent mieux via un serveur.)

## 3. Publier sur GitHub Pages (version téléphone)

1. Crée un dépôt sur GitHub, par ex. `kaiwa` (public).
2. Mets-y tous les fichiers de ce dossier (à la racine du dépôt) : bouton **Add file → Upload files**, ou :
   ```
   git init && git add . && git commit -m "Kaiwa"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/kaiwa.git
   git push -u origin main
   ```
3. Dans le dépôt : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)` → Save**.
4. Après une minute, l'app est en ligne sur `https://TON-PSEUDO.github.io/kaiwa/`.

**Installer sur le téléphone**
- Android (Chrome) : ouvre l'URL → menu ⋮ → « Ajouter à l'écran d'accueil » / « Installer l'application ».
- iPhone (Safari) : ouvre l'URL → bouton Partager → « Sur l'écran d'accueil ».

Il faudra recoller la clé API une fois sur le téléphone. Les points, le calendrier et la progression sont propres à chaque appareil.

## Navigateurs

| Fonction | Chrome / Edge (PC, Android) | Safari (iPhone) | Firefox |
|---|---|---|---|
| Chat, furigana, corrections | ✅ | ✅ | ✅ |
| Lecture audio | ✅ | ✅ | ✅ (selon voix installées) |
| Dictée vocale | ✅ | ✅ (iOS 14.5+) | ❌ |

Sur Windows, si la voix japonaise est absente : Paramètres → Heure et langue → Langue → ajouter « Japonais » (avec la synthèse vocale).

## Fichiers

- `index.html` — la page
- `style.css` — l'apparence (thème clair/sombre automatique)
- `app.js` — la conversation (Groq / OpenRouter / Claude, voix, corrections…)
- `i18n.js` — choix de la langue (français / anglais)
- `content-en.js` — traductions anglaises du contenu (même ordre que `content.js`)
- `content.js` — tout le contenu : kana, phrases, vocabulaire, mots du jour (facile à compléter)
- `learn.js` — onglets, mot du jour, kana, cartes, quiz et points
- `bruteforce.js` — le quiz Brute force des kana
- `manifest.json`, `sw.js`, `icons/` — ce qui rend l'app installable

## Personnaliser

- Thèmes de conversation : objet `SCENARIOS` dans `app.js`
- Changer l'exemple d'un kana : `KANA_EX` dans `content.js`, format `[mot avec [kana], rōmaji avec [syllabe], kanji, français, anglais, emoji]`
- Ajouter des mots du jour : `WORDS_OF_DAY` dans `content.js`, format `[mot, romaji, français, exemple, traduction]`
- Si tu ajoutes du contenu dans `content.js`, ajoute sa traduction anglaise **au même endroit** dans `content-en.js` (sinon la console affiche « EN content mismatch » et la liste reste en français en mode anglais)
- Ajouter des phrases à trous : `PARTICLES` dans `content.js`, format `[phrase avec ＿, bonne particule, "mauvaise|mauvaise|mauvaise", rōmaji avec __, français, explication]`
- Ajouter des mots ou des phrases : `VOCAB` et `PHRASES` dans `content.js`, au format `["{漢字|かんじ}", "romaji", "français"]`
- Comportement de Sakura (niveau, style…) : `SYSTEM_PROMPT` dans `app.js`
- Après une modification publiée, augmente le numéro `kaiwa-v11` → `kaiwa-v12` dans `sw.js` pour forcer la mise à jour sur le téléphone.
