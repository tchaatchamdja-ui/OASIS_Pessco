// OASIS — « Mesures d'Application » (CARE) : les mesures arrêtées, section E
// de l'étape « Qualification et Mesures », avec la durée et le terme qui se
// déduisent l'un de l'autre (ADR-003, 5.c — n° 5.f.123). Partie de
// `mes-qualification.js` ; voir `qualification-commun.ts` pour le partage.
import type { ConfigDates } from '../socle/dates';
import { etat, mt, requis } from './partage';
import {
  champId, chemin, date, esc, icone, messageDe, mesMajQualification, mesQualification,
  mesQualModifiable, mesQualModifier, mesQualRedessiner, section, traitementPresent,
} from './qualification-commun';
import type { MesureQual, Piece, Recours, VersionPrecedente } from './formes';

// ── Section E — les mesures arrêtées ──
// Elle ne s'ouvre que si l'infraction est constituée : sans infraction, il n'y
// a pas de mesure d'application à prendre.
// Ce que la mesure était avant que le recours ne la fasse modifier. Repliée
// par défaut : c'est une trace, pas une saisie.
export function mesQualVersionPrecedente(m: MesureQual): string {
  const v: VersionPrecedente = m.version_precedente || {};
  const portee = ({ temporelle: mt('limitee_temps'), illimitee: mt('illimitee'), sans_objet: mt('sans_objet') } as Record<string, string | undefined>)[v.portee as string] || '—';
  const duree = v.portee === 'temporelle' && v.duree_valeur
    ? `${v.duree_valeur} ${v.duree_unite || 'jours'}` : '';
  const fiche = (t: string, valeur: unknown): string => requis('mesLigneFiche')(t, valeur);
  return `<details class="mes-version">
        <summary>${mt('version_precedente')}</summary>
        <dl style="margin:.4rem 0 0;">
            ${fiche(mt('fiche_categorie'), requis('mesLibelleCategorie')(v.categorie))}
            ${fiche(mt('fiche_type'), requis('mesLibelleType')(v.type_mesure))}
            ${fiche(mt('fiche_date_sanction'), v.date_sanction ? date(v.date_sanction) : '')}
            ${fiche(mt('fiche_portee'), duree ? `${portee} · ${duree}` : portee)}
            ${fiche(mt('fiche_date_fin'), v.date_fin ? date(v.date_fin) : '')}
            ${fiche(mt('fiche_desc_sanction'), v.commentaire)}
        </dl>
    </details>`;
}

