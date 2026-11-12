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
// ── `oasisTelecharger` n'est plus publié ici, et pourquoi ──
//
// Les six noms qui restent sont la surface héritée de PESSCO : `api`, `ICONS`,
// `escapeHtml`, `formatDate`, `showToast`, `_pesSearchInput`. Trois écrans
// seulement chargent ce fichier, les trois qui s'en servent encore.
//
// `oasisTelecharger` n'en est pas : son nom porte le préfixe du socle, et
// **cinq gestes de SURV l'appellent** — un écran qui ne charge pas ce
// fichier-ci. Ils levaient « oasisTelecharger is not defined », et rien ne
// partait : l'export d'une checklist, celui de ses sous-thèmes, celui d'une
// checklist renseignée, et les deux téléchargements d'une constatation.
//
// Le charger dans SURV aurait réglé le symptôme en y posant `api` et
// `_pesSearchInput`, que le module redéfinit — un nom global déclaré deux fois
// sur le même écran, que le garde-fou de taille refuse à bon droit. Le nom
// rejoint donc `oasis-commun`, que **toute page qui charge celui-ci charge
// déjà**, et trois autres avec. *Un outil du socle vit dans le fichier que ses
// appelants chargent, non dans celui où l'histoire l'avait laissé.*
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
