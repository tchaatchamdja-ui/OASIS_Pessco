/* Module « Plans de Surveillance » — calendrier des activités du tableau de bord
   Repris du « Calendrier des Activités » de « Exécution de la Surveillance »,
   adapté aux données du module : ici l'activité n'a pas de dossier ouvert, son
   état se lit sur ses seules dates, et le périmètre est celui des plans en
   vigueur — ce que les cartes comptent, le calendrier le montre.
   Ordre de chargement : voir index.html.
   ─────────────────────────────────────────────────────────────────────── */

const PLAN_CAL_MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

// Une activité qui reste à réaliser est à venir, en cours, ou en retard : sa
// fin est passée et rien n'est venu la clore. Le module ne tient pas la
// réalisation — c'est « Exécution de la Surveillance » qui la constate.
const PLAN_CAL_ETATS = ['planifie', 'en_cours', 'en_retard'];
const PLAN_CAL_COULEURS = { planifie: '#2563eb', en_cours: '#f59e0b', en_retard: '#dc2626' };

function _planCalDate(iso) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function _planCalEtat(debut, fin, aujourdhui) {
    if (fin < aujourdhui) return 'en_retard';
    if (debut <= aujourdhui) return 'en_cours';
    return 'planifie';
}

function _planCalType(act) {
    const t = (PLAN_STATE.data.typesSupervision || []).find(x => x.id === act.type_supervision_id);
    return (t && (t.type_supervision || t.libelle || t.nom)) || '—';
}

// Bornes de la piste : l'année retenue par les filtres, étendue aux mois
// entiers si une activité déborde de part et d'autre.
function _planCalBornes(lignes, annee) {
    let min = new Date(annee, 0, 1);
    let max = new Date(annee, 11, 31);
    lignes.forEach(l => {
        if (l.debut < min) min = new Date(l.debut.getFullYear(), l.debut.getMonth(), 1);
        if (l.fin > max) max = new Date(l.fin.getFullYear(), l.fin.getMonth() + 1, 0);
    });
    return { min, max };
}

function _planCalListeMois(min, max) {
    const mois = [];
    const c = new Date(min.getFullYear(), min.getMonth(), 1);
    while (c <= max) {
        mois.push({ annee: c.getFullYear(), mois: c.getMonth() });
        c.setMonth(c.getMonth() + 1);
    }
    return mois;
}

// Lignes du diagramme, à partir des activités déjà retenues par les filtres du
// tableau de bord : les cartes et le calendrier montrent le même périmètre.
function _planCalLignes(activites) {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const prestataires = PLAN_STATE.data.prestataires || [];
    const plans = PLAN_STATE.data.plans || [];

    const lignes = (activites || [])
        .filter(a => a.date_debut)
        .map(a => {
            const debut = _planCalDate(a.date_debut);
            const finBrute = _planCalDate(a.date_fin) || debut;
            const fin = finBrute < debut ? debut : finBrute;
            const p = prestataires.find(x => x.id === a.prestataire_id);
            return {
                act: a, debut, fin,
                etat: _planCalEtat(debut, fin, aujourdhui),
                type: _planCalType(a),
                plan: (plans.find(x => x.id === a.plan_id) || {}).titre || '',
                prestataire_id: a.prestataire_id || 'inconnu',
                prestataire_nom: (p && p.nom) || tp('provider'),
            };
        });
    return { lignes, aujourdhui };
}

// Prestataires du périmètre : ceux que les filtres retiennent. Un organisme
// sans activité garde sa ligne — son absence laisserait croire qu'il a été
// écarté, quand il n'a simplement rien de programmé.
function _planCalPrestataires() {
    const F = PLAN_STATE.filters;
    const secteurs = PLAN_STATE.data.secteurs || [];
    const duDomaine = new Set(secteurs.filter(s => s.domaine_id === F.domaine).map(s => s.id));
    return (PLAN_STATE.data.prestataires || []).filter(p => {
        if (F.prestataire) return p.id === F.prestataire;
        if (F.secteur) return p.secteur_id === F.secteur;
        if (F.domaine) return duDomaine.has(p.secteur_id) || p.domaine_id === F.domaine;
        return true;
    });
}

