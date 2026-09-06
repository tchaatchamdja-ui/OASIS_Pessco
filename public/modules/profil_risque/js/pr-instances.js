/* Module « Profils de Risque » — l'instance regardée, en barre supérieure.
 *
 * L'application tourne pour une AAC, et les évaluations comme les profils ne
 * servaient que les siennes sans jamais le dire. La liste déroulante les
 * nomme : le super-administrateur régional y prend l'instance d'un État membre,
 * ou les regarde toutes — la vue régionale. Les autres comptes n'en changent
 * pas ; la barre leur rappelle seulement chez qui ils travaillent.
 *
 * Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
 * listes les évaluations, les plans de vérification et les organismes qui
 * n'appartiennent pas à l'instance retenue. Le barème — indicateurs et indices
 * — reste commun aux huit États.
 */

const PR_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

async function prAppliquerInstance(valeur) {
    const etat = (window.APP_STATE || {}).instances || {};
    if (!etat.disponible) return;
    if ((etat.courante || '') === (valeur || '')) return;
    try {
        await api(`${MODULE_API}/instance`, { method: 'PUT', body: JSON.stringify({ instance: valeur }) });
    } catch (e) {
        if (typeof showToast === 'function') showToast((e && e.message) || 'Changement d’instance impossible', 'error');
        return;
    }
    // L'instance commande le périmètre de tous les écrans : on recharge le
    // module plutôt que de rafraîchir liste après liste.
    window.location.reload();
}

function prDessinerActions() {
    if (typeof oasisModuleActions !== 'function') return;
    const etat = (window.APP_STATE || {}).instances || {};
    if (etat.disponible && (etat.instances || []).length) {
        oasisModuleActions([{
            key: 'instance', type: 'select', label: 'Instance regardée',
            value: etat.courante || '',
            options: [{ value: '', label: PR_VUE_REGIONALE }]
                .concat(etat.instances.map((e) => ({ value: e, label: e }))),
            onChange: (v) => prAppliquerInstance(v),
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

window.prDessinerActions = prDessinerActions;
