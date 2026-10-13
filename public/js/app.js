// OASIS — logique du portail (socle Phase 1)
// Logo de l'application (/img/oasis-logo.svg appliqué en masque : il prend la
// couleur du contexte, donc reste lisible sur les 5 thèmes).
// `OASIS_LOGO_IMG` vient de `/app/etat.js`, chargé avant ce fichier. C'était le
// dernier nom lexical qui empêchait `app-demarrage.js` d'être converti : il la
// lit pour poser la marque dans la barre. Ne pas la redéclarer.

// Nom complet : les majuscules formant le sigle OASIS sont légèrement agrandies.

// ── Téléphone : indicatif pays + numéro ──
// Indicatifs UEMOA en tête, puis principaux partenaires.
const PHONE_CODES = [
  { c: '+229', l: 'Bénin' }, { c: '+226', l: 'Burkina Faso' }, { c: '+225', l: "Côte d'Ivoire" },
  { c: '+245', l: 'Guinée-Bissau' }, { c: '+223', l: 'Mali' }, { c: '+227', l: 'Niger' },
  { c: '+221', l: 'Sénégal' }, { c: '+228', l: 'Togo' },
  { c: '+233', l: 'Ghana' }, { c: '+234', l: 'Nigéria' }, { c: '+237', l: 'Cameroun' },
  { c: '+235', l: 'Tchad' }, { c: '+241', l: 'Gabon' }, { c: '+242', l: 'Congo' },
  { c: '+243', l: 'RD Congo' }, { c: '+212', l: 'Maroc' }, { c: '+216', l: 'Tunisie' },
  { c: '+213', l: 'Algérie' }, { c: '+33', l: 'France' }, { c: '+32', l: 'Belgique' },
  { c: '+41', l: 'Suisse' }, { c: '+1', l: 'États-Unis / Canada' }, { c: '+44', l: 'Royaume-Uni' },
  { c: '+351', l: 'Portugal' }, { c: '+34', l: 'Espagne' },
];
const DEFAULT_PHONE_CODE = '+229';

// « +229 97 00 00 00 » → { code: '+229', number: '97 00 00 00' }
function splitPhone(value) {
  const v = String(value || '').trim();
  if (!v) return { code: DEFAULT_PHONE_CODE, number: '' };
  const match = PHONE_CODES
    .filter((p) => v.startsWith(p.c))
    .sort((a, b) => b.c.length - a.c.length)[0];
  if (match) return { code: match.c, number: v.slice(match.c.length).trim() };
  return { code: v.startsWith('+') ? '' : DEFAULT_PHONE_CODE, number: v };
}

function phoneFieldHtml(id, value, label) {
  const { code, number } = splitPhone(value);
  const opts = PHONE_CODES.map((p) =>
    `<option value="${p.c}" ${p.c === code ? 'selected' : ''}>${p.c} · ${esc(p.l)}</option>`).join('');
  return `<div class="shell-form-group">
    <label>${esc(label || 'Téléphone')}</label>
    <div class="phone-field">
      <select class="shell-input phone-code" id="${id}Code">${opts}</select>
      <input class="shell-input phone-number" id="${id}" type="tel" inputmode="tel"
             placeholder="97 00 00 00" value="${esc(number)}">
    </div>
  </div>`;
}

// Valeur à enregistrer : « indicatif numéro » (vide si aucun numéro saisi)
function phoneFieldValue(id) {
  const num = (document.getElementById(id).value || '').trim();
  if (!num) return '';
  const codeEl = document.getElementById(id + 'Code');
  const code = codeEl ? codeEl.value : '';
  return (code ? code + ' ' : '') + num;
}

// Cale la base de l'aéroport sur celle de la tour de contrôle (sous-titre).