function _planCalendrierHtml(activites) {
    const C = PLAN_STATE.calendrier || (PLAN_STATE.calendrier = { types: [], etats: [] });
    const { lignes, aujourdhui } = _planCalLignes(activites);

    // Les listes de filtres portent sur toutes les activités, pas seulement
    // sur celles qui restent visibles — sinon cocher une case ferait
    // disparaître les autres cases.
    const tousTypes = [...new Set(lignes.map(l => l.type))].sort((a, b) => a.localeCompare(b));
    const visibles = lignes.filter(l => (!C.types.length || C.types.includes(l.type))
        && (!C.etats.length || C.etats.includes(l.etat)));

    const annee = PLAN_STATE.filters.annee
        ? parseInt(PLAN_STATE.filters.annee, 10) : new Date().getFullYear();
    const { min, max } = _planCalBornes(visibles, annee);
    const mois = _planCalListeMois(min, max);
    const t0 = min.getTime();
    const etendue = Math.max(1, new Date(max.getFullYear(), max.getMonth() + 1, 0).getTime() - t0);
    const pct = (d) => ((d.getTime() - t0) / etendue) * 100;

    // Bandeau des trimestres : les mois consécutifs d'un même trimestre sont
    // regroupés, chaque cellule pesant son nombre de mois.
    const trimestres = [];
    mois.forEach((m) => {
        const t = Math.floor(m.mois / 3) + 1;
        const dernier = trimestres[trimestres.length - 1];
        if (dernier && dernier.annee === m.annee && dernier.t === t) dernier.n += 1;
        else trimestres.push({ annee: m.annee, t, n: 1 });
    });

    const groupes = {};
    _planCalPrestataires().forEach(p => { groupes[p.id] = { nom: p.nom, lignes: [] }; });
    visibles.forEach(l => {
        if (!groupes[l.prestataire_id]) groupes[l.prestataire_id] = { nom: l.prestataire_nom, lignes: [] };
        groupes[l.prestataire_id].lignes.push(l);
    });
    const ordre = Object.keys(groupes).sort((a, b) => groupes[a].nom.localeCompare(groupes[b].nom));

    const jour = (d) => `${d.getDate()} ${PLAN_CAL_MOIS[d.getMonth()]} ${d.getFullYear()}`;

    let corps = '';
    ordre.forEach(pid => {
        const g = groupes[pid];
        corps += `
        <div class="g-nom g-groupe">${_esc(g.nom)}<span class="g-compte">${g.lignes.length}</span></div>
        <div class="g-piste g-groupe"></div>`;
        if (!g.lignes.length) {
            corps += `<div class="g-nom g-activite g-sans">${tp('cal_sans_activite')}</div>
                      <div class="g-piste"></div>`;
        }
        g.lignes.sort((a, b) => a.debut - b.debut).forEach((l, iLigne) => {
            const paire = iLigne % 2 ? ' g-paire' : '';
            const gauche = Math.max(0, pct(l.debut));
            const largeur = Math.max(1.4, pct(new Date(l.fin.getTime() + 86400000)) - gauche);
            const objet = l.act.objet || l.act.titre || '—';
            corps += `
            <div class="g-nom g-activite${paire}" title="${_escAttr(objet)}">
                <span class="g-activite-txt">${_esc(objet)}</span>
            </div>
            <div class="g-piste${paire}">
                <div class="g-barre etat-${l.etat}" style="left:${gauche.toFixed(2)}%;width:${Math.min(largeur, 100 - gauche).toFixed(2)}%;"
                     onmouseenter="planCalInfo(this, true)" onmouseleave="planCalInfo(this, false)">
                    <span class="g-barre-txt">${_esc(l.type)}</span>
                    ${l.etat === 'en_retard' ? '<span class="g-alerte">!</span>' : ''}
                </div>
                <div class="g-infobulle">
                    <div class="t">${_esc(objet)}</div>
                    <div><span>${tp('cal_dates')}</span> ${jour(l.debut)} → ${jour(l.fin)}</div>
                    <div><span>${tp('status')}</span> ${tp('cal_' + l.etat)}</div>
                    <div><span>${tp('type_supervision')}</span> ${_esc(l.type)}</div>
                    ${l.plan ? `<div><span>${tp('plan_title')}</span> ${_esc(l.plan)}</div>` : ''}
                    ${l.act.lieu_activite ? `<div><span>${tp('lieu_activite')}</span> ${_esc(l.act.lieu_activite)}</div>` : ''}
                </div>
            </div>`;
        });
    });

    if (!corps) corps = `<div class="g-nom g-vide"></div><div class="g-piste g-vide">${tp('no_data')}</div>`;

    const caseFiltre = (groupe, valeur, libelle, couleur) => `
        <label class="g-case">
            <input type="checkbox" ${((C[groupe] || []).includes(valeur)) ? 'checked' : ''}
                   onchange="planCalFiltrer('${groupe}', ${_escAttr(JSON.stringify(valeur))}, this.checked)">
            ${couleur ? `<span class="g-puce" style="background:${couleur};"></span>` : ''}
            <span>${_esc(libelle)}</span>
        </label>`;

    const marqueur = (aujourdhui >= min && aujourdhui <= max)
        ? `<div class="g-aujourdhui" style="left:${pct(aujourdhui).toFixed(2)}%;"></div>` : '';

    return `
    <div class="card pl-cal-carte" id="planCalendrierRoot" style="margin-top:1rem;">
        <div class="pl-cal-entete">
            <h4>${tp('cal_titre')}</h4>
            <div class="pl-cal-nav">
                <button class="btn btn-sm btn-outline" onclick="planCalBord(-1)" title="${_escAttr(tp('cal_debut'))}">«</button>
                <button class="btn btn-sm btn-outline" onclick="planCalDefiler(-1)" title="${_escAttr(tp('cal_reculer'))}">‹</button>
                <button class="btn btn-sm btn-outline" onclick="planCalAujourdhui()">${tp('cal_aujourdhui')}</button>
                <button class="btn btn-sm btn-outline" onclick="planCalDefiler(1)" title="${_escAttr(tp('cal_avancer'))}">›</button>
                <button class="btn btn-sm btn-outline" onclick="planCalBord(1)" title="${_escAttr(tp('cal_fin'))}">»</button>
                <span class="pl-cal-jour">${jour(aujourdhui)}</span>
            </div>
        </div>
        <div class="pl-cal-corps">
            <div class="pl-gantt-cadre">
                <div class="pl-gantt" style="min-width:${Math.max(680, mois.length * 62)}px;">
                    <div class="g-nom g-annee">${min.getFullYear()}${max.getFullYear() !== min.getFullYear() ? ` – ${max.getFullYear()}` : ''}</div>
                    <div class="g-piste g-entete">
                        ${trimestres.map(t => `<div class="g-cellule" style="flex-grow:${t.n};">T${t.t}</div>`).join('')}
                    </div>
                    <div class="g-nom g-entete-vide"></div>
                    <div class="g-piste g-entete g-entete-mois">
                        ${mois.map(m => `<div class="g-cellule">${PLAN_CAL_MOIS[m.mois]}</div>`).join('')}
                    </div>
                    ${corps}
                    <div class="g-overlay">
                        ${mois.map((m, i) => i ? `<div class="g-trait" style="left:${((i / mois.length) * 100).toFixed(3)}%;"></div>` : '').join('')}
                        ${marqueur}
                    </div>
                </div>
            </div>
            <aside class="pl-gantt-panneau">
                <div class="g-bloc">
                    <div class="g-bloc-titre">${tp('type_supervision')}</div>
                    ${tousTypes.length
                        ? tousTypes.map(t => caseFiltre('types', t, t, '')).join('')
                        : `<div class="g-bloc-vide">${tp('no_data')}</div>`}
                </div>
                <div class="g-bloc">
                    <div class="g-bloc-titre">${tp('status')}</div>
                    ${PLAN_CAL_ETATS.map(e => caseFiltre('etats', e, tp('cal_' + e), PLAN_CAL_COULEURS[e])).join('')}
                </div>
            </aside>
        </div>
    </div>`;
}

