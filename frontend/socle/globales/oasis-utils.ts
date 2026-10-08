// OASIS — Les utilitaires partagés, publiés en globales (ADR-003, 5.b).
//
// Sas de cohabitation. Cinq noms, **plus `ICONS`**, et c'est ce dernier qui
// retenait ce fichier pour la fin du chantier.
//
// ── `ICONS` : la globale lexicale, et pourquoi ce n'était pas un problème ──
//
// L'ancien fichier déclarait `const ICONS = {…}` au premier niveau d'un script
// classique : une liaison du **périmètre lexical global**, atteinte par son nom
// nu — et absente de `window`. C'est la cause exacte des deux défauts du
// 3 octobre (`window.dtPriv`, puis `window.ICONS` lu par la coquille DROITS).
//
// Une IIFE construite ne peut pas recréer cette liaison : un `const` à
// l'intérieur n'en sort pas. Mais la mesure a montré qu'il n'y avait rien à
// recréer — **une propriété de `window` est lisible comme identifiant nu**, même
// posée depuis une IIFE. Les ~90 lectures de `ICONS` nu dans douze fichiers
// continuent donc de fonctionner, et `window.ICONS` fonctionne enfin : le nom
// est désormais lisible des deux façons, ce que la déclaration de DROITS
// supposait à tort.
//
// Les noms publiés sont ceux que les écrans appellent, non ceux de la source :
// `_pesSearchInput` garde son tiret bas, `ICONS` son orthographe anglaise. Les
// renommer en passant serait une migration déguisée en conversion.
import {
  ICONES, api, escapeHtml, formatDate, pesSearchInput, showToast,
} from '../utils';

declare global {
  interface Window {
    ICONS: Readonly<Record<string, string>>;
    api: (chemin: string, options?: RequestInit) => Promise<unknown>;
    escapeHtml: (s: unknown) => string;
    formatDate: (d: string | number | Date | null | undefined) => string;
    showToast: (message: string, type?: string, duree?: number) => unknown;
    _pesSearchInput: (champ: HTMLInputElement, appliquer: () => void) => void;
  }
}

window.ICONS = ICONES;
window.api = api;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.showToast = showToast;
window._pesSearchInput = pesSearchInput;
