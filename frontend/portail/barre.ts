// OASIS — La barre d'écran : recherche, export, import (ADR-003, 5.e.0).
//
// Deuxième moitié de la première pièce d'`app.js`. Avec `libelles.ts`, elle rend
// les **trois prêts** que les cinq modules de 5.d lisaient encore sur `window` :
// `tr`, `searchInputHtml` et `exportBar`.
//
// ── Un état de plus qui n'a pas eu à monter sur `window` ──
//
// `PORTAIL_RECHERCHE` — le champ est-il ouvert, et que porte-t-il — était un
// `const` du premier niveau d'`app.js`, donc une globale **lexicale**. Aucun
// autre fichier ne le lisait : il devient une variable privée du module, comme
// `AAC_CFG` en 5.d.5. C'est la règle de 5.b, et le critère est toujours le même —
// **ce qu'un autre fichier doit atteindre**, non la nature de la donnée.
//
// ── Le champ de recherche ne redessine pas l'écran, et c'est délibéré ──
//
// Les quatre gestes agissent sur le document **en place** : re-rendre ferait
// perdre le focus, et le filtrage travaille déjà sur le DOM posé. C'est pourquoi
// `portailOuvrirRecherche` fabrique son bouton de vidage à la main au lieu
// d'attendre un redessin. Le commentaire d'origine le disait ; il est conservé.
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import type { DonneesErreur } from '../socle/commun';
import { icon } from './icones';
import { t } from './traductions';
import { tr } from './libelles';
import { refLabel, type Enregistrement } from './schemas';
import { loadRefs } from './outils';

