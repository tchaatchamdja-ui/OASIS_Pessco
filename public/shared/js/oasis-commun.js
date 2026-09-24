/**
 * OASIS — les petits outils que chaque module réécrivait.
 *
 * Six modules, six façons d'échapper un texte ; deux clients HTTP identiques au
 * caractère près ; cinq copies de la même bascule de thème ; un anti-rebond de
 * recherche que le socle possédait déjà mais que trois modules ne chargeaient
 * pas. Chaque copie divergeait un peu : une échappait les guillemets, l'autre
 * non ; l'une traitait un zéro comme un vide ; l'un des clients imposait un
 * type JSON jusque sur les dépôts de fichiers, qui partaient ainsi sans leur
 * frontière multipart. Ils vivent ici, une fois, et chaque module s'y branche
 * sous le nom qu'il employait — rien n'est à renommer dans ses gabarits.
 *
 * À charger après oasis-requete.js (qui fournit oasisSessionPerdue), avant les
 * scripts du module.
 */
(function () {
  // ── Échappement ──
  // Un seul barème, le plus sûr : les cinq caractères, dans le texte comme dans
  // un attribut. Échapper un guillemet dans du texte ne change rien à
  // l'affichage ; ne pas l'échapper dans un attribut le refermait. Seuls
  // `null` et `undefined` donnent un vide : un zéro est une valeur, il s'affiche.
  const ENTITES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function oasisEsc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, (c) => ENTITES[c]);
  }

  // ── Erreurs du serveur ──
