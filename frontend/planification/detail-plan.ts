// OASIS — Planification : le détail d'un plan — son fil d'avancement, ses
// activités, sa lignée — et son ouverture (ADR-003, 5.c — n° 5.f.106).
//
// La seconde moitié de `pl-plans.js`, converti à la lettre : voir
// `liste-plans.ts`, avec lequel il partage le paquet, l'en-tête d'accordéon et
// les types.
import { donnees, etat, requis, tp } from './partage';
import {
  _planAccEntete, E, esc, type Activite, type Plan, type Ref,
} from './liste-plans';

// ══════════════════════════════════════
//  PLAN DETAIL
// ══════════════════════════════════════

export async function planOpenDetail(planId: string): Promise<void> {
  const S = E();
  // Le pré-remplissage ne survit qu'à l'ouverture demandée depuis le
  // bandeau d'un prestataire.
  if (S._keepPrefill) S._keepPrefill = false;
  else S.prefillPrestataire = '';
  try {
    const plan = await window.api(`${window.PLAN_MODULE_API}/plans/${planId}`) as Plan;
    S.selectedPlan = plan;
    etat().currentPage = 'plan-detail';
    // Load workflow to map rejet/validation comments per activity (for red-icon coloring)
    const rejets = new Set<string>();
    S.selectedPlanActivityRejet = rejets;
    try {
      const wfs = await window.api(`${window.PLAN_MODULE_API}/plans/${planId}/workflow`) as { action?: string; commentaire?: string }[];
      (wfs || []).forEach((w) => {
        if ((w.action === 'rejet' || w.action === 'rejeter') && w.commentaire) {
          const parsed = requis('_parseActivityCommentsFromText')(w.commentaire);
          parsed.perActivity.forEach((pa) => {
            if (pa.objet) rejets.add(pa.objet.trim());
          });
        }
      });
    } catch { /* non-fatal */ }
    requis('planUpdateNavUI')();
    requis('planRenderPage')();
  } catch (e) {
    console.error('Error loading plan:', e);
  }
}

// Fil d'avancement du plan (chevrons) : élaboration → soumission → validation.
const PLAN_STEPS = [
  { key: 'soumission', labelKey: 'step_soumission' },
  { key: 'validation', labelKey: 'step_validation' },
];

// Index de l'étape en cours. 2 : toutes les étapes franchies.
function _planCurrentStep(plan: Plan): number {
  const st = plan.statut || 'brouillon';
  if (['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'].includes(st)) return 2;
  if (['soumis', 'en_revue'].includes(st)) return 1;
  return 0;
}

function _renderPlanProcessSteps(plan: Plan): string {
  const cur = _planCurrentStep(plan);
  const rejete = ['rejete', 'rejete_clos'].includes(plan.statut || '');
  const items = PLAN_STEPS.map((s, i) => {
    let state = 'todo';
    if (!rejete) {
      if (i < cur) state = 'done';
      else if (i === cur) state = 'current';
    }
    const label = tp(s.labelKey);
    const tip = state === 'done' ? `${label} — ${tp('step_done')}`
      : state === 'current' ? `${label} — ${tp('step_current')}`
        : `${label} — ${tp('step_todo')}`;
    return `<span class="eval-step ${state}" title="${label} : ${tip}">${label}</span>`;
  }).join('');
  const flag = rejete
    ? `<span class="eval-step rejected" title="${tp('step_rejected')}">${tp('rejected')}</span>` : '';
  return `<div class="eval-steps plan-steps" role="img" aria-label="${tp('plan_progress')}">${items}${flag}</div>`;
}

// Statut courant du plan et date de passage à ce statut, affichés à gauche
// de son titre. « En Amendement » : plan en vigueur dont une nouvelle version
// est en préparation.
function _planStatutInline(plan: Plan, amendementEnCours: boolean): string {
  const st = plan.statut || 'brouillon';
  const dates: Record<string, string | undefined> = {
    brouillon: plan.createdAt,
    soumis: plan.soumettre_le || plan.date_soumission,
    en_revue: plan.soumettre_le || plan.date_soumission,
    valide: plan.valider_le || plan.date_validation,
    approuve_dg: plan.approuver_dg_le,
    transmis: plan.transmettre_le,
    rejete: plan.rejeter_le,
    archive: plan.archiver_le,
  };
  const couleurDe = requis('_statusColor');
  let label = tp(st) || st;
  let color = couleurDe(st);
  let date = dates[st] || plan.updatedAt || plan.createdAt;
  if (amendementEnCours) {
    const child = donnees<Plan>('plans').find((p) => p.parent_plan_id === plan.id
      && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut || ''));
    label = tp('status_en_amendement');
    color = couleurDe('amendement');
    date = child?.createdAt || date;
  }
  const jour = date ? String(date).substring(0, 10) : '';
  return `<span class="plan-statut-inline">
        <span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>
        ${jour ? `<span class="plan-statut-date">${jour}</span>` : ''}
    </span>`;
}

