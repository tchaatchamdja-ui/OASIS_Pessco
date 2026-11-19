// OASIS — « Mesures d'Application » (CARE) : les deux listes — les mesures du
// registre, les carences à traiter — et les gestes qui en partent
// (ADR-003, 5.c — n° 5.f.124).
//
// Converti à la lettre depuis `mes-app.js` : le balisage est rendu caractère
// pour caractère, chaque requête part avec le même corps. Ce que la coquille
// pose — redessiner, naviguer, ouvrir le volet — et ce que les autres paquets
// publient se lit sur la page au moment de l'appel, comme l'ancien fichier
// lisait le nom nu ; le paquet reste ainsi sans cycle.
import {
  MES_STATE, _mesAttr, _mesEsc, _mesNorm, mesApi, mesCategories, mesDate, mesEstAdmin,
  mesEstSuperAdmin, mesJour, mesLibelleCategorie, mesLibelleType, mesPeutEcrire, mesRechargerMesures,
  mesToast, messageDe,
} from './etat';
import type { ConstatationCare, TraitementCare } from './formes';
import {
  MES_CLES_ORIGINE, MES_ICONS, MES_STATUT_CARE, MES_SUIVI, mesBadgeStatutCare, mesEnRetard,
  mesLibelleCare, mesLibelleEtape, mesOrigine, mesStatutMesure, mesStatutSuivi,
} from './libelles';
import { mt, requis } from './partage';

const opt = (v: string | undefined, l: unknown, cur: string): string => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;
// Les boutons d'export, publiés par le menu « États ».
const mesBoutonsExport = (base: string): string => requis('mesBoutonsExport')(base);

// ══ Page 2 — Mesures ══

// Le menu Mesures peut être ouvert sur les seules mesures d'une carence : la
// mention le dit, faute de quoi la table paraîtrait incomplète sans raison.
export function mesFiltreCarence(): string {
  const id = MES_STATE.filtres.mes_carence;
  if (!id) return '';
  const c: Partial<ConstatationCare> = (MES_STATE.data.constatations || []).find((x) => x.id === id) || {};
  return `<span class="mes-filtre-carence">${_mesEsc(mt('carence_ref', c.reference || id))}
        <button class="btn-nu" title="${_mesAttr(mt('retirer_filtre'))}"
                onclick="mesSetFiltre('mes_carence','')">${MES_ICONS.x}</button></span>`;
}

export function mesMesuresFiltrees(): typeof MES_STATE.data.mesures {
  const F = MES_STATE.filtres;
  const q = _mesNorm(F.mes_recherche);
  return MES_STATE.data.mesures.filter((m) => {
    if (F.mes_categorie && m.categorie !== F.mes_categorie) return false;
    if (F.mes_statut && mesStatutSuivi(m) !== F.mes_statut) return false;
    if (F.mes_prest && m.prestataire_id !== F.mes_prest) return false;
    // Filtre posé depuis le menu Carences : les mesures d'un seul dossier.
    if (F.mes_carence && m.constatation_id !== F.mes_carence) return false;
    if (!q) return true;
    return _mesNorm(`${m.reference} ${m.objet} ${m.description} ${m.prestataire_nom} ${mesLibelleType(m.type_mesure)}`).includes(q);
  });
}

