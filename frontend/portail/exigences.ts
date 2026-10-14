// OASIS — Les exigences réglementaires du portail (ADR-003, 5.d.2).
//
// Troisième pièce de la réécriture d'`app-config.js`. Sept gestes, **tous
// couverts depuis 5.c.12** — y compris `saveReglement`, l'écriture la plus
// lourde du portail : elle réécrit toutes les exigences d'un groupe, une
// requête par exigence, dans une boucle sans retour en arrière.
//
// Une exigence est l'objet réglementaire du dispositif : c'est elle que la
// surveillance vient vérifier. Sa référence et son libellé fondent un écart, et
// un écart fonde une mesure d'application. Cette conversion est donc gardée des
// deux côtés — six contrôles de parcours, et la comparaison mécanique de son
// balisage.
//
// ── Ce que ce fichier emporte avec lui ──
//
// `EXIG_OPEN` — l'ensemble des bandeaux dépliés — et `fmtDay` n'étaient lus que
// par ce bloc. Ils entrent donc dans le module plutôt que de rester des globales
// lexicales d'`app-config.js`, et le second geste du portail cesse d'avoir à les
// y chercher.
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import { renderConfig } from './configuration';
import { langueRetenue } from './traductions';
import type { Enregistrement } from './schemas';
import { tr } from './libelles';
import { exportBar, searchInputHtml } from './barre';
import { loadRefs } from './outils';