export function planRenderPlanDetail(): string {
  const plan = E().selectedPlan;
  if (!plan) return `<p>${tp('no_data')}</p>`;

  const contribue = requis('_canContribute');
  const valide = requis('_canValidate');
  const activites = plan.activites || [];
  const dom = donnees<Ref>('domaines').find((d) => d.id === plan.domaine_id);
  // Droits appréciés sur le secteur du plan (portées de Gestion des Droits)
  const secteurPlan = plan.secteur_id || '';
  const canEdit = (plan.statut === 'brouillon' || plan.statut === 'rejete') && contribue(secteurPlan);
  const canSubmit = canEdit && activites.length > 0;
  const isPonctuelSpecial = plan.type === 'ponctuel_special';
  // Sync disabled for "Ponctuel/Spécial" type
  const canSync = contribue(secteurPlan) && plan.statut !== 'archive' && !isPonctuelSpecial;
  // Un amendement chemine-t-il déjà ? Mêmes statuts que le serveur — dont
  // « rejete », qui reste un amendement ouvert tant qu'il n'est ni repris ni
  // annulé. L'écran manquait celui-là.
  const hasChildAmendment = donnees<Plan>('plans').some((p) =>
    p.parent_plan_id === plan.id && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut || ''));
  // Amender n'est proposé que s'il n'y a pas déjà une version suivante en
  // chemin : le serveur refuse le second amendement, le bouton ne l'offre pas.
  const canAmendBtn = plan.statut === 'valide' && contribue(secteurPlan) && !hasChildAmendment;
  const isAmendmentInProgress = plan.statut === 'valide' && hasChildAmendment;
  // Distinct flag: this plan itself is an amendment child (used for cancel button logic)
  const isAmendmentChild = !!(plan.parent_plan_id);
  const canCancelAmend = isAmendmentChild && (plan.statut === 'brouillon' || plan.statut === 'rejete') && contribue(secteurPlan);
  // ── L'approbation du directeur et la transmission (Chap. 4 §4.2.3.e-f) ──
  //
  // Les deux actes n'étaient offerts par aucun écran : leurs boutons vivaient
  // dans la page de validation, qui ne reçoit que des plans « soumis », quand
  // ils exigent un plan « validé » ou « approuvé DG » — deux conditions qui
  // s'excluaient (ADR-003, n° 5.f.99). Le serveur, lui, les exécutait.
  // Décision de la maîtrise d'ouvrage, le 14 novembre 2026 : les rendre
  // accessibles. Ils viennent **ici**, au détail du plan, parce que c'est là
  // que les deux gestes ramènent après succès (`planOpenDetail`).
  //
  // Offerts à l'intersection de deux règles : l'administrateur agit comme
  // DG, et le serveur exige le privilège de validation sur le secteur du plan.
  // Un bouton que le serveur refuserait ne s'offre pas.
  const peutAgirCommeDG = requis('_isAdmin')() && valide(secteurPlan);
  const canApprouverDG = peutAgirCommeDG && plan.statut === 'valide';
  const canTransmettre = peutAgirCommeDG && plan.statut === 'approuve_dg';

  return `
    <div class="page-content">
        <div class="page-header plan-detail-header">
            <div class="plan-header-top">
                <button class="btn btn-primary btn-sm" onclick="planNavigateTo('plans')">${PLAN_ICONS.back} ${tp('back')}</button>
                <div class="plan-title-line">
                    <h2>${esc(plan.titre)}</h2>
                    <span class="plan-title-sep">|</span><span>${plan.annee}</span>
                    ${dom ? `<span class="plan-title-sep">|</span><span>${dom.code} - ${esc(dom.nom)}</span>` : ''}
                    <span class="plan-title-sep">|</span><span>v${plan.version || 1}</span>
                    <span class="plan-title-sep">|</span>${requis('_planTypeBadge')(plan.type)}
                </div>
                ${_planStatutInline(plan, isAmendmentInProgress)}
            </div>
            <div class="plan-header-bottom">
                ${_renderPlanProcessSteps(plan)}
                <div class="plan-header-actions">
                    <button class="btn btn-outline btn-sm"
                            onclick="${canSync ? `planSyncRisksSelective('${plan.id}')` : 'void(0)'}"
                            ${canSync ? '' : 'disabled title="' + (tp('sync_disabled_for_ponctuel')) + '"'}>
                        ${PLAN_ICONS.sync} ${tp('sync_risks')}
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="planExportPDF('${plan.id}')" title="Exporter PDF">${PLAN_ICONS.pdf} Exporter PDF</button>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:1rem;">
            <div class="card-header card-header-flex">
                <h3>${tp('activities')} (${activites.length})</h3>
                <div class="card-header-actions">
                    ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="planShowActivityModal('${plan.id}')">
                        ${PLAN_ICONS.add} ${tp('new_activity')}
                    </button>` : ''}
                    ${canSubmit ? `<button class="btn btn-primary btn-sm" onclick="planSubmit('${plan.id}')">${PLAN_ICONS.send} ${tp('submit_plan')}</button>` : ''}
                    ${canAmendBtn ? `<button class="btn btn-warning btn-sm" onclick="planAmend('${plan.id}')">${PLAN_ICONS.edit} ${tp('amend_plan')}</button>` : ''}
                    ${canCancelAmend ? `<button class="btn btn-danger btn-sm" onclick="planCancelAmendment('${plan.id}')">${PLAN_ICONS.x} ${tp('cancel_amendment')}</button>` : ''}
                    ${canApprouverDG ? `<button class="btn btn-primary btn-sm" onclick="planApprouverDG('${plan.id}')">${tp('approuver_dg')}</button>` : ''}
                    ${canTransmettre ? `<button class="btn btn-primary btn-sm" onclick="planTransmettre('${plan.id}')">${tp('transmettre_prestataire')}</button>` : ''}
                </div>
            </div>
            <div class="card-body">
                ${activites.length ? _renderActivitiesTable(activites, canEdit) : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}<br><small>${tp('import_desc')}</small></p>`}
            </div>
        </div>

        <div class="plan-bottom-split">
            <div class="card">
                <div class="card-header card-header-flex">
                    <h3>${tp('comments_only')}</h3>
                    <button class="btn-icon disc-add" onclick="planShowCommentModal('${plan.id}')" title="${tp('new_comment')}" aria-label="${tp('new_comment')}">${PLAN_ICONS.comment}</button>
                </div>
                <div class="card-body" id="planCommentsContainer">
                    <p class="text-center" style="color:var(--text-muted);padding:1rem;">${tp('loading')}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-header card-header-flex"><h3>${tp('history')}</h3></div>
                <div class="card-body">${_renderPlanHistorique(plan)}</div>
            </div>
        </div>
    </div>`;
}

