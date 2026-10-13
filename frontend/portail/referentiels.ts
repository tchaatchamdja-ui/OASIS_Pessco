// OASIS — Le CRUD générique des référentiels (ADR-003, 5.d.1).
//
// Deuxième pièce de la réécriture d'`app-config.js`, et la suite directe de la
// première : elle ne dépend plus que de `schemas.ts`, extrait en 5.d.0.
//
// Sept gestes, et ce sont les mieux gardés du portail : la ronde complète —
// créer, modifier, supprimer, confirmation pressée — est couverte depuis
// 5.c.7, et le contrôle « une fenêtre d'édition porte la valeur enregistrée »
// est précisément celui qui attrape une réécriture qui ouvrirait vide.
//
// ── Ce qu'il reste à lire du monde, et pourquoi ──
//
// **Deux noms**, et c'était cinq jusqu'au 13 octobre 2026. `tr`,
// `searchInputHtml` et `exportBar` sont partis dans `libelles.ts` et `barre.ts`
// (5.e.0) et sont désormais **importés** : leurs tables et leur état étaient des
// globales lexicales d'`app.js`, et c'est cela, non l'interface, qui les retenait.
//
//   · `loadRefs` — le rechargement des référentiels, encore dans `app.js`.
//   · `renderConfig` — le cycle de rendu, converti en 5.d.6 ; il est lu sur
//     `window` parce que l'importer ferait un cycle, le rendu appelant ce
//     module.
//
// `CURRENT_CFG`, lui, **a dû monter sur `window`** (voir `etat.ts`) : c'était un
// `let` du premier niveau, donc une globale lexicale qu'aucun module ne peut
// atteindre. C'est le même obstacle qu'en 5.b, et la même réponse — la
// dépendance, non l'interface, bloque la conversion.
import { confirmer } from '../socle/toast';
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import {
  REF_SCHEMAS, champsVisibles, fieldValue, type Champ, type Enregistrement, type Schema,
} from './schemas';
import { tr } from './libelles';
import { exportBar, searchInputHtml } from './barre';

declare global {
  interface Window {
    /** La table d'un référentiel, avec son en-tête et ses deux actions par ligne. */
    refTable: (coll: string, premier?: boolean) => string;
    /** Ouvre la fenêtre d'un enregistrement : création, édition, ou création préréglée. */
    openRefModal: (coll: string, id?: string, defaultsJson?: string) => void;
    /** Referme la fenêtre de référentiel. */
    closeRefModal: () => void;
    /** Enregistre la fenêtre ouverte : crée si `id` est vide, modifie sinon. */
    saveRef: (coll: string, id?: string) => Promise<void>;
    /** Supprime un enregistrement, confirmation demandée. */
    deleteRef: (coll: string, id: string) => Promise<void>;
    /** Le niveau d'ordre 1 de l'organigramme, ou `null` s'il n'y en a pas. */
    orgTopLevelType: () => string | null;
    /** Le choix du niveau commande le sigle et le libellé repris de l'Administration. */
    orgTypeChanged: () => void;
    /** Montre ou cache les champs réservés aux inspecteurs. */
    toggleInspectorFields: () => void;
    /**
     * Le sigle et le nom à reprendre d'office sur l'entité de niveau 1.
     *
     * Posé par `openRefModal`, lu par `orgTypeChanged` et `saveRef`. Il était
     * déjà sur `window` avant la conversion — c'est le seul de ce fichier qui
     * n'ait pas eu à changer de place.
     */
    __ORG_AUTO: { top: string | null; sigle: string; nom: string };

    // ── Les trois prêts rendus le 13 octobre 2026 (5.e.0) ──
    //
    // `tr`, `searchInputHtml` et `exportBar` étaient déclarés ici, et lus sur
    // `window` : leurs tables et leur état étaient des globales **lexicales**
    // d'`app.js`, hors d'atteinte d'un module. Ils vivent désormais dans
    // `libelles.ts` et `barre.ts`, et sont **importés**.
    //
    // Les déclarations partent avec les lectures : la règle de 5.b veut que le
    // module qui **définit** un nom le déclare, et lui seul. Les garder ici
    // aurait fait deux déclarations du même nom, que le compilateur tolère
    // tant qu'elles concordent — et qui mentent dès qu'elles divergent.
    /** Recharge les référentiels depuis l'API. */
    loadRefs: () => Promise<void>;
  }
}

