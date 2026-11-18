// OASIS — « Mesures d'Application » (CARE) : l'étape « Suivi des Mesures »
// (ADR-003, 5.c — n° 5.f.120).
//
// Dernière étape du traitement d'une carence. Les mesures ont été arrêtées à
// la qualification et sont entrées au registre ; il s'agit ici de suivre leur
// mise en œuvre — ce que le prestataire en a fait, où en est chacune, et ce
// qu'il en produit comme pièce.
//
// Le suivi n'entretient pas de copie des mesures : il écrit sur celles du
// registre, si bien que le menu « Mesures » lit aussitôt ce qui est saisi ici.
//
// Converti à la lettre depuis `mes-suivi.js` : le balisage est rendu caractère
// pour caractère, chaque requête part avec le même corps.
import { etat, mt, requis } from './partage';

/** Une pièce jointe, telle que `/upload` la rend et que le suivi la garde. */
interface PieceSuivi { nom?: string; path?: string; size?: number }
/** Une mesure du registre, vue par le suivi — les champs lus d'ici. */
export interface MesureSuivi {
  id?: string;
  reference?: string;
  categorie?: string;
  type_mesure?: string;
  description?: string;
  date_sanction?: string;
  date_emission?: string;
  date_echeance?: string;
  date_fin_sanction?: string;
  suivi_commentaire?: string;
  suivi_statut?: string;
  suivi_pieces?: PieceSuivi[];
  recours_intente?: boolean;
  [champ: string]: unknown;
}
/** Le traitement d'une carence, vu par le suivi. */
interface TraitementSuivi {
  suivi?: { commentaire_general?: string; [champ: string]: unknown };
  mesures?: MesureSuivi[];
  qualification?: { nature?: string; [champ: string]: unknown };
  cloture_le?: string;
  [champ: string]: unknown;
}
/** Ce que la saisie relève, et ce que le serveur reçoit. */
interface SaisieSuivi {
  commentaire_general: string;
  mesures: { id: string; suivi_commentaire: string; suivi_statut: string; recours_intente: boolean; suivi_pieces: { nom: string; path: string }[] }[];
}

const traitement = (): TraitementSuivi => (etat().traitement || {}) as TraitementSuivi;
// L'échappement est celui du socle : `_mesEsc` et `_mesAttr` n'en étaient que
// deux noms.
const esc = (v: unknown): string => window.oasisEsc(v);
const icone = (nom: string): string => requis('MES_ICONS')[nom] as string;
const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;

export const mesSuivi = (): { commentaire_general?: string; [champ: string]: unknown } => traitement().suivi || { commentaire_general: '' };
export const mesSuiviMesures = (): MesureSuivi[] => (traitement().mesures) || [];

// Un dossier classé, ou clôturé faute de suivi à conduire, ne se saisit plus :
// l'étape se consulte. Le serveur repose la même garde.
export const mesSuiviClos = (): boolean => requis('mesTraitementClos')() || !!traitement().cloture_le;
export const mesSuiviModifiable = (): boolean => requis('mesPeutEcrire')() && !mesSuiviClos();

// ── Section A — ce que la qualification a retenu ──
// La carence et la nature de l'infraction : de quoi se souvenir, en tête de
// l'étape, de ce qui a valu les mesures. Rien n'y est modifiable.
export function mesSectionSuiviMesures(): string {
  const c = (etat().carenceEnCours || {}) as { description?: string };
  const q = traitement().qualification || {};
  return requis('mesSection')('A', mt('nav_mesures'), `
        <div class="mes-champ">
            <label>${mt('description_carence')}</label>
            <div class="mes-lecture">${c.description ? esc(c.description)
    : '<span class="mes-preuve-vide">—</span>'}</div>
        </div>
        <div class="mes-champ" style="margin-bottom:0;">
            <label>${mt('nature_infraction')}</label>
            <div class="mes-lecture">${q.nature ? esc(q.nature)
    : '<span class="mes-preuve-vide">—</span>'}</div>
        </div>`);
}