// ── Défilement ──
// La piste est plus large que son cadre : au-delà de la barre de défilement,
// on donne des commandes explicites, dont un retour à la date du jour.
function _planCalCadre() {
    return document.querySelector('#planCalendrierRoot .pl-gantt-cadre');
}

window.planCalDefiler = function (sens) {
    const cadre = _planCalCadre();
    if (!cadre) return;
    cadre.scrollBy({ left: sens * Math.max(120, cadre.clientWidth * 0.6), behavior: 'smooth' });
};

window.planCalBord = function (sens) {
    const cadre = _planCalCadre();
    if (!cadre) return;
    cadre.scrollTo({ left: sens < 0 ? 0 : cadre.scrollWidth, behavior: 'smooth' });
};

window.planCalAujourdhui = function () {
    const cadre = _planCalCadre();
    if (!cadre) return;
    const trait = cadre.querySelector('.g-aujourdhui');
    if (!trait) { cadre.scrollTo({ left: 0, behavior: 'smooth' }); return; }
    const piste = cadre.querySelector('.pl-gantt');
    const x = 220 + (parseFloat(trait.style.left) / 100) * (piste.offsetWidth - 220);
    cadre.scrollTo({ left: Math.max(0, x - cadre.clientWidth / 2), behavior: 'smooth' });
};

// La fiche de survol se place à la main, en position fixe : la piste défile
// horizontalement, et tout ce qui reste dans ce cadre s'y trouve rogné.
window.planCalInfo = function (barre, montrer) {
    const bulle = barre.parentElement.querySelector('.g-infobulle');
    if (!bulle) return;
    if (!montrer) { bulle.style.display = 'none'; return; }
    bulle.style.display = 'block';
    const r = barre.getBoundingClientRect();
    const b = bulle.getBoundingClientRect();
    let x = r.left;
    let y = r.bottom + 6;
    if (x + b.width > window.innerWidth - 8) x = window.innerWidth - b.width - 8;
    if (y + b.height > window.innerHeight - 8) y = r.top - b.height - 6;
    bulle.style.left = Math.max(8, x) + 'px';
    bulle.style.top = Math.max(8, y) + 'px';
};

// Un filtre du panneau : on ne refait que le calendrier, pas le tableau de bord.
window.planCalFiltrer = function (groupe, valeur, coche) {
    const C = PLAN_STATE.calendrier || (PLAN_STATE.calendrier = { types: [], etats: [] });
    const liste = C[groupe] || (C[groupe] = []);
    const i = liste.indexOf(valeur);
    if (coche && i === -1) liste.push(valeur);
    if (!coche && i !== -1) liste.splice(i, 1);
    const root = document.getElementById('planCalendrierRoot');
    if (root) root.outerHTML = _planCalendrierHtml(_planActivitesDuBord());
};