// L'appel d'API : un `fetch` nu. L'en-tête anti-CSRF est posé par l'enveloppe du
// socle, et le retour à la connexion sur 401 est `sessionPerdue`. `window.api`
// porte deux fonctions différentes selon le fichier qui l'a posé en dernier ;
// aucune n'est empruntée ici. Voir `modules-hote.ts`.
async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

const enregistrements = (coll: string): Enregistrement[] =>
  (window.REFS[coll] ?? []) as Enregistrement[];

const texte = (v: unknown): string => (v == null ? '' : String(v));

// ── Le schéma d'une collection, et une divergence nommée ──
//
// `REF_SCHEMAS[coll]` peut être absent, et le compilateur l'a dit. L'original
// ne s'en souciait pas : il lisait `schema.title` sur `undefined` et rendait
// « Cannot read properties of undefined (reading 'title') » — un message qui ne
// dit pas **quelle** collection manque, sur un écran resté vide.
//
// Une collection inconnue est aujourd'hui inatteignable : les onze appels
// passent des littéraux. Mais puisqu'il faut traiter le cas, autant qu'il se
// lise : le refus nomme la collection.
function schemaDe(coll: string): Schema {
  const schema = REF_SCHEMAS[coll];
  if (!schema) throw new Error(`référentiel inconnu : « ${coll} »`);
  return schema;
}