declare global {
  interface Window {
    /** Déplie ou replie le bandeau d'un règlement. */
    toggleExigGroup: (key: string) => void;
    /** Ouvre le panneau d'une exigence : édition, ajout au groupe, ou nouveau règlement. */
    openExigDrawer: (id?: string | null, presetReglement?: string | null, presetDate?: string | null, newGroup?: boolean) => void;
    /** Referme le panneau — il sert aussi au formulaire du règlement. */
    closeExigDrawer: () => void;
    /** Enregistre le panneau ouvert. */
    saveExigDrawer: (id: string, showRegFields: boolean, reglement: string, date: string) => Promise<void>;
    /** Ouvre le formulaire d'un règlement : son nom et sa date d'adoption. */
    openReglementForm: (reglement: string) => void;
    /** Renomme un règlement **sur toutes ses exigences**. */
    saveReglement: (oldReglement: string) => Promise<void>;
  }
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

const exigences = (): Enregistrement[] => (window.REFS.exigences ?? []) as Enregistrement[];
const texte = (v: unknown): string => (v == null ? '' : String(v));

// `escArg` d'`app.js`, repris : `esc(JSON.stringify(String(v ?? '')))`. Trois
// fonctions imbriquées dont la seule difficulté est l'ordre.
const argEchappe = (v: unknown): string => escapeHtml(JSON.stringify(String(v ?? '')));

/**
 * Une date, dans la langue de l'écran.
 *
 * Rend un tiret sur une date absente, et la chaîne telle quelle si elle n'est pas
 * une date : afficher « Invalid Date » dirait à l'agent que l'application est
 * cassée, là où la valeur brute lui dit que la donnée l'est.
 */
export function fmtDay(iso: unknown): string {
  if (!iso) return '—';
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(langueRetenue());
}

// ── Les bandeaux dépliés ──
//
// Vide vaut « tous fermés », et c'est le choix de l'original : un écran qui
// s'ouvrirait avec tous les règlements dépliés noierait l'agent. La clé d'un
// groupe sans règlement est `__none__`, faute de pouvoir indexer sur la chaîne
// vide sans ambiguïté avec « absent ».
const EXIG_OPEN = new Set<string>();

export function toggleExigGroup(key: string): void {
  const k = key || '__none__';
  if (EXIG_OPEN.has(k)) EXIG_OPEN.delete(k);
  else EXIG_OPEN.add(k);
  void renderConfig();
}

// ── La sous-vue ──
//
// Le balisage est repris **caractère pour caractère**, retours à la ligne et
// indentation compris — y compris une indentation irrégulière de l'original, que
// `scripts/comparer-exigences.js` relèverait sinon comme un écart. On ne corrige
// pas la mise en page d'une chaîne qu'on est en train de prouver identique.
export function cfgSectionExigences(): string {
  const list = exigences();
  const groups: Record<string, Enregistrement[]> = {};
  list.forEach((e) => {
    const key = texte(e.reglement);
    (groups[key] = groups[key] ?? []).push(e);
  });
  const keys = Object.keys(groups).sort((a, b) => (a || 'zzz').localeCompare(b || 'zzz'));
  const blocks = keys
    .map((key) => {
      const items = groups[key] ?? [];
      const collapsed = !EXIG_OPEN.has(key || '__none__');
      const dateAdoption = texte((items.find((x) => x.date_adoption) ?? {}).date_adoption);
          const rows = items
        .map(
          (e) => `
        <tr>
          <td><strong>${escapeHtml(texte(e.reference))}</strong></td>
          <td style="white-space:normal;">${escapeHtml(texte(e.libelle))}</td>
          <td>${e.statut === 'inactif' ? '<span class="shell-badge badge-inactive">Inactif</span>' : '<span class="shell-badge badge-active">Actif</span>'}</td>
          <td class="actions-cell">
            <button class="shell-btn-icon" onclick="openExigDrawer('${texte(e.id)}')" title="${escapeHtml(t('edit'))}" aria-label="${escapeHtml(t('edit'))}">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" onclick="deleteRef('exigences','${texte(e.id)}')" title="${escapeHtml(t('delete'))}" aria-label="${escapeHtml(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
          </td>
        </tr>`,
        )
        .join('');
      return `
      <div class="exig-group ${collapsed ? 'collapsed' : ''}">
        <div class="exig-banner" onclick="toggleExigGroup(${argEchappe(key)})">
          <span class="exig-banner-title"><span class="exig-chevron">${icon('chevronRight', 15)}</span>${escapeHtml(key || tr('Sans règlement'))} <span class="shell-badge" style="background:rgba(255,255,255,.2);color:#fff;">${items.length}</span></span>
          <span class="exig-banner-right" onclick="event.stopPropagation()">
            <span class="exig-banner-date">${dateAdoption ? `${tr("Date d'adoption")} : ${escapeHtml(fmtDay(dateAdoption))}` : ''}</span>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openReglementForm(${argEchappe(key)})" title="${t('modifier_reglement')}" aria-label="${t('modifier_reglement')}">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openExigDrawer(null,${argEchappe(key)},${argEchappe(dateAdoption)})" title="${t('ajouter_exigence')}" aria-label="${t('ajouter_exigence')}">${icon('plus', 15)}</button>
          </span>
        </div>
        <div class="exig-body">
          <div class="shell-table-container">
            <table class="shell-table shell-table-compact exig-table">
              <thead><tr><th>${tr('Référence')}</th><th>${tr('Libellé')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    })
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${escapeHtml(tr('Liste des exigences'))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher une exigence / règlement...')}
      ${exportBar('exigences', tr('Liste des exigences'))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openExigDrawer(null,null,null,true)">${icon('plus', 13)} ${escapeHtml(t('add'))}</button>
    </div>
  </div>
  ${blocks || `<p style="color:var(--text-muted);">${t('aucune_exigence')}</p>`}
  <div id="exigDrawerRoot"></div>`;
}

/** Le balisage du panneau, utile seul pour la comparaison mécanique. */
export function drawerHtml(id?: string | null, presetReglement?: string | null, presetDate?: string | null, newGroup?: boolean): string {
  const e = id ? exigences().find((x) => x.id === id) : null;
  const reglement = e ? texte(e.reglement) : (presetReglement ?? '');
  const date = e ? texte(e.date_adoption) : (presetDate ?? '');
  const showRegFields = !!newGroup; // création d'un nouveau règlement : champs éditables
  const regBlock = showRegFields
    ? `<div class="shell-form-group"><label>${tr('Règlement')}</label><input class="shell-input" id="exReglement" value=""></div>
       <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="exDate" value=""></div>`
    : `<div class="exig-reg-readonly">${icon('fileText', 14)} <strong>${escapeHtml(reglement || tr('Sans règlement'))}</strong>${date ? ` · ${escapeHtml(fmtDay(date))}` : ''}</div>`;
  return `
  <div class="exig-drawer-overlay" onclick="closeExigDrawer()"></div>
  <div class="exig-drawer">
    <div class="exig-drawer-header"><h3>${id ? tr('Liste des exigences') : (newGroup ? 'Nouveau règlement' : 'Nouvelle exigence')}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
    <div class="exig-drawer-body">
      ${regBlock}
      <div class="shell-form-group"><label>${tr('Référence')}</label><input class="shell-input" id="exReference" value="${escapeHtml(e ? texte(e.reference) : '')}"></div>
      <div class="shell-form-group"><label>${tr('Libellé')}</label><textarea class="shell-input exig-libelle" id="exLibelle" rows="6">${escapeHtml(e ? texte(e.libelle) : '')}</textarea></div>
      <div class="shell-form-group"><label>${tr('Statut')}</label>
        <select class="shell-input" id="exStatut"><option value="actif" ${!e || e.statut !== 'inactif' ? 'selected' : ''}>Actif</option><option value="inactif" ${e && e.statut === 'inactif' ? 'selected' : ''}>Inactif</option></select>
      </div>
    </div>
    <div class="exig-drawer-footer">
      <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${escapeHtml(t('cancel'))}</button>
      <button class="shell-btn shell-btn-primary" onclick="saveExigDrawer(${argEchappe(id || '')}, ${showRegFields}, ${argEchappe(reglement || '')}, ${argEchappe(date || '')})">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
    </div>
  </div>`;
}

export function openExigDrawer(id?: string | null, presetReglement?: string | null, presetDate?: string | null, newGroup?: boolean): void {
  const racine = document.getElementById('exigDrawerRoot');
  if (!racine) return;
  racine.innerHTML = drawerHtml(id, presetReglement, presetDate, newGroup);
}

export function closeExigDrawer(): void {
  const r = document.getElementById('exigDrawerRoot');
  if (r) r.innerHTML = '';
}

// ── Lire un champ du panneau, et pourquoi cela lève (corrigé le 13 octobre 2026) ──
//
// Ce lecteur rendait `''` quand le champ était absent. L'original écrit
// `document.getElementById('exReference').value`, qui **lève** une `TypeError` :
// la requête ne partait pas. Avec `''`, elle part — et le serveur fusionne le
// correctif à l'enregistrement (`{ ...existant, ...correctif }`), donc il
// **écrit la référence vide**. Une divergence silencieuse qui efface une donnée.
//
// Trouvée en convertissant les paramètres de l'instance (5.d.5), où le même
// lecteur avait le même défaut, et où un contre-essai l'a fait voir. Corrigée
// aux deux endroits par le même remède : on lève, en nommant le champ.
//
// C'est la même famille que le défaut de `submitEditUser` nommé par la suite
// « parcours » — *le champ effacé parce qu'il est parti vide*.
const champ = (id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`champ introuvable dans le panneau : « ${id} »`);
  return el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
};
const valeur = (id: string): string => champ(id).value;

export async function saveExigDrawer(id: string, showRegFields: boolean, reglement: string, date: string): Promise<void> {
  const body: Record<string, unknown> = {
    reference: valeur('exReference').trim(),
    libelle: valeur('exLibelle').trim(),
    statut: valeur('exStatut'),
  };
  // ── Le règlement, envoyé seulement à la création ──
  //
  // En **édition**, ni le règlement ni la date ne partent : l'exigence les garde
  // parce que le serveur **fusionne** le correctif à l'enregistrement
  // (`{ ...existant, ...correctif }`). Ce couplage ne se voit d'aucun des deux
  // côtés, et il est asserté par la suite « parcours » depuis 5.c.12 — sans quoi
  // une réécriture le déferait sans s'en apercevoir.
  if (showRegFields) {
    body.reglement = valeur('exReglement').trim();
    body.date_adoption = valeur('exDate');
  } else if (!id) {
    body.reglement = reglement;
    body.date_adoption = date;
  }
  const res = await appel(id ? `/api/referentiels/exigences/${id}` : '/api/referentiels/exigences', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    closeExigDrawer();
    await loadRefs();
    void renderConfig();
    showToast('OK', 'success');
    return;
  }
  showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

/** Le balisage du formulaire d'un règlement, isolé pour la comparaison. */
export function reglementFormHtml(reglement: string): string {
  const items = exigences().filter((e) => texte(e.reglement) === reglement);
  const date = texte((items.find((x) => x.date_adoption) ?? {}).date_adoption);
  return `
  <div class="shell-modal-overlay" style="left:0;top:0;" onclick="closeExigDrawer()"></div>
  <div class="shell-modal-overlay" style="left:0;top:0;background:none;pointer-events:none;">
    <div class="shell-modal" style="max-width:440px;pointer-events:auto;">
      <div class="shell-modal-header"><h3>${tr('Règlement')} / ${tr("Date d'adoption")}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-group" style="margin-bottom:.75rem;"><label>${tr('Règlement')}</label><input class="shell-input" id="rgNom" value="${escapeHtml(reglement)}"></div>
        <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="rgDate" value="${escapeHtml(date)}"></div>
        <p style="font-size:.72rem;color:var(--text-muted);margin-top:.5rem;">Appliqué à ${items.length} exigence(s) de ce règlement.</p>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveReglement(${argEchappe(reglement)})">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
}

export function openReglementForm(reglement: string): void {
  const racine = document.getElementById('exigDrawerRoot');
  if (!racine) return;
  racine.innerHTML = reglementFormHtml(reglement);
}

/**
 * Renomme un règlement **sur toutes ses exigences**.
 *
 * L'écriture la plus lourde du portail : une requête par exigence, dans une
 * boucle **sans retour en arrière**. Un renommage qui s'arrête au milieu scinde
 * le règlement en deux groupes, et chaque moitié a l'air normale.
 *
 * La boucle est séquentielle, et le reste : lancer les requêtes ensemble ferait
 * se croiser des écritures sur le même fichier de référentiel. C'est la même
 * raison que pour l'import côté serveur (ADR-002).
 */
export async function saveReglement(oldReglement: string): Promise<void> {
  const nom = valeur('rgNom').trim();
  const date = valeur('rgDate');
  const items = exigences().filter((e) => texte(e.reglement) === oldReglement);
  for (const e of items) {
    // eslint-disable-next-line no-await-in-loop
    await appel(`/api/referentiels/exigences/${texte(e.id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, reglement: nom, date_adoption: date }),
    });
  }
  closeExigDrawer();
  await loadRefs();
  void renderConfig();
  showToast(t('reglement_maj'), 'success');
}

