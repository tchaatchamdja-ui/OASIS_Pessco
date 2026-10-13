// OASIS — Les quatre aides du portail (ADR-003, 5.e.4).
//
// **Dernière pièce d'`app.js`**, et avec elle `public/js/` disparaît : le portail
// est entièrement en TypeScript.
//
// Quatre fonctions, lues par presque tous les modules convertis :
// `escArg` (l'argument d'un `onclick`), `fmtDate` (la date et l'heure dans la
// langue de l'écran), `reglesMotDePasse` (les règles non tenues, mises en
// phrase) et `loadRefs` (le rechargement des référentiels).
//
// ── Trois noms qui ne sont pas convertis, mais **retirés** ──
//
// `app.js` définissait aussi `api`, `esc` et `showToast`, et les trois étaient des
// **doublons** de ceux du socle :
//
//   · `esc(s)` était `oasisEsc(s)` — exactement la fonction du socle, qu'il
//     écrasait sur `window` en se chargeant après lui ;
//   · `showToast` était **le même code**, à la ligne près : le test de
//     `window.oasisToast` puis la délégation ;
//   · `api` ajoutait l'en-tête `X-OASIS-Request` et ramenait à la connexion sur
//     401. Les deux gestes sont ailleurs depuis longtemps : l'enveloppe du socle
//     pose cet en-tête sur **tout** appel vers l'application — contre-essayé en
//     5.c, où le retirer d'`app.js` ne changeait rien — et le retour à la
//     connexion est `sessionPerdue`.
//
// `window.api` et `window.showToast` portaient donc deux fonctions, ce que le
// garde-fou « aucune page ne charge deux définitions du même nom global » nommait
// depuis le 8 octobre 2026 — trouvé **par le compilateur**, en déclarant la
// seconde, et par aucun contrôle. Les trois disparaissent, et les deux noms ne
// portent plus qu'une fonction.
//
// ── Une duplication nommée, et non corrigée ici ──
//
// `escArg` n'a **aucun lecteur** : `exigences.ts` et `instances.ts` en portent
// chacun une copie privée, `argEchappe`, et leurs commentaires disent d'où elle
// vient — « `escArg` d'`app.js`, repris ». Trois exemplaires du même calcul.
//
// Les réunir est une amélioration, donc un changement, donc pas ici : six étapes
// se sont interdit de changer en convertissant. Mais la copie n'a plus d'excuse —
// l'original était hors d'atteinte, celui-ci s'importe — et c'est écrit pour que
// le jour où quelqu'un l'aperçoive, il sache que ce n'est pas un oubli.
import { escapeHtml } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { tSouple } from './traductions';

// Aucun des quatre — `escArg`, `loadRefs`, `fmtDate`, `reglesMotDePasse` — n'est
// plus publié sur `window` depuis la dépose du pont (5.e.5) : les neuf modules
// qui les appellent les importent d'ici, et aucun lecteur ne subsistait dans la
// page. La déclaration part avec la publication.

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

export function escArg(v: unknown): string {
  return escapeHtml(JSON.stringify(String(v ?? '')));
}

export function reglesMotDePasse(details?: unknown): string {
  return (Array.isArray(details) ? details : [])
    .map((d: unknown) => {
      if (typeof d === 'string') return d;
      const r = d as { regle?: string; n?: number };
      return tSouple(`mdp_regle_${String(r.regle)}`, r.n);
    })
    .join(', ');
}

export function fmtDate(iso: unknown): string {
  if (!iso) return '—';
  const d = new Date(String(iso));
  return `${d.toLocaleDateString(window.CURRENT_LANG)} ${d.toLocaleTimeString(window.CURRENT_LANG, { hour: '2-digit', minute: '2-digit' })}`;
}

export async function loadRefs(): Promise<void> {
  const res = await appel('/api/referentiels');
  window.REFS = await res.json() as Record<string, unknown[]>;
}
