// OASIS — Le personnel et la taxinomie de la surveillance (ADR-003, 5.d.4).
//
// Cinquième pièce de la réécriture d'`app-config.js`, et la dernière qui emporte
// un **état partagé**.
//
// ── Pourquoi ces deux écrans dans un seul module ──
//
// Ce n'est pas un choix de commodité : `CFG_OPEN` les lie. L'ensemble des
// éléments dépliés sert à la fois aux fiches du personnel (`togglePers`, clés
// `pers-<id>`) et aux accordéons de la taxinomie (`toggleAcc`, clés `dom-`,
// `sect-`, `sa-`). Les séparer en deux modules donnerait **deux ensembles**, et
// déplier un domaine n'agirait plus sur ce que l'écran rend — sans erreur et
// sans trace, le mode de défaillance que 5.b a documenté.
//
// ── Trois prêts rendus ──
//
// `LEVEL_COLORS`, `orgChainFor` et `circuitHtml` étaient publiés sur `window`
// par le module de l'organigramme **pour ce fichier**. Il les importe désormais
// de la source : trois lectures de globale en moins, et le sas de l'organigramme
// cessera de les prêter quand `app-config.js` aura disparu.
import { escapeHtml } from '../socle/utils';
import { icon } from './icones';
import { t } from './traductions';
import { renderConfig } from './configuration';
import { REF_SCHEMAS, fieldValue, type Champ, type Enregistrement } from './schemas';
import { LEVEL_COLORS, circuitHtml, orgChainFor } from './organigramme';
import { tr } from './libelles';
import { exportBar, searchInputHtml } from './barre';

declare global {
  interface Window {
    /** Déplie ou replie le détail d'une fiche de personnel. */
    togglePers: (id: string) => void;
    /** Déplie ou replie un accordéon de la taxinomie. */
    toggleAcc: (key: string) => void;

    // Les deux sous-vues ne sont plus publiées depuis la dépose du pont (5.e.5) :
    // `renderConfig` les importe d'ici depuis 5.d.6.
  }
}

const liste = (coll: string): Enregistrement[] => (window.REFS[coll] ?? []) as Enregistrement[];
const texte = (v: unknown): string => (v == null ? '' : String(v));

// ── L'ensemble des éléments dépliés ──
//
// Privé au module, et partagé par ses deux écrans. Vide vaut « tout replié » :
// un écran qui s'ouvrirait entièrement déplié noierait l'agent, et c'est le
// choix de l'original.
const CFG_OPEN = new Set<string>();

export function togglePers(id: string): void {
  const k = `pers-${id}`;
  if (CFG_OPEN.has(k)) CFG_OPEN.delete(k);
  else CFG_OPEN.add(k);
  void renderConfig();
}

export function toggleAcc(key: string): void {
  if (CFG_OPEN.has(key)) CFG_OPEN.delete(key);
  else CFG_OPEN.add(key);
  void renderConfig();
}

// ── Le personnel de l'Administration ──
//
// Quatre champs sur onze passent dans le **détail déplié** plutôt que dans la
// table : le numéro d'inspecteur, les domaines, les spécialités et le niveau de
// qualification. Ce sont ceux qui n'ont de sens que pour un inspecteur, et une
// table de onze colonnes déborderait.
//
// Le détail porte aussi la **chaîne de validation** : de l'entité de
// rattachement jusqu'à la racine, avec l'intérimaire s'il y en a un. C'est la
// seule place de l'application où un agent voit qui valide ses actes.
const DETAIL_KEYS = ['numero_inspecteur', 'domaines', 'specialites', 'niveau_qualification'];