// Résumé succinct des changements majeurs entre les versions validées du
// plan (chaîne des amendements : chaque version pointe vers la précédente).
function _renderPlanHistorique(plan: Plan): string {
  const tous = donnees<Plan>('plans');
  const parId: Record<string, Plan> = {};
  tous.forEach((p) => { parId[p.id] = p; });

  // Lignée du plan : ascendants, lui-même, puis descendants retenus
  const vus = new Set([plan.id]);
  const ascendants: Plan[] = [];
  let a = plan.parent_plan_id ? parId[plan.parent_plan_id] : null;
  while (a && !vus.has(a.id) && ascendants.length < 50) {
    vus.add(a.id);
    ascendants.unshift(a);
    a = a.parent_plan_id ? parId[a.parent_plan_id] : null;
  }
  const descendants: Plan[] = [];
  let noeud = plan;
  while (descendants.length < 50) {
    const courant = noeud;
    const enfants = tous.filter((p) => p.parent_plan_id === courant.id && !vus.has(p.id));
    if (!enfants.length) break;
    const suite = (enfants.find((p) => ['valide', 'approuve_dg', 'transmis', 'remplace', 'archive'].includes(p.statut || '')) || enfants[0]) as Plan;
    vus.add(suite.id);
    descendants.push(suite);
    noeud = suite;
  }
  const famille = [...ascendants, plan, ...descendants];

  const VALIDES = ['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'];
  const acts = donnees<Activite>('allActivites');
  const nbActs = (id: string): number => acts.filter((x) => x.plan_id === id).length;
  const versions = famille.filter((p) => VALIDES.includes(p.statut || ''))
    .sort((x, y) => (x.version || 1) - (y.version || 1));

  if (!versions.length) {
    return `<p class="text-center" style="padding:1rem;color:var(--text-muted);font-style:italic;">${tp('history_none')}</p>`;
  }

  return `<div class="plan-history">${versions.map((v, i) => {
    const prec = i > 0 ? versions[i - 1] : null;
    const n = nbActs(v.id);
    const date = (v.valider_le || v.date_validation || v.createdAt || '').substring(0, 10);
    const chgs = prec ? _planDiffResume(prec, v) : [];
    if (v.motif_amendement) chgs.unshift(esc(v.motif_amendement));
    return `<div class="plan-history-item">
            <div class="plan-history-head">
                <span class="plan-history-version">v${v.version || 1}</span>
                <span class="plan-history-date">${date}</span>
                <span class="text-muted plan-history-count">${n} ${tp('activities').toLowerCase()}</span>
                ${v.id === plan.id ? `<span class="plan-history-current">${tp('history_current')}</span>` : ''}
                ${['archive', 'remplace'].includes(v.statut || '')
                    ? `<span class="plan-history-archived">${tp(v.statut || '')}</span>` : ''}
            </div>
            <div class="plan-history-body">${chgs.length
                ? `<ul class="plan-history-changes">${chgs.map((c) => `<li>${c}</li>`).join('')}</ul>`
                : (i === 0 ? tp('history_initial') : tp('history_no_major'))}</div>
        </div>`;
  }).join('')}</div>`;
}

