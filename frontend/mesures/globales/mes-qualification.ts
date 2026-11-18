// OASIS — « Mesures d'Application » (CARE) : l'étape « Qualification et
// Mesures », publiée pour la page (ADR-003, 5.c — n° 5.f.123).
//
// ── La surface, mesurée ──
//
// `mes-qualification.js` portait cinquante-six noms au premier niveau.
// **Quarante-neuf** étaient sur `window` — fonctions, et `const` que son
// `Object.assign` reposait. Sept n'y étaient pas, et l'un d'eux est appelé
// **par le balisage même du fichier** : `mesDatesSanction`, dans le `onchange`
// de la date de sanction. Un gestionnaire en ligne s'exécute dans la portée
// globale, qui voit les `const` d'un script classique ; il ne voit pas ceux
// d'un module. Le sas le pose donc — la recherche des lecteurs d'un nom doit
// inclure le fichier qui le déclare, ce que la première ne faisait pas.
//
// Les six autres — `mesNomVolet`, `MES_DECISIONS_RECOURS`,
// `mesRecoursModifier`, `mesQualRedessiner`, `mesBloc`, `mesChampBloc` — ne
// sont lus par personne : ils quittent la portée globale, et c'est la
// différence déclarée.
//
// Le sas pose les cinquante, un à un, depuis les quatre parties de l'étape. `mesActionsQualification` et
// `mesQualClose` quittent la frontière (`restant.d.ts`) : c'est lui qui les
// déclare désormais.
import {
  MES_QUAL_VOLETS, mesCollecterQualification, mesCollecterRecours, mesMajQualification,
  mesQualARecours, mesQualClose, mesQualification, mesQualModifiable, mesQualModifier,
  mesQualVolet,
} from '../qualification-commun';
import {
  mesBlocRecours, mesRecoursAjouterMembre, mesRecoursDecision, mesRecoursRetirerMembre,
  mesRecoursRetirerPiece, mesRecoursTeleverser, mesSectionRecours,
} from '../recours';
import {
  mesAjouterDuree, mesDatesSanction, mesQualAjouterMesure, mesQualCategorieMesure,
  mesQualDureeVersTerme, mesQualPorteeMesure, mesQualRetirerMesure, mesQualRetirerPiece,
  mesQualSuiviRequis, mesQualTeleverser, mesQualTermeVersDuree, mesQualVersionPrecedente,
  mesSectionMesuresArretees,
} from '../mesures-arretees';
import {
  mesActionsQualification, mesEnregistrerQualification, mesQualAjouterMembre,
  mesQualAjouterReunion, mesQualBasculerInfraction, mesQualBasculerNonInfraction,
  mesQualBasculerRenvoi, mesQualClasser, mesQualCloturer, mesQualCorps, mesQualIssue,
  mesQualOnglets, mesQualRenvoyer, mesQualRetirerMembre, mesQualRetirerReunion, mesQualSuivi,
  mesQualVoirVolet, mesSectionInstance, mesSectionQualification, mesSectionRapportInvestigation,
} from '../qualification';

declare global {
  interface Window {
    mesQualification?: typeof mesQualification;
    mesQualClose?: typeof mesQualClose;
    mesQualModifiable?: typeof mesQualModifiable;
    MES_QUAL_VOLETS?: typeof MES_QUAL_VOLETS;
    mesQualARecours?: typeof mesQualARecours;
    mesQualVolet?: typeof mesQualVolet;
    mesQualVoirVolet?: typeof mesQualVoirVolet;
    mesQualOnglets?: typeof mesQualOnglets;
    mesQualCorps?: typeof mesQualCorps;
    mesSectionRapportInvestigation?: typeof mesSectionRapportInvestigation;
    mesSectionInstance?: typeof mesSectionInstance;
    mesSectionQualification?: typeof mesSectionQualification;
    mesQualVersionPrecedente?: typeof mesQualVersionPrecedente;
    mesSectionMesuresArretees?: typeof mesSectionMesuresArretees;
    mesBlocRecours?: typeof mesBlocRecours;
    mesSectionRecours?: typeof mesSectionRecours;
    mesCollecterRecours?: typeof mesCollecterRecours;
    mesRecoursAjouterMembre?: typeof mesRecoursAjouterMembre;
    mesRecoursRetirerMembre?: typeof mesRecoursRetirerMembre;
    mesRecoursRetirerPiece?: typeof mesRecoursRetirerPiece;
    mesRecoursDecision?: typeof mesRecoursDecision;
    mesRecoursTeleverser?: typeof mesRecoursTeleverser;
    mesCollecterQualification?: typeof mesCollecterQualification;
    mesMajQualification?: typeof mesMajQualification;
    mesQualModifier?: typeof mesQualModifier;
    mesQualAjouterMembre?: typeof mesQualAjouterMembre;
    mesQualRetirerMembre?: typeof mesQualRetirerMembre;
    mesQualAjouterReunion?: typeof mesQualAjouterReunion;
    mesQualRetirerReunion?: typeof mesQualRetirerReunion;
    mesQualAjouterMesure?: typeof mesQualAjouterMesure;
    mesAjouterDuree?: typeof mesAjouterDuree;
    mesQualDureeVersTerme?: typeof mesQualDureeVersTerme;
    mesDatesSanction?: typeof mesDatesSanction;
    mesQualTermeVersDuree?: typeof mesQualTermeVersDuree;
    mesQualPorteeMesure?: typeof mesQualPorteeMesure;
    mesQualSuiviRequis?: typeof mesQualSuiviRequis;
    mesQualRetirerMesure?: typeof mesQualRetirerMesure;
    mesQualRetirerPiece?: typeof mesQualRetirerPiece;
    mesQualBasculerInfraction?: typeof mesQualBasculerInfraction;
    mesQualBasculerNonInfraction?: typeof mesQualBasculerNonInfraction;
    mesQualBasculerRenvoi?: typeof mesQualBasculerRenvoi;
    mesQualCategorieMesure?: typeof mesQualCategorieMesure;
    mesQualTeleverser?: typeof mesQualTeleverser;
    mesActionsQualification?: typeof mesActionsQualification;
    mesQualIssue?: typeof mesQualIssue;
    mesQualRenvoyer?: typeof mesQualRenvoyer;
    mesQualClasser?: typeof mesQualClasser;
    mesQualSuivi?: typeof mesQualSuivi;
    mesQualCloturer?: typeof mesQualCloturer;
    mesEnregistrerQualification?: typeof mesEnregistrerQualification;
  }
}