// `PRIO_COLORS` est parti dans `frontend/portail/icones.ts` (5.d.5) : l'écran
// « Modules » de la configuration le lit aussi, et un `const` du premier niveau
// est une globale **lexicale** qu'aucun module ne peut atteindre. Le sas des
// icônes le pose sur `window`, **avant** ce fichier, et la carte du portail
// ci-dessous le lit donc en propriété. **Ne pas le redéclarer ici** : un `const`
// masquerait la propriété et deux palettes coexisteraient sans une erreur.
//
// C'est un prêt dans l'autre sens — le premier de 5.d : jusqu'ici les modules
// empruntaient à `app.js`. `scripts/comparer-parametres.js` confronte les cinq
// teintes à celles de ce fichier, lues dans `git`, parce que les deux côtés de
// la comparaison lisent désormais la même palette construite.
// `LEVEL_COLORS` est parti dans `frontend/portail/organigramme.ts` (5.d.3) : ce
// fichier ne l'utilisait pas — seul `app-config.js` le lit —, et un `const` du
// premier niveau est une globale **lexicale** qu'aucun module ne peut atteindre.
// Le sas le pose sur `window`. **Ne pas le redéclarer ici.**

// ── Les libellés français littéraux : partis dans un module typé (5.e.0) ──
//
// `CFG_I18N` et `tr` vivent désormais dans `frontend/portail/libelles.ts`, et le
// sas les pose sur `window` — `tr` seulement : la table était un `const` du
// premier niveau, donc absente de `window`, et personne ne la lit.
//
// C'était le nom le plus **emprunté** du portail : quatre modules convertis en
// 5.d lisaient `window.tr`. Ils l'importent maintenant de sa source, et leurs
// déclarations sont parties avec leurs lectures.
//
// Le compilateur y a trouvé une clé en double — `'Domaines'`, une fois en titre
// de section et une fois en colonne, avec la **même** valeur. Un littéral d'objet
// garde la dernière ; le doublon est retiré, et le comparateur le prouve en
// relevant les clés de la table d'origine, où il est déjà effondré.
//
// Éprouvé par `scripts/comparer-barre.js` : les **65 libellés** dans les trois
// langues plus une quatrième absente, et les clés qui n'en sont pas.

// ── L'état partagé vient de `/app/etat.js`, chargé avant ce fichier ──
//
// Ces six noms étaient déclarés ici en `let`, au premier niveau : des globales
// **lexicales**, invisibles à un module. Tant qu'elles l'étaient, aucun fichier
// du portail ne pouvait être converti seul — `portail-instances.js` lit `ME` et
// `CFG_SUB`, `app-demarrage.js` écrit `ME` et `CURRENT_VIEW`.
//
// Ils sont désormais posés sur `window` par `frontend/portail/globales/etat.ts`.
// Les lectures et les affectations de ce fichier n'ont pas changé d'un
// caractère : un nom non déclaré atteint la propriété de `window`. **Ne pas les
// redéclarer** — un `let ME` masquerait la propriété, et un module lirait un
// état figé sans que rien ne le dise. Un garde-fou de forme le refuse.

async function api(path, options) {
  // En-tête d'origine applicative : un formulaire d'un autre site ne peut pas
  // l'ajouter, le serveur refuse donc les écritures qui en sont dépourvues.
  const o = { ...(options || {}) };
  o.headers = { ...(o.headers || {}), 'X-OASIS-Request': '1' };
  const res = await fetch(path, o);
  if (res.status === 401) {
    oasisSessionPerdue();
    throw new Error('unauthenticated');
  }
  return res;
}

// Les règles de mot de passe non tenues arrivent du serveur en codes : la phrase
// se compose ici, dans la langue de l'écran. Une chaîne reçue telle quelle —
// d'un serveur antérieur à ce changement — s'affiche sans être traduite plutôt
// que de disparaître.
function reglesMotDePasse(details) {
  return (details || [])
    .map((d) => (typeof d === 'string' ? d : t('mdp_regle_' + d.regle, d.n)))
    .join(', ');
}

// Valeur passée en argument d'un gestionnaire inline. `esc` seul ne suffit
// pas : il laisse passer le guillemet une fois l'entité redécodée, et une
// valeur importée d'un classeur peut refermer l'attribut pour en ouvrir un
// autre. On sérialise en littéral JavaScript, puis on échappe pour l'attribut.
function escArg(v) {
  return esc(JSON.stringify(String(v ?? '')));
}

// L'échappement vient du socle (oasis-commun.js), comme dans chaque module.
function esc(s) { return oasisEsc(s); }

