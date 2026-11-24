// OASIS — Planification : le calendrier — vues mois et semaine, et le
// diagramme de l'année (ADR-003, 5.c — n° 5.f.104).
//
// Converti à la lettre depuis `pl-calendrier.js` : le balisage est rendu
// caractère pour caractère, et la photographie du volet — trente-huit états,
// les douze mois en deux vues, chaque filtre de la barre — n'a pas d'écart.
// L'état et les libellés sont lus sur la page (`partage.ts`), les aides des
// fichiers restés en JavaScript exigées au moment de l'appel.
//
// Les gabarits écrivent leurs gestes en ligne — `PLAN_STATE.calendarYear--;
// planRenderPage();` — et les écriront ainsi jusqu'à ce que l'aiguillage de
// `pl-shell.js` soit converti : ils s'évaluent dans la portée de la page, où
// `PLAN_STATE` et `planRenderPage` vivent.
import type { EtatPlan, FiltresCal } from './etat';
import { etat, requis, tp } from './partage';

const PLAN_CAL_MOIS_LONGS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];


interface Domaine { id: string; code: string; nom: string }
interface Secteur { id: string; code: string; nom: string; domaine_id?: string }
interface Prestataire { id: string; nom?: string; trigramme?: string; secteur_id?: string }
interface Inspecteur { id: string; nom?: string; prenom?: string; trigramme?: string; numero_inspecteur?: string }
interface Activite {
  plan_id?: string; plan_statut?: string; prestataire_id?: string; responsable_id?: string;
  secteur_id?: string; date_debut?: string; date_fin?: string; objet?: string; titre?: string;
}
interface Plan { id: string; statut?: string; parent_plan_id?: string; annee?: number }


interface Referentiels {
  domaines: Domaine[]; secteurs: Secteur[]; prestataires: Prestataire[]; inspecteurs: Inspecteur[];
  prestMap: Record<string, string | undefined>; prestTrigMap: Record<string, string>;
  inspMap: Record<string, string>; inspTrigMap: Record<string, string>;
  prestSecteurMap: Record<string, string | undefined>;
  filteredSecteurs: Secteur[]; filteredPrest: Prestataire[];
}

/** Une liste des données chargées. Elles viennent du serveur, sans schéma ici. */
function liste<T>(nom: string): T[] {
  return (etat().data[nom] || []) as T[];
}

const S = etat;
const esc = (v: unknown): string => requis('_esc')(v);
const couleur = (id: string | undefined): string => requis('_prestataireColor')(id);
const mois = (S_: EtatPlan): number => S_.calendarMonth ?? 0;