// Le serveur refuse par un code — « privilege_insuffisant », « not_found ».
// Le client le passait tel quel au retour d'action : l'utilisateur lisait
// « privilege_insuffisant ». Chaque code connu a ici sa phrase, dans les trois
// langues. Un message déjà rédigé par le serveur passe devant, et un code
// inconnu se dit au moins en clair, avec son code entre parenthèses.
const ERREURS = {
  not_found: ['Élément introuvable.', 'Item not found.', 'Elemento não encontrado.'],
  invalid: ['Données invalides.', 'Invalid data.', 'Dados inválidos.'],
  invalid_action: ['Action inconnue.', 'Unknown action.', 'Ação desconhecida.'],
  corps_invalide: ['La saisie n’est pas valide.', 'The input is not valid.', 'A introdução não é válida.'],
  parse_error: ['Fichier illisible.', 'File could not be read.', 'Ficheiro ilegível.'],
  forbidden: ['Action non autorisée pour votre compte.', 'Action not allowed for your account.', 'Ação não autorizada para a sua conta.'],
  forbidden_target: ['Action non autorisée sur cet élément.', 'Action not allowed on this item.', 'Ação não autorizada neste elemento.'],
  privilege_insuffisant: ['Privilège insuffisant pour cette action.', 'Insufficient privilege for this action.', 'Privilégio insuficiente para esta ação.'],
  unauthenticated: ['Session expirée. Reconnectez-vous.', 'Session expired. Sign in again.', 'Sessão expirada. Volte a ligar-se.'],
  no_module_access: ['Ce module ne vous est pas ouvert. Veuillez contacter l’administrateur.', 'This module is not open to you. Please contact the administrator.', 'Este módulo não lhe está aberto. Contacte o administrador.'],
  reserve_autorite: ['Action réservée à l’Autorité.', 'Action reserved for the Authority.', 'Ação reservada à Autoridade.'],
  role_hors_perimetre: ['Ce rôle sort de votre périmètre.', 'This role is outside your scope.', 'Este papel está fora do seu âmbito.'],
  portee_nationale: ['Action réservée à la portée nationale.', 'Action reserved for the national scope.', 'Ação reservada ao âmbito nacional.'],
  self: ['Action impossible sur votre propre compte.', 'Action not possible on your own account.', 'Ação impossível na sua própria conta.'],
  exists: ['Cet élément existe déjà.', 'This item already exists.', 'Este elemento já existe.'],
  duplicate_code: ['Ce code est déjà utilisé.', 'This code is already in use.', 'Este código já está a ser usado.'],
  instance_existe: ['Cette instance existe déjà.', 'This instance already exists.', 'Esta instância já existe.'],
  instance_inconnue: ['Instance inconnue.', 'Unknown instance.', 'Instância desconhecida.'],
  instance_locale: ['Action impossible sur l’instance locale.', 'Action not possible on the local instance.', 'Ação impossível na instância local.'],
  instance_desactivee: ['Cette instance est désactivée.', 'This instance is disabled.', 'Esta instância está desativada.'],
  instance_non_vide: ['Cette instance porte encore des données.', 'This instance still holds data.', 'Esta instância ainda tem dados.'],
  unknown_collection: ['Collection inconnue.', 'Unknown collection.', 'Coleção desconhecida.'],
  unknown_module: ['Module inconnu.', 'Unknown module.', 'Módulo desconhecido.'],
  unknown_privilege: ['Privilège inconnu.', 'Unknown privilege.', 'Privilégio desconhecido.'],
  unknown_user: ['Utilisateur inconnu.', 'Unknown user.', 'Utilizador desconhecido.'],
  nom_requis: ['Le nom est obligatoire.', 'The name is required.', 'O nome é obrigatório.'],
  nom_invalide: ['Ce nom n’est pas valide.', 'This name is not valid.', 'Este nome não é válido.'],
  invalid_email: ['Cette adresse électronique n’est pas valide.', 'This email address is not valid.', 'Este endereço de email não é válido.'],
  code_required: ['Le code est obligatoire.', 'The code is required.', 'O código é obrigatório.'],
  admin_password: ['Mot de passe administrateur requis.', 'Administrator password required.', 'Palavra-passe de administrador necessária.'],
  wrong_old: ['Mot de passe actuel incorrect.', 'Current password incorrect.', 'Palavra-passe atual incorreta.'],
  reused: ['Réutilisation d’un ancien mot de passe interdite.', 'Reusing a former password is not allowed.', 'A reutilização de uma palavra-passe anterior não é permitida.'],
  policy: ['Le mot de passe ne respecte pas la politique de sécurité.', 'The password does not meet the security policy.', 'A palavra-passe não cumpre a política de segurança.'],
  temp_expired: ['Mot de passe temporaire expiré.', 'Temporary password expired.', 'Palavra-passe temporária expirada.'],
  locked: ['Compte verrouillé.', 'Account locked.', 'Conta bloqueada.'],
  too_many_attempts: ['Trop de tentatives. Reprenez plus tard.', 'Too many attempts. Try again later.', 'Demasiadas tentativas. Tente mais tarde.'],
  mfa_expired: ['Code expiré. Demandez un nouveau code.', 'Code expired. Request a new code.', 'Código expirado. Peça um novo código.'],
  mfa_invalid_code: ['Code incorrect.', 'Incorrect code.', 'Código incorreto.'],
  mfa_too_many_attempts: ['Trop de tentatives. Recommencez la connexion.', 'Too many attempts. Start the sign-in again.', 'Demasiadas tentativas. Recomece a ligação.'],
  no_mfa_channel: ['Aucun moyen d’envoi du code n’est enregistré.', 'No channel is recorded for sending the code.', 'Nenhum meio de envio do código está registado.'],
  no_file: ['Aucun fichier reçu.', 'No file received.', 'Nenhum ficheiro recebido.'],
  fichier_trop_volumineux: ['Fichier trop volumineux.', 'File too large.', 'Ficheiro demasiado grande.'],
  too_large: ['Fichier trop volumineux.', 'File too large.', 'Ficheiro demasiado grande.'],
  activite_declenchee: ['Activité déjà déclenchée : elle n’est plus amendable.', 'Activity already triggered: it can no longer be amended.', 'Atividade já desencadeada: já não pode ser emendada.'],
  suites_care: ['Une constatation concernée a déjà reçu une suite dans « Mesures d’Application » (mesure, classement ou traitement) : la suppression est refusée.', 'A finding concerned has already been followed up in “Enforcement Measures” (measure, closure or processing): deletion is refused.', 'Uma constatação envolvida já teve seguimento em « Medidas de Aplicação » (medida, arquivamento ou tratamento): a eliminação é recusada.'],
  plan_amende: ['Ce plan a été amendé : le supprimer couperait la lignée de ses versions. Seule la dernière version d’un plan se supprime.', 'This plan has been amended: deleting it would break the line of its versions. Only the latest version of a plan can be deleted.', 'Este plano foi emendado: eliminá-lo cortaria a linhagem das suas versões. Só a última versão de um plano pode ser eliminada.'],
  evaluation_reevaluee: ['Une réévaluation de ce profil est en cours ou validée : supprimez-la d’abord.', 'A re-assessment of this profile exists: delete it first.', 'Existe uma reavaliação deste perfil: elimine-a primeiro.'],
  amendement_en_cours: ['Un amendement de ce plan est déjà en cours.', 'An amendment of this plan is already under way.', 'Já está em curso uma emenda deste plano.'],
  plan_non_amendable: ['Ce plan n’est pas amendable.', 'This plan cannot be amended.', 'Este plano não pode ser emendado.'],
  plan_non_archive: ['Ce plan n’est pas archivé.', 'This plan is not archived.', 'Este plano não está arquivado.'],
  pas_un_amendement: ['Cette version n’est pas un amendement.', 'This version is not an amendment.', 'Esta versão não é uma emenda.'],
  version_remplacee: ['Cette version a été remplacée.', 'This version has been superseded.', 'Esta versão foi substituída.'],
  evaluation_verrouillee: ['Évaluation verrouillée.', 'Assessment locked.', 'Avaliação bloqueada.'],
  reevaluation_deja_lancee: ['Une réévaluation est déjà en cours.', 'A re-assessment is already under way.', 'Uma reavaliação já está em curso.'],
  decision_inconnue: ['Décision inconnue.', 'Unknown decision.', 'Decisão desconhecida.'],
  origine_non_reconnue: ['Origine non reconnue.', 'Unrecognised origin.', 'Origem não reconhecida.'],
};
const ECHEC = ['L’opération a échoué', 'The operation failed', 'A operação falhou'];