// La table du menu « Mesures » montre ce que l'instance décisionnelle a arrêté
// à l'étape « Qualification et Mesures » : la sanction, sa portée, son terme.
export function mesLignesMesures(): string {
  const liste = mesMesuresFiltrees();
  if (!liste.length) {
    return `<tr><td colspan="8" class="mes-table-vide">${mt('aucune_mesure_corresp')}</td></tr>`;
  }
  return liste.map((m) => {
        const retard = mesEnRetard(m);
        // Un suivi soldé, sans suite ou sans objet n'appelle plus de geste :
        // le bouton reste, pour ouvrir le dossier, mais cesse d'inviter.
        const suiviClos = ['solde', 'sans_suite', 'sans_objet'].includes(mesStatutSuivi(m));
        const portee = m.portee === 'illimitee'
            ? `<span class="mes-badge annulee">${mt('illimitee')}</span>`
            : (m.portee === 'sans_objet'
                ? `<span class="mes-badge">${mt('sans_objet')}</span>`
                : m.portee === 'temporelle'
                ? `<span class="mes-badge en_cours">${mt('limitee_temps')}</span>${m.duree_valeur
                    ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(
                        `${m.duree_valeur} ${m.duree_unite || 'jours'}`)}</div>` : ''}`
                : '<span class="mes-preuve-vide">—</span>');
        return `<tr>
            <td><strong>${_mesEsc(m.reference)}</strong>${m.constatation_ref
                ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(m.constatation_ref)}</div>` : ''}</td>
            <td>${_mesEsc(m.prestataire_nom || '—')}</td>
            <td class="mes-cell-mesure">
                <div class="mes-cell-categorie">${_mesEsc(mesLibelleCategorie(m.categorie))}</div>
                <div class="mes-cell-type">${_mesEsc(mesLibelleType(m.type_mesure) || '—')}${
                    // La description de la sanction dit ce qu'elle impose ;
                    // l'objet ne sert que si elle manque, la carence étant déjà
                    // nommée par sa référence en première colonne. Elle suit le
                    // type sur la même ligne, séparée par un deux-points.
                    m.description || m.objet
                        ? ` : <span class="mes-cell-description">${_mesEsc(m.description || m.objet)}</span>` : ''}</div>
            </td>
            <td>${m.date_sanction ? mesDate(m.date_sanction) : mesDate(m.date_emission)}</td>
            <td>${portee}</td>
            <td>${retard
                ? `<span class="mes-date-retard" title="${_mesAttr(mt('echeance_depassee'))}">${mesDate(m.date_echeance)}</span>`
                : mesDate(m.date_echeance)}</td>
            <td>${mesStatutMesure(m)}</td>
            <td class="mes-actions">
                <div class="mes-actions-duo">
                    <button class="btn btn-sm ${suiviClos ? 'mes-btn-consulter' : 'mes-btn-mesure'}"
                            onclick="mesFaireLeSuivi('${m.id}')"
                            title="${_mesAttr(suiviClos ? mt('suivi_termine_consulte') : mt('ouvre_suivi'))}">
                        ${MES_ICONS.check} ${suiviClos ? mt('consulte') : mt('suivi')}</button>
                    ${mesEstSuperAdmin() ? `<button class="btn btn-outline btn-sm mes-btn-icone mes-btn-danger"
                        title="${_mesAttr(mt('supprimer_mesure'))}" aria-label="${_mesAttr(mt('supprimer_mesure'))}"
                        onclick="mesSupprimerMesure('${m.id}')">${MES_ICONS.delete}</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Ouvre le menu « Mesures » sur les seules mesures d'une carence. Le volet qui
// les résume se ferme : c'est la table qui prend le relais.
export function mesOuvrirTableMesures(constatationId: string): void {
  const fermer = window.mesFermerHistorique;
  if (typeof fermer === 'function') fermer();
  const F = MES_STATE.filtres;
  F.mes_carence = constatationId;
  F.mes_categorie = ''; F.mes_statut = ''; F.mes_prest = ''; F.mes_recherche = '';
  requis('mesNavigateTo')('mesures');
}

// « Faire le suivi » rouvre le traitement de la carence dont la mesure est
// issue, à l'étape du suivi : la mesure ne se suit pas seule, elle se suit
// dans le dossier qui l'a value.
export async function mesFaireLeSuivi(id: string): Promise<void> {
  const m = (MES_STATE.data.mesures || []).find((x) => x.id === id);
  if (!m) return;
  if (!m.constatation_id) {
    mesToast(mt('mesure_sans_carence'), 'error');
    return;
  }
  const c = (MES_STATE.data.constatations || []).find((x) => x.id === m.constatation_id);
  if (!c) {
    mesToast(mt('carence_introuvable'), 'error');
    return;
  }
  MES_STATE.carenceEnCours = c;
  MES_STATE.mesureEnCours = null;
  try { MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`) as TraitementCare; }
  catch (e) { mesToast(messageDe(e) || mt('traitement_illisible'), 'error'); return; }
  // On ouvre là où le suivi se fait, quelle que soit l'étape atteinte.
  MES_STATE.etapeVue = 'suivi';
  requis('mesAfficherSlider')();
}

export function mesRenderMesures(): string {
  const F = MES_STATE.filtres;
  return `
    <div class="mes-page-header">
        <h2>${mt('nav_mesures')}</h2>
        ${mesBoutonsExport('mesures')}
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_categorie',this.value)">
                <option value="">${mt('toutes_categories')}</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.mes_categorie)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_statut',this.value)">
                <option value="">${mt('tous_suivis')}</option>
                ${Object.keys(MES_SUIVI).map((v) => opt(v, mt(`suivi_${v}`), F.mes_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.mes_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="${_mesAttr(mt('rechercher'))}" value="${_mesAttr(F.mes_recherche)}"
                   oninput="mesRechercher('mes_recherche', this.value)">
            ${mesFiltreCarence()}
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresMesures()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table mes-table-plate">
                <thead><tr>
                    <th style="width:120px;">${mt('col_reference')}</th>
                    <th style="width:150px;">${mt('col_prestataire')}</th>
                    <th style="width:28%;">${mt('col_cat_type_desc')}</th>
                    <th style="width:105px;">${mt('col_date_sanction')}</th>
                    <th style="width:120px;">${mt('col_portee')}</th>
                    <th style="width:105px;">${mt('col_echeance')}</th>
                    <th style="width:140px;">${mt('col_statut_suivi')}</th>
                    <th style="width:140px;text-align:center;">${mt('col_actions')}</th>
                </tr></thead>
                <tbody data-corps="mesures">${mesLignesMesures()}</tbody>
            </table>
        </div>
    </div>`;
}

// ══ Page 3 — Carences ══

// Une carence classée s'ouvre aussi : son dossier se consulte, il ne se
// modifie plus.
export function mesBoutonTraitement(c: ConstatationCare): string {
  const etape = c.traitement_etape || 'suite';
  // Le dossier est clos quand il a été déclaré tel, ou quand la carence a été
  // classée. Atteindre l'étape « Suivi des Mesures » ne le clôt pas.
  const clos = c.classee || (etape === 'suivi' && c.traitement_clos);
  const libelle = clos ? mt('traitement_cloture') : mesLibelleEtape(etape);
  // Un dossier clos se consulte : le bouton reste, sans l'accent de l'action.
  const classe = clos ? 'btn-outline' : 'mes-btn-mesure';
  if (!mesPeutEcrire() && !clos) return '';
  // Pas d'icône : le libellé porte seul le sens, et se centre dans le bouton
  // qu'il tienne sur une ligne ou deux.
  return `<button class="btn btn-sm ${classe}"
        title="${_mesAttr(clos ? mt('consulter_dossier')
            : mt('poursuivre_traitement', mesLibelleEtape(etape)))}"
        onclick="mesMesureDepuisConstatation('${c.id}')">${_mesEsc(libelle)}</button>`;
}

export function mesCritiquesFiltrees(): ConstatationCare[] {
  const F = MES_STATE.filtres;
  const q = _mesNorm(F.crit_recherche);
  return MES_STATE.data.constatations.filter((c) => {
    if (!_mesNorm(c.criticite).startsWith('crit')) return false;
    if (F.crit_statut && (c.statut_care || 'a_traiter') !== F.crit_statut) return false;
    if (F.crit_prest && c.prestataire_id !== F.crit_prest) return false;
    if (F.crit_origine && (c.origine || 'SURV') !== F.crit_origine) return false;
    if (!q) return true;
    const p: { nom?: string } = MES_STATE.data.prestataires.find((x) => x.id === c.prestataire_id) || {};
    return _mesNorm(`${c.reference} ${c.titre} ${c.description} ${p.nom || c.prestataire_nom || ''}`)
      .includes(q);
  });
}

export function mesLignesCritiques(): string {
  const liste = mesCritiquesFiltrees();
  if (!liste.length) {
    return `<tr><td colspan="8" class="mes-table-vide">${mt('aucune_carence_point')}</td></tr>`;
  }
  const prests = MES_STATE.data.prestataires;
  const aujourdhui = mesJour();
  return liste.map((c) => {
        const p: { nom?: string } = prests.find((x) => x.id === c.prestataire_id) || {};
        const retard = c.statut !== 'soldee' && c.date_due_cloture && c.date_due_cloture < aujourdhui;
        return `<tr>
            <td><strong>${_mesEsc(c.reference)}</strong>
                ${c.origine === 'RAMP'
                    ? `<div class="mes-sous-titre">${mt('ramp_cat3')}</div>` : ''}
                ${c.origine === 'CARE'
                    ? `<div class="mes-sous-titre">${mt('origine_CARE')}${c.origine_libelle
                        ? ` · ${_mesEsc(c.origine_libelle)}` : ''}</div>` : ''}</td>
            <td>
                <strong>${_mesEsc(c.titre || '—')}</strong>
                ${c.description
                    ? `<div class="mes-sous-titre">${_mesEsc(c.description)}</div>` : ''}
            </td>
            <td>${_mesEsc(p.nom || c.prestataire_nom || '—')}</td>
            <td>${mesDate(c.date_ouverture)}</td>
            <td>${retard
                // Une échéance dépassée reste signalée — c'est une information,
                // non une décoration — mais par la seule couleur du texte : la
                // pastille pleine pesait plus que ce qu'elle disait.
                ? `<span class="mes-date-retard" title="${_mesAttr(mt('echeance_depassee'))}">${mesDate(c.date_due_cloture)}</span>`
                : mesDate(c.date_due_cloture)}</td>
            <td class="mes-cell-statut">${mesBadgeStatutCare(c.statut_care)}</td>
            <td>${c.date_cloture ? mesDate(c.date_cloture) : '—'}</td>
            <td class="mes-actions">
              <div class="mes-actions-pile">
                <div class="mes-actions-grille">
                  <span class="mes-actions-case-bouton">${mesBoutonTraitement(c)}</span>
                  <span class="mes-actions-secondaires">
                    <button class="btn btn-outline btn-sm mes-btn-icone"
                            title="${_mesAttr(mt('historique_traitement'))}" aria-label="${_mesAttr(mt('historique_traitement'))}"
                            onclick="mesHistorique('${c.id}')">${requis('MES_ICONES_ETAT').clock}</button>
                    ${c.mesures_liees ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                            title="${_mesAttr(mt('voir_mesures_liees', c.mesures_liees))}" aria-label="${_mesAttr(mt('voir_mesures_liees', c.mesures_liees))}"
                            onclick="mesMesuresDeCarence('${c.id}')">${MES_ICONS.shield}</button>` : ''}
                    ${c.origine === 'CARE' && mesPeutEcrire() ? `
                    <button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('modifier'))}" aria-label="${_mesAttr(mt('modifier'))}"
                            onclick="mesOuvrirConstat('${c.id}')">${MES_ICONS.edit}</button>` : ''}
                    ${c.origine === 'CARE' && mesPeutEcrire() && mesEstAdmin()
                        && !c.mesures_liees && !c.classee
                        ? `<button class="btn btn-outline btn-sm mes-btn-icone mes-btn-danger" title="${_mesAttr(mt('supprimer'))}" aria-label="${_mesAttr(mt('supprimer'))}"
                                   onclick="mesSupprimerConstat('${c.id}')">${MES_ICONS.delete}</button>` : ''}
                  </span>
                </div>
              </div>
            </td>
        </tr>`;
    }).join('');
}

export function mesRenderCritiques(): string {
  const F = MES_STATE.filtres;
  return `
    <div class="mes-page-header">
        <h2>${mt('nav_carences')}</h2>
        <div class="mes-page-actions">
            ${mesPeutEcrire()
                ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirConstat()">
                       ${MES_ICONS.add} ${mt('ajouter_carence')}</button>` : ''}
            ${mesBoutonsExport('constatations')}
        </div>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_origine',this.value)">
                <option value="">${mt('toutes_origines')}</option>
                ${MES_CLES_ORIGINE.map((cle) => [cle, mesOrigine(cle)])
                    .map(([cle, lib]) => opt(cle, lib, F.crit_origine)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_statut',this.value)">
                <option value="">${mt('tous_statuts')}</option>
                ${Object.keys(MES_STATUT_CARE)
                    .map((cle) => opt(cle, mesLibelleCare(cle), F.crit_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.crit_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="${_mesAttr(mt('rechercher'))}"
                   value="${_mesAttr(F.crit_recherche)}"
                   oninput="mesRechercher('crit_recherche', this.value)">
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresCritiques()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    <p class="mes-note">${mt('note_carences')}</p>

    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table mes-table-plate">
                <thead><tr>
                    <th style="width:150px;">${mt('col_reference')}</th>
                    <th>${mt('col_objet_desc')}</th>
                    <th style="width:120px;">${mt('col_prestataire')}</th>
                    <th style="width:110px;">${mt('col_ouverture')}</th>
                    <th style="width:110px;">${mt('col_echeance')}</th>
                    <th style="width:130px;text-align:center;">${mt('col_statut')}</th>
                    <th style="width:110px;">${mt('col_cloture')}</th>
                    <th style="width:135px;text-align:center;">${mt('col_actions')}</th>
                </tr></thead>
                <tbody data-corps="critiques">${mesLignesCritiques()}</tbody>
            </table>
        </div>
    </div>`;
}

export async function mesMesureDepuisConstatation(constatationId: string): Promise<void> {
  const c = MES_STATE.data.constatations.find((x) => x.id === constatationId);
  if (!c) return;
  const premiere: { code?: string } = mesCategories()[0] || {};
  MES_STATE.mesureEnCours = {
    categorie: premiere.code || '',
    constatation_id: c.id,
    prestataire_id: c.prestataire_id || '',
    objet: c.titre || c.reference || '',
  };
  MES_STATE.carenceEnCours = c;
  MES_STATE.etapeVue = '';
  // Le plan d'actions vient du module qui a relevé la carence : il arrive
  // avec le traitement, en une seule demande.
  try { MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`) as TraitementCare; }
  catch (e) { MES_STATE.traitement = null; mesToast(messageDe(e) || mt('traitement_illisible'), 'error'); }
  requis('mesAfficherSlider')();
}

export async function mesSupprimerMesure(id: string): Promise<void> {
  const m: { reference?: string } = MES_STATE.data.mesures.find((x) => x.id === id) || {};
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_mesure', m.reference || ''))) return;
  try {
    await mesApi(`/mesures/${id}`, { method: 'DELETE' });
    await mesRechargerMesures();
    mesToast(mt('mesure_supprimee'));
  } catch (e) { mesToast(messageDe(e) || mt('suppression_impossible'), 'error'); }
}