// ── Recherche des écrans du portail ──
// ── La barre d'écran : partie dans un module typé (5.e.0) ──
//
// La recherche, l'export PDF et Excel, l'import de classeur et le filtre client
// vivent désormais dans `frontend/portail/barre.ts` ; le sas pose les douze noms
// que les attributs `onclick` du balisage appellent.
//
// `PORTAIL_RECHERCHE` part avec eux, et **ne doit pas être redéclaré ici** :
// c'était un `const` du premier niveau, donc une globale lexicale qu'aucun module
// ne peut atteindre, et personne d'autre ne le lisait — il est devenu privé au
// module, comme `AAC_CFG` en 5.d.5.
//
// `searchInputHtml` et `exportBar` étaient les deux autres prêts des modules de
// 5.d ; ils les importent maintenant de leur source, et les quatre comparateurs
// qui les fabriquaient chargent le module construit — un vrai balisage des deux
// côtés, au lieu d'un marqueur d'un seul.
//
// Une divergence assumée : `window.open` peut rendre `null` quand le navigateur
// bloque les fenêtres, et l'original écrivait dedans sans le vérifier
// (`TypeError`, console, rien à l'écran). Le module **lève**, en nommant la cause.
//
// Éprouvé par `scripts/comparer-barre.js` : les deux **documents PDF entiers**,
// le corps de l'import, le balisage de la fenêtre d'import, et le champ de
// recherche dans ses quatre états — atteints par les gestes des deux côtés.


// Retour d'action : le panneau du socle, commun au portail et aux modules.
// Si la feuille commune n'est pas chargée, le message part en console plutôt
// que d'interrompre le geste qui l'a produit.
function showToast(message, type = 'success', duration = 4000) {
  if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
  return window.oasisToast(message, type, duration);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(CURRENT_LANG) + ' ' + d.toLocaleTimeString(CURRENT_LANG, { hour: '2-digit', minute: '2-digit' });
}

async function loadRefs() {
  const res = await api('/api/referentiels');
  REFS = await res.json();
}

// ── L'accueil : parti dans un module typé (5.e.3) ──
//
// `renderHome`, `setModulesView`, `COULEURS_MODULE`, `THEMES_ORDER`,
// `MODULES_VIEW` et `OASIS_FULLNAME_HTML` vivent désormais dans
// `frontend/portail/accueil.ts` ; le sas ne pose que **deux** noms — la bascule de
// présentation et la vue. Les quatre autres étaient des globales **lexicales** que
// personne ne lisait hors de cet écran : les publier aurait *ajouté* à la surface.
//
// `PRIO_COLORS` est désormais **importé** par son unique lecteur restant : ce
// fichier ne le lit plus. Le sas des icônes continue pourtant de le publier, et
// ce n'est plus pour la cohabitation — c'est pour les comparateurs, qui font
// tourner les versions d'origine, lesquelles le cherchent dans la portée globale.
// Le prêt ouvert en 5.d.5 n'est donc pas refermé : il a changé de raison, et sa
// raison a une échéance (voir la décision inscrite à l'ADR).
//
// ── Une requête pour rien, et elle est fixée ──
//
// `renderHome` demandait `/api/stats`, en lisait la réponse, et **ne s'en servait
// pas** : la route parcourt tous les comptes du serveur à chaque ouverture du
// portail. La conversion ne la retire pas — ce serait changer ce que la page
// fait — et la comparaison des routes lues la **fixe** : retirer l'appel rend 15
// écarts. Même méthode que l'adresse centrale vidée (5.c.13).
//
// Mesure de ce que cette requête est morte : retirer la **lecture** de sa réponse
// ne rend, lui, aucun écart. Seul l'appel compte, et c'est tout ce qu'il y a à
// garder d'elle.
//
// ── Et la moitié de `card` que la suite du navigateur n'atteint pas ──
//
// Un module fermé au compte s'affiche éteint. Le jeu d'essai de « parcours »
// n'ouvre qu'un super-administrateur : cette branche n'était éprouvée **nulle
// part**. `scripts/comparer-accueil.js` la fabrique en cinq régimes — liste
// partielle, vide, absente, code inconnu, valeur qui n'est pas un tableau — et une
// garde exige que le balisage comparé porte les deux sortes de cartes.
//
// Éprouvé par ce même script : 87 comparaisons, dont les cinq issues du clic
// d'une carte et les deux états de la chaîne d'audit.
//
// Les six onglets, les cinq fenêtres et les quatre gestes qui écrivent vivent
// désormais dans `frontend/portail/utilisateurs.ts` ; le sas pose les douze noms
// que le balisage et `app-demarrage` appellent.
//
// `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` partent avec eux et **ne doivent
// pas être redéclarés ici** : c'étaient des `let` du premier niveau, donc des
// globales lexicales, et personne d'autre ne les lisait — ils sont devenus privés
// au module. Troisième fois après `AAC_CFG` (5.d.5) et `PORTAIL_RECHERCHE` (5.e.0).
//
// Ce que la conversion **ne corrige pas**, et qui est nommé là-bas :
// `submitEditUser` envoie tous les champs de la fenêtre, vides compris, et le
// serveur les écrit. C'est *le champ effacé parce qu'il est parti vide*, que la
// suite « parcours » nomme depuis 5.c. Le typage le rend visible — les champs
// facultatifs passent par `valeurFacultative`, qui dit en son nom que l'absence
// et le vide s'y confondent — mais le comportement est intact.
//
// Quatre noms restent empruntés à ce fichier : `fmtDate`, `reglesMotDePasse`,
// `phoneFieldHtml` et `phoneFieldValue`. Les deux derniers sont le bloc du
// téléphone, prévu pour 5.e.4.
//
// Éprouvé par `scripts/comparer-utilisateurs.js` : 100 comparaisons — les six
// onglets aux deux privilèges, **les écouteurs posés après le rendu** (six
// familles, et un bouton muet ne se voit dans aucun balisage), les quatre
// fenêtres avec le focus qu'elles posent, et les quatre corps de requête dont
// celui de l'effacement.

