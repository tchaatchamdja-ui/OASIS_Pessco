// OASIS — Les règles de dates, publiées en globales (ADR-003, 5.b).
//
// Sas de cohabitation : six noms, ceux que les formulaires appellent. Les noms
// de la source sont plus courts — `controler`, `borner`, `lier`, `valider` — et
// le préfixe `oasisDates` est rendu ici. Il servait à éviter les collisions dans
// une portée unique ; un module n'en a plus besoin, mais les six écrans qui
// appellent ces fonctions, si.
import {
  borner, controler, horodatage, jour, lier, valider,
} from '../dates';
import type { ConfigDates, Controle } from '../dates';

declare global {
  interface Window {
    oasisJour: (d?: Date) => string;
    oasisHorodatage: (d?: Date) => string;
    oasisDatesControler: (config?: ConfigDates) => Controle;
    oasisDatesBorner: (config?: ConfigDates) => void;
    oasisDatesLier: (config?: ConfigDates) => void;
    oasisDatesValider: (config?: ConfigDates) => boolean;
  }
}

window.oasisJour = jour;
window.oasisHorodatage = horodatage;
window.oasisDatesControler = controler;
window.oasisDatesBorner = borner;
window.oasisDatesLier = lier;
window.oasisDatesValider = valider;
