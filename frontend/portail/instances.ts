// OASIS — Les instances du dispositif, dans le portail. En TypeScript (ADR-003, 5.c).
//
// Deux portées de super-administration, le bandeau qui nomme l'instance
// regardée, et l'écran qui les ouvre, les met en sommeil ou les supprime.
//
// ── Le dernier des quatre petits fichiers, et le plus engageant ──
//
// Il porte `supprimerInstance` : **retirer l'instance d'un État**, le geste le
// plus lourd du portail. Il était déclaré non couvert, et le convertir est le
// moment de le couvrir — comme l'effacement des préférences et la pastille des
// notifications l'ont été.
//
// ── Ce qu'il emprunte, et ce qu'il ne lit plus sur `window` ──
//
// Il lisait `api`, `esc`, `icon`, `showToast`, `escArg`, `oasisConfirmer`,
// `oasisMessageErreur`, `t`, `ME`, `CFG_SUB` et `renderConfig`. Il n'en reste
// qu'un seul : `renderConfig`, défini par `app-config.js`, encore en JavaScript.
// Tout le reste vient de sa source.
import { messageErreur } from '../socle/commun';
import { sessionPerdue } from '../socle/requete';
import { confirmer, toast } from '../socle/toast';
import { escapeHtml } from '../socle/utils';
import { moi, sousVue, type Moi } from './etat';
import { icon } from './icones';
import { t } from './traductions';

// L'appel d'API : un `fetch` nu. L'en-tête anti-CSRF est posé par l'enveloppe du
// socle, et le retour à la connexion sur 401 est `sessionPerdue`. Voir
// `modules-hote.ts` pour la raison détaillée — `window.api` porte deux fonctions
// différentes, et aucune n'est empruntée ici.
async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

// `escArg` d'`app.js`, repris ici : `esc(JSON.stringify(String(v ?? '')))`. Trois
// fonctions imbriquées dont la seule difficulté est l'ordre, et `esc` **est**
// `escapeHtml` — `app.js` l'écrit `function esc(s) { return oasisEsc(s); }`.
const argEchappe = (v: unknown): string => escapeHtml(JSON.stringify(String(v ?? '')));

const avis = (message: string, type?: string, duree?: number): void => {
  toast(message, type, duree);
};

/** Une instance du dispositif, telle que `/api/instances` la rend. */
interface Instance {
  nom: string;
  aac?: string;
  donnees?: number;
  active?: boolean;
  locale?: boolean;
}

declare global {
  interface Window {
    /** Les deux libellés de portée. Lus par `app.js`. */
    PORTEE_LABELS: Readonly<Record<string, string>>;
    /** La portée d'un compte. Lue par `app.js`. */
    porteeDe: (u: unknown) => string;
    /** Le compte connecté est-il régional ? Lu par `app-config.js`. */
    jeSuisRegional: () => boolean;
    /** Le bloc « portée », commun aux deux formulaires. Lu par `app.js`. */
    porteeFieldsHtml: (prefixe: string, u?: unknown) => string;
    /** Branche le bloc sur le rôle choisi. Lu par `app.js`. */
    brancherPortee: (prefixe: string, selectRole: HTMLSelectElement) => void;
    /** Le bandeau d'instance. Lu par le démarrage. */
    majBandeauInstance: () => void;
    /** Charge la liste des instances. Lue par `app-config.js`. */
    cfgChargerInstances: () => Promise<void>;
    /** La section « Instances » de la configuration. Lue par `app-config.js`. */
    cfgSectionInstances: () => string;
    /**
     * Les quatre gestes, appelés depuis les `onclick` du balisage que ce fichier
     * **produit** : ils doivent être sur `window`, et aucun fichier ne les lit.
     */
    basculerInstance: (nom: string) => Promise<void>;
    supprimerInstance: (nom: string) => Promise<void>;
    ouvrirInstance: () => Promise<void>;
    changerInstance: (valeur: string) => Promise<void>;
  }
}

// ── Deux portées de super-administration ──
// Le régional administre toutes les instances et passe de l'une à l'autre en
// barre supérieure ; le national n'administre que la sienne. Un compte dont la
// portée n'est pas déclarée est régional — c'est ce qu'étaient tous les
// super-administrateurs avant que la distinction n'existe.
export const PORTEE_LABELS: Readonly<Record<string, string>> = {
  regionale: 'SuperAdmin régional',
  nationale: 'SuperAdmin national',
};