// ── L'écran du profil : parti dans un module typé (5.e.2) ──
//
// La photo, les quatre informations, les deux sections facultatives et le
// changement de mot de passe vivent désormais dans `frontend/portail/profil.ts` ;
// le sas pose les sept noms que le balisage et `app-demarrage` appellent.
//
// `ROLE_LABELS` part avec eux — c'était un `const` du premier niveau, donc absent
// de `window`, et seul cet écran le lisait. `saveProfile` devient **privée** :
// c'est le seul nom que ce bloc retire de la surface, ses cinq appelants étant
// partis avec elle.
//
// Ce bloc ne portait **aucun état** : tout vient de `ME`, que `loadMe()` rafraîchit
// après chaque enregistrement. Première pièce de 5.e dans ce cas.
//
// Deux divergences assumées, nommées là-bas : `ME.instance` absent fait lever au
// lieu de rendre `undefined`, et le `onload` du lecteur de fichier ne **rend**
// plus la promesse de l'enregistrement — le type ne le permet pas, et rien ne lit
// cette valeur, mais la preuve en dépendait.
//
// Huit champs de `ME.user` ont été ajoutés au type de l'état partagé : la route
// les rendait déjà, aucun module converti ne les avait encore lus.
//
// Éprouvé par `scripts/comparer-profil.js` : 60 comparaisons — les huit rôles,
// avec et sans photo, un nom hostile, un compte inactif, les deux sections dans
// leurs deux branches, les quatre corps de requête, et les quatre issues du
// changement de mot de passe dont les trois champs que le succès doit vider.
// Le retrait de la photo passe par la confirmation du socle, qui bâtit un
// dialogue : la suite « parcours » le couvre (5.c.14).

// ── Le journal d'audit : parti dans un module typé (5.e.3) ──
//
// `renderAudit` vit désormais dans `frontend/portail/audit.ts` ; le sas pose son
// seul nom — la vue. Cet écran n'a ni geste nommé (son bouton est branché par un
// écouteur), ni état, et il **n'écrit rien** : un journal chaîné qu'un écran
// pourrait modifier ne serait pas un journal.