window.mesQualification = mesQualification;
window.mesQualClose = mesQualClose;
window.mesQualModifiable = mesQualModifiable;
window.MES_QUAL_VOLETS = MES_QUAL_VOLETS;
window.mesQualARecours = mesQualARecours;
window.mesQualVolet = mesQualVolet;
window.mesQualVoirVolet = mesQualVoirVolet;
window.mesQualOnglets = mesQualOnglets;
window.mesQualCorps = mesQualCorps;
window.mesSectionRapportInvestigation = mesSectionRapportInvestigation;
window.mesSectionInstance = mesSectionInstance;
window.mesSectionQualification = mesSectionQualification;
window.mesQualVersionPrecedente = mesQualVersionPrecedente;
window.mesSectionMesuresArretees = mesSectionMesuresArretees;
window.mesBlocRecours = mesBlocRecours;
window.mesSectionRecours = mesSectionRecours;
window.mesCollecterRecours = mesCollecterRecours;
window.mesRecoursAjouterMembre = mesRecoursAjouterMembre;
window.mesRecoursRetirerMembre = mesRecoursRetirerMembre;
window.mesRecoursRetirerPiece = mesRecoursRetirerPiece;
window.mesRecoursDecision = mesRecoursDecision;
window.mesRecoursTeleverser = mesRecoursTeleverser;
window.mesCollecterQualification = mesCollecterQualification;
window.mesMajQualification = mesMajQualification;
window.mesQualModifier = mesQualModifier;
window.mesQualAjouterMembre = mesQualAjouterMembre;
window.mesQualRetirerMembre = mesQualRetirerMembre;
window.mesQualAjouterReunion = mesQualAjouterReunion;
window.mesQualRetirerReunion = mesQualRetirerReunion;
window.mesQualAjouterMesure = mesQualAjouterMesure;
window.mesAjouterDuree = mesAjouterDuree;
window.mesQualDureeVersTerme = mesQualDureeVersTerme;
window.mesDatesSanction = mesDatesSanction;
window.mesQualTermeVersDuree = mesQualTermeVersDuree;
window.mesQualPorteeMesure = mesQualPorteeMesure;
window.mesQualSuiviRequis = mesQualSuiviRequis;
window.mesQualRetirerMesure = mesQualRetirerMesure;
window.mesQualRetirerPiece = mesQualRetirerPiece;
window.mesQualBasculerInfraction = mesQualBasculerInfraction;
window.mesQualBasculerNonInfraction = mesQualBasculerNonInfraction;
window.mesQualBasculerRenvoi = mesQualBasculerRenvoi;
window.mesQualCategorieMesure = mesQualCategorieMesure;
window.mesQualTeleverser = mesQualTeleverser;
window.mesActionsQualification = mesActionsQualification;
window.mesQualIssue = mesQualIssue;
window.mesQualRenvoyer = mesQualRenvoyer;
window.mesQualClasser = mesQualClasser;
window.mesQualSuivi = mesQualSuivi;
window.mesQualCloturer = mesQualCloturer;
window.mesEnregistrerQualification = mesEnregistrerQualification;
