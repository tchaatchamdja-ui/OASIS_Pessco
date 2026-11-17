// OASIS — « Mesures d'Application » (CARE) : la barre supérieure — l'instance
// regardée et la gestion des droits (ADR-003, 5.c — n° 5.f.117).
//
// L'application tourne pour une AAC, et les menus « Carences » et « Mesures » ne
// servaient que ses dossiers sans jamais le dire. La liste déroulante les nomme :
// le super-administrateur y prend l'instance d'un État membre, ou les regarde
// toutes — la vue régionale. Les autres comptes n'en changent pas ; la barre leur
// rappelle seulement chez qui ils travaillent.
//
// Le cloisonnement n'est pas un habillage : c'est le serveur qui écarte des
// listes, des états exportés et des indicateurs ce qui n'appartient pas à
// l'instance retenue.
//
// ── Un sas, et non un script de page comme chez PLAN ──
//
// `pl-instances.js` ne publiait rien qu'on lût ailleurs, et devint un script de
// page. Ici, **un** nom est lu hors du fichier — mesuré le 17 novembre 2026 :
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `mesDessinerActions` | **oui** — `function` | `index.html` au démarrage, `mes-app.js` au changement de langue |
// | `mesAppliquerInstance` | **oui** — `function` | personne : la barre reçoit une fermeture |
// | `mesVueRegionale`, `MES_DROITS_ICON`, `mesPeutGererDroits` | **non** — `const` | personne |
//
// Le sas pose le premier ; les quatre autres quittent la portée globale. C'est
// la seule différence entre les deux photographies de la page, et elle est
// déclarée. L'action de barre reste reconnue du relevé des gestes : la
// fermeture `(v) => mesAppliquerInstance(v)` garde son texte, la construction
// ne renommant rien.
import type { ActionBarre } from '../../socle/chrome';
import { etat, mt, requis } from '../partage';

const mesVueRegionale = (): string => mt('vue_regionale');

async function mesAppliquerInstance(valeur: string): Promise<void> {
  const instances = etat().instances || {};
  if (!instances.disponible) return;
  if ((instances.courante || '') === (valeur || '')) return;
  try {
    await requis('mesApi')('/instance', { method: 'PUT', body: JSON.stringify({ instance: valeur }) });
  } catch (e) {
    // L'ancien lisait `e.message` sur toute valeur levée : `(e && e.message)`.
    const message = e && typeof e === 'object' && 'message' in e ? e.message : undefined;
    requis('mesToast')((typeof message === 'string' && message) || mt('instance_impossible'), 'error');
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

const mesPeutGererDroits = (): boolean => ['SUPERADMIN', 'ADMIN'].includes((etat().user || {}).role || '');

function mesDessinerActions(): void {
  if (typeof window.oasisModuleActions !== 'function') return;
  const instances = etat().instances || {};
  const actions: ActionBarre[] = [];
  if (instances.disponible && (instances.instances || []).length) {
    actions.push({
      key: 'instance', type: 'select', label: mt('instance_regardee'),
      value: instances.courante || '',
      options: [{ value: '', label: mesVueRegionale() }]
        .concat((instances.instances || []).map((e) => ({ value: e, label: e }))),
      onChange: (v) => mesAppliquerInstance(v),
    });
  }
  if (mesPeutGererDroits()) {
    actions.push({
      key: 'droits', label: mt('gestion_droits'), icon: MES_DROITS_ICON,
      onClick: () => { window.location.href = '/modules/droits/index.html?module=CARE'; },
    });
  }
  window.oasisModuleActions(actions);
  // La liste déroulante nomme déjà l'instance : la mention ne sert qu'aux
  // comptes qui n'en changent pas.
  if (typeof window.oasisModuleMention === 'function') {
    window.oasisModuleMention(instances.disponible ? '' : (instances.locale || ''));
  }
}

declare global {
  interface Window {
    /** Redessiner la barre — au démarrage, et au changement de langue. */
    mesDessinerActions: typeof mesDessinerActions;
  }
}

window.mesDessinerActions = mesDessinerActions;