// ── Section B — le plan d'action, mesure par mesure ──
// Un bloc par mesure : à gauche ce que l'instance a arrêté, en lecture ; à
// droite et en dessous, ce que le suivi y ajoute.
export function mesBlocSuiviMesure(m: MesureSuivi, i: number): string {
  const off = mesSuiviModifiable() ? '' : 'disabled';
  const ro = !!off;
  const statut = m.suivi_statut || requis('mesStatutSuivi')(m);
  const pieces = (Array.isArray(m.suivi_pieces) ? m.suivi_pieces : []).map((p, k) => `
        <div class="mes-preuve" data-chemin="${esc(p.path || '')}">
            <input class="mes-input" value="${esc(p.nom || '')}"
                   placeholder="${esc(mt('intitule_piece'))}" ${off}>
            ${requis('_mesChemin')(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${esc(requis('_mesChemin')(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${esc(mt('ouvrir'))}">${icone('download')}</a>` : ''}
            ${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}"
                onclick="mesSuiviRetirerPiece(${i}, ${k})">${icone('x')}</button>`}
        </div>`).join('');

  return `<div class="mes-bloc" data-rang="${i}" data-mesure="${esc(m.id || '')}">
        <div class="mes-bloc-entete">
            <span class="mes-bloc-titre">${esc(m.reference || mt('mesure'))}</span>
        </div>
        <div class="mes-bloc-corps">
            <div class="mes-paire">
                <div class="mes-champ">
                    <label>${mt('categorie_mesure')}</label>
                    <div class="mes-lecture">${esc(requis('mesLibelleCategorie')(m.categorie) || '—')}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('type_mesure')}</label>
                    <div class="mes-lecture">${esc(requis('mesLibelleType')(m.type_mesure) || '—')}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>${mt('fiche_desc_sanction')}</label>
                <div class="mes-lecture">${m.description ? esc(m.description)
    : '<span class="mes-preuve-vide">—</span>'}</div>
            </div>
            <div class="mes-trois">
                <div class="mes-champ">
                    <label>${mt('fiche_date_sanction')}</label>
                    <div class="mes-lecture">${esc(requis('mesDate')(m.date_sanction || m.date_emission))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('col_echeance')}</label>
                    <div class="mes-lecture">${esc(requis('mesDate')(m.date_echeance))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('fiche_date_fin')}</label>
                    <div class="mes-lecture">${esc(requis('mesDate')(m.date_fin_sanction))}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>${mt('commentaire_suivi')}</label>
                <textarea class="mes-input" data-champ="suivi_commentaire" rows="3" ${off}
                          placeholder="${esc(mt('commentaire_suivi_exemple'))}"
                    >${esc(m.suivi_commentaire || '')}</textarea>
            </div>
            <div class="mes-champ">
                <div class="mes-champ-entete">
                    <label>${mt('col_statut_suivi')}</label>
                    <label class="mes-case">
                        <input type="checkbox" data-champ="recours_intente" ${off}
                               ${m.recours_intente ? 'checked' : ''}
                               onchange="mesSuiviRecours(${i}, this.checked)">
                        <span>${mt('recours_intente_par')}</span>
                    </label>
                </div>
                <select class="mes-select" data-champ="suivi_statut" ${off || (m.recours_intente ? 'disabled' : '')}
                        onchange="mesSuiviStatut(${i}, this.value)">
                    ${Object.keys(requis('MES_SUIVI')).map((cle) => `<option value="${esc(cle)}"
                        ${statut === cle ? 'selected' : ''}>${esc(requis('mesLibelleSuivi')(cle))}</option>`).join('')}
                </select>
                <p class="mes-note">${esc(requis('MES_SUIVI')[statut] ? requis('mesAideSuivi')(statut) : '')}</p>
            </div>
            <div class="mes-champ" style="margin-bottom:0;">
                <label>${mt('pieces_jointes')}</label>
                <div class="mes-suivi-pieces">${pieces
    || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
                ${ro ? '' : `<input type="file" id="mesSuiviFichier_${i}" multiple style="display:none;"
                        onchange="mesSuiviTeleverser(${i}, this.files)">
                    <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                            onclick="document.getElementById('mesSuiviFichier_${i}').click()">
                        ${icone('add')} ${mt('ajouter_piece')}</button>`}
            </div>
        </div>
    </div>`;
}

export function mesSectionPlanAction(): string {
  const off = mesSuiviModifiable() ? '' : 'disabled';
  const mesures = mesSuiviMesures();
  const blocs = mesures.map(mesBlocSuiviMesure).join('');
  return requis('mesSection')('B', mt('sec_plan_action'), `
        <div id="mesSuiviMesures">${blocs || `<p class="mes-preuve-vide">${mt('aucune_mesure_rattachee')}</p>`}</div>
        <div class="mes-champ" style="margin-top:.9rem;margin-bottom:0;">
            <label>${mt('commentaire_general')}</label>
            <textarea class="mes-input" id="mesSuiviCommentaire" rows="4" ${off}
                      placeholder="${esc(mt('commentaire_general_exemple'))}"
                >${esc(mesSuivi().commentaire_general || '')}</textarea>
        </div>`);
}

