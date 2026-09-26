/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Barre supérieure : bascule Vue AAC / Vue Prestataire et accès à la
 * « Gestion des Droits » du module, comme dans « Exécution de la Surveillance ».
 *
 * Le module sert l'autorité et l'exploitant inspecté. Le super-administrateur
 * passe de l'une à l'autre depuis la barre : le serveur le présente alors aux
 * routes comme un compte du prestataire retenu, si bien que le cloisonnement
 * des données s'applique réellement — la vue n'est pas un habillage.
 */

const RAMP_VUES = {
    aac: {
        cle: 'vue_aac',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    },
    prestataire: {
        cle: 'vue_prestataire',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-6h4v6"/></svg>',
    },
};

const RAMP_DROITS_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';

// Bascule et gestion des droits appartiennent à l'Autorité : super-administrateur
// et administrateur AAC. Le serveur en juge sur le compte réellement connecté —
// en vue Prestataire, `user.role` est celui que la vue simule.
const rampPeutGererDroits = () => !!(RAMP_STATE.vue || {}).gestion_droits;

async function rampAppliquerVue(vue, prestataireId) {
    const etat = RAMP_STATE.vue || {};
    if (!etat.disponible) return;
    if (etat.vue === vue && !prestataireId) return;
    if (prestataireId && prestataireId === etat.prestataire_id) return;
    try {
        await rampApi('/vue', {
            method: 'PUT',
            body: JSON.stringify(prestataireId ? { vue, prestataire_id: prestataireId } : { vue }),
        });
    } catch (e) {
        rampToast((e && e.message) || rt('m_bascule_impossible'), 'error');
        return;
    }
    // La vue commande les menus, les boutons et le périmètre des données :
    // on recharge le module plutôt que de rafraîchir écran par écran.
    window.location.reload();
}

// Instance regardée : l'État dont le super-administrateur tient le poste. Le
// choix est celui du socle, commun au portail et aux six modules — le prendre
// ici le prend partout, et ce module ne sert plus que les inspections, les
// fiches et les échanges de cette AAC.
async function rampAppliquerInstance(valeur) {
    const etat = RAMP_STATE.instance || {};
    if (!etat.disponible) return;
    if ((etat.courante || '') === (valeur || '')) return;
    try {
        await rampApi('/instance', { method: 'PUT', body: JSON.stringify({ instance: valeur }) });
    } catch (e) {
        rampToast((e && e.message) || rt('m_bascule_impossible'), 'error');
        return;
    }
    window.location.reload();
}

// Le prestataire dont on tient le compte : c'est lui qui décide de ce que
// l'écran montre, la barre le nomme.
function rampNomPrestataireCourant() {
    const etat = RAMP_STATE.vue || {};
    if (etat.vue !== 'prestataire') return '';
    if (etat.prestataire_nom) return etat.prestataire_nom;
    if ((etat.exploitants || []).length) return etat.exploitants.join(', ');
    const p = (etat.prestataires || []).find((x) => x.id === etat.prestataire_id);
    return p ? (p.nom || p.trigramme || '') : '';
}

function rampDessinerActions() {
    if (typeof oasisModuleActions !== 'function') return;
    const etat = RAMP_STATE.vue || {};
    const actions = [];
    if (etat.disponible) {
        Object.entries(RAMP_VUES).forEach(([cle, v]) => actions.push({
            key: cle, label: rt(v.cle), icon: v.icon,
            active: etat.vue === cle,
            onClick: (k) => rampAppliquerVue(k),
        }));
        // En vue Prestataire, le compte tenu se choisit dans la barre : une
        // AAC surveille plusieurs exploitants et passe de l'un à l'autre.
        if (etat.vue === 'prestataire') {
            actions.push({
                key: 'prestataire_choix', type: 'select', label: rt('choisir_prestataire'),
                value: etat.prestataire_id || '',
                options: (etat.prestataires || []).map((p) => ({
                    value: p.id, label: p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom,
                })),
                onChange: (id) => rampAppliquerVue('prestataire', id),
            });
        }
    }
    // Instance regardée — servie au seul super-administrateur, et à la même
    // place que dans les autres modules.
    const inst = RAMP_STATE.instance || {};
    if (inst.disponible && (inst.instances || []).length) {
        actions.push({
            key: 'instance', type: 'select', label: rt('vue_instance'),
            value: inst.courante || '',
            options: [{ value: '', label: rt('vue_instance_regionale') }]
                .concat(inst.instances.map((e) => ({ value: e, label: e }))),
            onChange: (v) => rampAppliquerInstance(v),
        });
    }
    if (rampPeutGererDroits()) {
        actions.push({
            key: 'droits', label: rt('gestion_droits'), icon: RAMP_DROITS_ICON,
            onClick: () => { window.location.href = '/modules/droits/index.html?module=RAMP'; },
        });
    }
    oasisModuleActions(actions);
    rampDessinerMention();
}

// Ce que la barre nomme, à qui n'a rien à y choisir. Elle ne nommait que le
// prestataire : un agent d'AAC — utilisateur, administrateur, ou
// super-administrateur national — n'y lisait donc rien du tout, quand les
// autres modules lui disent chez quelle AAC il travaille.
function rampDessinerMention() {
    if (typeof oasisModuleMention !== 'function') return;
    const vue = RAMP_STATE.vue || {};
    const inst = RAMP_STATE.instance || {};
    // Vue Prestataire subie : le compte appartient à l'organisme, la barre le
    // nomme. Qui bascule d'une vue à l'autre le lit déjà dans la barre.
    const prestataire = vue.disponible ? '' : rampNomPrestataireCourant();
    if (prestataire) { oasisModuleMention(prestataire); return; }
    // Sinon l'instance — sauf à qui la prend dans la liste déroulante, qui la
    // nomme déjà. `courante` plutôt que `locale` : un compte rattaché à un
    // autre État travaille chez lui, non chez celui qui sert l'application.
    oasisModuleMention(inst.disponible ? '' : (inst.courante || inst.locale || ''));
}

// L'état arrive avec le contexte, la barre est posée par le socle : l'ordre
// des deux n'est pas garanti, et redessiner est sans effet de bord.
window.addEventListener('DOMContentLoaded', () => {
    rampDessinerActions();
    if (window.RAMP_BOOT && typeof window.RAMP_BOOT.then === 'function') {
        window.RAMP_BOOT.then(() => setTimeout(rampDessinerActions, 0)).catch(() => {});
    }
});
