/* OASIS — Module « Exécution de la Surveillance »
 * Écran 1 — Tableau de bord et suivi des activités.
 *
 * Cartes d’indicateurs, statistiques, diagramme de Gantt des activités planifiées.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  1. DASHBOARD
// ══════════════════════════════════════



// Répartition en table plutôt qu'en anneau : le volume exact se lit dans la
// colonne, la micro-barre ne sert qu'à comparer les lignes entre elles — elle
// est donc calée sur la plus forte, pas sur le total.
// Le total est passé à part : certaines répartitions se recoupent (une
// constatation hors délai est aussi une constatation ouverte), la somme des
// lignes ne vaut donc pas toujours l'effectif.
function _execTableauRepartition(titre, lignes, total) {
    const rows = lignes || [];
    const max = Math.max(1, ...rows.map(s => s.value || 0));
    const somme = total != null ? total : rows.reduce((s, x) => s + (x.value || 0), 0);
    return `
    <div class="exec-crit-bloc">
        <div class="exec-crit-titre">
            <span>${_esc(titre)}</span>
            <strong class="exec-crit-total">${somme}</strong>
        </div>
        <table class="exec-crit-tab">
            <tbody>
                ${rows.map(s => {
                    // Une ligne porteuse d'une clé ouvre le détail sous les
                    // indicateurs, comme les cartes de conformité.
                    const actif = s.cle && s.cle === (EXEC_STATE.statsIndicateur || '');
                    const attrs = s.cle
                        ? ` class="cliquable${actif ? ' actif' : ''}" onclick="execStatsIndicateur('${s.cle}')"
                            role="button" tabindex="0" title="${_escAttr(te('voir_donnees_source'))}"`
                        : '';
                    return `
                <tr${attrs}>
                    <td><span class="exec-crit-badge" style="background:${s.color};">${_esc(s.label)}</span></td>
                    <td class="num">${s.value || 0}</td>
                    <td>
                        <div class="exec-crit-piste">
                            <div class="exec-crit-barre" style="width:${Math.round(((s.value || 0) / max) * 100)}%;background:${s.color};"></div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// ── Ce qu'une constatation pèse dans les indicateurs ─────────────
// Elle compte dès qu'elle est notifiée au prestataire, quelle que soit son
// origine : relevée pendant une activité de surveillance, ou émise hors
// activité. Un brouillon, une soumission en cours de validation ou un rejet
// n'existent pas pour le prestataire — ils ne pèsent pas.
const EXEC_CONSTA_EN_VIGUEUR = new Set(['ouvert', 'ouverte', 'pac_soumis',
    'pac_valide', 'pac_rejetee', 'soldee']);

function _execConstaEnVigueur(c) {
    return EXEC_CONSTA_EN_VIGUEUR.has(String((c || {}).statut || ''));
}

// Constatation hors activité de supervision : elle ne se rattache à aucun
// dossier d'exécution.
function _execConstaHorsActivite(c) {
    return !(c || {}).dossier_id;
}

// Échéance de solde d'une constatation. `delai_solde` est un nombre de jours,
// jamais une date : le confondre avec l'échéance faussait les alertes.
function _execConstaEcheance(c) {
    return (c || {}).date_due_cloture || (c || {}).date_due || '';
}

// ── Avancement d'une activité, par lignée ──
// Une activité est réalisée quand son rapport a été transmis — le dernier des
// quatre niveaux. Le tableau de bord comptait jusqu'ici les dossiers clôturés
// du prestataire sans regarder à quelle activité ils se rattachaient : un
// dossier hors périmètre gonflait le taux, qui pouvait dépasser 100 %.
// La notification se cherche par la lignée de l'activité : déclenchée sous une
// version du plan puis recopiée par un amendement, elle garde son processus.
function _execAvancementParActivite(dossiers) {
    const notifParActivite = {};
    (EXEC_STATE.data.notifications || []).forEach((n) => {
        if (!n.activite_id) return;
        notifParActivite[n.activite_id] = n;
        const racine = execRacineActivite(n.activite_id);
        if (racine && !notifParActivite[racine]) notifParActivite[racine] = n;
    });
    const dossierParNotif = {};
    (dossiers || []).forEach((d) => { if (d.notification_id) dossierParNotif[d.notification_id] = d; });

    const notifDe = (a) => notifParActivite[(a || {}).id] || notifParActivite[execRacineActivite(a)] || null;
    const dossierDe = (a) => { const n = notifDe(a); return n ? dossierParNotif[n.id] || null : null; };
    return {
        notifParActivite, dossierParNotif, notifDe, dossierDe,
        niveau: (a) => execAvancement(notifDe(a), dossierDe(a)),
        activiteRealisee: (a) => execAvancement(notifDe(a), dossierDe(a)) === 'realisee',
    };
}

// ── Situation Générale ───────────────────────────────────────────
// Le regroupement Domaine → Secteur → Prestataire, ses agrégats et sa
// table à sous-totaux. Le tableau de bord s'en sert pour ses cartes et ses donuts ;
// le formulaire « Statistiques détaillées » l'affiche en propre, avec ses
// propres filtres. Une seule fonction, donc les mêmes chiffres partout.
function _execSituationGenerale(F) {
    F = F || EXEC_STATE.filters || {};
    const secteurs = EXEC_STATE.data.secteurs || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    // Compte prestataire : la portée est l’ensemble de ses rattachements,
    // resserrée sur celui qu’il a choisi au filtre.
    const mesPrest = _execPortePrestataire(F.prestataire);
    let constatations = EXEC_STATE.data.constatations || [];
    if (mesPrest) constatations = constatations.filter(c => mesPrest.includes(c.prestataire_id));
    const secteurToDomaine = {};
    secteurs.forEach(s => { if (s.domaine_id) secteurToDomaine[s.id] = s.domaine_id; });

    const allActivities = _execSgActivites(F, secteurToDomaine, _execIsPrestataire(), mesPrest);
    const filteredConstatations = _execSgConstatations(F, constatations);
    const indicateurs = _execSgIndicateurs(allActivities, filteredConstatations);
    const prestDomaineLookup = _execSgRattachements(secteurs);
    const aTraiter = _execSgADeclencher(F, mesPrest, prestDomaineLookup);
    const closedDossiers = _execSgDossiersClos(F, dossiers, mesPrest, prestDomaineLookup);
    const { activiteRealisee } = _execAvancementParActivite(dossiers);
    const { domaineMap, resolveSecteur, resolveDossierDomaine } = _execSgRegrouper(
        allActivities, closedDossiers, filteredConstatations, prestDomaineLookup, secteurToDomaine);

    // Libellés : domaines affichés par sigle/code, secteurs par code/nom.
    const domaineNameMap = {};
    domaines.forEach(d => { domaineNameMap[d.id] = d.code || d.sigle || d.nom || d.id; });
    const secteurNameMap = {};
    secteurs.forEach(s => { secteurNameMap[s.id] = s.code || s.nom || s.id; });

    const { criticites, critLibelle } = _execSgCriticites();
    const { computePrestStats, aggregate } = _execSgCalculs(
        domaineMap, filteredConstatations, activiteRealisee, criticites);
    const tableHtml = _execSgTableHtml({
        domaineMap, domaineNameMap, secteurNameMap, criticites, critLibelle, computePrestStats, aggregate,
    });

    return {
        tableHtml, domaineMap, domaineNameMap, secteurNameMap, criticites,
        computePrestStats, aggregate, closedDossiers, activiteRealisee, resolveDossierDomaine, resolveSecteur,
        allActivities, filteredConstatations,
        // Mesures des cartes : le tableau de bord et le formulaire de
        // statistiques les lisent d'ici, jamais recalculées à côté.
        ...indicateurs, ...aTraiter,
    };
}

// Activités des plans validés que les filtres retiennent.
function _execSgActivites(F, secteurToDomaine, isPrest, mesPrest) {
    const plansValides = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    let allActivities = [];
    plansValides.forEach(p => {
        if (F.annee && String(p.annee) !== String(F.annee)) return;
        (p.activites || []).forEach(a => {
            const domaineId = a.domaine_id || secteurToDomaine[a.secteur_id] || '';
            allActivities.push({ ...a, plan_annee: p.annee, domaine_id_resolved: domaineId });
        });
    });

    if (isPrest) {
        allActivities = allActivities.filter(a => mesPrest.includes(a.prestataire_id));
    }

    // Apply trimestre filter
    if (F.trimestre) {
        const q = parseInt(F.trimestre);
        const qStart = (q - 1) * 3; // 0,3,6,9
        allActivities = allActivities.filter(a => {
            if (!a.date_debut) return false;
            const m = new Date(a.date_debut).getMonth();
            return m >= qStart && m < qStart + 3;
        });
    }

    // Apply domaine filter
    if (F.domaine) {
        allActivities = allActivities.filter(a => a.domaine_id_resolved === F.domaine);
    }

    // Apply prestataire filter
    if (F.prestataire) {
        allActivities = allActivities.filter(a => a.prestataire_id === F.prestataire);
    }

    // Apply search filter
    if (F.search) {
        const s = F.search.toLowerCase();
        allActivities = allActivities.filter(a =>
            (a.objet || '').toLowerCase().includes(s) ||
            (a.prestataire_nom || '').toLowerCase().includes(s) ||
            (a.type_supervision || '').toLowerCase().includes(s)
        );
    }
    return allActivities;
}

// Constatations que les mêmes filtres retiennent.
function _execSgConstatations(F, constatations) {
    let filteredConstatations = [...constatations];
    if (F.annee) {
        filteredConstatations = filteredConstatations.filter(c => {
            const y = (c.date_creation || c.date_ouverture || '').substring(0, 4);
            return y === String(F.annee);
        });
    }
    if (F.trimestre) {
        filteredConstatations = filteredConstatations.filter(c => {
            const d = c.date_creation || c.date_ouverture || '';
            if (d.length < 7) return false;
            return String(Math.ceil(parseInt(d.slice(5, 7)) / 3)) === String(F.trimestre);
        });
    }
    if (F.domaine) {
        filteredConstatations = filteredConstatations.filter(c => c.domaine_id === F.domaine);
    }
    if (F.prestataire) {
        filteredConstatations = filteredConstatations.filter(c => c.prestataire_id === F.prestataire);
    }
    if (F.search) {
        const cs = F.search.toLowerCase();
        filteredConstatations = filteredConstatations.filter(c =>
            (c.reference || '').toLowerCase().includes(cs) ||
            (c.titre || '').toLowerCase().includes(cs) ||
            (c.description || '').toLowerCase().includes(cs) ||
            (c.prestataire_nom || '').toLowerCase().includes(cs)
        );
    }
    return filteredConstatations;
}

// Mesures des cartes : activités clôturées, constatations en vigueur,
// ouvertes, critiques, émises hors activité, hors délai.
function _execSgIndicateurs(allActivities, filteredConstatations) {
    const totalAct = allActivities.length;
    const closedAct = allActivities.filter(a => a.statut === 'cloture' || a.statut === 'cloturee').length;
    const tauxClotureAct = totalAct > 0 ? Math.round((closedAct / totalAct) * 100) : 0;

    // Les cartes portent sur les constatations en vigueur : brouillons,
    // soumissions et rejets en étaient jusqu'ici comptés comme « ouvertes ».
    const constEnVigueur = filteredConstatations.filter(_execConstaEnVigueur);
    const totalConst = constEnVigueur.length;
    const closedConst = constEnVigueur.filter(c => c.statut === 'soldee').length;
    const tauxClotureConst = totalConst > 0 ? Math.round((closedConst / totalConst) * 100) : 0;

    const ouvertes = constEnVigueur.filter(c => c.statut !== 'soldee');
    const fncOuvertes = ouvertes.length;
    const fncCritiques = ouvertes.filter(c => (c.criticite || c.gravite || '').toLowerCase() === 'critique').length;
    // Part des constatations émises hors activité de supervision.
    const horsActivite = constEnVigueur.filter(_execConstaHorsActivite).length;
    const horsActiviteOuvertes = ouvertes.filter(_execConstaHorsActivite).length;

    // Constatations dont le délai de traitement est dépassé.
    const fncHorsDelai = ouvertes.filter(c => {
        const j = _daysUntil(_execConstaEcheance(c));
        return j !== null && j < 0;
    }).length;

    return {
        totalAct, closedAct, tauxClotureAct,
        constEnVigueur, totalConst, closedConst, tauxClotureConst,
        fncOuvertes, fncCritiques, horsActivite, horsActiviteOuvertes, fncHorsDelai,
    };
}

// Rattachement de chaque prestataire (domaine + secteur + nom), pour résoudre
// les éléments qui ne portent pas directement ces infos (dossiers et
// constatations clôturés).
function _execSgRattachements(secteurs) {
    const prestDomaineLookup = {};
    (EXEC_STATE.data.prestataires || []).forEach(p => {
        const sec = secteurs.find(s => s.id === p.secteur_id);
        prestDomaineLookup[p.id] = {
            domaine_id: p.domaine_id || (sec ? sec.domaine_id : ''),
            secteur_id: p.secteur_id || '',
            nom: p.nom || p.trigramme || p.id
        };
    });
    return prestDomaineLookup;
}

// ── Activités : ce qui reste à déclencher, ce qui a pris du retard ──
// La répartition du menu « États » fait foi : mêmes délais, mêmes règles,
// mêmes chiffres d'un écran à l'autre.
function _execSgADeclencher(F, mesPrest, prestDomaineLookup) {
    const etats = typeof execEtatsRepartir === 'function' ? execEtatsRepartir() : null;
    const ligneRetenue = (l) => {
        const pId = l.prestataire_id || '';
        if (mesPrest && !mesPrest.includes(pId)) return false;
        if (F.prestataire && pId !== F.prestataire) return false;
        if (F.domaine && (prestDomaineLookup[pId] || {}).domaine_id !== F.domaine) return false;
        const debut = String(l.debut || '');
        if (F.annee && debut.slice(0, 4) !== String(F.annee)) return false;
        if (F.trimestre) {
            if (debut.length < 7) return false;
            if (String(Math.ceil(parseInt(debut.slice(5, 7)) / 3)) !== String(F.trimestre)) return false;
        }
        return true;
    };
    // Les activités qui attendent d'être déclenchées se partagent en deux :
    // celles dont la date de début est passée — en retard — et celles qui
    // restent à planifier dans l'horizon.
    const attente = etats ? etats.aDeclencher.filter(ligneRetenue) : [];
    const aujourdhuiIso = new Date().toISOString().slice(0, 10);
    const actEnRetard = attente.filter((l) => String(l.debut || '') < aujourdhuiIso).length;
    const aDeclencher = attente.filter((l) => String(l.debut || '') >= aujourdhuiIso);
    const horizonMois = (typeof EXEC_ETATS !== 'undefined' && EXEC_ETATS.delais
        && EXEC_ETATS.delais.horizon_a_declencher) || 3;
    return { aDeclencher, actEnRetard, horizonMois };
}

// Closed execution dossiers — the authoritative "activité réalisée clôturée" counter.
// NB: backend already scopes /dossiers for M3_Prestataire (only closed + own prestataire),
// so we must NOT re-filter by scopedPid here (it may be empty when cached localStorage
// didn't persist prestataire_id — we rely on server-side scoping instead).
function _execSgDossiersClos(F, dossiers, mesPrest, prestDomaineLookup) {
    let closedDossiers = (dossiers || []).filter(d => d.statut === 'cloture');
    if (mesPrest) {
        closedDossiers = closedDossiers.filter(d => !d.prestataire_id || mesPrest.includes(d.prestataire_id));
    }
    // Cohérence avec les filtres du tableau de bord (domaine / prestataire / année / trimestre).
    if (F.prestataire) {
        closedDossiers = closedDossiers.filter(d => d.prestataire_id === F.prestataire);
    }
    if (F.domaine) {
        closedDossiers = closedDossiers.filter(d =>
            (prestDomaineLookup[d.prestataire_id] || {}).domaine_id === F.domaine);
    }
    if (F.annee) {
        closedDossiers = closedDossiers.filter(d =>
            String(d.date_fin_execution || d.date_creation || '').slice(0, 4) === String(F.annee));
    }
    if (F.trimestre) {
        closedDossiers = closedDossiers.filter(d => {
            const dt = String(d.date_fin_execution || d.date_creation || '');
            if (dt.length < 7) return false;
            return String(Math.ceil(parseInt(dt.slice(5, 7)) / 3)) === String(F.trimestre);
        });
    }
    return closedDossiers;
}

// Groupement : domaineMap[dId][sId][pId] = { activities, prestataire_nom }.
// Regroupement prestataire-centré : chaque prestataire apparaît dans un seul
// groupe Domaine→Secteur (déduit de son rattachement), ce qui garantit que
// les décomptes correspondent aux listes des menus dédiés.
function _execSgRegrouper(allActivities, closedDossiers, filteredConstatations, prestDomaineLookup, secteurToDomaine) {
    const domaineMap = {};
    const resolveSecteur = (obj, fallbackPid) => {
        if (obj && obj.secteur_id) return obj.secteur_id;
        const info = prestDomaineLookup[fallbackPid] || {};
        return info.secteur_id || 'unknown';
    };
    const ensureEntry = (dId, sId, pId, pNom) => {
        if (!domaineMap[dId]) domaineMap[dId] = {};
        if (!domaineMap[dId][sId]) domaineMap[dId][sId] = {};
        if (!domaineMap[dId][sId][pId]) domaineMap[dId][sId][pId] = { activities: [], prestataire_nom: pNom || pId };
    };
    allActivities.forEach(a => {
        const pId = a.prestataire_id || 'unknown';
        const pInfo = prestDomaineLookup[pId] || {};
        const dId = pInfo.domaine_id || a.domaine_id_resolved || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(a, pId);
        ensureEntry(dId, sId, pId, a.prestataire_nom);
        domaineMap[dId][sId][pId].activities.push(a);
    });

    const resolveDossierDomaine = (d) => {
        const pInfo = prestDomaineLookup[d.prestataire_id] || {};
        return d.domaine_id
            || secteurToDomaine[d.secteur_id]
            || pInfo.domaine_id
            || 'unknown';
    };
    closedDossiers.forEach(d => {
        const pInfo = prestDomaineLookup[d.prestataire_id] || {};
        const dId = pInfo.domaine_id || resolveDossierDomaine(d);
        const pId = d.prestataire_id || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(d, pId);
        ensureEntry(dId, sId, pId, d.prestataire_nom || pInfo.nom);
    });
    filteredConstatations.filter(c => EXEC_CONSTA_EN_VIGUEUR.has(c.statut || '')).forEach(c => {
        const pInfo = prestDomaineLookup[c.prestataire_id] || {};
        const pId = c.prestataire_id || 'unknown';
        const dId = pInfo.domaine_id || c.domaine_id || secteurToDomaine[c.secteur_id] || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(c, pId);
        ensureEntry(dId, sId, pId, c.prestataire_nom || pInfo.nom);
    });
    return { domaineMap, resolveSecteur, resolveDossierDomaine };
}

// Colonnes de criticité : le référentiel du module en décide — il se règle
// au menu Paramètres. Les trois niveaux étaient écrits en dur : une
// quatrième criticité aurait compté au total sans colonne où se lire. Les
// clés restent celles enregistrées sur une constatation, en minuscules.
function _execSgCriticites() {
    const critRef = (EXEC_STATE.data.criticites || [])
        .filter(c => (c.statut || 'actif') !== 'inactif')
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const critLibelle = {};
    critRef.forEach((c) => {
        const cle = String(c.item || c.alias || c.libelle || c.nom || '').toLowerCase();
        if (cle) critLibelle[cle] = c.item || c.alias || c.libelle || c.nom;
    });
    const criticites = Object.keys(critLibelle).length
        ? Object.keys(critLibelle) : ['critique', 'majeure', 'mineure'];
    return { criticites, critLibelle };
}

// Stats par prestataire (activités + constatations par criticité), et leur
// agrégat en totaux de secteur, de domaine ou d'ensemble.
function _execSgCalculs(domaineMap, filteredConstatations, activiteRealisee, criticites) {
    const computePrestStats = (dId, sId, pId) => {
        const entry = domaineMap[dId][sId][pId];
        // Activités planifiées : liste "Activités de Supervision" du prestataire.
        const planned = entry.activities.length;
        // Activités réalisées : parmi ces mêmes activités, celles dont le
        // rapport a été transmis — le quatrième niveau d'avancement, celui
        // que le tableau de bord et les tables du module emploient partout.
        const closed = entry.activities.filter(activiteRealisee).length;
        const execRate = planned > 0 ? Math.round((closed / planned) * 100) : 0;

        // Constatations : décompte par criticité depuis la table du sous-menu "Suivi".
        const pConsts = filteredConstatations.filter(c =>
            c.prestataire_id === pId && EXEC_CONSTA_EN_VIGUEUR.has(c.statut || ''));
        const totalPConst = pConsts.length;
        const totalPClosed = pConsts.filter(c => c.statut === 'soldee').length;
        const constByCrit = {};
        criticites.forEach(cr => {
            const matching = pConsts.filter(c => ((c.criticite || c.gravite || '') + '').toLowerCase() === cr);
            const matchClosed = matching.filter(c => c.statut === 'soldee').length;
            constByCrit[cr] = {
                count: matching.length,
                closed: matchClosed,
                rate: matching.length > 0 ? Math.round((matchClosed / matching.length) * 100) : 0
            };
        });
        const totalClotRate = totalPConst > 0 ? Math.round((totalPClosed / totalPConst) * 100) : 0;
        return {
            prestataire_nom: entry.prestataire_nom,
            planned, closed, execRate,
            constByCrit, totalPConst, totalPClosed, totalClotRate
        };
    };

    const aggregate = (statsList) => {
        const agg = { planned: 0, closed: 0, totalPConst: 0, totalPClosed: 0 };
        const byCrit = {};
        criticites.forEach(cr => { byCrit[cr] = { count: 0, closed: 0 }; });
        statsList.forEach(s => {
            agg.planned += s.planned;
            agg.closed += s.closed;
            agg.totalPConst += s.totalPConst;
            agg.totalPClosed += s.totalPClosed;
            criticites.forEach(cr => {
                byCrit[cr].count += s.constByCrit[cr].count;
                byCrit[cr].closed += s.constByCrit[cr].closed;
            });
        });
        agg.execRate = agg.planned > 0 ? Math.round((agg.closed / agg.planned) * 100) : 0;
        agg.totalClotRate = agg.totalPConst > 0 ? Math.round((agg.totalPClosed / agg.totalPConst) * 100) : 0;
        agg.byCrit = byCrit;
        return agg;
    };
    return { computePrestStats, aggregate };
}

// ── La table : une seule, à sous-totaux ──
// Le domaine, puis chacun de ses secteurs, puis leurs prestataires : les
// lignes de sous-total restent visibles, rien n'est à déplier. Les lignes de
// prestataire portent data-domaine / data-secteur, que l'export relit.
function _execSgTableHtml(sg) {
    const { domaineMap, domaineNameMap, secteurNameMap, criticites, critLibelle, computePrestStats, aggregate } = sg;

    // Un taux se lit d'abord à sa couleur : vert tenu, ambre à surveiller,
    // rouge en défaut. Le même barème sert à toutes les lignes, pour qu'un
    // même chiffre ne change pas de sens selon l'endroit où on le lit.
    const niveau = (pct) => (pct >= 80 ? 'bon' : (pct >= 50 ? 'moyen' : 'faible'));
    const taux = (pct, base) => (base > 0
        ? `<span class="exec-sg-taux ${niveau(pct)}">${pct}%</span>`
        : '<span class="exec-sg-vide">—</span>');
    // Un zéro n'est pas une mesure : il s'efface pour laisser voir les autres.
    const nombre = (n) => (n > 0 ? String(n) : '<span class="exec-sg-vide">0</span>');
    const critEntete = (cr, i) => `<th${i === 0 ? ' class="exec-sg-bloc"' : ''}>${_esc(critLibelle[cr] || te(cr) || cr)}</th>`;

    const cellules = (s, fort) => {
        const f = fort ? ' fort' : '';
        const crit = s.byCrit || s.constByCrit;
        return `
            <td class="num${f} exec-sg-bloc">${nombre(s.planned)}</td>
            <td class="num${f}">${nombre(s.closed)}</td>
            <td class="num">${taux(s.execRate, s.planned)}</td>
            ${criticites.map((cr, i) => `<td class="num${f}${i === 0 ? ' exec-sg-bloc' : ''}">${nombre(crit[cr].count)}</td>`).join('')}
            <td class="num total">${nombre(s.totalPConst)}</td>
            ${criticites.map((cr, i) => {
                const cell = crit[cr];
                const rate = cell.rate !== undefined ? cell.rate : (cell.count > 0 ? Math.round((cell.closed / cell.count) * 100) : 0);
                return `<td class="num${i === 0 ? ' exec-sg-bloc' : ''}">${taux(rate, cell.count)}</td>`;
            }).join('')}
            <td class="num total">${taux(s.totalClotRate, s.totalPConst)}</td>`;
    };

    // Largeurs déclarées ici : avec table-layout fixed, seule la première
    // rangée compte, et elle porte les regroupements — pas les colonnes.
    const entete = `
        <colgroup>
            <col class="sg-col-nom">
            ${[...Array(3 + (criticites.length + 1) * 2)].map(() => '<col class="sg-col-num">').join('')}
        </colgroup>
        <thead>
        <tr class="exec-sg-groupes">
            <th></th>
            <th colspan="3" class="exec-sg-bloc">${te('sg_activites')}</th>
            <th colspan="${criticites.length + 1}" class="exec-sg-bloc">${te('sg_nb_constatations')}</th>
            <th colspan="${criticites.length + 1}" class="exec-sg-bloc">${te('sg_taux_cloture')}</th>
        </tr>
        <tr class="exec-sg-colonnes">
            <th class="exec-sg-col-nom">${te('sg_colonne_nom')}</th>
            <th class="exec-sg-bloc">${te('sg_planifiees')}</th>
            <th>${te('sg_cloturees')}</th>
            <th>${te('sg_taux')}</th>
            ${criticites.map(critEntete).join('')}
            <th>${te('total')}</th>
            ${criticites.map(critEntete).join('')}
            <th>${te('total')}</th>
        </tr></thead>`;

    const trier = (cles, noms) => cles.sort((a, b) => (noms[a] || a).localeCompare(noms[b] || b));
    const tous = [];
    let corps = '';
    trier(Object.keys(domaineMap), domaineNameMap).forEach(dId => {
        const dName = domaineNameMap[dId] || dId || '—';
        const secteursDuDomaine = trier(Object.keys(domaineMap[dId]), secteurNameMap).map(sId => ({
            sName: secteurNameMap[sId] || sId || '—',
            stats: Object.keys(domaineMap[dId][sId]).map(pId => computePrestStats(dId, sId, pId))
                .sort((a, b) => String(a.prestataire_nom).localeCompare(String(b.prestataire_nom))),
        }));
        const duDomaine = secteursDuDomaine.flatMap(x => x.stats);
        tous.push(...duDomaine);
        corps += `<tr class="sg-ligne-domaine"><td>${_esc(dName)}</td>${cellules(aggregate(duDomaine), true)}</tr>`;
        secteursDuDomaine.forEach(({ sName, stats }) => {
            corps += `<tr class="sg-ligne-secteur"><td>${_esc(sName)}</td>${cellules(aggregate(stats), true)}</tr>`;
            corps += stats.map(s => `<tr class="sg-ligne-prest" data-domaine="${_escAttr(dName)}" data-secteur="${_escAttr(sName)}">
                    <td>${_esc(s.prestataire_nom)}</td>${cellules(s)}</tr>`).join('');
        });
    });
    if (!corps) return `<div class="exec-sg-aucune">${te('no_data')}</div>`;

    return `
    <div class="sg-table-boite">
        <table class="exec-table sg-prest-table">
            ${entete}
            <tbody>${corps}</tbody>
            <tfoot><tr><td>${te('total_general')}</td>${cellules(aggregate(tous), true)}</tr></tfoot>
        </table>
    </div>`;
}


// ══════════════════════════════════════
//  SUIVI DES ACTIVITÉS — diagramme de Gantt
// ══════════════════════════════════════
// Chaque activité planifiée tient une barre entre sa date de début et sa date
// de fin. Sa couleur dit son niveau d'avancement — les quatre niveaux communs
// au module — et une pastille d'alerte signale le retard, qui se lit sur la
// date de début et non sur l'avancement.

// Filtres du panneau du calendrier : type d'activité, avancement et mode de
// supervision. Le retard n'y figure pas, il n'est pas un niveau.
function _execGanttFiltres() {
    const G = EXEC_STATE.gantt || (EXEC_STATE.gantt = {});
    if (!G.types) G.types = [];
    if (!G.avancements) G.avancements = [];
    if (!G.modes) G.modes = [];
    return G;
}

function _execGanttDate(iso) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// La couleur d'une barre suit les quatre niveaux d'avancement : réalisée quand
// le rapport est transmis, en cours du déclenchement à cette transmission, et
// planifiée tant que rien n'est déclenché — en retard si son début est passé.
function _execGanttEtat(act, dossier, aujourdhuiIso, notif) {
    const niveau = execAvancement(notif, dossier);
    if (niveau === 'realisee') return 'termine';
    if (niveau !== 'non_initiee') return 'en_cours';
    return String(act.date_debut || '') < aujourdhuiIso ? 'en_retard' : 'planifie';
}

function _execGanttTypeLibelle(act) {
    if (act.type_supervision) return String(act.type_supervision);
    const t = (EXEC_STATE.data.typesSupervision || []).find(x => x.id === act.type_supervision_id);
    return (t && (t.type_supervision || t.libelle || t.nom)) || '—';
}

// Bornes de la piste : l'année retenue par les filtres, étendue aux mois
// entiers si une activité déborde de part et d'autre.
// Le calendrier couvre l'année retenue, et s'étend à toute activité qui la
// déborde : sans année choisie, il s'ouvre donc sur l'ensemble des années
// couvertes. Il lisait `date_debut` et `date_fin` sur des lignes qui ne les
// portent plus — leurs dates y sont déjà converties — et restait par là même
// collé sur douze mois, quoi qu'on lui donnât.
function _execGanttBornes(lignes, annee) {
    let min = new Date(annee, 0, 1);
    let max = new Date(annee, 11, 31);
    lignes.forEach((l) => {
        const d = l.debut;
        const f = l.fin || d;
        if (d && d < min) min = new Date(d.getFullYear(), d.getMonth(), 1);
        if (f && f > max) max = new Date(f.getFullYear(), f.getMonth() + 1, 0);
    });
    return { min, max };
}

function _execGanttMois(min, max) {
    const mois = [];
    const c = new Date(min.getFullYear(), min.getMonth(), 1);
    while (c <= max) {
        mois.push({ annee: c.getFullYear(), mois: c.getMonth() });
        c.setMonth(c.getMonth() + 1);
    }
    return mois;
}

// Prépare les lignes du diagramme à partir des activités déjà filtrées par le
// tableau de bord : le Gantt et les cartes montrent ainsi le même périmètre.
function _execSuiviActivitesDonnees() {
    const activites = EXEC_STATE._ganttActivites || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    const prestataires = EXEC_STATE.data.prestataires || [];
    const aujourdhuiIso = new Date().toISOString().slice(0, 10);

    const dossierParActivite = {};
    dossiers.forEach(d => { if (d.activite_id) dossierParActivite[d.activite_id] = d; });
    // L'avancement se lit sur la notification autant que sur le dossier, et se
    // cherche par la lignée de l'activité.
    const { notifDe, dossierParNotif } = _execAvancementParActivite(dossiers);
    const nomPrestataire = (id, repli) => {
        const p = prestataires.find(x => x.id === id);
        return (p && p.nom) || repli || '—';
    };
    // Le mode de supervision se filtre au panneau : la ligne porte son
    // identifiant, et le libellé du référentiel pour l'affichage.
    const modes = EXEC_STATE.data.modesSupervision || [];
    const libelleMode = (id) => {
        const m = modes.find(x => x.id === id);
        return (m && (m.mode || m.libelle || m.nom)) || (id ? String(id) : te('sans_mode'));
    };

    const lignes = activites
        .filter(a => a.date_debut)
        .map(a => {
            const dossier = dossierParActivite[a.id];
            const debut = _execGanttDate(a.date_debut);
            const fin = _execGanttDate(a.date_fin) || debut;
            const notif = notifDe(a);
            return {
                act: a, dossier,
                debut, fin: fin < debut ? debut : fin,
                etat: _execGanttEtat(a, dossier, aujourdhuiIso, notif),
                niveau: execAvancement(notif, dossier || (notif ? dossierParNotif[notif.id] : null)),
                mode: libelleMode(a.mode_supervision_id),
                type: _execGanttTypeLibelle(a),
                horsPlan: false,
                prestataire_id: a.prestataire_id || 'inconnu',
                prestataire_nom: nomPrestataire(a.prestataire_id, a.prestataire_nom),
            };
        });

    // Une activité hors plan porte ses dates sur la notification elle-même, et
    // son dossier s'y rattache par notification_id — pas par activite_id.
    (EXEC_STATE._ganttHorsPlan || [])
        .filter(n => n.date_activite)
        .forEach(n => {
            const dossier = dossierParNotif[n.id];
            const debut = _execGanttDate(n.date_activite);
            const fin = _execGanttDate(n.date_fin_effective) || debut;
            lignes.push({
                act: {
                    id: n.id,
                    objet: n.objet_activite,
                    lieu_activite: n.lieu_activite,
                    reference: n.reference,
                },
                dossier,
                debut, fin: fin < debut ? debut : fin,
                etat: _execGanttEtat({ date_debut: n.date_activite }, dossier, aujourdhuiIso, n),
                niveau: execAvancement(n, dossier),
                mode: libelleMode(n.mode_supervision_id),
                type: n.nature_activite || _execGanttTypeLibelle(n),
                horsPlan: true,
                prestataire_id: n.prestataire_id || 'inconnu',
                prestataire_nom: nomPrestataire(n.prestataire_id, n.prestataire_nom),
            });
        });

    return { lignes, aujourdhuiIso };
}

function _execSuiviActivitesHtml() {
    const G = _execGanttFiltres();
    const { lignes, aujourdhuiIso } = _execSuiviActivitesDonnees();

    // Les listes de filtres portent sur toutes les activités, pas seulement
    // sur celles qui restent visibles — sinon cocher une case ferait
    // disparaître les autres cases.
    const tousTypes = [...new Set(lignes.map(l => l.type))].sort((a, b) => a.localeCompare(b));
    const tousModes = [...new Set(lignes.map(l => l.mode))].sort((a, b) => a.localeCompare(b));

    const visibles = lignes.filter(l =>
        (!G.types.length || G.types.includes(l.type))
        && (!G.avancements.length || G.avancements.includes(l.niveau))
        && (!G.modes.length || G.modes.includes(l.mode)));

    const annee = EXEC_STATE.filters.annee
        ? parseInt(EXEC_STATE.filters.annee, 10) : new Date().getFullYear();
    const { min, max } = _execGanttBornes(visibles, annee);
    const mois = _execGanttMois(min, max);
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

    // Regroupement par prestataire, dans l'ordre alphabétique. Tous les
    // prestataires du périmètre figurent au calendrier, y compris ceux sans
    // activité : leur ligne vide est une information, leur absence une
    // ambiguïté — on ne saurait pas s'ils manquent ou s'ils n'ont rien.
    const groupes = {};
    (EXEC_STATE._ganttPrestataires || []).forEach(p => {
        groupes[p.id] = { nom: p.nom, lignes: [] };
    });
    visibles.forEach(l => {
        if (!groupes[l.prestataire_id]) groupes[l.prestataire_id] = { nom: l.prestataire_nom, lignes: [] };
        groupes[l.prestataire_id].lignes.push(l);
    });
    const ordre = Object.keys(groupes).sort((a, b) => groupes[a].nom.localeCompare(groupes[b].nom));

    const jour = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    let corps = '';
    ordre.forEach(pid => {
        const g = groupes[pid];
        corps += `
        <div class="g-nom g-groupe">${_esc(g.nom)}
            <span class="g-compte">${g.lignes.length}</span>
        </div>
        <div class="g-piste g-groupe"></div>`;
        if (!g.lignes.length) {
            corps += `<div class="g-nom g-activite g-sans">${te('gantt_sans_activite')}</div>
                      <div class="g-piste"></div>`;
        }
        g.lignes.sort((a, b) => a.debut - b.debut).forEach((l, iLigne) => {
            const paire = iLigne % 2 ? ' g-paire' : '';
            const gauche = Math.max(0, pct(l.debut));
            const largeur = Math.max(1.4, pct(new Date(l.fin.getTime() + 86400000)) - gauche);
            const ref = (l.dossier && l.dossier.reference) || l.act.reference || '';
            corps += `
            <div class="g-nom g-activite${paire}" title="${_escAttr(l.act.objet || l.act.titre || '')}">
                ${l.horsPlan ? `<span class="g-hp" title="${_escAttr(te('gantt_hors_plan'))}">HP</span>` : ''}
                <span class="g-activite-txt">${_esc(l.act.objet || l.act.titre || '—')}</span>
            </div>
            <div class="g-piste${paire}">
                <div class="g-barre avc-${l.niveau}" style="left:${gauche.toFixed(2)}%;width:${Math.min(largeur, 100 - gauche).toFixed(2)}%;"
                     onmouseenter="execGanttInfo(this, true)" onmouseleave="execGanttInfo(this, false)">
                    <span class="g-barre-txt">${_esc(l.type)}</span>
                    ${l.etat === 'en_retard' ? '<span class="g-alerte">!</span>' : ''}
                </div>
                <div class="g-infobulle">
                    <div class="t">${_esc(l.act.objet || l.act.titre || '—')}</div>
                    ${ref ? `<div><span>${te('reference')}</span> ${_esc(ref)}</div>` : ''}
                    <div><span>${te('gantt_dates')}</span> ${jour(l.debut)} → ${jour(l.fin)}</div>
                    <div><span>${te('avancement')}</span> ${te('avancement_' + l.niveau)}${l.etat === 'en_retard' ? ` — ${te('gantt_en_retard')}` : ''}</div>
                    <div><span>${te('gantt_type_audit')}</span> ${_esc(l.type)}</div>
                    <div><span>${te('mode_supervision')}</span> ${_esc(l.mode)}</div>
                    ${l.horsPlan ? `<div><span>${te('gantt_origine')}</span> ${te('gantt_hors_plan')}</div>` : ''}
                    ${l.act.lieu_activite ? `<div><span>${te('gantt_lieu')}</span> ${_esc(l.act.lieu_activite)}</div>` : ''}
                </div>
            </div>`;
        });
    });

    if (!corps) {
        corps = `<div class="g-nom g-vide"></div><div class="g-piste g-vide">${te('no_data')}</div>`;
    }

    const caseFiltre = (groupe, valeur, libelle, couleur) => `
        <label class="g-case">
            <input type="checkbox" ${((G[groupe] || []).includes(valeur)) ? 'checked' : ''}
                   onchange="execGanttFiltrer('${groupe}', ${JSON.stringify(valeur).replace(/"/g, '&quot;')}, this.checked)">
            ${couleur ? `<span class="g-puce" style="background:${couleur};"></span>` : ''}
            <span>${_esc(libelle)}</span>
        </label>`;

    const aujourdhui = _execGanttDate(aujourdhuiIso);
    const marqueur = (aujourdhui >= min && aujourdhui <= max)
        ? `<div class="g-aujourdhui" style="left:${pct(aujourdhui).toFixed(2)}%;"></div>` : '';

    // Le cadre n'est pas encore dans la page : l'état des commandes se pose au
    // tour suivant, que la carte vienne du tableau de bord ou d'un filtre.
    setTimeout(execGanttNavEtat, 0);

    return `
    <div class="card exec-suivi-carte" id="execSuiviActivitesRoot" style="margin-top:1.25rem;">
        <div class="exec-suivi-entete">
            <h4>${te('gantt_titre')}</h4>
            <div class="exec-suivi-nav">
                <button class="btn btn-sm btn-outline" onclick="execGanttBord(-1)"
                        data-titre="${_escAttr(te('gantt_debut'))}" title="${_escAttr(te('gantt_debut'))}">«</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttDefiler(-1)"
                        data-titre="${_escAttr(te('gantt_reculer'))}" title="${_escAttr(te('gantt_reculer'))}">‹</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttAujourdhui()"
                        data-titre="${_escAttr(te('gantt_aujourdhui'))}">${te('gantt_aujourdhui')}</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttDefiler(1)"
                        data-titre="${_escAttr(te('gantt_avancer'))}" title="${_escAttr(te('gantt_avancer'))}">›</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttBord(1)"
                        data-titre="${_escAttr(te('gantt_fin'))}" title="${_escAttr(te('gantt_fin'))}">»</button>
                <span class="exec-suivi-jour">${jour(aujourdhui)}</span>
            </div>
        </div>
        <div class="exec-suivi-corps">
            <div class="exec-gantt-cadre">
                <div class="exec-gantt" style="min-width:${Math.max(680, mois.length * 62)}px;">
                    <div class="g-nom g-annee">${min.getFullYear()}${max.getFullYear() !== min.getFullYear() ? ` – ${max.getFullYear()}` : ''}</div>
                    <div class="g-piste g-entete">
                        ${trimestres.map(t => `<div class="g-cellule" style="flex-grow:${t.n};">T${t.t}</div>`).join('')}
                    </div>
                    <div class="g-nom g-entete-vide"></div>
                    <div class="g-piste g-entete g-entete-mois">
                        ${mois.map(m => `<div class="g-cellule">${EXEC_CHRONO_MOIS[m.mois]}</div>`).join('')}
                    </div>
                    ${corps}
                    <div class="g-overlay">
                        ${mois.map((m, i) => i ? `<div class="g-trait" style="left:${((i / mois.length) * 100).toFixed(3)}%;"></div>` : '').join('')}
                        ${marqueur}
                    </div>
                </div>
            </div>
            <aside class="exec-gantt-panneau">
                <div class="g-bloc">
                    <div class="g-bloc-titre">${te('gantt_type_audit')}</div>
                    ${tousTypes.length
                        ? tousTypes.map(t => caseFiltre('types', t, t, '')).join('')
                        : `<div class="g-bloc-vide">${te('no_data')}</div>`}
                </div>
                <div class="g-bloc">
                    <div class="g-bloc-titre">${te('avancement')}</div>
                    ${EXEC_AVANCEMENTS.map(n => caseFiltre('avancements', n, te('avancement_' + n),
                        EXEC_AVANCEMENT_COULEURS[n])).join('')}
                </div>
                <div class="g-bloc">
                    <div class="g-bloc-titre">${te('mode_supervision')}</div>
                    ${tousModes.length
                        ? tousModes.map(m => caseFiltre('modes', m, m, '')).join('')
                        : `<div class="g-bloc-vide">${te('no_data')}</div>`}
                </div>
            </aside>
        </div>
    </div>`;
}

// ── Défilement du calendrier ────────────────────────────────────────
// La piste est plus large que son cadre : au-delà de la barre de défilement,
// on donne des commandes explicites, dont un retour à la date du jour.
function _execGanttCadre() {
    return document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
}

// Les commandes ne valent que si la piste déborde de son cadre : sur un large
// écran, une piste qui tient tout entière ne bougeait pas d'un clic, et les
// boutons passaient pour cassés. Ils se ferment alors, et disent pourquoi.
function execGanttNavEtat() {
    const cadre = _execGanttCadre();
    if (!cadre) return;
    const defilable = cadre.scrollWidth > cadre.clientWidth + 1;
    document.querySelectorAll('#execSuiviActivitesRoot .exec-suivi-nav .btn').forEach((b) => {
        b.disabled = !defilable;
        if (!defilable) b.title = te('gantt_tout_visible');
        else if (b.dataset.titre) b.title = b.dataset.titre;
    });
}

// La largeur du cadre change avec la fenêtre, le pliage de la barre de menu ou
// l'ouverture d'un volet : l'état des commandes suit.
if (typeof window !== 'undefined' && !window._execGanttNavObserve) {
    window._execGanttNavObserve = true;
    window.addEventListener('resize', () => execGanttNavEtat());
}

function execGanttDefiler(sens) {
    const cadre = _execGanttCadre();
    if (!cadre) return;
    cadre.scrollBy({ left: sens * Math.max(120, cadre.clientWidth * 0.6), behavior: 'smooth' });
}

function execGanttBord(sens) {
    const cadre = _execGanttCadre();
    if (!cadre) return;
    cadre.scrollTo({ left: sens < 0 ? 0 : cadre.scrollWidth, behavior: 'smooth' });
}

// Recentre la piste sur le trait du jour, quand il tombe dans la période.
function execGanttAujourdhui() {
    const cadre = _execGanttCadre();
    const trait = cadre && cadre.querySelector('.g-aujourdhui');
    if (!cadre) return;
    if (!trait) { cadre.scrollTo({ left: 0, behavior: 'smooth' }); return; }
    const piste = cadre.querySelector('.exec-gantt');
    const x = 220 + (parseFloat(trait.style.left) / 100) * (piste.offsetWidth - 220);
    cadre.scrollTo({ left: Math.max(0, x - cadre.clientWidth / 2), behavior: 'smooth' });
}

// La fiche de survol se place à la main, en position fixe : la piste défile
// horizontalement, et tout ce qui reste dans ce cadre s'y trouve rogné.
function execGanttInfo(barre, montrer) {
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
}

// Un filtre du panneau : on ne refait que la section, pas le tableau de bord.
function execGanttFiltrer(groupe, valeur, coche) {
    const G = _execGanttFiltres();
    const liste = G[groupe] || (G[groupe] = []);
    const i = liste.indexOf(valeur);
    if (coche && i === -1) liste.push(valeur);
    if (!coche && i !== -1) liste.splice(i, 1);
    const root = document.getElementById('execSuiviActivitesRoot');
    if (root) root.outerHTML = _execSuiviActivitesHtml();
}

function execRenderDashboard() {
    const stats = EXEC_STATE.data.dashStats || {};
    const notifs = EXEC_STATE.data.notifications || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    let constatations = EXEC_STATE.data.constatations || [];
    // Source des activités planifiées : identique au menu "Activités de Supervision".
    const plansValides = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    // Base commune aux cartes, aux graphiques et à la table : les
    // constatations en vigueur (voir _execConstaEnVigueur).
    const POST_TRANSMIT = EXEC_CONSTA_EN_VIGUEUR;
    const secteurs = EXEC_STATE.data.secteurs || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const F = EXEC_STATE.filters;
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';

    // For prestataires: narrow the data to their own prestataire before any filter logic
    if (isPrest) {
        constatations = constatations.filter(c => _execPortePrestataire(F.prestataire).includes(c.prestataire_id));
    }

    // Build secteur -> domaine lookup
    const secteurToDomaine = {};
    secteurs.forEach(s => { if (s.domaine_id) secteurToDomaine[s.id] = s.domaine_id; });

    const SG = _execSituationGenerale(EXEC_STATE.filters);
    const {
        domaineMap, domaineNameMap, secteurNameMap, criticites,
        computePrestStats, aggregate, closedDossiers, activiteRealisee, resolveDossierDomaine, resolveSecteur,
        allActivities, filteredConstatations, totalAct, closedAct, tauxClotureAct,
        totalConst, closedConst, tauxClotureConst,
        fncOuvertes, fncCritiques, horsActivite, horsActiviteOuvertes,
        fncHorsDelai, aDeclencher, actEnRetard, horizonMois,
    } = SG;

    // ── Données pour les graphiques (dérivées des mêmes variables filtrées) ──
    // Barres : activités planifiées vs clôturées par domaine (sigle).
    const chartDomaineRows = Object.keys(domaineMap).sort((a, b) =>
        (domaineNameMap[a] || a).localeCompare(domaineNameMap[b] || b)
    ).map(dId => {
        let planned = 0, closed = 0;
        Object.keys(domaineMap[dId]).forEach(sId => {
            Object.keys(domaineMap[dId][sId]).forEach(pId => {
                planned += domaineMap[dId][sId][pId].activities.length;
                closed += domaineMap[dId][sId][pId].activities.filter(activiteRealisee).length;
            });
        });
        return { label: domaineNameMap[dId] || dId || '—', values: [planned, closed] };
    });

    // Agrégat des prestataires : les cartes du tableau de bord s'y adossent,
    // comme la section "Situation Générale".
    const _sgStats = [];
    Object.keys(domaineMap).forEach(dId => Object.keys(domaineMap[dId]).forEach(sId =>
        Object.keys(domaineMap[dId][sId]).forEach(pId => _sgStats.push(computePrestStats(dId, sId, pId)))));
    const sgAgg = aggregate(_sgStats);

    // Le Gantt part exactement des activités retenues par les filtres du
    // tableau de bord : on les lui dépose ici plutôt que de refaire le tri.
    // Le regroupement Domaine→Secteur→Prestataire fournit la liste complète
    // des prestataires du périmètre, y compris ceux sans activité planifiée.
    EXEC_STATE._ganttActivites = allActivities;
    const ganttPrest = [];
    Object.keys(domaineMap).forEach(dId => Object.keys(domaineMap[dId]).forEach(sId =>
        Object.keys(domaineMap[dId][sId]).forEach(pId => ganttPrest.push({
            id: pId, nom: domaineMap[dId][sId][pId].prestataire_nom || pId,
        }))));
    EXEC_STATE._ganttPrestataires = ganttPrest;

    // Les activités hors plan — section « Autres Activités » du menu Activités
    // de Supervision — n'existent que sous forme de notification, sans ligne
    // dans un plan validé. Elles tiennent leur place au calendrier : ce sont
    // des activités de surveillance au même titre que les autres. Mêmes
    // filtres que le reste du tableau de bord, appliqués sur leurs champs.
    let ganttHorsPlan = (EXEC_STATE.data.notifications || []).filter(n => n.hors_plan);
    if (isPrest) { const mp = _execPortePrestataire(F.prestataire); ganttHorsPlan = ganttHorsPlan.filter(n => mp.includes(n.prestataire_id)); }
    if (F.annee) {
        ganttHorsPlan = ganttHorsPlan.filter(n =>
            String(n.annee || String(n.date_activite || '').slice(0, 4)) === String(F.annee));
    }
    if (F.domaine) ganttHorsPlan = ganttHorsPlan.filter(n => n.domaine_id === F.domaine);
    if (F.prestataire) ganttHorsPlan = ganttHorsPlan.filter(n => n.prestataire_id === F.prestataire);
    if (F.trimestre) {
        ganttHorsPlan = ganttHorsPlan.filter(n => {
            const m = String(n.date_activite || '').slice(5, 7);
            return m && String(Math.ceil(parseInt(m, 10) / 3)) === String(F.trimestre);
        });
    }
    if (F.search) {
        const q = F.search.toLowerCase();
        ganttHorsPlan = ganttHorsPlan.filter(n =>
            `${n.objet_activite || ''} ${n.prestataire_nom || ''} ${n.nature_activite || ''}`
                .toLowerCase().includes(q));
    }
    EXEC_STATE._ganttHorsPlan = ganttHorsPlan;
    const suiviHtml = _execSuiviActivitesHtml();

    return `
    <div class="page-content">
        <div class="page-header exec-dash-entete">
            <div>
                <h2>${te('dashboard')}</h2>
            </div>
            <button class="btn btn-primary btn-sm" onclick="execShowStatistiquesAdvanced()" title="${_escAttr(te('voir_statistiques'))}">
                ${EXEC_ICONS.dashboard || ''} ${te('voir_statistiques')}
            </button>
        </div>

        <div class="oasis-kpi-groupes">
            ${oasisKpiGroupe(te('activites'), [
                oasisKpiCarte({
                    titre: te('taux_execution'), couleur: '#2563eb',
                    valeur: sgAgg.planned > 0 ? `${sgAgg.execRate}%` : '-',
                    precision: `${sgAgg.closed} ${te('sur')} ${sgAgg.planned} ${te('realisees_court')}`,
                    figure: { type: 'jauge', pct: sgAgg.execRate },
                }),
                oasisKpiCarte({
                    titre: te('act_en_retard'), couleur: '#dc2626', alerte: !!actEnRetard,
                    valeur: actEnRetard, precision: te('act_en_retard_aide'),
                    figure: { type: 'retard', pastille: te('depasse'), legende: te('debut') },
                }),
                oasisKpiCarte({
                    titre: te('a_planifier'), couleur: '#f59e0b',
                    valeur: aDeclencher.length,
                    precision: `${te('horizon_prochains')} ${horizonMois} ${te('mois')}`,
                    figure: { type: 'calendrier', mois: horizonMois },
                }),
            ])}
            ${oasisKpiGroupe(te('constatations'), [
                oasisKpiCarte({
                    titre: te('taux_cloture'), couleur: '#8b5cf6',
                    valeur: totalConst > 0 ? `${tauxClotureConst}%` : '-',
                    precision: `${closedConst}/${totalConst} ${te('cloturees_court')}`
                        + (horsActivite ? ` · ${horsActivite} ${te('hors_activite_court')}` : ''),
                    figure: { type: 'cloture', pct: tauxClotureConst },
                }),
                oasisKpiCarte({
                    titre: te('critiques'), couleur: '#f97316', alerte: !!fncCritiques,
                    valeur: fncCritiques, precision: te('action_immediate'),
                    figure: { type: 'echelle', position: 92, min: te('faible'), max: te('eleve') },
                }),
                oasisKpiCarte({
                    // « En attente de traitement » laissait croire que rien n'y
                    // avait bougé : la carte compte toutes les constatations
                    // notifiées et non soldées, plan d'actions correctives en
                    // cours d'examen ou déjà validé compris. Où en est chaque
                    // plan d'actions se lit au menu Constatations, non ici.
                    titre: te('ouvertes'), couleur: '#ef4444',
                    valeur: fncOuvertes,
                    precision: te('non_soldees')
                        + (horsActiviteOuvertes ? ` · ${horsActiviteOuvertes} ${te('hors_activite_court')}` : ''),
                }),
            ])}
        </div>

        ${_execRenderFilterBar('execRenderPage()', isPrest
            ? { showAnnee: false, showTrimestre: false, showDomaine: false, showSecteur: false, showPrestataire: true, showStatut: false, showSearch: true }
            : { showAnnee: false, showTrimestre: false, showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showSearch: true })}

        ${_execBoutonsAnnees(EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [], F)}

        ${suiviHtml}

    </div>`;
}

// ── Chronologie ─────────────────────────────────────────────────
// Un curseur à deux poignées borne la période analysée. La graduation porte
// les mois, et les trimestres aux extrémités ; chaque poignée annonce sa date.
// Le glissement ne recalcule rien : les indicateurs se refont au relâchement.
const EXEC_CHRONO_MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

const _execChronoJour = (v) => {
    // Les dates stockées ne sont pas toutes complétées à deux chiffres :
    // « 2026-4-5 » doit se lire comme « 2026-04-05 », sans quoi la
    // chronologie entière disparaîtrait pour une donnée mal formée.
    const m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
};
const _execChronoIso = (d) => d.toISOString().slice(0, 10);
const _execChronoIndex = (v, min) => Math.round((_execChronoJour(v) - min) / 86400000);
const _execChronoDate = (i, min) => _execChronoIso(new Date(min.getTime() + i * 86400000));

// « 15 Juin 2026 » : la date telle que la poignée l'annonce.
function _execChronoLisible(v) {
    const d = _execChronoJour(v);
    if (!d) return '';
    return `${d.getDate()} ${EXEC_CHRONO_MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

// Cycle de surveillance d'un prestataire, tel que « Plans de Surveillance »
// le fixe. Sans dates, pas de cycle : la période reste libre.
function _execCyclePrestataire(prestataireId) {
    if (!prestataireId) return null;
    const c = (EXEC_STATE.data.cyclesPrestataires || [])
        .find((x) => x.id === prestataireId);
    if (!c || !c.debut_cycle || !c.fin_cycle) return null;
    return { debut: String(c.debut_cycle), fin: String(c.fin_cycle), nom: c.nom || '' };
}

function _execStatsChronologie(bornes, P, cycle) {
    const min = _execChronoJour(bornes.min);
    const max = _execChronoJour(bornes.max);
    if (!min || !max || max <= min) return '';
    const total = Math.round((max - min) / 86400000);
    const debut = P.debut || bornes.min;
    const fin = P.fin || bornes.max;
    const iDebut = Math.max(0, Math.min(total, _execChronoIndex(debut, min)));
    const iFin = Math.max(iDebut, Math.min(total, _execChronoIndex(fin, min)));
    const pct = (i) => (total ? (i / total) * 100 : 0);
    // Une bulle centrée sur une poignée d'extrémité déborderait de la carte :
    // sa position est retenue dans les bornes lisibles.
    const pctBulle = (i) => Math.min(90, Math.max(10, pct(i)));

    // Graduation : un trait par mois, son nom en dessous ; les trimestres
    // des extrémités encadrent la piste.
    const traits = [];
    // Sur une longue période, les noms de mois se chevaucheraient : on n'en
    // garde qu'un sur N, et l'année remplace le mois en janvier.
    const nbMois = (max.getFullYear() - min.getFullYear()) * 12
        + (max.getMonth() - min.getMonth()) + 1;
    const pasLibelle = nbMois <= 8 ? 1 : (nbMois <= 16 ? 2 : 3);
    let rangMois = -1;
    const curseur = new Date(min.getFullYear(), min.getMonth(), 1);
    while (curseur <= max) {
        rangMois += 1;
        const debutMois = curseur > min ? curseur : min;
        const finMois = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0);
        const milieu = new Date(Math.min(finMois.getTime(), max.getTime()));
        const centre = (debutMois.getTime() + milieu.getTime()) / 2;
        if (curseur > min) {
            traits.push(`<span class="exec-chrono-trait" style="left:${pct((curseur - min) / 86400000)}%;"></span>`);
        }
        if (rangMois % pasLibelle === 0) {
            const libelle = curseur.getMonth() === 0
                ? `${EXEC_CHRONO_MOIS[0]} ${curseur.getFullYear()}`
                : EXEC_CHRONO_MOIS[curseur.getMonth()];
            traits.push(`<span class="exec-chrono-mois-nom" style="left:${pct((centre - min.getTime()) / 86400000)}%;">`
                + `${libelle}</span>`);
        }
        curseur.setMonth(curseur.getMonth() + 1);
    }
    const trimestre = (d) => `T${Math.floor(d.getMonth() / 3) + 1}`;

    return `
    <div class="exec-chrono" id="execChrono"
         data-min="${_execChronoIso(min)}" data-total="${total}">
        <div class="exec-chrono-tete">
            <span class="exec-chrono-titre">${te('periode_examinee')}</span>
            <label class="exec-chrono-date">${te('chrono_date_debut')}
                <input type="date" id="execChronoDateDebut" value="${_escAttr(debut)}"
                       onchange="execChronoDates()">
            </label>
            <label class="exec-chrono-date">${te('chrono_date_fin')}
                <input type="date" id="execChronoDateFin" value="${_escAttr(fin)}"
                       onchange="execChronoDates()">
            </label>
            ${cycle ? `<span class="exec-chrono-cycle" title="${te('cycle_surveillance')}">
                ${te('cycle_court')} ${_formatDate(cycle.debut)} → ${_formatDate(cycle.fin)}
            </span>` : ''}
            <span class="exec-chrono-raccourcis">
                ${[[12, te('chrono_12_mois')], [6, te('chrono_6_mois')], [3, te('chrono_3_mois')]]
                    .map(([n, l]) => `<button class="exec-chrono-btn" onclick="execStatsPeriodeDerniers(${n})">${l}</button>`).join('')}
                <button class="exec-chrono-btn" onclick="execStatsPeriode('','')">${te('chrono_tout')}</button>
            </span>
        </div>

        <div class="exec-chrono-curseur">
            <span class="exec-chrono-bulle" id="execChronoBulleDebut" style="left:${pctBulle(iDebut)}%;">
                <strong>${_execChronoLisible(debut)}</strong> - ${te('debut')}</span>
            <span class="exec-chrono-bulle" id="execChronoBulleFin" style="left:${pctBulle(iFin)}%;">
                <strong>${_execChronoLisible(fin)}</strong> - ${te('fin')}</span>
            <div class="exec-chrono-piste">
                <div class="exec-chrono-selection" id="execChronoSelection"
                     style="left:${pct(iDebut)}%;right:${100 - pct(iFin)}%;"></div>
                <input type="range" class="exec-chrono-poignee" id="execChronoDebut"
                       min="0" max="${total}" value="${iDebut}"
                       oninput="execChronoGlisser()" onchange="execChronoAppliquer()"
                       aria-label="${te('debut')}">
                <input type="range" class="exec-chrono-poignee" id="execChronoFin"
                       min="0" max="${total}" value="${iFin}"
                       oninput="execChronoGlisser()" onchange="execChronoAppliquer()"
                       aria-label="${te('fin')}">
            </div>
            <div class="exec-chrono-graduation">
                <span class="exec-chrono-trimestre gauche">${trimestre(min)}</span>
                <span class="exec-chrono-trimestre droite">${trimestre(max)}</span>
                ${traits.join('')}
            </div>
        </div>
    </div>`;
}

// Glissement : seules les étiquettes et la plage colorée suivent le doigt.
window.execChronoGlisser = function () {
    const boite = document.getElementById('execChrono');
    if (!boite) return;
    const min = _execChronoJour(boite.dataset.min);
    const total = Number(boite.dataset.total) || 1;
    const a = document.getElementById('execChronoDebut');
    const b = document.getElementById('execChronoFin');
    // Les poignées ne se croisent pas : celle qu'on pousse repousse l'autre.
    let i = Number(a.value);
    let j = Number(b.value);
    if (i > j) { if (document.activeElement === a) j = i; else i = j; a.value = i; b.value = j; }
    const pct = (v) => (v / total) * 100;
    const sel = document.getElementById('execChronoSelection');
    if (sel) { sel.style.left = `${pct(i)}%`; sel.style.right = `${100 - pct(j)}%`; }
    const bulle = (id, v, libelle) => {
        const e = document.getElementById(id);
        if (!e) return;
        e.style.left = `${Math.min(90, Math.max(10, pct(v)))}%`;
        e.innerHTML = `<strong>${_execChronoLisible(_execChronoDate(v, min))}</strong> - ${libelle}`;
    };
    bulle('execChronoBulleDebut', i, te('debut'));
    bulle('execChronoBulleFin', j, te('fin'));
};

// Relâchement : la période est arrêtée, les indicateurs se refont.
window.execChronoAppliquer = function () {
    const boite = document.getElementById('execChrono');
    if (!boite) return;
    const min = _execChronoJour(boite.dataset.min);
    const a = Number(document.getElementById('execChronoDebut').value);
    const b = Number(document.getElementById('execChronoFin').value);
    execStatsPeriode(_execChronoDate(Math.min(a, b), min), _execChronoDate(Math.max(a, b), min));
};

// Bornes saisies au clavier : elles arrêtent la période comme les poignées.
window.execChronoDates = function () {
    const a = document.getElementById('execChronoDateDebut');
    const b = document.getElementById('execChronoDateFin');
    let debut = (a && a.value) || '';
    let fin = (b && b.value) || '';
    if (debut && fin && debut > fin) { const t = debut; debut = fin; fin = t; }
    execStatsPeriode(debut, fin);
};

window.execStatsPeriode = function (debut, fin) {
    EXEC_STATE.statsPeriode = { debut, fin };
    execShowStatistiquesAdvanced();
};

// Raccourci : les N derniers mois, à compter d'aujourd'hui.
window.execStatsPeriodeDerniers = function (n) {
    const fin = new Date();
    const debut = new Date();
    debut.setMonth(debut.getMonth() - n);
    execStatsPeriode(_execChronoIso(debut), _execChronoIso(fin));
};

// Détail d'un indicateur de conformité : les constatations qu'il compte,
// présentées sous les cartes, là où le classement des prestataires figurait.
function _execStatsDetailHtml(cle, detail) {
    if (!cle || !detail) {
        return `<p class="exec-stats-invite">${te('aucun_indicateur')}</p>`;
    }
    const lignes = detail.lignes || [];
    return `
    <div class="exec-stats-detail">
        <div class="exec-stats-entete">
            <h4>${te('detail_indicateur')} — ${_esc(detail.titre)}
                <span class="exec-stats-compte">${lignes.length}</span></h4>
            <button class="btn btn-sm btn-outline" onclick="execStatsIndicateur('')">
                ${EXEC_ICONS.x || ''} ${te('cancel')}
            </button>
        </div>
        <table class="exec-data-table exec-compact-table" style="width:100%;font-size:0.82rem;">
            <thead><tr>
                <th style="width:140px;">${te('reference')}</th>
                <th>${te('provider')}</th>
                <th style="width:100px;">${te('criticite')}</th>
                <th style="width:120px;">${te('statut')}</th>
                <th style="width:110px;">${te('date_ouverture')}</th>
                <th style="width:110px;">${te('date_due_label')}</th>
                <th style="width:110px;">${te('date_solde')}</th>
                <th style="width:70px;text-align:center;">${te('actions')}</th>
            </tr></thead>
            <tbody>
                ${lignes.length === 0
                    ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`
                    : lignes.map(c => `<tr>
                        <td><strong>${_esc(c.reference || '')}</strong></td>
                        <td>${_esc(c.prestataire_nom || '')}</td>
                        <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
                        <td>${_execStatusBadge(c.statut)}</td>
                        <td>${_formatDate(String(c.date_ouverture || c.date_creation || '').slice(0, 10))}</td>
                        <td>${_formatDate(String(c.date_due_cloture || '').slice(0, 10))}</td>
                        <td>${_formatDate(String(c.date_solde || '').slice(0, 10))}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-sm btn-outline" onclick="execOuvrirConstatation('${c.id}')"
                                    title="${_escAttr(te('ouvrir_constatation'))}">${EXEC_ICONS.eye || EXEC_ICONS.openFolder || '→'}</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

// Ouvre la constatation là où elle se travaille : son suivi PAC tant qu'elle
// est ouverte, le dossier de l'activité une fois soldée, et le processus
// « hors activité » pour celles qui n'ont pas de dossier. Même aiguillage que
// la table des Constatations, en un seul endroit.
window.execOuvrirConstatation = function (fncId) {
    const c = (EXEC_STATE.data.constatations || []).find(x => x.id === fncId);
    if (!c) { _execToast(te('no_data'), 'info'); return; }
    const st = c.statut || '';
    let ouvrir;
    if (st.startsWith('direct_')) ouvrir = () => execOpenConstatationDirecteSlider(fncId);
    else if (st !== 'soldee' && EXEC_CONSTA_EN_VIGUEUR.has(st)) ouvrir = () => execOpenPACSlider(fncId);
    else if (c.dossier_id) ouvrir = () => execOpenDossierSlider(c.dossier_id, 'constatations');
    else ouvrir = () => execOpenConstatationDirecteSlider(fncId);
    // On vient du formulaire de statistiques : son bouton Retour doit y
    // ramener, et non refermer le volet sur le tableau de bord.
    const revenir = EXEC_STATE.voletRejouer;
    // Le formulaire de statistiques occupe déjà le volet : on le referme
    // d'abord, les deux ne peuvent pas y tenir ensemble.
    if (typeof execCloseSlider === 'function') execCloseSlider();
    execArmerRetour(revenir);
    setTimeout(ouvrir, 80);
};

// Choix d'un indicateur : un second clic sur la même carte referme le détail.
window.execStatsIndicateur = function (cle) {
    EXEC_STATE.statsIndicateur = (EXEC_STATE.statsIndicateur === cle) ? '' : cle;
    execShowStatistiquesAdvanced();
};

// Statistiques avancées — ouvre un slider plein, basé sur les données filtrées du tableau de bord.
function execShowStatistiquesAdvanced() {
    // Filtres propres au formulaire (initialisés depuis ceux du tableau de bord à la 1re ouverture).
    if (!EXEC_STATE.statsFilters) {
        const f = EXEC_STATE.filters || {};
        EXEC_STATE.statsFilters = { domaine: f.domaine || '', prestataire: f.prestataire || '', annee: f.annee || '', trimestre: f.trimestre || '' };
    }
    const F = EXEC_STATE.statsFilters;
    const filtrees = _execStatsConstatations(F);
    const { consts, bornes, P, cycle } = _execStatsPeriode(F, filtrees.consts);
    const k = _execStatsCalculs(consts);
    const indicateur = EXEC_STATE.statsIndicateur || '';
    const detail = k.DETAILS[indicateur] || null;

    // Sous-menus du formulaire : les indicateurs, puis la situation générale.
    const onglet = EXEC_STATE.statsOnglet || 'indicateurs';
    const sousMenus = `<div class="exec-stats-onglets">
        ${[['indicateurs', te('indicateurs')], ['situation', te('situation_generale')]]
            .map(([cle, libelle]) => `<button class="exec-stats-onglet${onglet === cle ? ' actif' : ''}"
                onclick="EXEC_STATE.statsOnglet='${cle}';execShowStatistiquesAdvanced()">${_esc(libelle)}</button>`).join('')}
    </div>`;

    const filterBar = _execStatsBarreFiltres(F, filtrees.prests);

    const body = `
    <div style="padding:1rem 1.25rem;">
        ${sousMenus}
        ${onglet === 'situation' ? `
        <div class="card" id="execSituationGeneraleCard">
            <div class="exec-stats-entete">
                <h4>${te('situation_generale')}</h4>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('xlsx')" title="Exporter Excel">
                        ${EXEC_ICONS.download || EXEC_ICONS.file || ''} ${te('export_excel')}
                    </button>
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('pdf')" title="Exporter PDF">
                        ${EXEC_ICONS.pdf || EXEC_ICONS.download || ''} ${te('export_pdf')}
                    </button>
                </div>
            </div>
            <div id="execSituationGeneraleRoot">${_execSituationGenerale(F).tableHtml}</div>
        </div>` : _execStatsIndicateursHtml(k, filterBar, bornes, P, cycle, indicateur, detail)}
    </div>`;

    // Bandeau : sortie du formulaire à gauche, avant son intitulé ; la croix
    // de fermeture n'a plus lieu d'être.
    const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execCloseSlider()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.dashboard || ''} ${te('statistiques')}`;
    execShowSlider(titre, body, '', 'max');
    // Onglet, indicateur, filtres et période vivent dans EXEC_STATE : rejouer
    // le formulaire suffit à le retrouver dans l'état où on l'a laissé.
    EXEC_STATE.voletRejouer = () => execShowStatistiquesAdvanced();
    // Le formulaire se rejoue à chaque onglet et à chaque indicateur : ni
    // glissement du volet, ni fondu du corps entre deux états.
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
    document.querySelector('#execSlider .exec-slider-close')?.remove();
}

// Constatations du formulaire : portée du compte, puis ses filtres.
function _execStatsConstatations(F) {
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';
    const secteurs = EXEC_STATE.data.secteurs || [];
    const sec2dom = {}; secteurs.forEach(s => { sec2dom[s.id] = s.domaine_id; });
    const prests = EXEC_STATE.data.prestataires || [];
    const prestDom = {}; prests.forEach(p => {
        prestDom[p.id] = p.domaine_id || (secteurs.find(s => s.id === p.secteur_id) || {}).domaine_id || '';
    });
    let consts = EXEC_STATE.data.constatations || [];
    const mesPrestStats = _execPortePrestataire(F.prestataire);
    if (mesPrestStats) consts = consts.filter(c => mesPrestStats.includes(c.prestataire_id));
    // Filtres du tableau de bord
    if (F.prestataire) consts = consts.filter(c => c.prestataire_id === F.prestataire);
    if (F.domaine) consts = consts.filter(c => (prestDom[c.prestataire_id] || c.domaine_id) === F.domaine);
    if (F.annee) consts = consts.filter(c => String(c.date_creation || c.date_ouverture || '').slice(0, 4) === String(F.annee));
    if (F.trimestre) consts = consts.filter(c => {
        const d = String(c.date_creation || c.date_ouverture || '');
        return d.length >= 7 && String(Math.ceil(parseInt(d.slice(5, 7)) / 3)) === String(F.trimestre);
    });
    return { consts, prests };
}

// Période retenue et bornes offertes au curseur de la chronologie.
function _execStatsPeriode(F, consts) {
    // Période retenue : la chronologie sous les filtres borne les données sur
    // lesquelles les indicateurs sont calculés.
    if (!EXEC_STATE.statsPeriode) EXEC_STATE.statsPeriode = { debut: '', fin: '' };
    // Un prestataire retenu impose son cycle de surveillance : c'est la
    // période sur laquelle son suivi se juge. Changer de prestataire réarme
    // ce défaut ; un réglage manuel de la chronologie le remplace.
    const cycle = _execCyclePrestataire(F.prestataire);
    if (F.prestataire !== EXEC_STATE._statsPrestataireCycle) {
        EXEC_STATE._statsPrestataireCycle = F.prestataire;
        EXEC_STATE.statsPeriode = cycle
            ? { debut: cycle.debut.slice(0, 10), fin: cycle.fin.slice(0, 10) }
            : { debut: '', fin: '' };
    }
    const P = EXEC_STATE.statsPeriode;
    const jourDe = (c) => String(c.date_creation || c.date_ouverture || '').slice(0, 10);
    // Étendue offerte au curseur : ce que couvrent les données, élargi au
    // cycle du prestataire quand il déborde.
    const jours = consts.map(jourDe).filter(Boolean).sort();
    // La piste couvre les données, le cycle du prestataire — et la période
    // retenue : une date saisie au clavier hors de ces bornes doit rester
    // atteignable par les poignées, sinon le curseur mentirait sur le filtre.
    const bornes = {
        min: [jours[0], cycle && cycle.debut, P.debut].filter(Boolean).sort()[0] || '',
        max: [jours[jours.length - 1], cycle && cycle.fin, P.fin].filter(Boolean).sort().pop() || '',
    };
    if (P.debut) consts = consts.filter(c => jourDe(c) >= P.debut);
    if (P.fin) consts = consts.filter(c => jourDe(c) <= P.fin);
    return { consts, bornes, P, cycle };
}

// Indicateurs, répartitions, et la liste que chacun recouvre.
function _execStatsCalculs(consts) {
    const POST = new Set(EXEC_CONSTA_EN_VIGUEUR);
    const transmitted = consts.filter(c => POST.has(c.statut || ''));
    const crit = c => (c.criticite || c.gravite || '').toLowerCase();

    // --- KPIs requis ---
    const criticals = transmitted.filter(c => crit(c) === 'critique');
    const nbCrit = criticals.length;
    const critResolvedInTime = criticals.filter(c => {
        if (c.statut !== 'soldee' || !c.date_solde || !c.date_due_cloture) return false;
        return new Date(c.date_solde) <= new Date(c.date_due_cloture);
    }).length;
    // Moyenne mensuelle Critique + Majeure
    const cm = transmitted.filter(c => ['critique', 'majeure'].includes(crit(c)));
    const monthSet = new Set(cm.map(c => String(c.date_creation || c.date_ouverture || '').slice(0, 7)).filter(Boolean));
    const moyMensCritMaj = monthSet.size > 0 ? (cm.length / monthSet.size).toFixed(1) : '-';
    // Taux clôture majeures
    const majeures = transmitted.filter(c => crit(c) === 'majeure');
    const majSolded = majeures.filter(c => c.statut === 'soldee').length;
    const tauxClotMaj = majeures.length > 0 ? Math.round((majSolded / majeures.length) * 100) + '%' : '-';
    // Récurrentes : clé prestataire + thème/description (50 prem. car.) — paquets avec count > 1
    const recurMap = {};
    transmitted.forEach(c => {
        const k = (c.prestataire_id || '') + '|' + ((c.theme || c.titre || c.description || '').toString().toLowerCase().slice(0, 50));
        recurMap[k] = (recurMap[k] || 0) + 1;
    });
    const nbRecur = Object.values(recurMap).filter(n => n > 1).reduce((a, b) => a + b, 0);

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Répartition par mois, pour la vignette de la moyenne mensuelle.
    const parMois = {};
    cm.forEach(c => {
        const m = String(c.date_creation || c.date_ouverture || '').slice(0, 7);
        if (m) parMois[m] = (parMois[m] || 0) + 1;
    });
    const repartitionMois = Object.keys(parMois).sort().slice(-5).map(k => parMois[k]);

    // Ce que chaque indicateur recouvre : la liste qu'il compte. Cliquer la
    // carte affiche cette liste, sous les indicateurs.
    const recurrentes = transmitted.filter(c => {
        const k = (c.prestataire_id || '') + '|'
            + ((c.theme || c.titre || c.description || '').toString().toLowerCase().slice(0, 50));
        return recurMap[k] > 1;
    });
    // ── Répartitions ─────────────────────────────────────────────────
    // Trois lectures d'un même ensemble : par criticité, par avancement, puis
    // par état du plan d'actions. Elles portent sur les données du formulaire,
    // filtres et période compris — et chaque ligne renvoie à sa propre liste.
    const ouvertesStats = transmitted.filter(c => c.statut !== 'soldee');
    const soldeesStats = transmitted.filter(c => c.statut === 'soldee');
    const horsDelaiListe = ouvertesStats.filter(c => c.date_due_cloture
        && new Date(c.date_due_cloture) < today);
    const stConst = c => (c.statut || '').toLowerCase();
    const pacNonSoumisL = ouvertesStats.filter(c => ['ouvert', 'ouverte'].includes(stConst(c)));
    const pacAccepteL = ouvertesStats.filter(c => stConst(c) === 'pac_valide');
    const pacRejeteL = ouvertesStats.filter(c => stConst(c) === 'pac_rejetee');
    const parCriticite = n => transmitted.filter(c => crit(c) === n);

    const repCritSegments = [
        { cle: 'rep_critique', label: te('critique'), value: parCriticite('critique').length, color: '#dc2626' },
        { cle: 'rep_majeure',  label: te('majeure'),  value: parCriticite('majeure').length,  color: '#f97316' },
        { cle: 'rep_mineure',  label: te('mineure'),  value: parCriticite('mineure').length,  color: '#f59e0b' },
    ];
    // « Hors délais » est un sous-ensemble des ouvertes : c'est l'alerte, pas
    // une troisième catégorie — la somme des lignes ne fait pas le total.
    const repEmisesSegments = [
        { cle: 'emis_ouverte',     label: te('emises_ouverte'), value: ouvertesStats.length,   color: '#2563eb' },
        { cle: 'emis_hors_delais', label: te('hors_delais'),    value: horsDelaiListe.length,  color: '#dc2626' },
        { cle: 'emis_cloture',     label: te('emises_cloture'), value: soldeesStats.length,    color: '#16a34a' },
    ];
    const repPacSegments = [
        { cle: 'pac_non_soumis', label: te('graph_pac_non_soumis'), value: pacNonSoumisL.length, color: '#dc2626' },
        { cle: 'pac_accepte',    label: te('graph_pac_accepte'),    value: pacAccepteL.length,   color: '#16a34a' },
        { cle: 'pac_rejete',     label: te('graph_pac_rejete'),     value: pacRejeteL.length,    color: '#f97316' },
    ];

    const DETAILS = {
        critiques: { titre: te('stats_critiques'), lignes: criticals },
        rep_critique: { titre: `${te('graph_criticite')} — ${te('critique')}`, lignes: parCriticite('critique') },
        rep_majeure: { titre: `${te('graph_criticite')} — ${te('majeure')}`, lignes: parCriticite('majeure') },
        rep_mineure: { titre: `${te('graph_criticite')} — ${te('mineure')}`, lignes: parCriticite('mineure') },
        emis_ouverte: { titre: `${te('graph_emises')} — ${te('emises_ouverte')}`, lignes: ouvertesStats },
        emis_hors_delais: { titre: `${te('graph_emises')} — ${te('hors_delais')}`, lignes: horsDelaiListe },
        emis_cloture: { titre: `${te('graph_emises')} — ${te('emises_cloture')}`, lignes: soldeesStats },
        pac_non_soumis: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_non_soumis')}`, lignes: pacNonSoumisL },
        pac_accepte: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_accepte')}`, lignes: pacAccepteL },
        pac_rejete: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_rejete')}`, lignes: pacRejeteL },
        critiques_delai: {
            titre: te('stats_critiques_delai'),
            lignes: criticals.filter(c => c.statut === 'soldee' && c.date_solde && c.date_due_cloture
                && new Date(c.date_solde) <= new Date(c.date_due_cloture)),
        },
        crit_maj: { titre: te('stats_moyenne_mensuelle'), lignes: cm },
        majeures: { titre: te('stats_cloture_majeures'), lignes: majeures },
        recurrentes: { titre: te('stats_recurrentes'), lignes: recurrentes },
    };
    return {
        transmitted, criticals, nbCrit, critResolvedInTime, cm, moyMensCritMaj, majeures, majSolded,
        tauxClotMaj, nbRecur, repartitionMois, recurrentes, ouvertesStats, soldeesStats, horsDelaiListe,
        repCritSegments, repEmisesSegments, repPacSegments, DETAILS,
    };
}

// Barre de filtres propre au formulaire.
function _execStatsBarreFiltres(F, prests) {
    // Options du filtre propre
    const domaines = EXEC_STATE.data.domaines || [];
    const allConstYears = new Set((EXEC_STATE.data.constatations || [])
        .map(c => String(c.date_creation || c.date_ouverture || '').slice(0, 4)).filter(Boolean));
    const years = [...allConstYears].sort((a, b) => b.localeCompare(a));
    const filterBar = `
    <div style="display:flex;flex-wrap:nowrap;gap:0.5rem;margin-bottom:1rem;padding:0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;align-items:center;">
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.domaine=this.value;execShowStatistiquesAdvanced()">
            <option value="">${te('all_domains')}</option>
            ${domaines.map(d => `<option value="${d.id}" ${F.domaine===d.id?'selected':''}>${_esc(d.code || d.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.prestataire=this.value;execShowStatistiquesAdvanced()">
            <option value="">${te('all_providers')}</option>
            ${prests.map(p => `<option value="${p.id}" ${F.prestataire===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.annee=this.value;execShowStatistiquesAdvanced()">
            <option value="">${te('toutes_annees_option')}</option>
            ${years.map(y => `<option value="${y}" ${F.annee===y?'selected':''}>${y}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.trimestre=this.value;execShowStatistiquesAdvanced()">
            <option value="">${te('all_trimestres')}</option>
            ${['1','2','3','4'].map(t => `<option value="${t}" ${String(F.trimestre)===t?'selected':''}>T${t}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-outline" style="flex-shrink:0;" onclick="EXEC_STATE.statsFilters={domaine:'',prestataire:'',annee:'',trimestre:''};execShowStatistiquesAdvanced()" title="${te('reinitialiser')}">${EXEC_ICONS.reset || '↺'}</button>
    </div>`;
    return filterBar;
}

// Onglet « Indicateurs » : filtres, chronologie, cartes, répartitions et détail.
function _execStatsIndicateursHtml(k, filterBar, bornes, P, cycle, indicateur, detail) {
    const {
        nbCrit, critResolvedInTime, moyMensCritMaj, repartitionMois, tauxClotMaj, majSolded, majeures, nbRecur,
        repCritSegments, repEmisesSegments, repPacSegments, transmitted, ouvertesStats,
    } = k;
    return `
        ${filterBar}
        ${_execStatsChronologie(bornes, P, cycle)}
        <div class="oasis-kpi-groupes pleine cinq">
            ${oasisKpiGroupe(te('indicateurs_conformite'), [
                oasisKpiCarte({
                    titre: te('stats_critiques'), couleur: '#dc2626', alerte: !!nbCrit,
                    valeur: nbCrit, precision: te('stats_critiques_aide'),
                    figure: { type: 'echelle', position: 92, min: te('faible'), max: te('eleve') },
                    onClick: "execStatsIndicateur('critiques')", actif: indicateur === 'critiques',
                }),
                oasisKpiCarte({
                    titre: te('stats_critiques_delai'), couleur: '#16a34a',
                    valeur: critResolvedInTime,
                    precision: `${te('sur')} ${nbCrit} ${te('critiques').toLowerCase()}`,
                    figure: { type: 'jauge', pct: nbCrit ? Math.round((critResolvedInTime / nbCrit) * 100) : 0 },
                    onClick: "execStatsIndicateur('critiques_delai')", actif: indicateur === 'critiques_delai',
                }),
                oasisKpiCarte({
                    titre: te('stats_moyenne_mensuelle'), couleur: '#f97316',
                    valeur: moyMensCritMaj, precision: te('stats_moyenne_aide'),
                    figure: { type: 'barres', valeurs: repartitionMois },
                    onClick: "execStatsIndicateur('crit_maj')", actif: indicateur === 'crit_maj',
                }),
                oasisKpiCarte({
                    titre: te('stats_cloture_majeures'), couleur: '#059669',
                    valeur: tauxClotMaj,
                    precision: `${majSolded}/${majeures.length} ${te('cloturees_court')}`,
                    figure: { type: 'cloture', pct: majeures.length ? Math.round((majSolded / majeures.length) * 100) : 0 },
                    onClick: "execStatsIndicateur('majeures')", actif: indicateur === 'majeures',
                }),
                oasisKpiCarte({
                    titre: te('stats_recurrentes'), couleur: '#7c3aed',
                    valeur: nbRecur, precision: te('stats_recurrentes_aide'),
                    figure: { type: 'etapes', liste: [te('stats_repetition'), te('stats_isolee')], actif: nbRecur ? 0 : 1 },
                    onClick: "execStatsIndicateur('recurrentes')", actif: indicateur === 'recurrentes',
                }),
            ])}
        </div>
        <div class="exec-crit-grille" id="execCritGrille">
            ${_execTableauRepartition(te('graph_criticite'), repCritSegments, transmitted.length)}
            ${_execTableauRepartition(te('graph_emises'), repEmisesSegments, transmitted.length)}
            ${_execTableauRepartition(te('graph_pac_titre'), repPacSegments, ouvertesStats.length)}
        </div>
        ${_execStatsDetailHtml(indicateur, detail)}`;
}