function oasisLangue() {
  try { return (window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr').slice(0, 2); } catch (e) { return 'fr'; }
}

// L'attribut `lang` de la page commande la prononciation d'un lecteur d'écran.
// Les six modules le laissaient à « fr », figé dans leur gabarit : un écran
// anglais ou portugais s'annonçait alors en français, du premier mot au
// dernier. Le portail, lui, le mettait à jour — la règle vaut pour tous.
function oasisPoserLangue(langue) {
  const l = langue || oasisLangue();
  try { document.documentElement.lang = l; } catch (e) { /* hors document */ }
  return l;
}

// `defaut` — la phrase que l'appelant tient du geste en cours (« Téléversement
// refusé ») : elle sert quand le code est inconnu du dictionnaire, ou absent.
// Une phrase française du serveur, dans la langue de l'agent quand la table
// oasis-messages-serveur.js la connaît. Une phrase à trous s'y reconnaît par
// son gabarit ; les valeurs lues à la place des trous passent dans la
// traduction. Une phrase inconnue se rend telle quelle.
let gabaritsServeur = null;
const TROU = /\{(\d)\}/g;
const echapperMotif = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);

function compilerGabarits(table) {
  return Object.keys(table).filter((fr) => /\{\d\}/.test(fr)).map((fr) => {
    const ordre = [];
    const motif = fr.split(/(\{\d\})/).map((bout) => {
      const trou = /^\{(\d)\}$/.exec(bout);
      if (!trou) return echapperMotif(bout);
      ordre.push(Number(trou[1]));
      return '([\\s\\S]*?)';
    }).join('');
    return { re: new RegExp(`^${motif}$`), ordre, trad: table[fr] };
  });
}

function traduirePhraseServeur(texte, rang) {
  const table = typeof window !== 'undefined' ? window.OASIS_MESSAGES_SERVEUR : null;
  if (!rang || !table) return texte;
  const exacte = table[texte];
  if (exacte) return exacte[rang - 1] || texte;
  if (!gabaritsServeur) gabaritsServeur = compilerGabarits(table);
  for (const g of gabaritsServeur) {
    const m = g.re.exec(texte);
    if (!m) continue;
    const cible = g.trad[rang - 1];
    if (!cible) return texte;
    const valeurs = {};
    g.ordre.forEach((n, i) => { valeurs[n] = m[i + 1]; });
    return cible.replace(TROU, (_, n) => (valeurs[n] === undefined ? '' : valeurs[n]));
  }
  return texte;
}

// Erreur normalisée (src/erreurs.js) : un code et l'objet concerné. La phrase
// se compose ici, dans la langue de l'agent, accordée au genre du nom.
const RESERVEE = ['Action réservée', 'Action restricted', 'Ação reservada'];
const TROP_VOLUMINEUX = [
  'Fichier trop volumineux ({0} Mo maximum)',
  'File too large ({0} MB maximum)',
  'Ficheiro demasiado grande (máximo {0} MB)',
];

function composerErreurNormalisee(d, rang) {
  const fenetre = typeof window !== 'undefined' ? window : {};
  if (d.error === 'reserve') {
    const role = (fenetre.OASIS_ROLES_SERVEUR || {})[d.role];
    if (!role) return ERREURS.forbidden[rang] || ERREURS.forbidden[0];
    return `${RESERVEE[rang]} ${role[rang] || role[0]}.`;
  }
  if (d.error === 'fichier_trop_volumineux' && Number(d.maxMo) > 0) {
    const mo = Number(d.maxMo).toLocaleString(['fr-FR', 'en-GB', 'pt-PT'][rang] || 'fr-FR', { maximumFractionDigits: 1 });
    return TROP_VOLUMINEUX[rang].replace('{0}', mo);
  }
  const gabarits = (fenetre.OASIS_GABARITS_SERVEUR || {})[d.error];
  if (!gabarits) return '';
  const objet = (fenetre.OASIS_OBJETS_SERVEUR || {})[d.objet] || (fenetre.OASIS_OBJETS_SERVEUR || {}).element;
  if (!objet) return '';
  const [nom, genre] = objet[rang] || objet[0];
  const gabarit = gabarits[rang] || gabarits[0];
  const phrase = gabarit[genre === 'f' ? 'f' : 'm'] || gabarit.m;
  // En tête de phrase, le nom garde sa majuscule ; au milieu, il la perd —
  // sauf un sigle, qui s'écrit en capitales où qu'il soit (PAC, FNC).
  const sigle = nom.slice(1) !== nom.slice(1).toLowerCase();
  const place = phrase.startsWith('{objet}') || sigle ? nom : nom.charAt(0).toLowerCase() + nom.slice(1);
  // L'état s'accorde au genre du nom dans sa langue ; plusieurs états
  // attendus se joignent par « ou ».
  const table = fenetre.OASIS_ETATS_SERVEUR || {};
  const etats = (d.etats || []).map((cle) => {
    const e = table[cle];
    if (!e) return cle;
    const formes = e[rang] || e[0];
    return formes[genre === 'f' ? 1 : 0] || formes[0];
  });
  if (phrase.includes('{etat}') && !etats.length) return '';
  const ou = (fenetre.OASIS_OU_SERVEUR || ['ou'])[rang] || 'ou';
  const precision = d.precision ? ` (${d.precision})` : '';
  const suite = d.desactivable ? (gabarit[genre === 'f' ? 'desactivableF' : 'desactivableM'] || '') : '';
  return phrase
    .replace('{objet}', place)
    .replace('{etat}', etats.join(` ${ou} `))
    .replace('{n}', Number(d.n) || 0) + suite + precision;
}

// Le même message, quand c'est l'écran qui constate le champ vide avant
// d'écrire au serveur : « Intitulé requis », « Title required ».
function oasisChampRequis(champ) {
  const rang = { fr: 0, en: 1, pt: 2 }[oasisLangue()] || 0;
  return composerErreurNormalisee({ error: 'requis', objet: champ }, rang);
}

function oasisMessageErreur(donnees, statut, defaut) {
  const d = donnees || {};
  const rang = { fr: 0, en: 1, pt: 2 }[oasisLangue()] || 0;
  const normalisee = composerErreurNormalisee(d, rang);
  if (normalisee) return normalisee;
  // Une phrase déjà écrite par le serveur dit mieux le cas particulier.
  if (d.message) return traduirePhraseServeur(String(d.message), rang);
  const connue = ERREURS[d.error];
  if (connue) return connue[rang] || connue[0];
  // Toutes les routes ne répondent pas par un code : beaucoup renvoient une
  // phrase toute faite — « Infraction non trouvée ». Un code s'écrit en
  // minuscules et tirets bas ; tout le reste est déjà une phrase, et se lit
  // telle quelle. L'envelopper dans « L'opération a échoué (…) » ne faisait
  // qu'ajouter du bruit devant un message qui se suffisait.
  const brut = d.error === undefined || d.error === null ? '' : String(d.error);
  if (brut && !/^[a-z][a-z0-9_]*$/.test(brut)) return traduirePhraseServeur(brut, rang);
  // Le point final se pose à la fin, une fois le code joint : « L'opération a
  // échoué (not_found). », jamais « … échoué. (not_found) ».
  const general = String(defaut || ECHEC[rang] || ECHEC[0]).replace(/\s*\.$/, '');
  const code = d.error || statut || '';
  return code ? `${general} (${code}).` : `${general}.`;
}

// ── Client HTTP ──
  // Ce que l'on attend d'un appel à l'API d'un module : la session suivie, le
  // corps en JSON — sauf un dépôt de fichier, dont le navigateur écrit lui-même
  // l'en-tête et la frontière —, une session perdue renvoyée à la connexion,
  // l'erreur du serveur rendue telle qu'il l'a dite, et un 204 lu comme vide.
  async function oasisJson(url, options) {
    const o = { credentials: 'same-origin', ...(options || {}) };
    const entetes = { ...(o.headers || {}) };
    if (!(o.body instanceof FormData) && !entetes['Content-Type']) {
      entetes['Content-Type'] = 'application/json';
    }
    o.headers = entetes;
    const r = await fetch(url, o);
    if (r.status === 401) {
      if (typeof window.oasisSessionPerdue === 'function') window.oasisSessionPerdue();
      // Le renvoi vers la connexion est lancé, mais l'appelant reçoit quand
      // même l'échec et l'affiche souvent : la phrase doit donc suivre la
      // langue, comme tous les autres refus du serveur.
      throw new Error(oasisMessageErreur({ error: 'unauthenticated' }, r.status));
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(oasisMessageErreur(err, r.status));
    }
    return r.status === 204 ? null : r.json();
  }

  // ── Thème ──
  // La bascule commune : l'attribut qui porte les couleurs, la préférence
  // retenue, et la pastille active. Chaque module y ajoute ce qui lui est
  // propre — un volet à refermer, un état à tenir.
  function oasisAppliquerTheme(theme) {
    try { localStorage.setItem('pr_theme', theme); } catch (e) { /* stockage fermé */ }
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.theme === theme);
    });
  }

  // ── Saisie différée ──
  // Un champ de recherche redessine sa liste à chaque frappe : on attend que la
  // frappe s'arrête, puis on rend le curseur là où il était — le redessin
  // recrée souvent le champ lui-même. Un minuteur par champ, pour que deux
  // recherches voisines ne s'annulent pas l'une l'autre.
  const minuteurs = new Map();
  function oasisSaisieDifferee(champ, appliquer, delai) {
    const cle = (champ && (champ.id || champ.name)) || champ;
    const id = champ && champ.id;
    const pos = champ && champ.selectionStart;
    clearTimeout(minuteurs.get(cle));
    minuteurs.set(cle, setTimeout(() => {
      minuteurs.delete(cle);
      appliquer();
      if (!id) return;
      const el = document.getElementById(id);
      if (!el || el === document.activeElement) return;
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch (e) { /* champ non textuel */ }
    }, delai === undefined ? 300 : delai));
  }

  // ── Chargement à la demande ──
  // Un script qu'on ne réclame qu'une fois : la promesse est retenue, si bien
  // que deux appels pendant le même chargement attendent le même. Sert aux
  // volets de traduction, dont un agent n'emploie jamais que le sien.
  const enRoute = new Map();
  function oasisCharger(src) {
    if (!enRoute.has(src)) {
      enRoute.set(src, new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => ok(src);
        s.onerror = () => { enRoute.delete(src); ko(new Error(`script injoignable : ${src}`)); };
        document.head.appendChild(s);
      }));
    }
    return enRoute.get(src);
  }

  window.oasisCharger = oasisCharger;

  // Dès le chargement du socle, avant tout rendu : la page part dans la langue
  // de l'agent, sans attendre qu'il actionne la bascule.
  oasisPoserLangue();

  window.oasisLangue = oasisLangue;
  window.oasisPoserLangue = oasisPoserLangue;
  window.oasisEsc = oasisEsc;
  window.oasisMessageErreur = oasisMessageErreur;
  window.oasisChampRequis = oasisChampRequis;
  window.oasisJson = oasisJson;
  window.oasisAppliquerTheme = oasisAppliquerTheme;
  window.oasisSaisieDifferee = oasisSaisieDifferee;
}());