// Principaux champs modifiés entre deux versions validées : entête du plan
// puis activités ajoutées, retirées ou modifiées (champs cités).
function _planDiffResume(avant: Plan, apres: Plan): string[] {
  const chgs: string[] = [];
  const libelle: Record<string, string> = {
    titre: tp('plan_title'), annee: tp('year'), type: tp('plan_type'),
    domaine_id: tp('domain'), secteur_id: tp('sector'),
  };
  const nomRef = (champ: string, val: unknown): unknown => {
    if (champ === 'domaine_id') {
      const d = donnees<Ref>('domaines').find((x) => x.id === val);
      return d ? d.code : (val || '-');
    }
    if (champ === 'secteur_id') {
      const sec = donnees<Ref>('secteurs').find((x) => x.id === val);
      return sec ? sec.code : (val || '-');
    }
    return val || '-';
  };
  Object.keys(libelle).forEach((champ) => {
    if ((avant[champ] || '') !== (apres[champ] || '')) {
      chgs.push(`${libelle[champ]} : ${esc(nomRef(champ, avant[champ]))} → ${esc(nomRef(champ, apres[champ]))}`);
    }
  });

  const acts = donnees<Activite>('allActivites');
  const cle = (x: Activite): string => (x.objet || x.titre || x.id || '').trim();
  const actsAvant = acts.filter((x) => x.plan_id === avant.id);
  const actsApres = acts.filter((x) => x.plan_id === apres.id);
  const parCle = (arr: Activite[]): Record<string, Activite> => { const m: Record<string, Activite> = {}; arr.forEach((x) => { m[cle(x)] = x; }); return m; };
  const mAvant = parCle(actsAvant); const mApres = parCle(actsApres);

  const ajoutees = Object.keys(mApres).filter((k) => !mAvant[k]);
  const retirees = Object.keys(mAvant).filter((k) => !mApres[k]);
  if (ajoutees.length) chgs.push(`${tp('history_added')} : ${ajoutees.map(esc).join(', ')}`);
  if (retirees.length) chgs.push(`${tp('history_removed')} : ${retirees.map(esc).join(', ')}`);

  // Champs suivis sur les activités communes
  const champsAct: Record<string, string> = {
    date_debut: tp('start_date'), date_fin: tp('end_date'),
    responsable_id: tp('responsable_activite'), lieu_activite: tp('lieu_activite'),
    type_supervision_id: tp('type_supervision'), mode_supervision_id: tp('mode_supervision'),
    nombre_inspecteurs: tp('nombre_inspecteurs'), themes_couverts: tp('themes_couverts'),
    sous_activite_ids: tp('sub_activity'), priorite: tp('priority'),
  };
  const norm = (val: unknown): string => (Array.isArray(val) ? JSON.stringify(val) : String(val == null ? '' : val));
  Object.keys(mApres).filter((k) => mAvant[k]).forEach((k) => {
    const av = mAvant[k] as Activite; const ap = mApres[k] as Activite;
    const modifs = Object.keys(champsAct)
      .filter((c) => norm(av[c]) !== norm(ap[c]))
      .map((c) => champsAct[c]);
    if (modifs.length) chgs.push(`${esc(k)} — ${tp('history_modified')} : ${modifs.join(', ')}`);
  });
  return chgs;
}

