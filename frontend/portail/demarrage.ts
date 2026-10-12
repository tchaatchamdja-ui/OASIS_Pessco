// OASIS — La navigation, les notifications et le démarrage du portail.
// En TypeScript (ADR-003, 5.c).
//
// Il était la « suite d'`app-config.js` », découpé pour que chaque fichier tienne
// sous les 2 000 lignes — et les morceaux « partageaient la même portée ». C'est
// cette portée partagée qui le rendait inconvertible : il **écrivait** quatre
// globales lexicales. La suite n° 5.c.3 les a posées sur `window`, et la n° 5.c.4
// a converti l'hôte des modules dont il dépend.
//
// ── Ce qu'il emprunte encore, et à qui ──
//
// Les six noms déclarés plus bas viennent d'`app.js`, encore en JavaScript. Ils
// sont déclarés **ici, chez leur lecteur**, faute de définisseur typé ; la règle
// de 5.b veut qu'ils déménagent le jour où `app.js` passe, et les erreurs de
// compilation diront alors exactement où.
//
// Tout le reste vient de sa source : les libellés, les icônes, l'état partagé,
// l'hôte des modules, l'échappement et le retour à la connexion du socle. Et
// **l'appel d'API n'est plus emprunté du tout** — voir `appel()`.
import { messageErreur } from '../socle/commun';
import { sessionPerdue } from '../socle/requete';
import { escapeHtml } from '../socle/utils';
import {
  dernierVu, marque, moi, poserDernierVu, poserMoi, poserVue, vueCourante, vues, type Moi,
} from './etat';
import { icon } from './icones';
import { basculerPleinEcran, enregistrerVues } from './modules-hote';
import { poserLangue, t } from './traductions';

// `window.showToast` n'est **pas** déclaré ici : le sas du socle le déclare, et
// la règle de 5.b veut une seule déclaration. Sa signature a d'ailleurs été
// corrigée en l'écrivant — elle oubliait la durée. Voir `socle/utils.ts`.
declare global {
  interface Window {
    /** Les cinq vues du portail, définies par `app.js`. */
    renderHome: () => Promise<void>;
    renderProfile: () => Promise<void>;
    renderUsers: () => Promise<void>;
    renderAudit: () => Promise<void>;
    renderConfig: () => Promise<void>;
    /** Vide le champ de recherche du portail à chaque changement de vue. */
    portailReinitialiserRecherche: () => void;
    // `majBandeauInstance` est déclaré par son **définisseur**,
    // `frontend/portail/instances.ts` (converti le 8 octobre). Il l'était ici,
    // faute d'en avoir un ; ce fichier ne fait que l'appeler.
    /** Les règles de mot de passe non tenues, mises en phrase. */
    reglesMotDePasse: (details?: unknown) => string;
    /** L'horodatage court, défini par `app.js`. */
    /**
     * Une date et une heure, dans la langue de l'écran.
     *
     * Le paramètre est `unknown` et non `string`, et c'est une correction du
     * 12 octobre 2026 : `fmtDate` d'`app.js` commence par `if (!iso) return '—'`
     * et accepte donc n'importe quoi. Le déclarer `string` obligeait le registre
     * des postes (5.d.3) à convertir des valeurs venues du magasin — et une
     * conversion que le code d'origine ne fait pas est une divergence, même
     * quand elle est inoffensive. On déclare ce que la fonction fait.
     */
    fmtDate: (iso: unknown) => string;
    /** La navigation du portail. Lue par `app.js` et par l'hôte des modules. */
    navigate: (vue: string) => void;
    /**
     * Appelé après chaque changement de langue.
     *
     * **Déclaré ici, chez son définisseur** : le sas de ce fichier le pose, et la
     * règle de 5.b veut que ce soit lui qui le déclare. Il l'était dans le sas des
     * libellés, qui ne fait que l'appeler.
     *
     * Optionnel, et c'est la vérité : la page de connexion ne le pose plus depuis
     * sa conversion, et le sas des libellés vérifie donc son type avant d'appeler.
     */
    onLangChange?: () => void;
    /** Le repli de la barre latérale. Lu par l'`onclick` de la page. */
    toggleSidebar: () => void;
    /**
     * Les trois noms ci-dessous étaient sur `window` **sans lecteur** : une
     * `function` du premier niveau s'y pose, qu'on le veuille ou non. Ils y
     * restent sous leurs anciens noms, parce qu'ils y étaient.
     */
    initIcons: () => void;
    loadMe: () => Promise<void>;
    refreshNotifications: () => Promise<unknown[]>;
  }
}