export const porteeDe = (u: unknown): string => {
  const portee = (u as { portee?: unknown } | null)?.portee;
  return String(portee ?? '') === 'nationale' ? 'nationale' : 'regionale';
};

// Qui peut désigner la portée d'un autre : le régional seul.
export const jeSuisRegional = (): boolean => {
  const m = moi();
  return !!m && m.user.role === 'SUPERADMIN' && porteeDe(m.user) === 'regionale';
};

// `instance_vue` et `instance` sont **déclarés sur `Moi`** (voir `etat.ts`) : ils
// étaient lus ici par quatre affirmations de type, que le garde-fou du typage a
// refusées. Un champ que l'application lit est un champ qui a un type.
type VueInstance = NonNullable<Moi['instance_vue']>;
const vueInstance = (m: Moi | null): VueInstance => m?.instance_vue ?? {};
const instanceDuCompte = (m: Moi | null): NonNullable<Moi['instance']> => m?.instance ?? {};

/**
 * Bloc « portée de super-administration », commun aux deux formulaires. Il ne
 * s'affiche qu'au régional — lui seul désigne les autres — et seulement quand le
 * rôle retenu est SuperAdmin. L'instance n'est demandée que pour un national :
 * le régional les administre toutes.
 */
export function porteeFieldsHtml(prefixe: string, u?: unknown): string {
  if (!jeSuisRegional()) return '';
  const m = moi();
  const p = porteeDe(u);
  const vue = vueInstance(m);
  const inst = (u as { instance?: string } | null)?.instance
    || vue.courante || instanceDuCompte(m).etat;
  const listeInst = vue.instances ?? [];
  return `
  <div id="${prefixe}PorteeWrap" style="display:none;">
    <div class="shell-form-group" style="margin-bottom:1rem;">
      <label>${t('portee_super_admin')}</label>
      <select class="shell-input" id="${prefixe}Portee">
        <option value="regionale" ${p === 'regionale' ? 'selected' : ''}>${t('superadmin_regional')}</option>
        <option value="nationale" ${p === 'nationale' ? 'selected' : ''}>${t('superadmin_national')}</option>
      </select>
    </div>
    <div class="shell-form-group" id="${prefixe}InstanceWrap" style="margin-bottom:1rem;">
      <label>${t('instance_administree')}</label>
      <select class="shell-input" id="${prefixe}Instance">
        ${listeInst.map((e) => `<option value="${escapeHtml(e)}" ${e === inst ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
      </select>
    </div>
  </div>`;
}

/** Le bloc suit le rôle choisi, et l'instance ne se demande qu'au national. */
export function brancherPortee(prefixe: string, selectRole: HTMLSelectElement): void {
  const wrap = document.getElementById(`${prefixe}PorteeWrap`);
  if (!wrap) return;
  const sel = document.getElementById(`${prefixe}Portee`) as HTMLSelectElement | null;
  const instWrap = document.getElementById(`${prefixe}InstanceWrap`);
  if (!sel || !instWrap) return;
  const majAffichage = (): void => {
    wrap.style.display = selectRole.value === 'SUPERADMIN' ? '' : 'none';
    instWrap.style.display = sel.value === 'nationale' ? '' : 'none';
  };
  selectRole.addEventListener('change', majAffichage);
  sel.addEventListener('change', majAffichage);
  majAffichage();
}

// ── Instance regardée ──
// OASIS s'installe une fois par État : le bandeau nomme celle dont on tient le
// poste. Le super-administrateur de l'Union en change ici, et le choix vaut
// aussitôt pour le portail comme pour les six modules. Les autres comptes lisent
// la leur, sans en changer.
const PORTAIL_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

export function majBandeauInstance(): void {
  const zone = document.getElementById('instanceBadge');
  if (!zone) return;
  const m = moi();
  const vue = vueInstance(m);
  if (!vue.disponible || !(vue.instances ?? []).length) {
    // L'instance du compte, non celle installée ici : le super-administrateur
    // national du Togo travaille au Togo, quel que soit l'État sur lequel le
    // déploiement a été posé. Le bigramme suit l'AAC de cette instance ; une
    // instance qu'on n'a pas encore renseignée n'en a pas, et le nom suffit.
    const propre = instanceDuCompte(m);
    const etat = vue.courante || propre.etat || '';
    const code = m?.aac?.bigramme
      || (etat === propre.etat ? propre.codeEtat : '') || '';
    zone.className = 'portal-header-instance';
    zone.textContent = code ? `${etat} (${code})` : etat;
    return;
  }
  const options = [{ valeur: '', libelle: PORTAIL_VUE_REGIONALE }]
    .concat((vue.instances ?? []).map((e) => ({ valeur: e, libelle: e })))
    // Ouvrir une instance depuis la liste elle-même : c'est là qu'on constate
    // qu'elle manque.
    .concat([{ valeur: '__nouvelle__', libelle: '＋ Nouvelle instance…' }]);
  zone.className = 'portal-header-instance portal-header-instance-choix';
  zone.innerHTML = `<select id="instanceSelect" title="${t('instance_regardee')}"
      aria-label="${t('instance_regardee')}">${options.map((o) =>
    `<option value="${escapeHtml(o.valeur)}"${o.valeur === (vue.courante || '') ? ' selected' : ''}>${escapeHtml(o.libelle)}</option>`).join('')}</select>`;
  const choix = document.getElementById('instanceSelect') as HTMLSelectElement | null;
  if (choix) choix.onchange = (e): void => { void changerInstance((e.target as HTMLSelectElement).value); };
}

export async function changerInstance(valeur: string): Promise<void> {
  const vue = vueInstance(moi());
  if (valeur === '__nouvelle__') { await ouvrirInstance(); return; }
  if ((vue.courante || '') === (valeur || '')) return;
  const res = await appel('/api/instance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instance: valeur }),
  });
  if (!res.ok) {
    avis(t('instance_changement_impossible'), 'error');
    majBandeauInstance();
    return;
  }
  // L'instance commande le périmètre de tous les écrans : on recharge le portail
  // plutôt que de rafraîchir liste après liste.
  window.location.reload();
}

/**
 * Une instance nouvelle part vide : ni organismes, ni inspecteurs, ni
 * nomenclatures. Son super-administrateur national la garnira.
 */
export async function ouvrirInstance(): Promise<void> {
  const nom = (window.prompt('Nom de la nouvelle instance (l’État) :') ?? '').trim();
  majBandeauInstance();
  if (!nom) return;
  const res = await appel('/api/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom }),
  });
  const d = (await res.json().catch(() => ({}))) as { error?: string; instances?: string[] };
  if (!res.ok) {
    avis(d.error === 'portee_nationale' ? t('reserve_superadmin_regional')
      : messageErreur(d, res.status, t('nom_instance_invalide')), 'error');
    return;
  }
  const m = moi();
  if (m) {
    // `?? []` et non `d.instances` tel quel : `exactOptionalPropertyTypes` refuse
    // d'affecter `undefined` à une propriété optionnelle, et il a raison de le
    // demander. L'effet observable est **le même** — le bandeau lit
    // `(instances ?? []).length`, nul dans les deux cas —, mais le type ne
    // prétend plus qu'une liste est là quand elle peut manquer.
    m.instance_vue = { ...vueInstance(m), instances: d.instances ?? [] };
  }
  majBandeauInstance();
  avis(t('instance_ouverte', nom), 'success');
  if (sousVue() === 'instances') { await cfgChargerInstances(); void window.renderConfig(); }
}

// ── Instances du dispositif ──
// Le régional les ouvre, les met en sommeil, et supprime celles qui ne portent
// rien. Une instance désactivée garde ses données mais ne se prend plus en barre
// et ne laisse plus entrer les siens ; une instance supprimée l'est **sans
// retour**, d'où le refus dès qu'un enregistrement s'y rattache.
let CFG_INSTANCES: Instance[] = [];

export async function cfgChargerInstances(): Promise<void> {
  const res = await appel('/api/instances');
  CFG_INSTANCES = res.ok ? ((await res.json()) as Instance[]) : [];
}

export function cfgSectionInstances(): string {
  const rows = CFG_INSTANCES.map((i) => `
    <tr class="${i.active ? '' : 'row-inactive'}">
      <td><strong>${escapeHtml(i.nom)}</strong>${i.locale ? ' <span class="shell-badge badge-neutral">' + t('installee_ici') + '</span>' : ''}</td>
      <td>${escapeHtml(i.aac ?? '') || '<span style="color:var(--text-muted);">—</span>'}</td>
      <td>${i.donnees ? `${i.donnees} enregistrement(s)` : '<span style="color:var(--text-muted);">vide</span>'}</td>
      <td>${i.active ? '<span class="shell-badge badge-active">Active</span>' : '<span class="shell-badge badge-inactive">' + t('desactivee') + '</span>'}</td>
      <td class="actions-cell">
        ${i.locale ? '<span style="color:var(--text-muted);font-size:.75rem;">—</span>' : `
        <button class="shell-btn-icon" onclick="basculerInstance(${argEchappe(i.nom)})" title="${i.active ? 'Désactiver' : 'Réactiver'}" aria-label="${i.active ? 'Désactiver' : 'Réactiver'}">${icon('power', 15)}</button>
        <button class="shell-btn-icon" onclick="supprimerInstance(${argEchappe(i.nom)})" title="${i.donnees ? 'Suppression impossible : des données y sont rattachées' : 'Supprimer'}" aria-label="${i.donnees ? 'Suppression impossible : des données y sont rattachées' : 'Supprimer'}" ${i.donnees ? 'disabled style="opacity:.35;cursor:default;"' : 'style="color:#dc2626;"'}>${icon('trash', 15)}</button>`}
      </td>
    </tr>`).join('');
  return `
  <div class="portal-page-header">
    <h3>Instances <span class="shell-badge badge-neutral">${CFG_INSTANCES.length}</span></h3>
    <div class="portal-page-actions">
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="ouvrirInstance()">${icon('plus', 13)} Nouvelle instance</button>
    </div>
  </div>
  <p style="font-size:.78rem;color:var(--text-muted);margin:0 0 .75rem;">
    Une instance désactivée conserve ses données mais ne se prend plus en barre supérieure,
    et ses comptes ne peuvent plus se connecter. La suppression n'est offerte que si rien ne s'y rattache.
  </p>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr><th>Instance</th><th>AAC</th><th>${t('donnees_col')}</th><th>${t('users_col_status')}</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function basculerInstance(nom: string): Promise<void> {
  const res = await appel(`/api/instances/${encodeURIComponent(nom)}/activite`, { method: 'PUT' });
  const d = (await res.json().catch(() => ({}))) as { error?: string; active?: boolean };
  if (!res.ok) {
    avis(d.error === 'instance_locale' ? t('instance_locale_non_desactivable')
      : messageErreur(d, res.status), 'error');
    return;
  }
  avis(d.active ? t('instance_reactivee', nom) : t('instance_desactivee', nom), 'success');
  await cfgChargerInstances();
  void window.renderConfig();
}

/**
 * Supprimer une instance. **Le geste le plus lourd du portail** : il retire
 * l'instance d'un État, sans retour.
 *
 * Trois refus se distinguent, et chacun dit autre chose : des données y sont
 * rattachées, c'est l'instance installée ici, ou le serveur refuse pour une
 * autre raison. Les confondre ferait chercher au mauvais endroit.
 */
export async function supprimerInstance(nom: string): Promise<void> {
  if (!await confirmer(t('confirmer_suppr_instance', nom))) return;
  const res = await appel(`/api/instances/${encodeURIComponent(nom)}`, { method: 'DELETE' });
  const d = (await res.json().catch(() => ({}))) as { error?: string; donnees?: number };
  if (!res.ok) {
    avis(d.error === 'instance_non_vide' ? t('instance_non_vide_n', d.donnees)
      : d.error === 'instance_locale' ? t('instance_locale_non_supprimable')
        : messageErreur(d, res.status), 'error', 4500);
    return;
  }
  avis(t('instance_supprimee', nom), 'success');
  const m = moi();
  if (m) {
    m.instance_vue = {
      ...vueInstance(m),
      instances: (vueInstance(m).instances ?? []).filter((e) => e !== nom),
    };
  }
  majBandeauInstance();
  await cfgChargerInstances();
  void window.renderConfig();
}

export type { Instance };