function _renderActivitiesTable(activites: Activite[], canEdit: boolean): string {
  const dateFr = requis('planDateFr');
  const rejets = E().selectedPlanActivityRejet;
  // Group activities by prestataire
  const grouped: Record<string, { label: string; acts: Activite[] }> = {};
  for (const a of activites) {
    const prest = donnees<Ref>('prestataires').find((p) => p.id === a.prestataire_id);
    const key = prest ? prest.id : '_none';
    const label = prest ? String(prest.nom) : '-';
    (grouped[key] || (grouped[key] = { label, acts: [] })).acts.push(a);
  }

  let html = '<div class="plan-activities-accordion">';
  for (const group of Object.values(grouped)) {
    html += `
        <div class="act-acc-item act-acc-niveau-1 expanded">
            ${_planAccEntete(esc(group.label), tp('acc_nb_activites', group.acts.length), true)}
            <div class="act-acc-body">
                <div style="overflow-x:auto;">
                <table class="data-table plan-act-table">
                    <colgroup>
                        <col style="width:3.5%"><col style="width:16%"><col style="width:12%">
                        <col style="width:10.5%"><col style="width:12%"><col style="width:14%">
                        <col style="width:10.5%"><col style="width:10.5%"><col style="width:11%">
                    </colgroup>
                    <thead><tr>
                        <th>#</th><th>${tp('objet')}</th><th>${tp('sector')}</th>
                        <th>${tp('col_mode_type')}</th>
                        <th>${tp('col_lieu')}</th>
                        <th>${tp('col_responsable')}</th>
                        <th>${tp('start_date')}</th><th>${tp('end_date')}</th>
                        <th>${tp('actions')}</th>
                    </tr></thead>
                    <tbody>
                        ${group.acts.map((a, idx) => {
                            const sect = donnees<Ref>('secteurs').find((s) => s.id === a.secteur_id);
                            // All sous-activités with their associated themes
                            let saIds: string[] = [];
                            try {
                                if (a.sous_activite_ids) {
                                    saIds = (typeof a.sous_activite_ids === 'string' ? JSON.parse(a.sous_activite_ids) : a.sous_activite_ids) as string[];
                                }
                                if (!saIds.length && a.sous_activite_id) saIds = [a.sous_activite_id];
                            } catch { saIds = []; }
                            const saObjects = saIds.map((sid) => donnees<Ref>('sousActivites').find((x) => x.id === sid)).filter(Boolean) as Ref[];

                            // All themes
                            let themeObjects: Ref[] = [];
                            if (a.themes_couverts) {
                                try {
                                    const tids = (typeof a.themes_couverts === 'string' ? JSON.parse(a.themes_couverts) : a.themes_couverts) as string[];
                                    themeObjects = tids.map((tid) => donnees<Ref>('themesSupervision').find((t) => t.id === tid)).filter(Boolean) as Ref[];
                                } catch { themeObjects = []; }
                            }

                            // Une seule colonne : chaque sous-activité suivie de ses thèmes
                            let saCell = '-';
                            if (saObjects.length > 0) {
                                saCell = `<div class="act-sa-list act-sa-cols">${saObjects.map((sa) => {
                                    const saThemes = themeObjects.filter((t) => t.sous_activite_id === sa.id);
                                    return `<div class="act-sa-block">
                                        <div class="act-sa-name">${esc(sa.code + ' - ' + sa.nom)}</div>
                                        ${saThemes.length
                                            ? `<ul class="sa-theme-list">${saThemes.map((t) => `<li>${esc(t.libelle)}</li>`).join('')}</ul>`
                                            : `<span class="text-muted" style="font-size:0.82rem;">-</span>`}
                                    </div>`;
                                }).join('')}</div>`;
                            }

                            const mode = donnees<Ref>('modesSupervision').find((m) => m.id === a.mode_supervision_id);
                            const prestRisk = donnees<Ref>('prestataireRisques').find((pr) => pr.id === a.prestataire_id);
                            let cycleWarn = '';
                            if (prestRisk && prestRisk.debut_cycle && a.date_debut) {
                                if (a.date_debut < prestRisk.debut_cycle || (prestRisk.fin_cycle && a.date_debut > prestRisk.fin_cycle)) {
                                    cycleWarn = ' ⚠️';
                                }
                            }
                            // Detail row data
                            const typeS = donnees<Ref>('typesSupervision').find((t) => t.id === a.type_supervision_id);
                            const resp = donnees<Ref>('inspecteurs').find((i) => i.id === a.responsable_id);
                            const modeTypeStr = `${mode ? esc(mode.mode) : '-'} / ${typeS ? esc(typeS.type_supervision) : '-'}`;
                            const respStr = resp ? esc((resp.nom || '') + ' ' + (resp.prenom || '')).trim() : '-';
                            const _actKey = (a.objet || a.titre || '').trim();
                            const hasRejet = !!(rejets && rejets.has(_actKey));
                            return `<tr>
                                <td>${idx + 1}</td>
                                <td>${esc(a.objet || a.titre)}</td>
                                <td>${sect ? sect.code + ' - ' + esc(sect.nom) : '-'}</td>
                                <td>${modeTypeStr}</td>
                                <td>${esc(a.lieu_activite || '-')}</td>
                                <td>${respStr}</td>
                                <td><span class="plan-act-date">${dateFr(a.date_debut)}</span>${cycleWarn}</td>
                                <td><span class="plan-act-date">${dateFr(a.date_fin)}</span></td>
                                <td class="actions-cell">
                                    <button class="btn-icon" onclick="this.closest('tr').nextElementSibling.classList.toggle('hidden')" title="${tp('details')}" aria-label="${tp('details')}">${PLAN_ICONS.eye}</button>
                                    ${(() => {
                                        // Rouge dès qu'un commentaire de validation existe ;
                                        // le clic ouvre le volet de lecture.
                                        const cv = (a.commentaire_validation || '').trim();
                                        const rouge = !!cv || hasRejet;
                                        return `<button class="btn-icon act-comment-flag${rouge ? ' has-comment' : ''}" onclick="planShowValidationComment('${a.id}')" title="${tp('validation_comment')}" aria-label="${tp('validation_comment')}">${PLAN_ICONS.comment}</button>`;
                                    })()}
                                    ${(canEdit && Number(a.verrouillee) === 1)
                                        ? `<span class="plan-act-verrou" title="${esc(tp('activite_verrouillee'))}">${PLAN_ICONS.lock || '🔒'}</span>`
                                        : `${canEdit ? `<button class="btn-icon" onclick="planShowActivityModal('${a.plan_id}','${a.id}')" title="${tp('edit')}" aria-label="${tp('edit')}">${PLAN_ICONS.edit}</button>` : ''}
                                    ${canEdit ? `<button class="btn-icon text-danger" onclick="planDeleteActivity('${a.id}')" title="${tp('delete')}" aria-label="${tp('delete')}">${PLAN_ICONS.delete}</button>` : ''}`}
                                </td>
                            </tr>
                            <tr class="hidden activity-detail-row">
                                <td colspan="9" style="max-width:0;">
                                    <div class="activity-detail-grid">
                                        <div class="detail-item"><label>${tp('description_activite')}</label><span>${esc(a.description_activite || '-')}</span></div>
                                        <div class="detail-item"><label>${tp('nombre_inspecteurs')}</label><span>${a.nombre_inspecteurs || 1}</span></div>
                                        <div class="detail-item full-width"><label>${tp('sub_activity')} / ${tp('themes_couverts')}</label><span>${saCell}</span></div>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        </div>`;
  }
  html += '</div>';
  return html;
}
