# Kaiwa 会話 — Parler japonais avec un chatbot

Application web pour pratiquer le japonais (niveau débutant N5-N4) : conversation avec « Sakura », un chatbot IA, et exercices hors ligne.

**Avec Sakura (clé API gratuite Groq/OpenRouter, ou Claude payant)** : mode ⌨️ Écrit (par défaut, sans voix ni micro) ou 🎙️ Oral (lecture automatique + micro), à basculer d'un bouton · conversation par thèmes · correction de tes phrases avec explication en français · furigana et rōmaji (activables) · traduction au clic · dictée vocale en japonais · lecture audio · suggestions de réponses.

**Sans clé API (hors ligne)** :
- **Mot du jour** (bouton doré 日 dans la barre de la page Sakura) — un mot par jour avec phrase d'exemple et audio, calendrier (✓ sur les jours appris, jours passés à rattraper), série de jours d'affilée. Pastille rouge tant que le mot du jour n'est pas appris
- **Kana** — tableaux hiragana / katakana (base, dakuten, combinaisons). Touche un caractère pour ouvrir sa fiche : grand caractère, audio, **moyen mnémotechnique illustré** (le kana dessiné dans un objet dont le nom commence par son son, ex. あ sur un **A**vocat ; aussi au dos des cartes), mot d'exemple avec le kana surligné (ex. **と**もだち – tomodachi – ami), kanji, illustration et traduction. Flèches ou balayage pour passer au suivant
- **Kanji** (remplace l'ancien onglet Phrases) — les 500 kanji les plus utilisés, triés par niveau JLPT (N5 → N4 → N3 → N2 → N1) puis par fréquence (classement KANJIDIC2), avec un filtre par niveau avec recherche par sens, lecture ou kanji. Chaque fiche : rang, niveau JLPT, nombre de traits, lectures on/kun, sens en français ou anglais, mot d'exemple avec furigana, rōmaji, traduction et audio. Flèches ou balayage pour passer au suivant
- **Cartes** — flashcards qui se retournent (kana, particules, 13 catégories de vocabulaire, et des paquets de kanji par niveau JLPT — N5, N4 (2 paquets), N3 (3 paquets), N2, N1, 70 kanji max par paquet : le kanji d'un côté, sens + lectures + mot d'exemple de l'autre). Pour les kana, on choisit d'abord les lignes du tableau à réviser (あ, か, … dakuten, combinaisons), avec la progression de chaque ligne, sens JA→FR ou FR→JA, progression sauvegardée. Sur PC : espace = retourner, ← = à revoir, → = je savais
- **Particules** (dans Cartes) — 38 phrases à trous pour choisir la bonne particule (は・が・を, に・で・へ…, と・も・の・か…, ou tout mélangé), avec explication en français, audio, rōmaji et mémo des particules. +5 ⭐ par bonne réponse ; une erreur revient 3 phrases plus loin. Sur PC : touches 1-4 pour répondre, Entrée pour continuer
- **Quiz** — hiragana ou katakana en 10, 30, 60 ou 90 cartes (au choix), kanji (500 kanji : trouver le sens) en 10, 30, 60 ou 90 cartes aussi. Points : 10 ⭐ par bonne réponse (jusqu'à 20 ⭐ en série), 🔥 bonus de série à 5 (+10), 10 (+25), 15 (+40), 20 (+60) bonnes réponses d'affilée puis +50/+100 toutes les 5, et 5 ⭐ par carte en plus sans faute. Record par quiz et par nombre de cartes, niveau tous les 200 ⭐
- **Brute force (kana)** (dans Quiz) — un kana s'affiche, tu tapes sa lecture en rōmaji (ou en kana) : validation instantanée, une réponse fausse est signalée tout de suite avec la correction. Choix hiragana / katakana / les deux, et des lignes à inclure (あ, か, … dakuten, combinaisons). Chaque kana doit être réussi 3 fois pour être éliminé ; les ratés reviennent ~4 questions plus loin. Entrée = « je ne sais pas ». +2 ⭐ par bonne réponse, +30 ⭐ à la fin, puis révision libre possible. Inspiré de vedxyz.github.io/kana
- **⚡ Jeu de vitesse** (dans Quiz) — contre la montre, durée au choix (30 s, 1 min, 1 min 30 ou 2 min ; un record par mode et par durée) pour enchaîner un maximum de bonnes réponses (hiragana, katakana, les deux mélangés ou kanji). Une erreur coûte 3 s, 5 bonnes réponses d'affilée rapportent +2 s. 3 ⭐ par bonne réponse, +20 ⭐ pour un nouveau record. Sur PC : touches 1 à 4
- **Points ⭐** — affichés en haut de l'écran ; on en gagne aussi avec le mot du jour (+20 ⭐)

Sur téléphone, l'interface passe en mode « menu de jeu » : barre d'onglets en bas, gros boutons en relief.

**Langues** : au premier lancement, l'app demande de choisir entre **français** et **anglais** (interface et tout le contenu : traductions, explications, Sakura). On peut changer ensuite dans ⚙ Réglages → Langue.

Une seule base de code : elle tourne dans le navigateur sur PC et s'installe comme une app sur téléphone (PWA).

## SpeedHangul 한글 — la version coréenne (dossier `hangul/`)

Le même site contient aussi **SpeedHangul**, pour apprendre le coréen, avec les mêmes fonctions que Kaiwa :
- **Jiwoo 지우** (onglet du milieu) — l'équivalent de Sakura : une étudiante de Séoul qui discute en coréen poli simple (해요체), corrige tes phrases, donne la romanisation et la traduction, propose des réponses ; mode écrit ou oral, thèmes, dictée et lecture en coréen. Elle utilise la même clé API que Sakura (reprise automatiquement si elle est déjà enregistrée dans Kaiwa sur le même appareil). Le **mot du jour** (calendrier, série de jours) est sur le bouton doré 말 de sa page
- **Hangeul** — les 40 lettres (consonnes, doubles, voyelles, voyelles composées), chacune avec une affiche mnémotechnique illustrée et un mot d'exemple ; assembleur de syllabes (ㄱ + ㅏ = 가) et tableau des syllabes
- **Phrases** — 8 thèmes avec audio, et bouton « Pratiquer avec Jiwoo »
- **Cartes** — lettres par groupes, 12 paquets de vocabulaire, phrases, mots du jour, et 34 phrases à trous sur les particules coréennes (은/는, 이/가, 을/를, 에/에서…)
- **Quiz** — lettres ou syllabes en 10/30/60/90 cartes, vocabulaire, bonus de série, Brute force et ⚡ jeu de vitesse

Au premier lancement, l'app demande la langue (une seule fois pour les deux apps), puis **Kaiwa ou SpeedHangul**. On peut changer à tout moment dans ⚙ Réglages → Application. Le site se souvient du choix : https://TON-PSEUDO.github.io/Kaiwa/ ouvre directement la bonne app. Les points et la progression de chaque app sont séparés.

Fichiers de SpeedHangul : `hangul/index.html`, `hangul/style.css`, `hangul/app.js` (Jiwoo, réglages, voix coréenne ; son comportement : `SYSTEM_PROMPT`), `hangul/content.js` (tout le contenu coréen, FR et EN dans les mêmes entrées), `hangul/mnemo.js` (dessins), `hangul/learn.js`, `hangul/bruteforce.js`, `hangul/speed.js`. Le choix de l'app est dans `appchoice.js` (à la racine, partagé).

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
- `kanji.js` — les 500 kanji (lectures et sens : KANJIDIC2 / JMdict de l'EDRDG, licence CC BY-SA 4.0 ; niveaux JLPT : tanos.co.uk)
- `learn.js` — onglets, mot du jour, kana, cartes, quiz et points
- `bruteforce.js` — le quiz Brute force des kana
- `speed.js` — le jeu de vitesse
- `appchoice.js` — le choix Kaiwa / SpeedHangul
- `hangul/` — SpeedHangul, la version coréenne
- `mnemo.js` — les 92 dessins mnémotechniques des kana
- `manifest.json`, `sw.js`, `icons/` — ce qui rend l'app installable

## Personnaliser

- Thèmes de conversation : objet `SCENARIOS` dans `app.js`
- Changer l'exemple d'un kana : `KANA_EX` dans `content.js`, format `[mot avec [kana], rōmaji avec [syllabe], kanji, français, anglais, emoji]`
- Changer un moyen mnémotechnique : `KANA_MNEMO` dans `mnemo.js`, format `[mot FR avec [son], mot EN avec [son], explication FR, explication EN, dessin SVG]` (dakuten et combinaisons reprennent le dessin de leur kana de base)
- Ajouter des mots du jour : `WORDS_OF_DAY` dans `content.js`, format `[mot, romaji, français, exemple, traduction]`
- Si tu ajoutes du contenu dans `content.js`, ajoute sa traduction anglaise **au même endroit** dans `content-en.js` (sinon la console affiche « EN content mismatch » et la liste reste en français en mode anglais)
- Ajouter des phrases à trous : `PARTICLES` dans `content.js`, format `[phrase avec ＿, bonne particule, "mauvaise|mauvaise|mauvaise", rōmaji avec __, français, explication]`
- Ajouter des mots ou des phrases : `VOCAB` et `PHRASES` dans `content.js`, au format `["{漢字|かんじ}", "romaji", "français"]`
- Comportement de Sakura (niveau, style…) : `SYSTEM_PROMPT` dans `app.js`
- Après une modification publiée, augmente le numéro `kaiwa-v27` → `kaiwa-v28` dans `sw.js` pour forcer la mise à jour sur le téléphone.