export function planRenderCalendar(): string {
  const E = S();
  if (E.calendarYear == null) E.calendarYear = new Date().getFullYear();
  if (!E.calendarView) E.calendarView = 'month';
  if (E.calendarMonth == null) E.calendarMonth = new Date().getMonth(); // 0-indexed
  if (!E.calendarWeek) E.calendarWeek = 1;

  // Calendar-specific filter state (separate from PLAN_STATE.filters to avoid cross-page pollution)
  if (!E.calFilters) E.calFilters = { domaine: '', secteur: '', prestataire: '', annee: '', trimestre: '', responsable: '', search: '' };
  const CF = E.calFilters;

  const year = E.calendarYear;
  const view = E.calendarView;
  const refs = _planCalReferentiels(CF);
  const { prestMap, filteredPrest } = refs;
  const calFilterBar = _planCalBarreFiltres(CF, refs);
  const allActivities = _planCalActivites(CF, year, refs);

  // Initialize prestataire color cache for consistent colors
  const uniquePrestIds = [...new Set(allActivities.map((a) => a.prestataire_id).filter(Boolean))] as string[];
  uniquePrestIds.forEach((pid) => couleur(pid));

  // Build prestataire legend
  const prestLegend = uniquePrestIds.length ? `
    <div class="gantt-legend">
        ${uniquePrestIds.map((pid) => {
            const color = couleur(pid);
            const name = esc(prestMap[pid] || pid);
            return `<span class="gantt-legend-item"><span class="gantt-legend-dot" style="background:${color}"></span>${name}</span>`;
        }).join('')}
    </div>` : '';

  // Year navigation
  const yearNav = `
    <div class="calendar-year-nav">
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarYear--;planRenderPage();" title="${tp('previous_year')}" aria-label="${tp('previous_year')}">${PLAN_ICONS.back}</button>
        <h3 style="margin:0;min-width:80px;text-align:center;">${year}</h3>
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarYear++;planRenderPage();" title="${tp('next_year')}" aria-label="${tp('next_year')}" style="transform:rotate(180deg)">${PLAN_ICONS.back}</button>
    </div>`;

  // View toggle
  const viewToggle = `
    <div class="calendar-view-toggle">
        <button class="btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-outline'}" onclick="PLAN_STATE.calendarView='month';planRenderPage();">${tp('month_view')}</button>
        <button class="btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-outline'}" onclick="PLAN_STATE.calendarView='week';planRenderPage();">${tp('week_view')}</button>
    </div>`;

  const calendarContent = view === 'month'
    ? _planCalVueMois(year, allActivities, refs)
    : _planCalVueSemaine(year, allActivities, refs);

  // ── Gantt section (annual overview) — exclude superseded plan versions ──
  const validatedPlans = liste<Plan>('plans').filter((p) => p.statut === 'valide');
  const amendedParentIds = new Set(validatedPlans.filter((p) => p.parent_plan_id).map((p) => p.parent_plan_id));
  const ganttActivities = allActivities.filter((a) => !amendedParentIds.has(a.plan_id));

  // Le diagramme reprend la présentation du « Calendrier des Activités » du
  // tableau de bord — colonne figée, trimestres, mois, barres proportionnelles,
  // trait du jour — et garde ce qui lui appartient : l'année choisie ici, ses
  // propres filtres, la teinte par organisme et le clic qui ouvre le mois.
  const ganttHtml = requis('_planCalendrierHtml')(ganttActivities, {
    annee: year,
    titre: `${tp('gantt_diagram')} - ${year}`,
    prestataires: filteredPrest,
    filtre: { prestataire: CF.prestataire, pose: PLAN_CAL_FILTRES_PERIMETRE.some((k) => CF[k]) },
    couleur: (l: { act: Activite }) => couleur(l.act.prestataire_id),
    clic: (l: { debut: Date }) => `PLAN_STATE.calendarMonth=${l.debut.getMonth()};PLAN_STATE.calendarView='month';planRenderPage();`,
  });

  return `
    <div class="page-content" style="max-width:100%;min-width:0;overflow-x:hidden;">
        ${calFilterBar}

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
            ${yearNav}
            ${viewToggle}
        </div>

        ${prestLegend}

        <div class="card" style="min-width:0;">
            <div class="card-body" style="overflow-x:auto;min-width:0;">${calendarContent}</div>
        </div>

        ${ganttHtml}
    </div>`;
}

