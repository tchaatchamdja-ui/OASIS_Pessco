// OASIS — « Planification de la Surveillance » : l'instance regardée, en barre
// supérieure (ADR-003, 5.c — n° 5.f.102).
//
// L'application tourne pour une AAC, et les menus « Plans » et « Calendrier »
// ne servaient que ses programmations sans jamais le dire. La liste déroulante
// les nomme : le super-administrateur y prend l'instance d'un État membre, ou
// les regarde toutes — la vue régionale. Les autres comptes n'en changent pas ;
// la barre leur rappelle seulement chez qui ils travaillent.
//
// Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
// listes et des statistiques ce qui n'appartient pas à l'instance retenue.
// « Exécution de la Surveillance » ne déclenche d'ailleurs que les activités
// des plans de l'instance dont elle tient le poste.
//
// ── Un script de page, et non un sas ──
//
// `pl-instances.js` posait quatre noms au premier niveau — deux fonctions sur
// `window`, deux liaisons lexicales. **Mesuré le 14 novembre 2026 : aucun autre
// fichier ne les lit.** Le geste passe par une fermeture remise au socle, non
// par un nom. Converti, le fichier ne publie donc rien : il est rangé dans
// `pages/`, et les quatre noms quittent la portée globale — la seule différence
// avec l'ancien, déclarée, et que la photographie de la page vérifie.
import type { ActionBarre } from '../../socle/chrome';
import { PLAN_MODULE_API } from '../adresse';

const PLAN_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

/** Ce que `/instance` rend : l'instance retenue, et celles qu'on peut prendre. */
interface EtatInstance {
  disponible?: boolean;
  courante?: string;
  instances?: string[];
  locale?: string;
}

let planInstanceActive: EtatInstance | null = null;

async function planAppliquerInstance(valeur: string): Promise<void> {
  if (!planInstanceActive || !planInstanceActive.disponible) return;
  if ((planInstanceActive.courante || '') === (valeur || '')) return;
  try {
    await window.api(`${PLAN_MODULE_API}/instance`, {
      method: 'PUT', body: JSON.stringify({ instance: valeur }),
    });
  } catch (e) {
    window.planShowEphemeralToast?.((e instanceof Error && e.message) || 'Changement d’instance impossible', 'error');
    return;
  }
  // L'instance commande le périmètre de tous les écrans : on recharge le
  // module plutôt que de rafraîchir liste après liste.
  window.location.reload();
}

function planDessinerActions(): void {
  if (typeof window.oasisModuleActions !== 'function') return;
  const etat: EtatInstance = planInstanceActive || {};
  if (etat.disponible && (etat.instances || []).length) {
    const action: ActionBarre = {
      key: 'instance', type: 'select', label: 'Instance regardée',
      value: etat.courante || '',
      options: [{ value: '', label: PLAN_VUE_REGIONALE }]
        .concat((etat.instances || []).map((e) => ({ value: e, label: e }))),
      onChange: (v: string) => planAppliquerInstance(v),
    };
    window.oasisModuleActions([action]);
  } else {
    window.oasisModuleActions([]);
  }
  // La liste déroulante nomme déjà l'instance : la mention ne sert qu'aux
  // comptes qui n'en changent pas.
  if (typeof window.oasisModuleMention === 'function') {
    window.oasisModuleMention(etat.disponible ? '' : (etat.locale || ''));
  }
}

// L'état arrive quand il arrive ; la barre est posée par le socle. Redessiner
// est sans effet de bord, on le fait aux deux moments.
window.api(`${PLAN_MODULE_API}/instance`)
  .then((etat) => { planInstanceActive = etat as EtatInstance; planDessinerActions(); })
  .catch(() => {});
window.addEventListener('DOMContentLoaded', () => planDessinerActions());