// ── Saisie ──
// Ce qui est tapé se relève avant tout redessin, comme aux autres étapes :
// ajouter une pièce ou changer un statut ne doit rien perdre.
export function mesCollecterSuivi(): SaisieSuivi | null {
  const racine = document.getElementById('mesSuiviMesures');
  if (!racine) return null;
  const val = (bloc: Element, champ: string): string => {
    const el = bloc.querySelector<HTMLInputElement>(`[data-champ="${champ}"]`);
    return el ? String(el.value || '').trim() : '';
  };
  const mesures = [...racine.querySelectorAll<HTMLElement>('.mes-bloc')].map((bloc) => ({
    id: bloc.dataset['mesure'] || '',
    suivi_commentaire: val(bloc, 'suivi_commentaire'),
    suivi_statut: val(bloc, 'suivi_statut'),
    recours_intente: !!bloc.querySelector<HTMLInputElement>('[data-champ="recours_intente"]')?.checked,
    suivi_pieces: [...bloc.querySelectorAll<HTMLElement>('.mes-suivi-pieces .mes-preuve')].map((r) => ({
      nom: r.querySelector('input')?.value || '', path: r.dataset['chemin'] || '',
    })),
  }));
  const zone = document.getElementById('mesSuiviCommentaire') as HTMLTextAreaElement | null;
  return { commentaire_general: zone ? zone.value : '', mesures };
}

// La saisie se replie sur l'état : les mesures du traitement portent ce qui
// vient d'être tapé, et le redessin les retrouve.
export const mesMajSuivi = (): void => {
  const saisi = mesCollecterSuivi();
  if (!saisi) return;
  const parId = new Map(saisi.mesures.map((m) => [m.id, m]));
  const t = traitement();
  etat().traitement = {
    ...t,
    suivi: { ...(t.suivi || {}), commentaire_general: saisi.commentaire_general },
    mesures: (t.mesures || []).map((m) => (parId.has(m.id as string) ? { ...m, ...parId.get(m.id as string) } : m)),
  };
};

const mesSuiviRedessiner = (): void => { requis('mesAfficherSlider')({ anime: false }); };

export function mesSuiviModifier(action: (mesures: MesureSuivi[]) => void): void {
  mesMajSuivi();
  const t = traitement();
  const mesures = (t.mesures || []).slice();
  action(mesures);
  etat().traitement = { ...t, mesures };
  mesSuiviRedessiner();
}

// Changer le statut redessine : l'aide qui l'accompagne doit suivre le choix.
export const mesSuiviStatut = (i: number, valeur: string): void => mesSuiviModifier((mesures) => {
  const m = mesures[i];
  if (m) mesures[i] = { ...m, suivi_statut: valeur };
});

// Un recours suspend le suivi : le statut passe à « Recours » et cesse de se
// choisir, tant que l'instance ne l'a pas examiné. Le décocher rend la main.
export const mesSuiviRecours = (i: number, coche: boolean): void => mesSuiviModifier((mesures) => {
  const m = mesures[i];
  if (!m) return;
  mesures[i] = {
    ...m,
    recours_intente: !!coche,
    suivi_statut: coche ? 'recours'
      : (m.suivi_statut === 'recours' ? '' : m.suivi_statut),
  } as MesureSuivi;
});

export const mesSuiviRetirerPiece = (i: number, k: number): void => mesSuiviModifier((mesures) => {
  const m = mesures[i];
  if (!m) return;
  const pieces = (m.suivi_pieces || []).filter((_, n) => n !== k);
  mesures[i] = { ...m, suivi_pieces: pieces };
});

export async function mesSuiviTeleverser(i: number, fichiers: FileList | File[] | null): Promise<void> {
  if (!fichiers || !fichiers.length) return;
  mesMajSuivi();
  const t = traitement();
  const mesures = (t.mesures || []).slice();
  const m = mesures[i];
  if (!m) return;
  const pieces = (m.suivi_pieces || []).slice();
  for (const f of Array.from(fichiers)) {
    try {
      const corps = new FormData();
      corps.append('file', f);
      const r = await requis('mesApi')('/upload', { method: 'POST', body: corps }) as { filename?: string; path?: string; size?: number };
      pieces.push({ nom: r.filename, path: r.path, size: r.size } as PieceSuivi);
    } catch (e) { requis('mesToast')(messageDe(e) || mt('depot_impossible'), 'error'); }
  }
  mesures[i] = { ...m, suivi_pieces: pieces };
  etat().traitement = { ...t, mesures };
  mesSuiviRedessiner();
}

