/* Module « Plans de Surveillance » — calendrier
   Vues calendrier (mois, semaine) et diagramme de Gantt.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  CALENDAR / GANTT PAGE
// ══════════════════════════════════════

function planRenderCalendar() {
    if (PLAN_STATE.calendarYear == null) PLAN_STATE.calendarYear = new Date().getFullYear();
    if (!PLAN_STATE.calendarView) PLAN_STATE.calendarView = 'month';
    if (PLAN_STATE.calendarMonth == null) PLAN_STATE.calendarMonth = new Date().getMonth(); // 0-indexed
    if (!PLAN_STATE.calendarWeek) PLAN_STATE.calendarWeek = 1;

    // Calendar-specific filter state (separate from PLAN_STATE.filters to avoid cross-page pollution)
    if (!PLAN_STATE.calFilters) PLAN_STATE.calFilters = { domaine: '', secteur: '', prestataire: '', annee: '', trimestre: '', responsable: '', search: '' };
    const CF = PLAN_STATE.calFilters;

    const year = PLAN_STATE.calendarYear;
    const view = PLAN_STATE.calendarView;
    const plans = PLAN_STATE.data.plans || [];
    const fullMonths = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    // Reference data maps
    const domaines = PLAN_STATE.data.domaines || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    const prestataires = PLAN_STATE.data.prestataires || [];
    const inspecteurs = PLAN_STATE.data.inspecteurs || [];
    const prestMap = {};
    const prestTrigMap = {};
    // Trigramme du prestataire : identifiant court utilisé dans le calendrier
    prestataires.forEach(p => {
        prestMap[p.id] = p.nom;
        prestTrigMap[p.id] = (p.trigramme || (p.nom || '').substring(0, 3)).toUpperCase();
    });
    const inspMap = {};
    const inspTrigMap = {};
    const _trig = i => {
        if (i.trigramme) return String(i.trigramme).toUpperCase();
        const p = (i.prenom || '').trim(), n = (i.nom || '').trim();
        const t = ((p[0] || '') + (n.slice(0, 2) || '')).toUpperCase();
        return t || (i.numero_inspecteur || '').slice(0, 3).toUpperCase();
    };
    inspecteurs.forEach(i => {
        inspMap[i.id] = ((i.nom || '') + ' ' + (i.prenom || '')).trim();
        inspTrigMap[i.id] = _trig(i);
    });

    // Secteur → domaine lookup for activity filtering
    const secteurDomaineMap = {};
    secteurs.forEach(s => secteurDomaineMap[s.id] = s.domaine_id);
    // Prestataire → secteur lookup
    const prestSecteurMap = {};
    prestataires.forEach(p => prestSecteurMap[p.id] = p.secteur_id);

    // Cascading filter options
    let filteredSecteurs = secteurs;
    if (CF.domaine) filteredSecteurs = secteurs.filter(s => s.domaine_id === CF.domaine);
    let filteredPrest = prestataires;
    if (CF.secteur) filteredPrest = prestataires.filter(p => p.secteur_id === CF.secteur);
    else if (CF.domaine) {
        const secIds = new Set(filteredSecteurs.map(s => s.id));
        filteredPrest = prestataires.filter(p => secIds.has(p.secteur_id));
    }

    // Collect available years from plans
    const availYears = [...new Set(plans.map(p => p.annee))].sort((a, b) => b - a);

    // Build calendar filter bar HTML
    const calFilterBar = `<div class="plan-filter-bar">
        <select class="form-select" onchange="PLAN_STATE.calFilters.domaine=this.value;PLAN_STATE.calFilters.secteur='';PLAN_STATE.calFilters.prestataire='';planRenderPage();">
            <option value="">${tp('all_domains')}</option>
            ${domaines.map(d => `<option value="${d.id}" ${CF.domaine===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.secteur=this.value;PLAN_STATE.calFilters.prestataire='';planRenderPage();">
            <option value="">${tp('all_sectors')}</option>
            ${filteredSecteurs.map(s => `<option value="${s.id}" ${CF.secteur===s.id?'selected':''}>${s.code} - ${_esc(s.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.prestataire=this.value;planRenderPage();">
            <option value="">${tp('all_providers')}</option>
            ${filteredPrest.map(p => `<option value="${p.id}" ${CF.prestataire===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.annee=this.value;if(this.value)PLAN_STATE.calendarYear=parseInt(this.value);planRenderPage();">
            <option value="">${tp('all_years')}</option>
            ${availYears.map(y => `<option value="${y}" ${CF.annee==y?'selected':''}>${y}</option>`).join('')}
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.trimestre=this.value;planRenderPage();">
            <option value="">${tp('all_quarters')}</option>
            <option value="1" ${CF.trimestre==='1'?'selected':''}>${tp('quarter_1')}</option>
            <option value="2" ${CF.trimestre==='2'?'selected':''}>${tp('quarter_2')}</option>
            <option value="3" ${CF.trimestre==='3'?'selected':''}>${tp('quarter_3')}</option>
            <option value="4" ${CF.trimestre==='4'?'selected':''}>${tp('quarter_4')}</option>
        </select>
        <select class="form-select" onchange="PLAN_STATE.calFilters.responsable=this.value;planRenderPage();">
            <option value="">${tp('all_responsables')}</option>
            ${inspecteurs.map(i => `<option value="${i.id}" ${CF.responsable===i.id?'selected':''}>${_esc((i.nom||'')+' '+(i.prenom||''))}</option>`).join('')}
        </select>
        <input type="text" class="form-input" id="plan-cal-search" placeholder="${tp('search')}" value="${_esc(CF.search)}" oninput="_pesSearchInput(this, () => { PLAN_STATE.calFilters.search=document.getElementById('plan-cal-search').value; planRenderPage(); })">
        <button class="btn-icon-reset" onclick="PLAN_STATE.calFilters={domaine:'',secteur:'',prestataire:'',annee:'',trimestre:'',responsable:'',search:''};planRenderPage();" title="${tp('reset_filters')}">${PLAN_ICONS.reset}</button>
    </div>`;

    // ── Load & filter all activities (only from validated plans) ──
    let allActivities = (PLAN_STATE.data.allActivites || []).filter(a => {
        if (!a.date_debut) return false;
        // Seuls les plans validés alimentent le calendrier
        if (!['valide', 'approuve_dg', 'transmis'].includes(a.plan_statut)) return false;
        const aYear = parseInt(a.date_debut.substring(0, 4));
        const eYear = a.date_fin ? parseInt(a.date_fin.substring(0, 4)) : aYear;
        return aYear <= year && eYear >= year;
    });

    // Apply calendar filters
    if (CF.domaine) {
        const secIds = new Set(secteurs.filter(s => s.domaine_id === CF.domaine).map(s => s.id));
        allActivities = allActivities.filter(a => {
            if (a.secteur_id) return secIds.has(a.secteur_id);
            return secIds.has(prestSecteurMap[a.prestataire_id]);
        });
    }
    if (CF.secteur) {
        allActivities = allActivities.filter(a => {
            if (a.secteur_id) return a.secteur_id === CF.secteur;
            return prestSecteurMap[a.prestataire_id] === CF.secteur;
        });
    }
    if (CF.prestataire) allActivities = allActivities.filter(a => a.prestataire_id === CF.prestataire);
    if (CF.responsable) allActivities = allActivities.filter(a => a.responsable_id === CF.responsable);
    if (CF.trimestre) {
        const qStart = (parseInt(CF.trimestre) - 1) * 3 + 1;
        const qEnd = qStart + 2;
        allActivities = allActivities.filter(a => {
            const sm = a.date_debut ? parseInt(a.date_debut.substring(5, 7)) : 0;
            const em = a.date_fin ? parseInt(a.date_fin.substring(5, 7)) : sm;
            return sm <= qEnd && em >= qStart;
        });
    }
    if (CF.search) {
        const s = CF.search.toLowerCase();
        allActivities = allActivities.filter(a => {
            const label = ((prestMap[a.prestataire_id] || '') + ' ' + (a.objet || '') + ' ' + (a.titre || '') + ' ' + (inspMap[a.responsable_id] || '')).toLowerCase();
            return label.includes(s);
        });
    }

    // Initialize prestataire color cache for consistent colors
    const uniquePrestIds = [...new Set(allActivities.map(a => a.prestataire_id).filter(Boolean))];
    uniquePrestIds.forEach(pid => _prestataireColor(pid));

    // Build prestataire legend
    const prestLegend = uniquePrestIds.length ? `
    <div class="gantt-legend">
        ${uniquePrestIds.map(pid => {
            const color = _prestataireColor(pid);
            const name = _esc(prestMap[pid] || pid);
            return `<span class="gantt-legend-item"><span class="gantt-legend-dot" style="background:${color}"></span>${name}</span>`;
        }).join('')}
    </div>` : '';

    // Year navigation
    const yearNav = `
    <div class="calendar-year-nav">
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarYear--;planRenderPage();" title="${tp('previous_year')}">${PLAN_ICONS.back}</button>
        <h3 style="margin:0;min-width:80px;text-align:center;">${year}</h3>
        <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarYear++;planRenderPage();" title="${tp('next_year')}" style="transform:rotate(180deg)">${PLAN_ICONS.back}</button>
    </div>`;

    // View toggle
    const viewToggle = `
    <div class="calendar-view-toggle">
        <button class="btn btn-sm ${view==='month'?'btn-primary':'btn-outline'}" onclick="PLAN_STATE.calendarView='month';planRenderPage();">${tp('month_view')}</button>
        <button class="btn btn-sm ${view==='week'?'btn-primary':'btn-outline'}" onclick="PLAN_STATE.calendarView='week';planRenderPage();">${tp('week_view')}</button>
    </div>`;

    let calendarContent = '';

    if (view === 'month') {
        // ── Month view: horizontal bars per activity across days ──
        const cm = PLAN_STATE.calendarMonth;
        const daysInMonth = new Date(year, cm + 1, 0).getDate();
        const dayHeaders = Array.from({length: daysInMonth}, (_, i) => {
            const dayDate = new Date(year, cm, i + 1);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            return `<th class="gantt-day-header${isWeekend ? ' gantt-weekend' : ''}">${i + 1}</th>`;
        }).join('');

        const monthNav = `
        <div class="calendar-month-nav">
            <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.max(0,PLAN_STATE.calendarMonth-1);planRenderPage();">${PLAN_ICONS.back}</button>
            <h4 style="margin:0;min-width:120px;text-align:center;">${fullMonths[cm]}</h4>
            <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.min(11,PLAN_STATE.calendarMonth+1);planRenderPage();" style="transform:rotate(180deg)">${PLAN_ICONS.back}</button>
        </div>`;

        // Filter activities for this month
        const monthActs = allActivities.filter(a => {
            if (!a.date_debut) return false;
            const aYear = parseInt(a.date_debut.substring(0, 4));
            const aMonth = parseInt(a.date_debut.substring(5, 7)) - 1;
            const eYear = a.date_fin ? parseInt(a.date_fin.substring(0, 4)) : aYear;
            const eMonth = a.date_fin ? parseInt(a.date_fin.substring(5, 7)) - 1 : aMonth;
            return (aYear <= year && aMonth <= cm || aYear < year) && (eYear >= year && eMonth >= cm || eYear > year);
        });

        let rows = monthActs.map((a, idx) => {
            const prestNom = _esc(prestMap[a.prestataire_id] || '');
            const prestTrig = _esc(prestTrigMap[a.prestataire_id] || '');
            const objet = _esc(a.objet || a.titre || '');
            const fullLabel = prestNom ? `${prestNom} / ${objet}` : objet;
            // Ligne du mois : prestataire identifié par son trigramme
            const courtLabel = prestTrig ? `${prestTrig} / ${objet}` : objet;
            const label = courtLabel.length > 30 ? courtLabel.substring(0, 30) + '…' : courtLabel;
            const barColor = _prestataireColor(a.prestataire_id);
            const respName = inspMap[a.responsable_id] || '';
            const respTrig = inspTrigMap[a.responsable_id] || '';
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
                    const barLabel = [prestTrig, respTrig ? _esc(respTrig) : ''].filter(Boolean).join(' · ');
                    cells += `<td class="gantt-cell gantt-bar-cell" colspan="${barSpan}" title="${fullLabel}${respName ? ' — ' + _esc(respName) : ''}">
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

        calendarContent = `
            ${monthNav}
            <div style="overflow-x:auto;margin-top:0.5rem;">
                ${rows ? `<table class="gantt-table gantt-table-enhanced">
                    <thead><tr><th class="gantt-label-header">${tp('activities')}</th>${dayHeaders}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>` : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
            </div>`;
    } else {
        // ── Week view: show weeks of selected month with activity bars ──
        const cm = PLAN_STATE.calendarMonth;
        const firstDay = new Date(year, cm, 1).getDay(); // 0=Sunday
        const daysInMonth = new Date(year, cm + 1, 0).getDate();
        const weekDays = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

        // Build weeks
        let weeks = [];
        let currentWeek = [];
        const startOffset = (firstDay + 6) % 7; // Monday=0
        for (let i = 0; i < startOffset; i++) currentWeek.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            currentWeek.push(d);
            if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
        }
        if (currentWeek.length) { while (currentWeek.length < 7) currentWeek.push(null); weeks.push(currentWeek); }

        // Find activities for each day
        const getActsForDay = (day) => {
            if (!day) return [];
            const dateStr = `${year}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return allActivities.filter(a => {
                if (!a.date_debut) return false;
                const start = a.date_debut.substring(0, 10);
                const end = (a.date_fin || a.date_debut).substring(0, 10);
                return dateStr >= start && dateStr <= end;
            });
        };

        const monthNav = `
        <div class="calendar-month-nav">
            <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.max(0,PLAN_STATE.calendarMonth-1);planRenderPage();">${PLAN_ICONS.back}</button>
            <h4 style="margin:0;min-width:120px;text-align:center;">${fullMonths[cm]}</h4>
            <button class="btn btn-icon btn-sm" onclick="PLAN_STATE.calendarMonth=Math.min(11,PLAN_STATE.calendarMonth+1);planRenderPage();" style="transform:rotate(180deg)">${PLAN_ICONS.back}</button>
        </div>`;

        // Week number labels
        const getWeekNumber = (day) => {
            if (!day) return '';
            const d = new Date(year, cm, day);
            const oneJan = new Date(d.getFullYear(), 0, 1);
            return Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
        };

        calendarContent = `${monthNav}
        <div class="calendar-week-grid calendar-week-enhanced">
            <div class="cal-header-row">
                <div class="cal-week-label-header">S.</div>
                ${weekDays.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}
            </div>
            ${weeks.map((week, wIdx) => {
                const firstDayOfWeek = week.find(d => d !== null);
                const weekNum = firstDayOfWeek ? getWeekNumber(firstDayOfWeek) : '';
                return `<div class="cal-week-row ${wIdx % 2 === 1 ? 'cal-week-row-alt' : ''}">
                    <div class="cal-week-label">S${weekNum}</div>
                    ${week.map(day => {
                    if (!day) return '<div class="cal-day-cell empty"></div>';
                    const dayDate = new Date(year, cm, day);
                    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                    const dayActs = getActsForDay(day);
                    return `<div class="cal-day-cell${dayActs.length ? ' has-activities' : ''}${isWeekend ? ' cal-weekend' : ''}">
                        <div class="cal-day-num">${day}</div>
                        ${dayActs.slice(0, 3).map(a => {
                            const color = _prestataireColor(a.prestataire_id);
                            const respName = inspMap[a.responsable_id] || '';
                            const respTrig = inspTrigMap[a.responsable_id] || '';
                            const actLabel = _esc(a.objet || a.titre || '');
                            return `<div class="cal-activity-bar" style="background:${color};" title="${actLabel}${respName ? ' — ' + _esc(respName) : ''}">
                                <span class="cal-activity-bar-text">${respTrig ? _esc(respTrig) : actLabel.substring(0, 8)}</span>
                            </div>`;
                        }).join('')}
                        ${dayActs.length > 3 ? `<span class="cal-more">+${dayActs.length - 3}</span>` : ''}
                    </div>`;
                }).join('')}
                </div>`;
            }).join('')}
        </div>`;
    }

    // ── Gantt section (annual overview) — exclude superseded plan versions ──
    const validatedPlans = (PLAN_STATE.data.plans || []).filter(p => p.statut === 'valide');
    const amendedParentIds = new Set(validatedPlans.filter(p => p.parent_plan_id).map(p => p.parent_plan_id));
    const ganttActivities = allActivities.filter(a => !amendedParentIds.has(a.plan_id));

    // Le diagramme reprend la présentation du « Calendrier des Activités » du
    // tableau de bord — colonne figée, trimestres, mois, barres proportionnelles,
    // trait du jour — et garde ce qui lui appartient : l'année choisie ici, ses
    // propres filtres, la teinte par organisme et le clic qui ouvre le mois.
    const ganttHtml = _planCalendrierHtml(ganttActivities, {
        annee: year,
        titre: `${tp('gantt_diagram')} - ${year}`,
        prestataires: filteredPrest,
        couleur: (l) => _prestataireColor(l.act.prestataire_id),
        clic: (l) => `PLAN_STATE.calendarMonth=${l.debut.getMonth()};PLAN_STATE.calendarView='month';planRenderPage();`,
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
