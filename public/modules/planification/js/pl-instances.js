/* Module « Plans de Surveillance » — l'instance regardée, en barre supérieure.
 *
 * L'application tourne pour une AAC, et les menus « Plans » et « Calendrier »
 * ne servaient que ses programmations sans jamais le dire. La liste déroulante
 * les nomme : le super-administrateur y prend l'instance d'un État membre, ou
 * les regarde toutes — la vue régionale. Les autres comptes n'en changent pas ;
 * la barre leur rappelle seulement chez qui ils travaillent.
 *
 * Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
 * listes et des statistiques ce qui n'appartient pas à l'instance retenue.
 * « Exécution de la Surveillance » ne déclenche d'ailleurs que les activités
 * des plans de l'instance dont elle tient le poste.
 */

const PLAN_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

let planInstanceActive = null;

async function planAppliquerInstance(valeur) {
    if (!planInstanceActive || !planInstanceActive.disponible) return;
    if ((planInstanceActive.courante || '') === (valeur || '')) return;
    try {
        await api(`${PLAN_MODULE_API}/instance`, {
            method: 'PUT', body: JSON.stringify({ instance: valeur }),
        });
    } catch (e) {
        planShowEphemeralToast((e && e.message) || 'Changement d’instance impossible', 'error');
        return;
    }
    // L'instance commande le périmètre de tous les écrans : on recharge le
    // module plutôt que de rafraîchir liste après liste.
    window.location.reload();
}

function planDessinerActions() {
    if (typeof oasisModuleActions !== 'function') return;
    const etat = planInstanceActive || {};
    if (etat.disponible && (etat.instances || []).length) {
        oasisModuleActions([{
            key: 'instance', type: 'select', label: 'Instance regardée',
            value: etat.courante || '',
            options: [{ value: '', label: PLAN_VUE_REGIONALE }]
                .concat(etat.instances.map((e) => ({ value: e, label: e }))),
            onChange: (v) => planAppliquerInstance(v),
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

// L'état arrive quand il arrive ; la barre est posée par le socle. Redessiner
// est sans effet de bord, on le fait aux deux moments.
api(`${PLAN_MODULE_API}/instance`)
    .then((etat) => { planInstanceActive = etat; planDessinerActions(); })
    .catch(() => {});
window.addEventListener('DOMContentLoaded', () => planDessinerActions());