// ── La table ──
//
// Le balisage est repris **caractère pour caractère** d'`app-config.js`, retours
// à la ligne et indentation compris : `scripts/comparer-referentiels.js` compare
// les deux chaînes à l'identique, et une espace de plus y serait un écart.
export function refTable(coll: string, premier?: boolean): string {
  const schema = schemaDe(coll);
  const rows = enregistrements(coll)
    .map(
      (r) => `
    <tr>
      ${champsVisibles(schema).map((f) => `<td>${fieldValue(f, r)}</td>`).join('')}
      <td class="actions-cell">
        <button class="shell-btn-icon" onclick="openRefModal('${coll}','${texte(r.id)}')" title="${escapeHtml(t('edit'))}" aria-label="${escapeHtml(t('edit'))}">${icon('edit', 15)}</button>
        <button class="shell-btn-icon" onclick="deleteRef('${coll}','${texte(r.id)}')" title="${escapeHtml(t('delete'))}" aria-label="${escapeHtml(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
      </td>
    </tr>`,
    )
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile ${premier ? 'cfg-entete-premier' : 'cfg-entete-suivant'}">
    <h3>${escapeHtml(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${coll === 'prestataires' ? searchInputHtml('Rechercher un prestataire...') + exportBar('prestataires', tr('Prestataires de services')) : ''}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${escapeHtml(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr>${champsVisibles(schema).map((f) => `<th>${escapeHtml(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${champsVisibles(schema).length + 1}" style="color:var(--text-muted);">${t('aucun_element')}</td></tr>`}</tbody>
    </table>
  </div>`;
}

/** Le niveau d'ordre 1 de l'organigramme : celui qui reprend l'identité de l'AAC. */
export function orgTopLevelType(): string | null {
  const niveaux = enregistrements('organisation_levels').slice()
    .sort((a, b) => Number(a.ordre ?? 0) - Number(b.ordre ?? 0));
  const premier = niveaux[0];
  return premier ? texte(premier.type) : null;
}

// ── Un champ de la fenêtre ──
//
// Quatre formes, et l'ordre des cas est celui de l'original : les deux champs
// asservis de l'organigramme passent **avant** le type du champ, si bien qu'un
// `sigle` y est un texte repris et désactivé, non un texte ordinaire.
function champHtml(coll: string, f: Champ, record: Enregistrement, id: string | undefined): string {
  const val = record[f.k] ?? '';
  const wrapCls = f.inspectorOnly ? 'shell-form-group insp-only' : 'shell-form-group';
  const isOrg = coll === 'organisation';
  const auto = window.__ORG_AUTO;
  const orgIsTop = isOrg && record.type === auto.top;
  let onchange = f.k === 'est_inspecteur' ? ' onchange="toggleInspectorFields()"' : '';
  if (isOrg && f.k === 'type') onchange = ' onchange="orgTypeChanged()"';

  if (isOrg && (f.k === 'sigle' || f.k === 'libelle')) {
    const autoVal = f.k === 'sigle' ? auto.sigle : auto.nom;
    const useVal = orgIsTop ? autoVal : val;
    return `
        <div class="shell-form-group" style="margin-bottom:.75rem;">
          <label>${escapeHtml(tr(f.l))}</label>
          <input class="shell-input org-${f.k}-input" type="text" data-field="${f.k}" value="${escapeHtml(useVal)}" ${orgIsTop ? 'disabled' : ''}>
          <span class="org-auto-note" style="font-size:.7rem;color:var(--text-muted);${orgIsTop ? '' : 'display:none;'}">${t('repris_administration')}</span>
        </div>`;
  }
  if (f.type === 'multiselect') {
    const opts = f.options ? f.options() : [];
    const vals = Array.isArray(record[f.k]) ? (record[f.k] as unknown[]).map(String) : [];
    return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${escapeHtml(tr(f.l))}</label>
          <div class="multi-check">
            ${opts.length
              ? opts.map((o) => `<label class="multi-check-item"><input type="checkbox" data-multi="${f.k}" value="${escapeHtml(o.v)}" ${vals.includes(String(o.v)) ? 'checked' : ''}> ${escapeHtml(o.t)}</label>`).join('')
              : `<span style="color:var(--text-muted);font-size:.8rem;">${t('aucune_option_config')}</span>`}
          </div>
        </div>`;
  }
  if (f.type === 'select') {
    // Une entité ne peut pas être son propre rattachement : elle est ôtée de ses
    // propres options. Sans cela, l'organigramme accepterait un cycle.
    const opts = (f.options ? f.options() : [])
      .filter((o) => !(coll === 'organisation' && f.k === 'parent_id' && o.v === id));
    return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${escapeHtml(tr(f.l))}</label>
          <select class="shell-input" data-field="${f.k}"${onchange}>
            ${f.allowEmpty ? '<option value="">—</option>' : ''}
            ${opts.map((o) => `<option value="${escapeHtml(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${escapeHtml(o.t)}</option>`).join('')}
          </select>
        </div>`;
  }
  return `
      <div class="${wrapCls}" style="margin-bottom:.75rem;">
        <label>${escapeHtml(tr(f.l))}</label>
        <input class="shell-input" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" data-field="${f.k}" value="${escapeHtml(val)}">
      </div>`;
}

/** Le corps de la fenêtre : utile seul, pour la comparaison mécanique. */
export function champsHtml(coll: string, record: Enregistrement, id?: string): string {
  const schema = schemaDe(coll);
  return champsVisibles(schema).map((f) => champHtml(coll, f, record, id)).join('');
}

export function openRefModal(coll: string, id?: string, defaultsJson?: string): void {
  const schema = schemaDe(coll);
  let record: Enregistrement = {};
  if (id) record = enregistrements(coll).find((r) => r.id === id) ?? {};
  else if (defaultsJson) {
    try { record = JSON.parse(defaultsJson) as Enregistrement; } catch { record = {}; }
  }
  const root = document.getElementById('cfgModalRoot');
  if (!root) return;
  const aacRef = window.CURRENT_CFG?.aac ?? {};
  window.__ORG_AUTO = {
    top: coll === 'organisation' ? orgTopLevelType() : null,
    sigle: aacRef.sigle ?? '',
    nom: aacRef.nom ?? '',
  };
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>${escapeHtml(tr(schema.title))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">${champsHtml(coll, record, id)}</div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveRef('${coll}','${id || ''}')">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
  if (coll === 'inspecteurs') toggleInspectorFields();
}

export function closeRefModal(): void {
  const r = document.getElementById('cfgModalRoot');
  if (r) r.innerHTML = '';
}

export function toggleInspectorFields(): void {
  const sel = document.querySelector<HTMLSelectElement>('#cfgModalRoot [data-field="est_inspecteur"]');
  const montre = !!sel && sel.value === 'oui';
  document.querySelectorAll<HTMLElement>('#cfgModalRoot .insp-only').forEach((el) => {
    el.style.display = montre ? '' : 'none';
  });
}

export function orgTypeChanged(): void {
  const auto = window.__ORG_AUTO;
  const sel = document.querySelector<HTMLSelectElement>('#cfgModalRoot [data-field="type"]');
  const sigleIn = document.querySelector<HTMLInputElement>('#cfgModalRoot .org-sigle-input');
  const libelleIn = document.querySelector<HTMLInputElement>('#cfgModalRoot .org-libelle-input');
  const isTop = !!sel && sel.value === auto.top;
  ([[sigleIn, auto.sigle], [libelleIn, auto.nom]] as const).forEach(([inp, v]) => {
    if (!inp) return;
    const note = inp.parentElement?.querySelector<HTMLElement>('.org-auto-note');
    if (isTop) {
      inp.value = v || '';
      inp.disabled = true;
      if (note) note.style.display = '';
    } else {
      inp.disabled = false;
      if (note) note.style.display = 'none';
    }
  });
}

/** Le corps de la requête, lu dans la fenêtre ouverte. Isolé pour la comparaison. */
export function corpsDeLaFenetre(coll: string, id?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  document.querySelectorAll<HTMLInputElement>('#cfgModalRoot [data-field]').forEach((input) => {
    const cle = input.dataset.field;
    if (!cle) return;
    body[cle] = input.type === 'number' ? Number(input.value) : input.value;
  });
  // Champs multi-valeurs (domaines, spécialités…)
  document.querySelectorAll<HTMLInputElement>('#cfgModalRoot [data-multi]').forEach((input) => {
    const k = input.dataset.multi;
    if (!k) return;
    if (!Array.isArray(body[k])) body[k] = [];
    if (input.checked) (body[k] as string[]).push(input.value);
  });
  // Niveau d'ordre 1 : sigle & libellé repris de « Détails sur l'Administration »
  if (coll === 'organisation') {
    const auto = window.__ORG_AUTO;
    if (auto.top && body.type === auto.top) {
      if (auto.sigle) body.sigle = auto.sigle;
      if (auto.nom) body.libelle = auto.nom;
    }
  }
  // ── Le registre des titulaires ──
  //
  // Tout changement de titulaire de poste y est journalisé : l'entrée ouverte se
  // referme, et la nouvelle s'ouvre. C'est la même discipline que l'intérim
  // (5.c.11), et pour la même raison — ce registre dit qui répondait de quoi, et
  // à quelle date.
  if (coll === 'organisation' && id && body.titulaire_id !== undefined) {
    const ancien = enregistrements('organisation').find((o) => o.id === id);
    if (ancien && body.titulaire_id !== (ancien.titulaire_id || '')) {
      const registre = (Array.isArray(ancien.registre) ? ancien.registre : [])
        .map((e) => ({ ...(e as Record<string, unknown>) }));
      const ouverte = [...registre].reverse().find((e) => e.role === 'titulaire' && !e.end);
      if (ouverte) ouverte.end = new Date().toISOString();
      if (body.titulaire_id) {
        registre.push({ role: 'titulaire', person_id: body.titulaire_id, start: new Date().toISOString(), end: null });
      }
      body.registre = registre;
    }
  }
  return body;
}

export async function saveRef(coll: string, id?: string): Promise<void> {
  const body = corpsDeLaFenetre(coll, id);
  const res = await appel(id ? `/api/referentiels/${coll}/${id}` : `/api/referentiels/${coll}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    closeRefModal();
    await window.loadRefs();
    void window.renderConfig();
    showToast('OK', 'success');
    return;
  }
  const d = await res.json().catch(() => ({})) as Record<string, unknown>;
  showToast(
    d.error === 'duplicate_code'
      ? t('code_deja_utilise', body.code ?? '')
      : window.oasisMessageErreur(d, res.status),
    'error', 5000,
  );
}

export async function deleteRef(coll: string, id: string): Promise<void> {
  if (!await confirmer(t('confirm_delete'))) return;
  const res = await appel(`/api/referentiels/${coll}/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await window.loadRefs();
    void window.renderConfig();
    showToast('OK', 'success');
    return;
  }
  showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}