declare global {
  interface Window {
    /** Le champ de recherche d'un écran, au repos ou ouvert. */
    searchInputHtml: (ph?: string) => string;
    /** Ouvre le champ : le document est touché en place, sans redessin. */
    portailOuvrirRecherche: () => void;
    /** Prend la saisie et filtre la portée. */
    portailChercher: (champ: HTMLInputElement) => void;
    /** Vide la saisie, referme le champ, et défait le filtre. */
    portailViderRecherche: () => void;
    /** Referme le champ s'il repart vide. */
    portailFermerRechercheSiVide: () => void;
    /** Remet la recherche au repos : changer d'écran ne garde pas son filtre. */
    portailReinitialiserRecherche: () => void;
    /** La barre d'export / import d'un référentiel. */
    exportBar: (coll: string, title: string, pdfFn?: string) => string;
    /** La fenêtre d'impression. Publiée parce qu'elle l'était ; lue par personne. */
    pdfWindow: (title: string, bodyHtml: string) => void;
    /** Imprime les tables de l'écran courant. */
    exportPdf: (title: string) => void;
    /** Imprime les quatre tables de la taxinomie de la surveillance. */
    exportPdfActivites: () => void;
    /** Ouvre la fenêtre d'import d'un référentiel. */
    openImportModal: (coll: string, title: string) => void;
    /** Envoie le classeur choisi au référentiel. */
    doImport: (coll: string) => Promise<void>;
    /** Filtre la portée du champ : tables, accordéons, ou groupes d'exigences. */
    filterScope: (champ: HTMLInputElement) => void;
  }
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

// Le geste est celui du menu « Inspections » de RAMP : au repos une pastille
// qui dit « Rechercher », et le champ la remplace au clic, en s'étirant sur
// tout ce que la ligne laisse jusqu'au premier bouton. Il se referme s'il
// repart vide — le rang retrouve alors sa place.
const PORTAIL_RECHERCHE = { ouverte: false, valeur: '' };

export function searchInputHtml(ph?: string): string {
  const ouverte = PORTAIL_RECHERCHE.ouverte || !!PORTAIL_RECHERCHE.valeur;
  const libelle = escapeHtml(ph || 'Rechercher...');
  return `
    <div class="cfg-search-wrap${ouverte ? ' ouverte' : ''}" id="portailRecherche">
      <button class="cfg-search-loupe" type="button" title="${libelle}" aria-label="${libelle}"
              onclick="portailOuvrirRecherche()">${icon('search', 14)}<span>Rechercher</span></button>
      <input class="cfg-search-input" type="search" placeholder="${libelle}" aria-label="${libelle}"
             value="${escapeHtml(PORTAIL_RECHERCHE.valeur)}"
             oninput="portailChercher(this)" onblur="portailFermerRechercheSiVide()">
      ${ouverte ? `<button class="shell-btn-icon cfg-search-reset" type="button" title="${t('vider_recherche')}" aria-label="${t('vider_recherche')}"
              onmousedown="event.preventDefault()" onclick="portailViderRecherche()">${icon('x', 14)}</button>` : ''}
    </div>`;
}

// Le champ remplace la pastille sans redessiner l'écran : re-rendre ferait
// perdre le focus, et le filtrage travaille déjà sur le DOM en place.
export function portailOuvrirRecherche(): void {
  PORTAIL_RECHERCHE.ouverte = true;
  const boite = document.getElementById('portailRecherche');
  if (!boite) return;
  boite.classList.add('ouverte');
  // Le bouton de vidage n'existe qu'ouverte : il est posé ici plutôt que
  // d'attendre un redessin, qui ferait perdre le focus.
  if (!boite.querySelector('.cfg-search-reset')) {
    const reset = document.createElement('button');
    reset.className = 'shell-btn-icon cfg-search-reset';
    reset.type = 'button';
    reset.title = 'Vider la recherche';
    reset.innerHTML = icon('x', 14);
    reset.onmousedown = (e) => e.preventDefault();
    reset.onclick = portailViderRecherche;
    boite.appendChild(reset);
  }
  const champ = boite.querySelector<HTMLInputElement>('.cfg-search-input');
  if (champ) champ.focus();
}

export function portailChercher(champ: HTMLInputElement): void {
  PORTAIL_RECHERCHE.valeur = champ.value;
  filterScope(champ);
}

export function portailViderRecherche(): void {
  PORTAIL_RECHERCHE.valeur = '';
  PORTAIL_RECHERCHE.ouverte = false;
  const boite = document.getElementById('portailRecherche');
  if (!boite) return;
  const champ = boite.querySelector<HTMLInputElement>('.cfg-search-input');
  if (champ) { champ.value = ''; filterScope(champ); }
  boite.classList.remove('ouverte');
  const reset = boite.querySelector('.cfg-search-reset');
  if (reset) reset.remove();
}

export function portailFermerRechercheSiVide(): void {
  if (PORTAIL_RECHERCHE.valeur) return;
  portailViderRecherche();
}

// Changer d'écran ou de sous-menu remet la recherche au repos : elle ne porte
// que sur ce qu'on regarde.
export function portailReinitialiserRecherche(): void {
  PORTAIL_RECHERCHE.ouverte = false;
  PORTAIL_RECHERCHE.valeur = '';
}

export function exportBar(coll: string, title: string, pdfFn?: string): string {
  const pdf = pdfFn || `exportPdf('${escapeHtml(title)}')`;
  return `
    <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="${pdf}" title="Exporter PDF">${icon('fileText', 13)} Exporter PDF</button>
    <a class="shell-btn shell-btn-primary shell-btn-sm" href="/api/referentiels/${coll}/export" title="Exporter Excel">${icon('download', 13)} Exporter Excel</a>
    <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openImportModal('${coll}','${escapeHtml(title)}')" title="Importer">${icon('layers', 13)} Importer</button>`;
}

/**
 * La fenêtre d'impression.
 *
 * ── `window.open` peut rendre `null`, et l'original ne le traitait pas ──
 *
 * Un navigateur qui bloque les fenêtres rend `null`, et l'original écrivait
 * `w.document.write` dessus : `TypeError`, console, et rien à l'écran. Le chemin
 * est atteignable — les deux appels partent bien d'un clic, mais une extension ou
 * un réglage suffit.
 *
 * On lève donc, avec un message qui nomme la cause. C'est le même choix qu'en
 * 5.d.1, 5.d.5 et 5.d.6 ; la divergence est le texte, et elle est assertée.
 */
export function pdfWindow(title: string, bodyHtml: string): void {
  const w = window.open('', '_blank');
  if (!w) throw new Error("la fenêtre d'impression n'a pas pu s'ouvrir — elle est probablement bloquée");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:18px;color:#111}h2,h3{color:#1a365d}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}th,td{border:1px solid #ccc;padding:5px 7px;font-size:11px;text-align:left}
    th{background:#eef2f7}.actions-cell,button,input,.shell-btn-icon{display:none!important}</style></head>
    <body><h2>${escapeHtml(title)}</h2>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

export function exportPdf(title: string): void {
  const scope = document.querySelector('.cfg-content') || document.getElementById('mainView');
  if (!scope) throw new Error("rien à imprimer : ni « cfg-content » ni « mainView » dans le document");
  const tables = [...scope.querySelectorAll('.shell-table-container')].map((c) => c.outerHTML).join('');
  pdfWindow(title, `<div>${tables}</div>`);
}

/** Une colonne du document d'activités : la clé, l'en-tête, et un rendu facultatif. */
type Colonne = [string, string] | [string, string, (r: Enregistrement) => string];

// PDF Activités supervisées : construit 4 tables depuis les référentiels
export function exportPdfActivites(): void {
  const liste = (coll: string): Enregistrement[] => (window.REFS[coll] ?? []) as Enregistrement[];
  const brut = (v: unknown): string => (v == null ? '' : String(v));
  const table = (heading: string, cols: Colonne[], rows: Enregistrement[]) => `
    <h3>${escapeHtml(heading)}</h3>
    <table><thead><tr>${cols.map((c) => `<th>${escapeHtml(c[1])}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(c[2] ? c[2](r) : brut(r[c[0]]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const domCode = (id: unknown) => refLabel('domaines', brut(id), 'code');
  const secCode = (id: unknown) => refLabel('secteurs', brut(id), 'code');
  const body =
    table(tr('Domaines'), [['code', tr('Code')], ['nom', tr('Nom')], ['description', tr('Description')], ['statut', tr('Statut')]], liste('domaines')) +
    table(tr('Secteurs'), [['code', tr('Code')], ['nom', tr('Nom')], ['domaine_id', tr('Domaine'), (r) => domCode(r.domaine_id)], ['csn', tr('Cycle (mois)')], ['statut', tr('Statut')]], liste('secteurs')) +
    table(tr('Sous-activités'), [['code', tr('Code')], ['nom', tr('Nom')], ['secteur_id', tr('Secteur'), (r) => secCode(r.secteur_id)]], liste('sous_activites')) +
    table(tr('Thèmes de supervision'), [['code', tr('Code')], ['libelle', tr('Libellé')], ['domaine_id', tr('Domaine'), (r) => domCode(r.domaine_id)], ['secteur_id', tr('Secteur'), (r) => secCode(r.secteur_id)], ['statut', tr('Statut')]], liste('themes_supervision'));
  pdfWindow(tr('Domaines / Secteurs / Sous-activités / Thèmes'), body);
}

export function openImportModal(coll: string, title: string): void {
  const racine = document.getElementById('cfgModalRoot');
  if (!racine) return;
  racine.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:460px;">
      <div class="shell-modal-header"><h3>Importer Excel — ${escapeHtml(title)}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeRefModal()" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem;">${t('import_marche_a_suivre')}</p>
        <a class="shell-btn shell-btn-outline" href="/api/referentiels/${coll}/template" style="margin-bottom:1rem;">${icon('download', 14)} Télécharger le modèle (.xlsx)</a>
        <div class="shell-form-group">
          <label>${t('fichier_renseigne')}</label>
          <input class="shell-input" type="file" id="importFile" accept=".xlsx">
        </div>
        <div id="importResult" style="font-size:.8rem;margin-top:.6rem;"></div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="doImport('${coll}')">${icon('layers', 14)} Importer</button>
      </div>
    </div>
  </div>`;
}

/**
 * Envoie le classeur choisi.
 *
 * Le compte rendu est celui de l'original, et il porte le défaut nommé en
 * 5.c.9 : une mise à jour **annoncée** l'est même quand le référentiel refuse la
 * ligne. La suite « parcours » le tient ; la conversion ne corrige pas.
 */
export async function doImport(coll: string): Promise<void> {
  const champ = document.getElementById('importFile');
  if (!champ) throw new Error("champ introuvable dans la fenêtre : « importFile »");
  const file = (champ as HTMLInputElement).files?.[0];
  if (!file) { showToast(t('choisir_xlsx'), 'warning'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    const res = await appel(`/api/referentiels/${coll}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileB64: reader.result }),
    });
    // Le même objet sert aux deux branches, comme dans l'original : le compte
    // rendu d'un succès et le message d'un refus. Le type dit les deux.
    type Compte = DonneesErreur & { added?: number; updated?: number; errors?: string[] };
    const d = await res.json().catch(() => ({})) as Compte;
    if (res.ok) {
      const errs = d.errors || [];
      const msg = `${d.added || 0} ajout(s), ${d.updated || 0} mise(s) à jour`
        + (errs.length ? ` — ${errs.length} ligne(s) ignorée(s)` : '');
      showToast(msg, errs.length ? 'warning' : 'success', errs.length ? 8000 : 4000);
      if (errs.length) console.warn('Import — lignes ignorées :\n' + errs.join('\n'));
      // ── `closeRefModal` est lu sur `window`, et c'est pour éviter un cycle ──
      //
      // Il appartient à `referentiels.ts` (5.d.1), qui importe désormais
      // `searchInputHtml` et `exportBar` d'ici. L'importer en retour ferait un
      // cycle entre la barre et le CRUD — que les deux survivraient, les deux
      // noms n'étant lus qu'à l'appel, mais qui dirait faux sur ce qui dépend de
      // quoi.
      //
      // Le vrai couplage est ailleurs, et il est réel : la fenêtre d'import et
      // celles des référentiels partagent la racine `cfgModalRoot`. Il se
      // dénouera quand cette racine aura son module ; d'ici là, le prêt est dans
      // ce sens-ci.
      window.closeRefModal();
      await loadRefs();
      void window.renderConfig();
    } else showToast(window.oasisMessageErreur(d, res.status, t('erreur_import')), 'error');
  };
  reader.readAsDataURL(file);
}

// Filtre client : tables, accordéons (domaines), groupes (exigences)
export function filterScope(champ: HTMLInputElement): void {
  const q = champ.value.trim().toLowerCase();
  const scope = champ.closest('.cfg-content') || document.getElementById('mainView');
  if (!scope) return;
  const groups = scope.querySelectorAll<HTMLElement>('.exig-group');
  if (groups.length) {
    groups.forEach((g) => {
      const m = !q || (g.textContent ?? '').toLowerCase().includes(q);
      g.style.display = m ? '' : 'none';
      if (m && q) g.classList.remove('collapsed');
    });
    return;
  }
  const accItems = scope.querySelectorAll<HTMLElement>('.cfg-accordion > .cfg-acc-item');
  if (accItems.length) {
    accItems.forEach((it) => { it.style.display = !q || (it.textContent ?? '').toLowerCase().includes(q) ? '' : 'none'; });
    return;
  }
  scope.querySelectorAll<HTMLElement>('tbody tr').forEach((ligne) => {
    if (ligne.classList.contains('pers-detail-row')) return;
    ligne.style.display = !q || (ligne.textContent ?? '').toLowerCase().includes(q) ? '' : 'none';
  });
}
