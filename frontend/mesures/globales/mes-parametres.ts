// OASIS — « Mesures d'Application » (CARE) : l'écran « Paramètres », publié
// pour la page (ADR-003, 5.c — n° 5.f.118).
//
// ── La surface, mesurée ──
//
// `mes-parametres.js` posait dix-sept fonctions sur `window`, par un
// `Object.assign` final. Une seule est lue hors du fichier : `mesRenderParametres`,
// par l'aiguillage de `mes-app.js`. Quinze le sont par les `onclick` de son
// propre balisage — la page, ses sous-menus, ses quatre fenêtres. La dernière,
// `mesAfficherModal`, n'est lue par personne : le fichier l'appelle lui-même.
//
// Le sas les pose **toutes**, une à une — un `Object.assign` ne vérifierait
// aucun type. Retirer un nom n'est pas l'objet d'une conversion, et la
// photographie de la page le vérifie : même surface avant et après.
import {
  mesAfficherModal, mesBasculerBarreParam, mesEnregistrerCategorie, mesEnregistrerComite,
  mesEnregistrerType, mesEnregistrerTypeInvestigation, mesFermerModal, mesOuvrirCategorie,
  mesOuvrirComite, mesOuvrirType, mesOuvrirTypeInvestigation, mesParamSousMenu,
  mesRenderParametres, mesSupprimerCategorie, mesSupprimerComite, mesSupprimerType,
  mesSupprimerTypeInvestigation,
} from '../parametres';

declare global {
  interface Window {
    /** La page des Paramètres — lue par l'aiguillage de `mes-app.js`. */
    mesRenderParametres?: typeof mesRenderParametres;
    mesParamSousMenu?: typeof mesParamSousMenu;
    mesBasculerBarreParam?: typeof mesBasculerBarreParam;
    mesAfficherModal?: typeof mesAfficherModal;
    mesFermerModal?: typeof mesFermerModal;
    mesOuvrirCategorie?: typeof mesOuvrirCategorie;
    mesOuvrirType?: typeof mesOuvrirType;
    mesEnregistrerCategorie?: typeof mesEnregistrerCategorie;
    mesEnregistrerType?: typeof mesEnregistrerType;
    mesSupprimerCategorie?: typeof mesSupprimerCategorie;
    mesSupprimerType?: typeof mesSupprimerType;
    mesOuvrirTypeInvestigation?: typeof mesOuvrirTypeInvestigation;
    mesEnregistrerTypeInvestigation?: typeof mesEnregistrerTypeInvestigation;
    mesSupprimerTypeInvestigation?: typeof mesSupprimerTypeInvestigation;
    mesOuvrirComite?: typeof mesOuvrirComite;
    mesEnregistrerComite?: typeof mesEnregistrerComite;
    mesSupprimerComite?: typeof mesSupprimerComite;
  }
}

window.mesRenderParametres = mesRenderParametres;
window.mesParamSousMenu = mesParamSousMenu;
window.mesBasculerBarreParam = mesBasculerBarreParam;
window.mesAfficherModal = mesAfficherModal;
window.mesFermerModal = mesFermerModal;
window.mesOuvrirCategorie = mesOuvrirCategorie;
window.mesOuvrirType = mesOuvrirType;
window.mesEnregistrerCategorie = mesEnregistrerCategorie;
window.mesEnregistrerType = mesEnregistrerType;
window.mesSupprimerCategorie = mesSupprimerCategorie;
window.mesSupprimerType = mesSupprimerType;
window.mesOuvrirTypeInvestigation = mesOuvrirTypeInvestigation;
window.mesEnregistrerTypeInvestigation = mesEnregistrerTypeInvestigation;
window.mesSupprimerTypeInvestigation = mesSupprimerTypeInvestigation;
window.mesOuvrirComite = mesOuvrirComite;
window.mesEnregistrerComite = mesEnregistrerComite;
window.mesSupprimerComite = mesSupprimerComite;
