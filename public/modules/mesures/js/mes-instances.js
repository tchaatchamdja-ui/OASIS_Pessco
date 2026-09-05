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

function mesDessinerActions() {
    if (typeof oasisModuleActions !== 'function') return;
    const etat = MES_STATE.instances || {};
    if (etat.disponible && (etat.instances || []).length) {
        oasisModuleActions([{
            key: 'instance', type: 'select', label: 'Instance regardée',
            value: etat.courante || '',
            options: [{ value: '', label: MES_VUE_REGIONALE }]
                .concat(etat.instances.map((e) => ({ value: e, label: e }))),
            onChange: (v) => mesAppliquerInstance(v),
        }]);
    } else {
        oasisModuleActions([]);
    }
    // La liste déroulante nomme déjà l'instance : la mention ne sert qu'aux
    // comptes qui n'en changent pas.
    if (typeof oasisModuleMention === 'function') {
        oasisModuleMention(etat.disponible ? '' : (etat.locale || ''));
    }
}
