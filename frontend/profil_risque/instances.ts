// OASIS — « Profils de Risque » (PR) — l'instance regardée, en barre
// supérieure (ADR-003, 5.c — n° 5.f.129).
//
// L'application tourne pour une AAC, et les évaluations comme les profils ne
// servaient que les siennes sans jamais le dire. La liste déroulante les
// nomme : le super-administrateur régional y prend l'instance d'un État membre,
// ou les regarde toutes — la vue régionale. Les autres comptes n'en changent
// pas ; la barre leur rappelle seulement chez qui ils travaillent.
//
// Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
// listes les évaluations, les plans de vérification et les organismes qui
// n'appartiennent pas à l'instance retenue. Le barème — indicateurs et indices
// — reste commun aux huit États.
//
// Converti à la lettre depuis `pr-instances.js` : les mêmes gardes, dans le
// même ordre, et la même requête.
import { t } from './partage';

export const PR_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

export async function prAppliquerInstance(valeur: string): Promise<void> {
  const etat = (window.APP_STATE || {}).instances || {};
  if (!etat.disponible) return;
  if ((etat.courante || '') === (valeur || '')) return;
  try {
    await window.api(`${MODULE_API}/instance`, { method: 'PUT', body: JSON.stringify({ instance: valeur }) });
  } catch (e) {
    // `showToast` est celui du socle : l'ancien le cherchait par son nom, et le
    // trouvait sur `window`, où le socle le pose.
    if (typeof window.showToast === 'function') {
      window.showToast(((e as { message?: string } | null) && (e as { message?: string }).message) || t('instance_changement_impossible'), 'error');
    }
    return;
  }
  // L'instance commande le périmètre de tous les écrans : on recharge le
  // module plutôt que de rafraîchir liste après liste.
  window.location.reload();
}

export function prDessinerActions(): void {
  if (typeof window.oasisModuleActions !== 'function') return;
  const etat = (window.APP_STATE || {}).instances || {};
  if (etat.disponible && (etat.instances || []).length) {
    window.oasisModuleActions([{
      key: 'instance', type: 'select', label: 'Instance regardée',
      value: etat.courante || '',
      options: [{ value: '', label: PR_VUE_REGIONALE }]
        .concat((etat.instances || []).map((e) => ({ value: e, label: e }))),
      onChange: (v) => prAppliquerInstance(v),
    }]);
  } else {
    window.oasisModuleActions([]);
  }
  // La liste déroulante nomme déjà l'instance : la mention ne sert qu'aux
  // comptes qui n'en changent pas.
  if (typeof window.oasisModuleMention === 'function') {
    window.oasisModuleMention(etat.disponible ? '' : (etat.locale || ''));
  }
}
