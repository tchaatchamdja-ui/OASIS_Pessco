// OASIS — Les cartes d'indicateurs, publiées en globales (ADR-003, 5.b).
//
// Sas de cohabitation : trois noms, ceux que les cinq tableaux de bord
// appellent. `oasisKpiFigures` expose la table des dessins — un module s'en sert
// pour composer une carte à lui.
import { FIGURES, carte, groupe } from '../kpi';
import type { Figures, OptionsCarte } from '../kpi';

declare global {
  interface Window {
    oasisKpiCarte: (o?: OptionsCarte) => string;
    oasisKpiGroupe: (titre?: string, cartes?: readonly string[]) => string;
    oasisKpiFigures: Figures;
  }
}

window.oasisKpiCarte = carte;
window.oasisKpiGroupe = groupe;
window.oasisKpiFigures = FIGURES;