// ── L'appel d'API, et pourquoi il n'est pas emprunté à `app.js` ──
//
// `app.js` définit un `api()` qui pose `X-OASIS-Request` et ramène à la connexion
// sur 401. Les deux gestes sont déjà ailleurs : l'en-tête est posé sur **tout**
// appel vers l'application par l'enveloppe du socle, et le retour à la connexion
// est `sessionPerdue`, que le socle exporte.
//
// L'emprunter poserait de plus un problème de nom : `window.api` porte **deux
// fonctions différentes** selon la page (voir `modules-hote.ts`), et le
// compilateur refuse de le déclarer deux fois. Un `fetch` nu évite la question.
async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) {
    sessionPerdue();
    throw new Error('unauthenticated');
  }
  return res;
}

// ══════════ Navigation ══════════

/**
 * Les cinq vues du portail, posées dans l'état partagé.
 *
 * ── Elles sont **fusionnées**, non affectées, et c'est un changement voulu ──
 *
 * L'original faisait `VIEWS = { home: …, … }` : une **affectation**, qui remplace
 * la table. Elle marchait parce que l'hôte des modules chargeait après, et
 * ajoutait ses vues `mod_<CODE>` à la table neuve. Inverser l'ordre des deux
 * balises aurait effacé les vues des modules — sans erreur, et l'on aurait
 * cherché du côté des modules.
 *
 * `Object.assign` sur la table existante rend l'ordre indifférent. Même résultat
 * dans l'ordre actuel, et le piège s'en va avec l'affectation.
 *
 * ── Et l'oubli de cette fonction a cassé le portail ──
 *
 * La première écriture de ce fichier ne la portait pas : `naviguer` ne trouvait
 * aucune vue et repliait tout sur l'accueil. Les contrôles ont dit « la vue du
 * profil se remplit **et ne porte pas ses champs** » — mille lignes de contenu,
 * et les mauvaises. C'est exactement la forme de défaut qu'un contrôle qui
 * mesurerait seulement « l'écran n'est pas vide » aurait laissée passer.
 */
export function poserVuesDeBase(): void {
  Object.assign(vues(), {
    home: () => window.renderHome(),
    profile: () => window.renderProfile(),
    users: () => window.renderUsers(),
    audit: () => window.renderAudit(),
    config: () => window.renderConfig(),
  });
}


/**
 * Ouvre une vue. Les vues `mod_<CODE>` sont ajoutées par l'hôte des modules à
 * partir des manifestes des modules installés.
 */
export function naviguer(vue: string): void {
  poserVue(vue);
  window.portailReinitialiserRecherche();
  // Sortie d'un module plein écran : restaure la barre latérale et la marque.
  if (!String(vue).startsWith('mod_')) basculerPleinEcran(false);
  document.querySelectorAll<HTMLElement>('.portal-nav-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.view === vue));
  const principal = document.getElementById('mainView');
  if (principal) principal.innerHTML = '<div class="loading-spinner"></div>';
  const rendre = vues()[vue] ?? window.renderHome;
  rendre().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'unauthenticated') return;
    const zone = document.getElementById('mainView');
    if (zone) zone.innerHTML = `<div class="shell-card">Erreur de chargement : ${escapeHtml(message)}</div>`;
  });
}

// ══════════ Notifications ══════════

interface Notification { id: number; message: string; ts: string }

export async function rafraichirNotifications(): Promise<Notification[]> {
  try {
    const res = await appel('/api/notifications');
    const notifs = (await res.json()) as Notification[];
    const nouvelles = notifs.filter((n) => n.id > dernierVu()).length;
    const pastille = document.getElementById('notifBadge');
    if (pastille) {
      pastille.style.display = nouvelles ? 'flex' : 'none';
      pastille.textContent = String(nouvelles);
    }
    return notifs;
  } catch {
    return [];
  }
}

// ══════════ Démarrage ══════════

export async function chargerMoi(): Promise<void> {
  const res = await appel('/api/me');
  const lu = (await res.json()) as Moi;
  poserMoi(lu);
  const nom = document.getElementById('userName');
  if (nom) nom.textContent = lu.user.fullName ?? '';
  const role = document.getElementById('userRole');
  if (role) role.textContent = lu.user.role;
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    if (lu.user.photo) {
      avatar.innerHTML = `<img src="${lu.user.photo}" alt="">`;
      avatar.classList.add('has-photo');
    } else {
      avatar.classList.remove('has-photo');
      avatar.textContent = (lu.user.fullName || lu.user.username)
        .split(/\s+/).map((mot) => mot[0]).slice(0, 2).join('').toUpperCase();
    }
  }
  window.majBandeauInstance();
  const logo = document.getElementById('sidebarLogo');
  const image = lu.aac?.logo;
  if (logo) {
    if (image) {
      logo.innerHTML = `<img src="${image}" alt="Logo AAC">`;
      logo.style.display = 'flex';
    } else {
      logo.innerHTML = '';
      logo.style.display = 'none';
    }
  }
  document.querySelectorAll<HTMLElement>('.portal-nav-btn[data-roles]').forEach((bouton) => {
    const roles = (bouton.dataset.roles ?? '').split(',');
    bouton.style.display = roles.includes(lu.user.role) ? '' : 'none';
  });
  if (lu.user.mustChange) {
    const fenetre = document.getElementById('pwdModal');
    if (fenetre) fenetre.style.display = 'flex';
  }
}