// Référentiels de la page : noms et trigrammes, rattachements, et les listes
// des filtres en cascade — les secteurs d'un domaine, les organismes d'un secteur.
function _planCalReferentiels(CF: FiltresCal): Referentiels {
  const domaines = liste<Domaine>('domaines');
  const secteurs = liste<Secteur>('secteurs');
  const prestataires = liste<Prestataire>('prestataires');
  const inspecteurs = liste<Inspecteur>('inspecteurs');
  const prestMap: Record<string, string | undefined> = {};
  const prestTrigMap: Record<string, string> = {};
  // Trigramme du prestataire : identifiant court utilisé dans le calendrier
  prestataires.forEach((p) => {
    prestMap[p.id] = p.nom;
    prestTrigMap[p.id] = (p.trigramme || (p.nom || '').substring(0, 3)).toUpperCase();
  });
  const inspMap: Record<string, string> = {};
  const inspTrigMap: Record<string, string> = {};
  const _trig = (i: Inspecteur): string => {
    if (i.trigramme) return String(i.trigramme).toUpperCase();
    const p = (i.prenom || '').trim(); const n = (i.nom || '').trim();
    const t = ((p[0] || '') + (n.slice(0, 2) || '')).toUpperCase();
    return t || (i.numero_inspecteur || '').slice(0, 3).toUpperCase();
  };
  inspecteurs.forEach((i) => {
    inspMap[i.id] = ((i.nom || '') + ' ' + (i.prenom || '')).trim();
    inspTrigMap[i.id] = _trig(i);
  });

  // Prestataire → secteur lookup
  const prestSecteurMap: Record<string, string | undefined> = {};
  prestataires.forEach((p) => { prestSecteurMap[p.id] = p.secteur_id; });

  // Cascading filter options
  let filteredSecteurs = secteurs;
  if (CF.domaine) filteredSecteurs = secteurs.filter((s) => s.domaine_id === CF.domaine);
  let filteredPrest = prestataires;
  if (CF.secteur) filteredPrest = prestataires.filter((p) => p.secteur_id === CF.secteur);
  else if (CF.domaine) {
    const secIds = new Set(filteredSecteurs.map((s) => s.id));
    filteredPrest = prestataires.filter((p) => secIds.has(p.secteur_id || ''));
  }
  return {
    domaines, secteurs, prestataires, inspecteurs, prestMap, prestTrigMap, inspMap, inspTrigMap,
    prestSecteurMap, filteredSecteurs, filteredPrest,
  };
}

