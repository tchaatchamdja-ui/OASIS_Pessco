/* OASIS — Module « Mesures d'Application »
 * Barre supérieure : l'instance regardée, comme « RAMP Inspections » y porte le
 * poste d'AAC tenu.
 *
 * L'application tourne pour une AAC, et les menus « Carences » et « Mesures »
 * ne servaient que ses dossiers sans jamais le dire. La liste déroulante les
 * nomme : le super-administrateur y prend l'instance d'un État membre, ou les
 * regarde toutes — la vue régionale. Les autres comptes n'en changent pas ;
 * la barre leur rappelle seulement chez qui ils travaillent.
 *
 * Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
 * listes, des états exportés et des indicateurs ce qui n'appartient pas à
 * l'instance retenue.
 */

const MES_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

async function mesAppliquerInstance(valeur) {
    const etat = MES_STATE.instances || {};
    if (!etat.disponible) return;
    if ((etat.courante || '') === (valeur || '')) return;
    try {
        await mesApi('/instance', { method: 'PUT', body: JSON.stringify({ instance: valeur }) });
    } catch (e) {
        mesToast((e && e.message) || 'Changement d’instance impossible', 'error');
        return;
    }
    // L'instance commande le périmètre de tous les écrans : on recharge le
    // module plutôt que de rafraîchir liste après liste.
    window.location.reload();
}

// ── Gestion des Droits du module ──
// Même écran que pour les autres espaces, appliqué à CARE : privilèges par
// compte, portées domaine/secteur, journal d'audit. Il appartient à l'Autorité
// — super-administrateur et administrateur AAC —, et le module n'ayant pas
// d'écran côté organisme, aucun compte prestataire n'y figure.
const MES_DROITS_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';

const mesPeutGererDroits = () => ['SUPERADMIN', 'ADMIN'].includes((MES_STATE.user || {}).role);

function mesDessinerActions() {
    if (typeof oasisModuleActions !== 'function') return;
    const etat = MES_STATE.instances || {};
    const actions = [];
    if (etat.disponible && (etat.instances || []).length) {
        actions.push({
            key: 'instance', type: 'select', label: 'Instance regardée',
            value: etat.courante || '',
            options: [{ value: '', label: MES_VUE_REGIONALE }]
                .concat(etat.instances.map((e) => ({ value: e, label: e }))),
            onChange: (v) => mesAppliquerInstance(v),
        });
    }
    if (mesPeutGererDroits()) {
        actions.push({
            key: 'droits', label: 'Gestion des Droits', icon: MES_DROITS_ICON,
            onClick: () => { window.location.href = '/modules/droits/index.html?module=CARE'; },
        });
    }
    oasisModuleActions(actions);
    // La liste déroulante nomme déjà l'instance : la mention ne sert qu'aux
    // comptes qui n'en changent pas.
    if (typeof oasisModuleMention === 'function') {
        oasisModuleMention(etat.disponible ? '' : (etat.locale || ''));
    }
}
