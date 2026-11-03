// SpeedHangul — moyens mnémotechniques illustrés (la lettre dessinée dans un objet dont le nom commence par son son).
// [mot FR avec [son], mot EN avec [son], explication FR, explication EN, dessin SVG (viewBox 0 0 100 100)]
// Les consonnes doubles et les voyelles dérivées reprennent le dessin de leur lettre de base (voir jamoMnemo dans learn.js).

const _c = (cx, cy, r, f, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${extra}/>`;
const _e = (cx, cy, rx, ry, f, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" transform="rotate(${rot} ${cx} ${cy})"/>`;
const _r = (x, y, w, h, f, rx = 0, rot = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
const _p = (d, f, s = "none", w = 0) => `<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const _l = (x1, y1, x2, y2, s, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
const _ring = (cx, cy, r, s, w) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s}" stroke-width="${w}"/>`;

const JAMO_MNEMO = {
  // ===== Consonnes =====
  "ㄱ": ["[G]âchette", "[G]un", "ㄱ a la forme d'un pistolet vu de côté : le canon en haut, la crosse qui descend. On appuie sur la gâchette : « g ».", "ㄱ is shaped like a gun seen from the side: barrel on top, grip going down. “G” for gun.",
    _r(10, 26, 74, 16, "#78909c", 4) + _r(6, 29, 10, 10, "#455a64", 2) + _r(64, 36, 20, 46, "#8d6e63", 6, 10) + _ring(54, 50, 7, "#546e7a", 4) + _r(20, 22, 6, 6, "#455a64", 1)],
  "ㄴ": ["[N]ez", "[N]ose", "ㄴ dessine un nez de profil : l'arête qui descend, puis le bout du nez vers la droite.", "ㄴ draws a nose in profile: the bridge goes down, then the tip points right.",
    _c(50, 52, 40, "#ffe0b2") + _c(34, 34, 4, "#5d4037") + _c(68, 34, 4, "#5d4037") + _p("M38 76 Q50 84 62 76", "none", "#d84315", 4) + _e(26, 60, 6, 4, "#ffab91") + _e(76, 60, 6, 4, "#ffab91")],
  "ㄷ": ["[D]inosaure", "[D]inosaur", "ㄷ est la mâchoire grande ouverte d'un dinosaure : mâchoire du haut, gorge, mâchoire du bas.", "ㄷ is a dinosaur's wide-open jaw: upper jaw, throat, lower jaw.",
    _p("M16 14 H82 Q94 14 94 26 V36 H38 V64 H94 V76 Q94 88 82 88 H16 Z", "#81c784") + _p("M44 36 L50 44 L56 36 L62 44 L68 36 L74 44 L80 36", "#fff") + _p("M44 64 L50 56 L56 64 L62 56 L68 64 L74 56 L80 64", "#fff") + _c(70, 24, 4, "#1b5e20") + _p("M38 36 Q30 50 38 64", "#e57373")],
  "ㄹ": ["[R]uban", "[R]ibbon", "ㄹ est un ruban plié en zigzag. Il se lit « r » entre deux voyelles et « l » en fin de syllabe.", "ㄹ is a ribbon folded into a zig-zag. Read “r” between vowels and “l” at the end of a syllable.",
    _p("M14 18 H84 V48 H18 V80 H88", "none", "#f48fb1", 14) + _p("M14 18 H84 V48 H18 V80 H88", "none", "#ec407a", 4) + _p("M88 80 L96 72 M88 80 L96 90", "none", "#ec407a", 5)],
  "ㅁ": ["[M]icro-ondes", "[M]icrowave", "ㅁ est carré comme la porte vitrée d'un micro-ondes : « m ».", "ㅁ is square like the glass door of a microwave: “m”.",
    _r(6, 20, 88, 62, "#cfd8dc", 8) + _r(14, 28, 56, 46, "#37474f", 5) + _r(18, 32, 48, 38, "#ffcc80", 3) + _c(81, 36, 4, "#78909c") + _c(81, 50, 4, "#78909c") + _r(75, 62, 12, 6, "#78909c", 2) + _r(14, 82, 12, 6, "#90a4ae", 2) + _r(74, 82, 12, 6, "#90a4ae", 2)],
  "ㅂ": ["[B]assine", "[B]ucket", "ㅂ ressemble à un seau (une bassine) avec ses deux montants : « b ».", "ㅂ looks like a bucket with its two side posts: “b”.",
    _p("M18 22 Q50 -8 82 22", "none", "#546e7a", 4) + _p("M20 28 L80 28 L72 88 L28 88 Z", "#4fc3f7") + _r(16, 24, 68, 9, "#0288d1", 4) + _e(50, 30, 28, 3, "#b3e5fc")],
  "ㅅ": ["[S]ommet", "[S]ummit", "ㅅ est un sommet de montagne : deux pentes qui se rejoignent en haut. « s ».", "ㅅ is a mountain summit: two slopes meeting at the top. “s”.",
    _p("M2 90 L50 14 L98 90 Z", "#8d6e63") + _p("M50 14 L37 35 L44 31 L50 38 L56 31 L63 35 Z", "#fff") + _l(50, 14, 50, 2, "#5d4037", 2) + _p("M50 2 L62 6 L50 10 Z", "#e53935") + _p("M2 90 L24 60 L46 90 Z", "#a1887f")],
  "ㅇ": ["Pi[ng]-pong", "Pi[ng]-pong", "ㅇ est rond comme une raquette de ping-pong. Au début de la syllabe il est muet (아 = « a ») ; à la fin, il fait « ng » (방 = bang).", "ㅇ is round like a ping-pong paddle. At the start of a syllable it's silent (아 = “a”); at the end it says “ng” (방 = bang).",
    _r(60, 64, 12, 32, "#8d6e63", 5, -40) + _c(44, 46, 34, "#e53935") + _c(44, 46, 28, "#ef5350") + _c(86, 16, 9, "#fff8e1", 'stroke="#ffb300" stroke-width="2"')],
  "ㅈ": ["[J]upe", "[J]ean skirt", "ㅈ ressemble à une jupe : la ceinture en haut, puis le tissu qui s'évase. « j ».", "ㅈ looks like a skirt: the waistband on top, then the fabric flaring out. “j”.",
    _r(24, 16, 52, 12, "#5d4037", 4) + _p("M28 28 L72 28 L92 88 L8 88 Z", "#7e57c2") + _l(40, 30, 30, 86, "#5e35b1", 2) + _l(50, 30, 50, 86, "#5e35b1", 2) + _l(60, 30, 70, 86, "#5e35b1", 2) + _r(46, 18, 8, 8, "#ffca28", 2)],
  "ㅊ": ["[Ch]apelle", "[Ch]urch", "ㅊ, c'est ㅈ avec un petit trait en plus, comme le clocher d'une chapelle. « ch », avec un souffle.", "ㅊ is ㅈ with an extra little stroke, like a church steeple. “ch”, with a puff of air.",
    _r(24, 50, 52, 42, "#ffecb3", 2) + _p("M16 54 L50 24 L84 54 Z", "#c62828") + _l(50, 4, 50, 26, "#6d4c41", 4) + _l(42, 11, 58, 11, "#6d4c41", 4) + _p("M43 92 V74 Q50 64 57 74 V92 Z", "#8d6e63") + _c(50, 44, 5, "#90caf9")],
  "ㅋ": ["[C]lé", "[K]ey", "ㅋ, c'est ㄱ avec un trait au milieu, comme les dents d'une clé. « k », avec un souffle.", "ㅋ is ㄱ with a stroke in the middle, like the teeth of a key. “k”, with a puff of air.",
    _ring(24, 50, 15, "#fbc02d", 9) + _r(38, 45, 56, 10, "#fbc02d", 3) + _r(70, 55, 7, 13, "#fbc02d", 1) + _r(83, 55, 7, 19, "#fbc02d", 1) + _c(24, 50, 6, "#fff8e1")],
  "ㅌ": ["[T]iroirs", "[T]wo drawers", "ㅌ ressemble à une commode à deux tiroirs vue de face, ouverte à droite. « t », avec un souffle.", "ㅌ looks like a chest with two drawers, open on the right. “t”, with a puff of air.",
    _r(12, 12, 76, 76, "#a1887f", 5) + _r(18, 18, 64, 30, "#d7ccc8", 3) + _r(18, 52, 64, 30, "#d7ccc8", 3) + _r(42, 30, 16, 5, "#5d4037", 2) + _r(42, 64, 16, 5, "#5d4037", 2) + _r(16, 88, 8, 8, "#6d4c41") + _r(76, 88, 8, 8, "#6d4c41")],
  "ㅍ": ["[P]ont", "[P]ier", "ㅍ est un pont : le tablier en haut, deux piliers, et l'eau en bas. « p », avec un souffle.", "ㅍ is a pier: the deck on top, two pillars, and the water below. “p”, with a puff of air.",
    _r(0, 76, 100, 24, "#81d4fa") + _p("M0 84 Q12 80 25 84 T50 84 T75 84 T100 84", "none", "#fff", 2) + _r(4, 22, 92, 12, "#8d6e63", 3) + _r(26, 34, 11, 46, "#a1887f") + _r(63, 34, 11, 46, "#a1887f") + _l(8, 22, 8, 10, "#6d4c41", 3) + _l(92, 22, 92, 10, "#6d4c41", 3) + _l(8, 12, 92, 12, "#6d4c41", 2)],
  "ㅎ": ["[H]omme au chapeau", "[H]at", "ㅎ est un petit homme avec un chapeau : le chapeau, le bord du chapeau, puis sa tête ronde. « h ».", "ㅎ is a little man with a hat: the hat, its brim, then his round head. “h”.",
    _r(36, 4, 28, 18, "#37474f", 3) + _r(20, 22, 60, 8, "#37474f", 4) + _r(36, 16, 28, 5, "#c62828") + _c(50, 64, 28, "#ffe0b2") + _c(40, 58, 3.5, "#5d4037") + _c(60, 58, 3.5, "#5d4037") + _p("M40 74 Q50 82 60 74", "none", "#d84315", 3.5)],
  // ===== Voyelles =====
  "ㅏ": ["[À] droite", "[A]rrow →", "ㅏ : un poteau avec une branche vers la droite, comme un panneau « à droite ! » → « a ».", "ㅏ: a post with a branch pointing right, like an arrow sign → “a”.",
    _r(45, 8, 9, 86, "#8d6e63", 3) + _p("M54 38 H80 L94 50 L80 62 H54 Z", "#43a047") + _e(50, 94, 34, 5, "#a5d6a7")],
  "ㅓ": ["[O] de « p[o]rte » ←", "[Uh]… back ←", "ㅓ : la branche part vers la gauche, comme un panneau qui renvoie en arrière. Le son « eo » est un « o » très ouvert, comme dans « porte ».", "ㅓ: the branch points left, like a sign sending you back. “eo” sounds like the “u” in “but” / “aw”.",
    _r(46, 8, 9, 86, "#8d6e63", 3) + _p("M46 38 H20 L6 50 L20 62 H46 Z", "#fb8c00") + _e(50, 94, 34, 5, "#ffe0b2")],
  "ㅗ": ["[O]h, le soleil !", "[O]h, sunrise!", "ㅗ : le petit trait monte au-dessus de la ligne, comme le soleil qui se lève sur l'horizon. « Oh ! » → « o ».", "ㅗ: the little stroke rises above the line, like the sun coming up over the horizon. “Oh!” → “o”.",
    _r(0, 0, 100, 66, "#fff3e0") + _c(50, 50, 24, "#ffb300") + _l(50, 12, 50, 2, "#ffb300", 4) + _l(22, 24, 15, 17, "#ffb300", 4) + _l(78, 24, 85, 17, "#ffb300", 4) + _r(0, 64, 100, 36, "#4db6ac")],
  "ㅜ": ["[Ou]vre le parapluie", "[U]mbrella (“oo”)", "ㅜ : le trait plat est la toile d'un parapluie, le trait qui descend est le manche. « ou ».", "ㅜ: the flat line is the umbrella's canopy, the stroke going down is the handle. Say “oo”.",
    _p("M6 44 Q50 -4 94 44 Z", "#e53935") + _p("M6 44 Q17 36 28 44 Q39 36 50 44 Q61 36 72 44 Q83 36 94 44", "#c62828") + _p("M50 44 V82 Q50 92 40 88", "none", "#5d4037", 5) + _e(20, 70, 2.5, 4, "#4fc3f7") + _e(80, 64, 2.5, 4, "#4fc3f7") + _e(74, 86, 2.5, 4, "#4fc3f7")],
  "ㅡ": ["Mer bl[eu]e", "[Ugh], flat!", "ㅡ : une seule ligne plate, comme l'horizon sur une mer bleue toute calme. « eu », comme dans « bleu ».", "ㅡ: one flat line, like the horizon on a calm sea. “eu”, like the “u” in “put”.",
    _r(0, 0, 100, 52, "#e1f5fe") + _c(78, 22, 10, "#ffca28") + _r(0, 50, 100, 50, "#29b6f6") + _p("M10 70 Q20 66 30 70 M58 80 Q68 76 78 80", "none", "#e1f5fe", 2.5)],
  "ㅣ": ["[I]f (l'arbre)", "Tr[ee]", "ㅣ : un seul trait debout, droit comme un if, un arbre tout fin. « i ».", "ㅣ: a single stroke standing up, straight like a tall thin tree. “i” (“ee”).",
    _e(50, 94, 30, 5, "#a5d6a7") + _r(46, 70, 8, 24, "#6d4c41", 2) + _e(50, 42, 15, 38, "#2e7d32") + _e(46, 40, 6, 26, "#43a047")],
};

// une couleur de panneau par groupe de lettres (même ordre que JAMO_ROWS)
const MNEMO_ROW_COLORS = ["#b54848", "#c96a2b", "#b38a12", "#4f8f3a", "#6b7280", "#2f8a83", "#3b6fb0", "#5b4f9a", "#8a4d9e", "#b04a7a", "#4b5563"];