// Barre de filtres du calendrier, précédée des boutons d'années.
function _planCalBarreFiltres(CF: FiltresCal, refs: Referentiels): string {
  const { domaines, filteredSecteurs, filteredPrest, inspecteurs } = refs;
  const plans = liste<Plan>('plans');
  // Collect available years from plans
  const availYears = [...new Set(plans.map((p) => p.annee))].sort((a, b) => Number(b) - Number(a));

  // Barre de filtres du calendrier, précédée des boutons d'années
  const choixAnnee = (a: unknown): string => `PLAN_STATE.calFilters.annee='${a}';${a ? `PLAN_STATE.calendarYear=${a};` : ''}planRenderPage();`;
  const calFilterBar = `${requis('_planBoutonsAnnees')(availYears, CF.annee, choixAnnee)}<div class="plan-filter-bar">
        <select class="form-select" onchange="PLAN_STATE.calFilters.domaine=this.value;PLAN_STATE.calFilters.secteur='';PLAN_STATE.calFilters.prestataire='';planRenderPage();">
            <option value="">${tp('all_domains')}</option>
            ${domaines.map((d) => `<option value="${d.id}" ${CF.domaine === d.id ? 'selected' : ''}>${d.code} - ${esc(d.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.secteur=this.value;PLAN_STATE.calFilters.prestataire='';planRenderPage();">
            <option value="">${tp('all_sectors')}</option>
            ${filteredSecteurs.map((s) => `<option value="${s.id}" ${CF.secteur === s.id ? 'selected' : ''}>${s.code} - ${esc(s.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.prestataire=this.value;planRenderPage();">
            <option value="">${tp('all_providers')}</option>
            ${filteredPrest.map((p) => `<option value="${p.id}" ${CF.prestataire === p.id ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.trimestre=this.value;planRenderPage();">
            <option value="">${tp('all_quarters')}</option>
            <option value="1" ${CF.trimestre === '1' ? 'selected' : ''}>${tp('quarter_1')}</option>
            <option value="2" ${CF.trimestre === '2' ? 'selected' : ''}>${tp('quarter_2')}</option>
            <option value="3" ${CF.trimestre === '3' ? 'selected' : ''}>${tp('quarter_3')}</option>
            <option value="4" ${CF.trimestre === '4' ? 'selected' : ''}>${tp('quarter_4')}</option>
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.responsable=this.value;planRenderPage();">
            <option value="">${tp('all_responsables')}</option>
            ${inspecteurs.map((i) => `<option value="${i.id}" ${CF.responsable === i.id ? 'selected' : ''}>${esc((i.nom || '') + ' ' + (i.prenom || ''))}</option>`).join('')}
        </select>
        <input type="text" class="form-input" id="plan-cal-search" placeholder="${tp('search')}" value="${esc(CF.search)}" oninput="_pesSearchInput(this, () => { PLAN_STATE.calFilters.search=document.getElementById('plan-cal-search').value; planRenderPage(); })">
        <button class="btn-icon-reset" onclick="PLAN_STATE.calFilters={domaine:'',secteur:'',prestataire:'',annee:'',trimestre:'',responsable:'',search:''};planRenderPage();" title="${tp('reset_filters')}" aria-label="${tp('reset_filters')}">${PLAN_ICONS.reset}</button>
    </div>`;
  return calFilterBar;
}

// Filtres de la barre du calendrier qui commandent le périmètre — ceux dont
// `_planCalRestreindre` tient compte pour ne porter en ligne que les organismes
// retenus.
//
// L'année n'en est pas : le diagramme porte toujours sur une année, et celle
// par défaut se lit sans qu'aucun bouton ait été touché. La compter ferait
// dépendre la liste d'un clic qui ne change rien au périmètre.
const PLAN_CAL_FILTRES_PERIMETRE: (keyof FiltresCal)[] = ['domaine', 'secteur', 'prestataire', 'trimestre', 'responsable', 'search'];

// Activités des plans validés qui touchent l'année, filtres du calendrier appliqués.
function _planCalActivites(CF: FiltresCal, year: number, refs: Referentiels): Activite[] {
  const { secteurs, prestSecteurMap, prestMap, inspMap } = refs;
  // ── Load & filter all activities (only from validated plans) ──
  let allActivities = liste<Activite>('allActivites').filter((a) => {
    if (!a.date_debut) return false;
    // Seuls les plans validés alimentent le calendrier
    if (!['valide', 'approuve_dg', 'transmis'].includes(a.plan_statut || '')) return false;
    const aYear = parseInt(a.date_debut.substring(0, 4));
    const eYear = a.date_fin ? parseInt(a.date_fin.substring(0, 4)) : aYear;
    return aYear <= year && eYear >= year;
  });

  // Apply calendar filters
  if (CF.domaine) {
    const secIds = new Set(secteurs.filter((s) => s.domaine_id === CF.domaine).map((s) => s.id));
    allActivities = allActivities.filter((a) => {
      if (a.secteur_id) return secIds.has(a.secteur_id);
      return secIds.has(prestSecteurMap[a.prestataire_id || ''] || '');
    });
  }
  if (CF.secteur) {
    allActivities = allActivities.filter((a) => {
      if (a.secteur_id) return a.secteur_id === CF.secteur;
      return prestSecteurMap[a.prestataire_id || ''] === CF.secteur;
    });
  }
  if (CF.prestataire) allActivities = allActivities.filter((a) => a.prestataire_id === CF.prestataire);
  if (CF.responsable) allActivities = allActivities.filter((a) => a.responsable_id === CF.responsable);
  if (CF.trimestre) {
    const qStart = (parseInt(CF.trimestre) - 1) * 3 + 1;
    const qEnd = qStart + 2;
    allActivities = allActivities.filter((a) => {
      const sm = a.date_debut ? parseInt(a.date_debut.substring(5, 7)) : 0;
      const em = a.date_fin ? parseInt(a.date_fin.substring(5, 7)) : sm;
      return sm <= qEnd && em >= qStart;
    });
  }
  if (CF.search) {
    const s = CF.search.toLowerCase();
    allActivities = allActivities.filter((a) => {
      const label = ((prestMap[a.prestataire_id || ''] || '') + ' ' + (a.objet || '') + ' ' + (a.titre || '') + ' ' + (inspMap[a.responsable_id || ''] || '')).toLowerCase();
      return label.includes(s);
    });
  }
  return allActivities;
}

// Vue mois : une ligne par activité, sa barre étendue sur ses jours.
function _planCalVueMois(year: number, allActivities: Activite[], refs: Referentiels): string {
  const { prestMap, prestTrigMap, inspMap, inspTrigMap } = refs;
  const fullMonths = PLAN_CAL_MOIS_LONGS;
  // ── Month view: horizontal bars per activity across days ──
  const cm = mois(S());
  const daysInMonth = new Date(year, cm + 1, 0).getDate();
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const dayDate = new Date(year, cm, i + 1);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    return `<th class="gantt-day-header${isWeekend ? ' gantt-weekend' : ''}">${i + 1}</th>`;
  }).join('');

  const monthNav = `
    <div class="calendar-month-nav">
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.max(0,PLAN_STATE.calendarMonth-1);planRenderPage();" aria-label="${tp('mois_precedent')}" title="${tp('mois_precedent')}">${PLAN_ICONS.back}</button>
        <h4 style="margin:0;min-width:120px;text-align:center;">${fullMonths[cm]}</h4>
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.min(11,PLAN_STATE.calendarMonth+1);planRenderPage();" style="transform:rotate(180deg)" aria-label="${tp('mois_suivant')}" title="${tp('mois_suivant')}">${PLAN_ICONS.back}</button>
    </div>`;

  // Filter activities for this month
  const monthActs = allActivities.filter((a) => {
    if (!a.date_debut) return false;
    const aYear = parseInt(a.date_debut.substring(0, 4));
    const aMonth = parseInt(a.date_debut.substring(5, 7)) - 1;
    const eYear = a.date_fin ? parseInt(a.date_fin.substring(0, 4)) : aYear;
    const eMonth = a.date_fin ? parseInt(a.date_fin.substring(5, 7)) - 1 : aMonth;
    return ((aYear <= year && aMonth <= cm) || aYear < year) && ((eYear >= year && eMonth >= cm) || eYear > year);
  });

  const rows = monthActs.map((a, idx) => {
    const prestNom = esc(prestMap[a.prestataire_id || ''] || '');
    const prestTrig = esc(prestTrigMap[a.prestataire_id || ''] || '');
    const objet = esc(a.objet || a.titre || '');
    const fullLabel = prestNom ? `${prestNom} / ${objet}` : objet;
    // Ligne du mois : prestataire identifié par son trigramme
    const courtLabel = prestTrig ? `${prestTrig} / ${objet}` : objet;
    const label = courtLabel.length > 30 ? courtLabel.substring(0, 30) + '…' : courtLabel;
    const barColor = couleur(a.prestataire_id);
    const respName = inspMap[a.responsable_id || ''] || '';
    const respTrig = inspTrigMap[a.responsable_id || ''] || '';
    const startDay = a.date_debut && parseInt(a.date_debut.substring(0, 4)) === year && parseInt(a.date_debut.substring(5, 7)) - 1 === cm ? parseInt(a.date_debut.substring(8, 10)) : 1;
    const endDay = a.date_fin && parseInt(a.date_fin.substring(0, 4)) === year && parseInt(a.date_fin.substring(5, 7)) - 1 === cm ? parseInt(a.date_fin.substring(8, 10)) : daysInMonth;
    const barSpan = endDay - startDay + 1;

    // Build cells with a merged bar spanning the active period
    let cells = '';
    let d = 1;
    while (d <= daysInMonth) {
      const dayDate = new Date(year, cm, d);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      if (d === startDay) {
        // Barre : trigramme du prestataire, puis celui du responsable
        const barLabel = [prestTrig, respTrig ? esc(respTrig) : ''].filter(Boolean).join(' · ');
        cells += `<td class="gantt-cell gantt-bar-cell" colspan="${barSpan}" title="${fullLabel}${respName ? ' — ' + esc(respName) : ''}">
                    <div class="gantt-bar" style="background:${barColor};">${barLabel}</div>
                </td>`;
        d = endDay + 1;
      } else {
        cells += `<td class="gantt-cell${isWeekend ? ' gantt-weekend' : ''}"></td>`;
        d++;
      }
    }
    return `<tr class="gantt-row ${idx % 2 === 1 ? 'gantt-row-alt' : ''}"><td class="gantt-label" title="${fullLabel}"><span class="gantt-label-dot" style="background:${barColor}"></span>${label}</td>${cells}</tr>`;
  }).join('');

  return `
        ${monthNav}
        <div style="overflow-x:auto;margin-top:0.5rem;">
            ${rows ? `<table class="gantt-table gantt-table-enhanced">
                <thead><tr><th class="gantt-label-header">${tp('activities')}</th>${dayHeaders}</tr></thead>
                <tbody>${rows}</tbody>
            </table>` : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
        </div>`;
}

// Vue semaine : les semaines du mois, trois activités au plus par jour.
function _planCalVueSemaine(year: number, allActivities: Activite[], refs: Referentiels): string {
  const { inspMap, inspTrigMap } = refs;
  const fullMonths = PLAN_CAL_MOIS_LONGS;
  const cm = mois(S());
  const firstDay = new Date(year, cm, 1).getDay(); // 0=Sunday
  const daysInMonth = new Date(year, cm + 1, 0).getDate();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Build weeks
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  const startOffset = (firstDay + 6) % 7; // Monday=0
  for (let i = 0; i < startOffset; i++) currentWeek.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length) { while (currentWeek.length < 7) currentWeek.push(null); weeks.push(currentWeek); }

  // Find activities for each day
  const getActsForDay = (day: number | null): Activite[] => {
    if (!day) return [];
    const dateStr = `${year}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allActivities.filter((a) => {
      if (!a.date_debut) return false;
      const start = a.date_debut.substring(0, 10);
      const end = (a.date_fin || a.date_debut).substring(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const monthNav = `
    <div class="calendar-month-nav">
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.max(0,PLAN_STATE.calendarMonth-1);planRenderPage();" aria-label="${tp('mois_precedent')}" title="${tp('mois_precedent')}">${PLAN_ICONS.back}</button>
        <h4 style="margin:0;min-width:120px;text-align:center;">${fullMonths[cm]}</h4>
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.min(11,PLAN_STATE.calendarMonth+1);planRenderPage();" style="transform:rotate(180deg)" aria-label="${tp('mois_suivant')}" title="${tp('mois_suivant')}">${PLAN_ICONS.back}</button>
    </div>`;

  // Week number labels
  const getWeekNumber = (day: number | null | undefined): number | '' => {
    if (!day) return '';
    const d = new Date(year, cm, day);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  };

  return `${monthNav}
    <div class="calendar-week-grid calendar-week-enhanced">
        <div class="cal-header-row">
            <div class="cal-week-label-header">S.</div>
            ${weekDays.map((d) => `<div class="cal-header-cell">${d}</div>`).join('')}
        </div>
        ${weeks.map((week, wIdx) => {
            const firstDayOfWeek = week.find((d) => d !== null);
            const weekNum = firstDayOfWeek ? getWeekNumber(firstDayOfWeek) : '';
            return `<div class="cal-week-row ${wIdx % 2 === 1 ? 'cal-week-row-alt' : ''}">
                <div class="cal-week-label">S${weekNum}</div>
                ${week.map((day) => {
                if (!day) return '<div class="cal-day-cell empty"></div>';
                const dayDate = new Date(year, cm, day);
                const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                const dayActs = getActsForDay(day);
                return `<div class="cal-day-cell${dayActs.length ? ' has-activities' : ''}${isWeekend ? ' cal-weekend' : ''}">
                    <div class="cal-day-num">${day}</div>
                    ${dayActs.slice(0, 3).map((a) => {
                        const color = couleur(a.prestataire_id);
                        const respName = inspMap[a.responsable_id || ''] || '';
                        const respTrig = inspTrigMap[a.responsable_id || ''] || '';
                        const actLabel = esc(a.objet || a.titre || '');
                        return `<div class="cal-activity-bar" style="background:${color};" title="${actLabel}${respName ? ' — ' + esc(respName) : ''}">
                            <span class="cal-activity-bar-text">${respTrig ? esc(respTrig) : actLabel.substring(0, 8)}</span>
                        </div>`;
                    }).join('')}
                    ${dayActs.length > 3 ? `<span class="cal-more">+${dayActs.length - 3}</span>` : ''}
                </div>`;
            }).join('')}
            </div>`;
        }).join('')}
    </div>`;
}