// Le bouton de rétraction de la barre latérale, identique à celui des modules.
const CHEVRON_DROITE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
const CHEVRON_GAUCHE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';

const habillerLeRepli = (replie: boolean): void => {
  const bouton = document.getElementById('sidebarToggle');
  if (!bouton) return;
  bouton.innerHTML = replie ? CHEVRON_DROITE : CHEVRON_GAUCHE;
  bouton.title = replie ? t('sb_expand') : t('sb_collapse');
};

export function basculerBarre(): void {
  habillerLeRepli(document.body.classList.toggle('app-sidebar-collapsed'));
}

export function poserIcones(): void {
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon ?? '', 18);
  });
  const marqueEl = document.getElementById('brandLogo');
  if (marqueEl) marqueEl.innerHTML = marque();
  habillerLeRepli(document.body.classList.contains('app-sidebar-collapsed'));
}

/** La bascule de langue redessine la vue courante : ses libellés en dépendent. */
export function langueChangee(): void {
  naviguer(vueCourante());
}

// ══════════ Les gestes de la coquille ══════════

export function brancherGestes(): void {
  document.getElementById('sidebarNav')?.addEventListener('click', (e) => {
    const cible = e.target;
    const bouton = cible instanceof Element ? cible.closest<HTMLElement>('.portal-nav-btn') : null;
    if (bouton) naviguer(bouton.dataset.view ?? 'home');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await appel('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  document.getElementById('notifBell')?.addEventListener('click', async () => {
    const panneau = document.getElementById('notifPanel');
    if (!panneau) return;
    if (panneau.style.display !== 'none') { panneau.style.display = 'none'; return; }
    const notifs = await rafraichirNotifications();
    panneau.innerHTML = `<div style="padding:.7rem 1rem;font-weight:700;color:var(--primary);border-bottom:1px solid var(--border);">${escapeHtml(t('notif_title'))}</div>`
      + (notifs.length
        ? notifs.map((n) => `<div class="portal-notif-item">${escapeHtml(n.message)}<div class="notif-ts">${window.fmtDate(n.ts)}</div></div>`).join('')
        : `<div class="portal-notif-item">${escapeHtml(t('notif_empty'))}</div>`);
    panneau.style.display = 'block';
    if (notifs.length) {
      poserDernierVu(Math.max(...notifs.map((n) => n.id)));
      const pastille = document.getElementById('notifBadge');
      if (pastille) pastille.style.display = 'none';
    }
  });

  document.getElementById('pwdSubmit')?.addEventListener('click', async () => {
    const champ = (id: string): string =>
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
    const oldPassword = champ('pwdOld');
    const newPassword = champ('pwdNew');
    if (newPassword !== champ('pwdConfirm')) {
      window.showToast(t('mdp_discordants'), 'error');
      return;
    }
    const res = await appel('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (res.ok) {
      const fenetre = document.getElementById('pwdModal');
      if (fenetre) fenetre.style.display = 'none';
      window.showToast(t('mdp_change'), 'success');
      void chargerMoi();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    const message = data.error === 'policy'
      ? t('mdp_politique', window.reglesMotDePasse(data.details))
      : messageErreur(data, res.status);
    window.showToast(message, 'error', 4500);
  });
}

/** Le démarrage, dans l'ordre du fichier d'origine. */
export async function demarrer(): Promise<void> {
  // Barre latérale étendue à l'ouverture.
  document.body.classList.remove('app-sidebar-collapsed');
  poserIcones();
  poserLangue(localStorage.getItem('pr_lang') ?? 'fr');
  await chargerMoi();
  // Les vues des modules installés : le registre n'est lisible qu'une session
  // ouverte, d'où ce second appel après `chargerMoi`.
  await enregistrerVues(true);
  naviguer('home');
  void rafraichirNotifications();
  window.setInterval(() => { void rafraichirNotifications(); }, 60000);
}

export { moi };