export async function mesEnregistrerSuivi(): Promise<void> {
  const c = etat().carenceEnCours as { id: string } | null | undefined;
  if (!c) return;
  mesMajSuivi();
  const corps = mesCollecterSuivi();
  if (!corps) return;
  try {
    const api = requis('mesApi');
    await api(`/constatations/${encodeURIComponent(c.id)}/suivi`, {
      method: 'PUT', body: JSON.stringify(corps),
    });
    // Le registre a bougé : la liste des mesures et celle des carences le
    // disent, l'une par ses statuts de suivi, l'autre par sa clôture.
    etat().traitement = await api(`/constatations/${encodeURIComponent(c.id)}/traitement`);
    await requis('mesRechargerMesures')();
    etat().data.constatations = await api('/constatations');
    requis('mesToast')(mt('suivi_enregistre'));
    mesSuiviRedessiner();
  } catch (e) { requis('mesToast')(messageDe(e) || mt('enregistrement_impossible'), 'error'); }
}

// Actions de l'étape, à l'extrême droite du fil. Clôturer ferme le dossier ;
// l'action de recours le fait reculer à la qualification, où l'instance
// examinera ce que le prestataire conteste.
export function mesActionsSuivi(): string {
  if (mesSuiviClos()) {
    return `<span class="mes-badge cloturee">${mt('traitement_cloture')}</span>`;
  }
  if (!requis('mesPeutDecider')()) return '';
  const recours = mesSuiviMesures().filter((m) => m.recours_intente).length;
  const bouton = (actif: boolean, classe: string, aide: string, geste: string, libelle: string): string => `<button class="btn btn-sm ${classe}"
        ${actif ? '' : 'disabled'} title="${esc(aide)}"
        onclick="${geste}">${esc(libelle)}</button>`;
  return [
    bouton(!!recours, 'mes-btn-investiguer',
      recours ? mt('s_contestees', recours) : mt('s_cocher_recours'),
      'mesSuiviActionRecours()', mt('s_action_recours')),
    bouton(!recours, 'mes-btn-mesure',
      recours ? mt('s_recours_en_cours') : mt('s_aide_cloturer'),
      'mesSuiviCloturer()', mt('cloturer')),
  ].join('');
}

// Les deux issues enregistrent d'abord ce qui est saisi : le serveur relit le
// suivi pour vérifier qu'un recours a bien été coché.
export async function mesSuiviIssue(chemin: string, confirmation: Record<string, unknown>, fait: string): Promise<void> {
  const E = etat();
  const c = E.carenceEnCours as { id: string } | null | undefined;
  if (!c) return;
  if (!await requis('mesConfirmerEtape')(confirmation)) return;
  mesMajSuivi();
  const corps = mesCollecterSuivi();
  try {
    const api = requis('mesApi');
    if (corps) {
      await api(`/constatations/${encodeURIComponent(c.id)}/suivi`, {
        method: 'PUT', body: JSON.stringify(corps),
      });
    }
    await api(`/constatations/${encodeURIComponent(c.id)}/suivi/${chemin}`, { method: 'POST' });
    E.traitement = await api(`/constatations/${encodeURIComponent(c.id)}/traitement`);
    E.etapeVue = '';
    await requis('mesRechargerMesures')();
    E.data.constatations = await api('/constatations');
    requis('mesToast')(fait);
    mesSuiviRedessiner();
    if (E.currentPage === 'critiques') requis('mesRenderPage')();
  } catch (e) { requis('mesToast')(messageDe(e) || mt('operation_impossible'), 'error'); }
}

export const mesSuiviCloturer = (): Promise<void> => mesSuiviIssue('cloturer', {
  titre: mt('s_titre_cloturer'),
  depuis: 'suivi', vers: '',
  consequence: mt('s_cons_cloturer'),
  points: [mt('s_pt_cloturer1'), mt('s_pt_cloturer2')],
  aveu: mt('s_aveu_cloturer'),
  libelle: mt('cloturer'), classe: 'mes-btn-mesure',
}, mt('s_toast_cloturer'));

export const mesSuiviActionRecours = (): Promise<void> => mesSuiviIssue('recours', {
  titre: mt('s_titre_recours'),
  depuis: 'suivi', vers: 'qualification',
  consequence: mt('s_cons_recours'),
  points: [mt('s_pt_recours1'), mt('s_pt_recours2')],
  aveu: mt('s_aveu_recours'),
  libelle: mt('s_libelle_recours'), classe: 'mes-btn-investiguer',
}, mt('s_toast_recours'));