export function cfgSectionPersonnel(): string {
  const coll = 'inspecteurs';
  const schema = REF_SCHEMAS[coll];
  if (!schema) throw new Error(`référentiel inconnu : « ${coll} »`);
  const tableFields: Champ[] = schema.fields.filter((f) => !DETAIL_KEYS.includes(f.k));
  const detailFields: Champ[] = schema.fields.filter((f) => DETAIL_KEYS.includes(f.k));
  const colspan = tableFields.length + 2; // chevron + actions
  const rows = liste(coll)
    .map((r) => {
      const open = CFG_OPEN.has(`pers-${texte(r.id)}`);
      const chain = orgChainFor(r.id);
      const cells = tableFields.map((f) => `<td>${fieldValue(f, r)}</td>`).join('');
      const detailInfo = detailFields
        .map((f) => `<div class="pers-info-item"><span class="pers-info-lbl">${escapeHtml(tr(f.l))}</span><span class="pers-info-val">${fieldValue(f, r)}</span></div>`)
        .join('');
      return `
      <tr>
        <td><button class="shell-btn-icon pers-toggle" onclick="togglePers('${texte(r.id)}')" title="${t('audit_col_details')}" aria-label="${t('audit_col_details')}" style="transform:rotate(${open ? 90 : 0}deg);">${icon('chevronRight', 14)}</button></td>
        ${cells}
        <td class="actions-cell">
          <button class="shell-btn-icon" onclick="openRefModal('${coll}','${texte(r.id)}')" title="${escapeHtml(t('edit'))}" aria-label="${escapeHtml(t('edit'))}">${icon('edit', 15)}</button>
          <button class="shell-btn-icon" onclick="deleteRef('${coll}','${texte(r.id)}')" title="${escapeHtml(t('delete'))}" aria-label="${escapeHtml(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
        </td>
      </tr>
      <tr class="pers-detail-row" style="${open ? '' : 'display:none;'}">
        <td colspan="${colspan}" style="background:var(--bg);">
          <div class="pers-info-grid">${detailInfo}</div>
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.6rem 0 .4rem;">${t('circuit_validation')}</div>
          ${circuitHtml(chain)}
        </td>
      </tr>`;
    })
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${escapeHtml(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un membre du personnel...')}
      ${exportBar('inspecteurs', tr("Liste du personnel de l'Administration"))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${escapeHtml(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr><th></th>${tableFields.map((f) => `<th>${escapeHtml(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${colspan}" style="color:var(--text-muted);">${t('aucun_element')}</td></tr>`}</tbody>
    </table>
  </div>`;
}

// ── Accordéons hiérarchiques (Domaines / Secteurs / Sous-activités / Thèmes) ──

function statutBadge(s: unknown): string {
  return s === 'inactif'
    ? '<span class="shell-badge badge-inactive">Inactif</span>'
    : '<span class="shell-badge badge-active">Actif</span>';
}

function accActions(coll: string, id: unknown): string {
  return `<span style="display:flex;gap:.15rem;" onclick="event.stopPropagation()">
    <button class="shell-btn-icon" onclick="openRefModal('${coll}','${texte(id)}')" title="${escapeHtml(t('edit'))}" aria-label="${escapeHtml(t('edit'))}">${icon('edit', 15)}</button>
    <button class="shell-btn-icon" style="color:#dc2626;" onclick="deleteRef('${coll}','${texte(id)}')" title="${escapeHtml(t('delete'))}" aria-label="${escapeHtml(t('delete'))}">${icon('trash', 15)}</button>
  </span>`;
}

// Le double `JSON.stringify` n'est pas une maladresse : le premier rend l'objet,
// le second en fait un littéral de chaîne JavaScript que l'attribut `onclick`
// — délimité par des apostrophes simples — peut porter sans être refermé.
function accAddBtn(coll: string, defaults: Record<string, unknown>, label: string): string {
  const json = JSON.stringify(JSON.stringify(defaults || {}));
  return `<button class="shell-btn shell-btn-outline shell-btn-sm" style="margin-top:.6rem;" onclick='openRefModal("${coll}","",${json})'>${icon('plus', 13)} ${escapeHtml(label)}</button>`;
}

function accItem(key: string, color: string, headerHtml: string, actionsHtml: string, bodyHtml: string, dense?: boolean): string {
  const open = CFG_OPEN.has(key);
  return `
  <div class="cfg-acc-item ${open ? 'open' : ''}" style="margin-bottom:${dense ? '.1rem' : '.5rem'};">
    <div class="cfg-acc-header" style="border-left:4px solid ${color};" onclick="toggleAcc('${key}')">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">${headerHtml}</div>
      <div style="display:flex;align-items:center;gap:.35rem;">${actionsHtml}<span class="cfg-acc-chevron" style="display:flex;">${icon('chevronRight', 15)}</span></div>
    </div>
    <div class="cfg-acc-body">${bodyHtml}</div>
  </div>`;
}

// Sous-menu « Domaines & Secteurs » : accordéons Domaines → Secteurs → Sous-activités
export function cfgSectionDomaines(): string {
  const domaines = liste('domaines');
  const secteurs = liste('secteurs');
  const sousActivites = liste('sous_activites');
  const themes = liste('themes_supervision');

  const themeRow = (th: Enregistrement): string => `
    <div class="cfg-module-row" style="border-left:3px solid ${LEVEL_COLORS[3]};padding-left:.75rem;">
      <div>
        <strong>${th.code ? `<span class="shell-badge badge-neutral" style="margin-right:.4rem;">${escapeHtml(th.code)}</span>` : ''}${escapeHtml(th.libelle)}</strong>
        ${th.description ? `<div style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(th.description)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:.35rem;">${statutBadge(th.statut)}${accActions('themes_supervision', th.id)}</div>
    </div>`;

  const items = domaines
    .map((d) => {
      const dSecteurs = secteurs.filter((s) => s.domaine_id === d.id);
      const secteurItems = dSecteurs
        .map((s) => {
          const sSas = sousActivites.filter((x) => x.secteur_id === s.id);
          const saItems = sSas
            .map((x) => {
              const saThemes = themes.filter((th) => th.sous_activite_id === x.id);
              return accItem(
                `sa-${texte(x.id)}`,
                LEVEL_COLORS[2] ?? '',
                `<span class="shell-badge badge-neutral">${escapeHtml(x.code)}</span> <strong style="margin-left:.35rem;">${escapeHtml(x.nom)}</strong>
                 <span class="shell-badge badge-neutral">${saThemes.length} thème(s)</span>`,
                accActions('sous_activites', x.id),
                (saThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme') + '</p>')
                  + accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, sous_activite_id: x.id, statut: 'actif' }, 'Thème'),
                true,
              );
            })
            .join('');
          const directThemes = themes.filter((th) => th.secteur_id === s.id && !th.sous_activite_id);
          const directBlock = `
            <div style="margin-top:.4rem;">
              <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.35rem 0 .25rem;">${t('themes_du_secteur')}</div>
              ${directThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme_secteur') + '</p>'}
              ${accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, statut: 'actif' }, 'Thème')}
            </div>`;
          const nbThemes = themes.filter((th) => th.secteur_id === s.id || sSas.some((x) => x.id === th.sous_activite_id)).length;
          return accItem(
            `sect-${texte(s.id)}`,
            LEVEL_COLORS[1] ?? '',
            `<strong style="color:${LEVEL_COLORS[1]};">${escapeHtml(s.code)}</strong> — ${escapeHtml(s.nom)}
             <span class="shell-badge badge-neutral">Cycle ${escapeHtml(s.csn)} mois</span>
             <span class="shell-badge badge-neutral">${sSas.length} sous-activité(s)</span>
             <span class="shell-badge badge-neutral">${nbThemes} thème(s)</span>
             ${statutBadge(s.statut)}`,
            accActions('secteurs', s.id),
            (saItems || '')
              + accAddBtn('sous_activites', { secteur_id: s.id }, 'Sous-activité')
              + directBlock,
            true,
          );
        })
        .join('');
      return accItem(
        `dom-${texte(d.id)}`,
        LEVEL_COLORS[0] ?? '',
        `<strong style="color:${LEVEL_COLORS[0]};">${escapeHtml(d.code)}</strong> — ${escapeHtml(d.nom)}
         <span class="shell-badge badge-neutral">${dSecteurs.length} secteur(s)</span>
         ${statutBadge(d.statut)}`,
        accActions('domaines', d.id),
        (secteurItems || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_secteur') + '</p>')
          + accAddBtn('secteurs', { domaine_id: d.id }, 'Secteur'),
        true,
      );
    })
    .join('');

  // Un thème rattaché à ni un secteur ni une sous-activité ne paraîtrait nulle
  // part dans la hiérarchie : il est donc listé à part, plutôt que perdu.
  const orphans = themes.filter((th) => !th.secteur_id && !th.sous_activite_id);
  const orphanBlock = orphans.length
    ? `<div style="margin-top:1rem;">
        <div class="portal-page-header"><h3>${tr('Thèmes non rattachés')}</h3></div>
        ${orphans.map(themeRow).join('')}
      </div>`
    : '';

  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${tr('Domaines | Secteurs | Sous-activités | Thèmes')}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un domaine / secteur...')}
      ${exportBar('activites', tr('Domaines | Secteurs | Sous-activités | Thèmes'), 'exportPdfActivites()')}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('domaines')">${icon('plus', 13)} Domaine</button>
    </div>
  </div>
  <div class="cfg-accordion cfg-acc-dense">${items || '<p style="color:var(--text-muted);">' + t('aucun_domaine_defini') + '</p>'}</div>
  ${orphanBlock}`;
}