export function mesSectionMesuresArretees(): string {
  const q = mesQualification();
  if (!q.infraction_constituee) {
    return section('E', mt('onglet_mesures'),
      `<p class="mes-preuve-vide">${mt('aucune_mesure_sans_infraction')}</p>`);
  }
  const off = mesQualModifiable() ? '' : 'disabled';
  const cats = requis('mesCategories')();

  const blocs = (q.mesures || []).map((m, i) => {
    const libelleCat = (cats.find((c) => c.code === m.categorie) || {} as { libelle?: string }).libelle || mt('mesure');
    const types = requis('mesTypesDe')(m.categorie as string);
    // Une sanction court sur une durée, sans terme, ou hors du temps —
    // un avertissement ne dure pas, il est prononcé. Les trois cases
    // disent la même portée par ses trois faces, elles s'excluent.
    const temporelle = m.portee === 'temporelle';
    const illimitee = m.portee === 'illimitee';
    const sansObjet = m.portee === 'sans_objet';
    // Une mesure annulée sur recours ne se réécrit plus ; une mesure
    // modifiée rouvre ses champs, et garde sous elle, repliée, la version
    // que le recours a fait tomber.
    const annulee = m.statut_recours === 'annulee';
    const modifiee = m.statut_recours === 'modifiee';
    const offBloc = annulee ? 'disabled' : off;
    return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${esc(libelleCat)}</span>
                ${annulee ? `<span class="mes-badge annulee">${mt('st_annulee')}</span>` : ''}
                ${modifiee ? `<span class="mes-badge notifiee">${mt('st_modifiee')}</span>` : ''}
                ${offBloc ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer_mesure'))}" aria-label="${esc(mt('retirer_mesure'))}"
                    onclick="mesQualRetirerMesure(${i})">${icone('x')}</button>`}
            </div>
            <div class="mes-bloc-corps">
                ${modifiee ? mesQualVersionPrecedente(m) : ''}
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('categorie_mesure')}</label>
                        <select class="mes-select" data-champ="categorie" ${offBloc}
                                onchange="mesQualCategorieMesure(${i}, this.value)">
                            <option value="">—</option>
                            ${cats.map((c) => `<option value="${esc(c.code)}"
                                ${m.categorie === c.code ? 'selected' : ''}>${esc(c.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('type_mesure')}</label>
                        <select class="mes-select" data-champ="type_mesure" ${offBloc}>
                            <option value="">—</option>
                            ${types.map((t) => `<option value="${esc(t.code)}"
                                ${m.type_mesure === t.code ? 'selected' : ''}>${esc(t.libelle)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('fiche_date_sanction')}</label>
                        <input type="date" class="mes-input" data-champ="date_sanction"
                               value="${esc(m.date_sanction || '')}" ${offBloc}
                               onchange="oasisDatesBorner(mesDatesSanction(${i}))">
                    </div>
                    <div class="mes-champ">
                        <label>${mt('fiche_portee')}</label>
                        <div class="mes-cases-exclusives" style="padding-top:.35rem;">
                            <label class="mes-case">
                                <input type="checkbox" data-champ="temporelle" ${temporelle ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'temporelle', this.checked)">
                                <span>${mt('limitee_temps')}</span>
                            </label>
                            <label class="mes-case">
                                <input type="checkbox" data-champ="illimitee" ${illimitee ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'illimitee', this.checked)">
                                <span>${mt('illimitee')}</span>
                            </label>
                            <label class="mes-case">
                                <input type="checkbox" data-champ="sans_objet" ${sansObjet ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'sans_objet', this.checked)">
                                <span>${mt('sans_objet')}</span>
                            </label>
                        </div>
                    </div>
                </div>
                ${temporelle ? `<div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('duree_sanction')}</label>
                        <div class="mes-duree">
                            <input type="number" min="0" class="mes-input" data-champ="duree_valeur"
                                   value="${esc(m.duree_valeur || '')}" ${offBloc}
                                   oninput="mesQualDureeVersTerme(${i})">
                            <select class="mes-select" data-champ="duree_unite" ${offBloc}
                                    onchange="mesQualDureeVersTerme(${i})">
                                ${['jours', 'mois'].map((u) => `<option value="${u}"
                                    ${(m.duree_unite || 'jours') === u ? 'selected' : ''}>${u}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('fiche_date_fin')}</label>
                        <input type="date" class="mes-input" data-champ="date_fin"
                               value="${esc(m.date_fin || '')}" ${offBloc}
                               onchange="mesQualTermeVersDuree(${i})">
                    </div>
                </div>` : ''}
                <div class="mes-champ" style="margin-bottom:0;">
                    <div class="mes-champ-entete">
                        <label>${mt('fiche_desc_sanction')}</label>
                        <label class="mes-case">
                            <input type="checkbox" data-champ="suivi_requis" ${offBloc}
                                   ${m.suivi_requis ? 'checked' : ''}
                                   onchange="mesQualSuiviRequis(${i}, this.checked)">
                            <span>${mt('suivi_requis')}</span>
                        </label>
                    </div>
                    <textarea class="mes-input" data-champ="commentaire" rows="3" ${offBloc}
                              placeholder="${esc(mt('desc_sanction_exemple'))}">${esc(m.commentaire || '')}</textarea>
                </div>
            </div>
        </div>`;
  }).join('');

  const pieces = (q.pieces || []).map((p, i) => `
        <div class="mes-preuve" data-chemin="${esc(p.path || '')}">
            <input class="mes-input" value="${esc(p.nom || '')}" placeholder="${esc(mt('intitule_piece'))}" ${off}>
            ${chemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${esc(chemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${esc(mt('ouvrir'))}">${icone('download')}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}"
                onclick="mesQualRetirerPiece(${i})">${icone('x')}</button>`}
        </div>`).join('');

  return section('E', mt('onglet_mesures'), `
        <div id="mesQualMesures">${blocs || `<p class="mes-preuve-vide">${mt('aucune_mesure_arretee')}</p>`}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
            onclick="mesQualAjouterMesure()">${icone('add')} ${mt('ajouter_mesure')}</button>`}
        <div class="mes-champ" style="margin-top:.9rem;margin-bottom:0;">
            <label>${mt('decision_instance')}</label>
            <div id="mesQualPieces">${pieces || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
            ${off ? '' : `<input type="file" id="mesQualFichier" multiple style="display:none;"
                    onchange="mesQualTeleverser(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesQualFichier').click()">
                    ${icone('add')} ${mt('ajouter_piece')}</button>`}
        </div>`);
}

export const mesQualAjouterMesure = (): void => mesQualModifier((q) => { q.mesures.push({
  categorie: (requis('mesCategories')()[0] || {} as { code?: string }).code || '', type_mesure: '',
  date_sanction: '', portee: '', duree_valeur: '', duree_unite: 'jours',
  // Le suivi est attendu par défaut : c'est en le décochant que l'instance
  // déclare qu'une mesure n'appelle pas de suivi de mise en œuvre, non en
  // omettant de le cocher.
  date_fin: '', commentaire: '', suivi_requis: true,
}); });

// ── Durée et terme : chacun se déduit de l'autre ──
// La date de sanction sert d'ancre. Poser la durée fixe le terme ; poser le
// terme donne la durée. Les deux champs restent d'accord sans que l'agent ait
// à faire le calcul.
export function mesAjouterDuree(depart: string, valeur: number, unite: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(depart || '') || !valeur) return '';
  const d = new Date(`${depart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  if (unite === 'mois') {
    const jour = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + valeur);
    // Trois mois après le 31 janvier tombent au 30 avril : on ne déborde
    // pas sur le mois suivant.
    const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(jour, dernier));
  } else {
    d.setUTCDate(d.getUTCDate() + valeur);
  }
  return d.toISOString().slice(0, 10);
}

const mesBloc = (i: number): Element | undefined => document.querySelectorAll('#mesQualMesures .mes-bloc')[i];
const mesChampBloc = (i: number, nom: string): HTMLInputElement | null => (mesBloc(i) || document).querySelector<HTMLInputElement>(`[data-champ="${nom}"]`);

// La durée vient d'être saisie : le terme suit.
export function mesQualDureeVersTerme(i: number): void {
  const depart = mesChampBloc(i, 'date_sanction')?.value || '';
  const valeur = Number(mesChampBloc(i, 'duree_valeur')?.value) || 0;
  const unite = mesChampBloc(i, 'duree_unite')?.value || 'jours';
  const fin = mesChampBloc(i, 'date_fin');
  if (!fin) return;
  if (!depart) {
    requis('mesToast')(mt('date_sanction_dabord'), 'warning');
    return;
  }
  fin.value = mesAjouterDuree(depart, valeur, unite);
}

// Les deux dates d'une sanction : celle qui la prononce et celle qui la lève.
// Appelé par le `onchange` de la date de sanction : c'est pourquoi il est posé
// sur `window`.
export const mesDatesSanction = (i: number): ConfigDates => ({
  debut: mesChampBloc(i, 'date_sanction'), fin: mesChampBloc(i, 'date_fin'),
});

// Le terme vient d'être posé : la durée s'en déduit, dans l'unité retenue.
// Une sanction ne se lève pas avant d'être prononcée — la règle commune le dit
// et marque les champs ; la durée reste alors vide.
export function mesQualTermeVersDuree(i: number): void {
  if (!window.oasisDatesValider(mesDatesSanction(i))) {
    const champVide = mesChampBloc(i, 'duree_valeur');
    if (champVide) champVide.value = '';
    return;
  }
  const depart = mesChampBloc(i, 'date_sanction')?.value || '';
  const fin = mesChampBloc(i, 'date_fin')?.value || '';
  const champ = mesChampBloc(i, 'duree_valeur');
  const unite = mesChampBloc(i, 'duree_unite')?.value || 'jours';
  if (!champ || !depart || !fin) return;
  const d1 = new Date(`${depart}T00:00:00Z`);
  const d2 = new Date(`${fin}T00:00:00Z`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) { champ.value = ''; return; }
  if (unite === 'mois') {
    let mois = (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
    if (d2.getUTCDate() < d1.getUTCDate()) mois -= 1;
    champ.value = String(Math.max(0, mois));
  } else {
    champ.value = String(Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }
}

// Cocher une portée décoche l'autre ; décocher celle qui l'était laisse la
// portée indéterminée.
export const mesQualPorteeMesure = (i: number, portee: string, coche: boolean): void => mesQualModifier((q) => {
  const m = q.mesures[i];
  if (m) m.portee = coche ? portee : '';
});
// Le suivi requis commande le bouton « Clôturer » : la bascule redessine
// l'étape pour que le bandeau d'actions suive la case.
export const mesQualSuiviRequis = (i: number, coche: boolean): void => mesQualModifier((q) => {
  const m = q.mesures[i];
  if (m) m.suivi_requis = !!coche;
});
export const mesQualRetirerMesure = (i: number): void => mesQualModifier((q) => { q.mesures = q.mesures.filter((_, k) => k !== i); });
export const mesQualRetirerPiece = (i: number): void => mesQualModifier((q) => { q.pieces = q.pieces.filter((_, k) => k !== i); });

// Changer de catégorie vide le type : les types sont propres à leur catégorie.
export const mesQualCategorieMesure = (i: number, code: string): void => mesQualModifier((q) => {
  const m = q.mesures[i];
  if (m) { m.categorie = code; m.type_mesure = ''; }
});

export async function mesQualTeleverser(fichiers: FileList | File[] | null): Promise<void> {
  if (!fichiers || !fichiers.length) return;
  mesMajQualification();
  const q = mesQualification();
  q.pieces = q.pieces || [];
  for (const f of Array.from(fichiers)) {
    try {
      const corps = new FormData();
      corps.append('file', f);
      const r = await requis('mesApi')('/upload', { method: 'POST', body: corps }) as { filename?: string; path?: string; size?: number };
      q.pieces.push({ nom: r.filename, path: r.path, size: r.size } as Piece);
    } catch (e) { requis('mesToast')(messageDe(e) || mt('depot_impossible'), 'error'); }
  }
  traitementPresent().qualification = q;
  mesQualRedessiner();
}

