// OASIS — Le champ de téléphone (ADR-003, 5.e.4).
//
// Vingt-cinq indicatifs, un sélecteur, et la recomposition du numéro. Lu par
// l'écran des comptes (5.e.1) et par le profil (5.e.2), qui l'empruntaient à
// `app.js` : ce sont les deux derniers prêts rendus.
//
// ── Pourquoi un module à lui seul ──
//
// `PHONE_CODES` et `DEFAULT_PHONE_CODE` étaient des `const` du premier niveau —
// donc des globales **lexicales** —, et les deux fonctions les lisent. C'est le
// même obstacle qu'aux six fois précédentes, et la septième fois qu'il décide d'un
// déplacement. La table et ses lecteurs partent ensemble ; les deux constantes
// restent privées, personne ne les lisant ailleurs.
import { escapeHtml } from '../socle/utils';

/** Un indicatif du catalogue : le code, et l'État qu'il désigne. */
export interface Indicatif {
  c: string;
  l: string;
}

// `phoneFieldHtml`, `phoneFieldValue` et `splitPhone` ne sont plus publiés sur
// `window` depuis la dépose du pont (5.e.5) : les deux écrans qui s'en servent
// les importent d'ici.

export const PHONE_CODES: readonly Indicatif[] = [
  { c: '+229', l: 'Bénin' }, { c: '+226', l: 'Burkina Faso' }, { c: '+225', l: "Côte d'Ivoire" },
  { c: '+245', l: 'Guinée-Bissau' }, { c: '+223', l: 'Mali' }, { c: '+227', l: 'Niger' },
  { c: '+221', l: 'Sénégal' }, { c: '+228', l: 'Togo' },
  { c: '+233', l: 'Ghana' }, { c: '+234', l: 'Nigéria' }, { c: '+237', l: 'Cameroun' },
  { c: '+235', l: 'Tchad' }, { c: '+241', l: 'Gabon' }, { c: '+242', l: 'Congo' },
  { c: '+243', l: 'RD Congo' }, { c: '+212', l: 'Maroc' }, { c: '+216', l: 'Tunisie' },
  { c: '+213', l: 'Algérie' }, { c: '+33', l: 'France' }, { c: '+32', l: 'Belgique' },
  { c: '+41', l: 'Suisse' }, { c: '+1', l: 'États-Unis / Canada' }, { c: '+44', l: 'Royaume-Uni' },
  { c: '+351', l: 'Portugal' }, { c: '+34', l: 'Espagne' },
];

export const DEFAULT_PHONE_CODE = '+229';

export function splitPhone(value: unknown): { code: string; number: string } {
  const v = String(value || '').trim();
  if (!v) return { code: DEFAULT_PHONE_CODE, number: '' };
  // ── Le plus long d'abord — et ce tri est **inatteignable** sur cette table ──
  //
  // La règle est juste : si deux indicatifs correspondaient, il faudrait prendre
  // le plus précis. Mais **aucun des vingt-cinq n'est préfixe d'un autre** :
  // `+22` n'y est pas, `+2` non plus, et `filter` ne rend donc jamais plus d'un
  // élément. Le tri ne décide de rien.
  //
  // J'avais d'abord écrit ici que c'était « la règle qu'on éprouve ». Deux
  // contre-essais — tri inversé, tri retiré — sont restés **verts** et m'ont
  // corrigé : *on ne peut pas prouver un tri que les données rendent sans objet.*
  //
  // Il est conservé, parce que le retirer serait changer le code en convertissant,
  // et parce que la règle redeviendra vraie le jour où un indicatif court
  // paraîtra. Ce jour-là, une garde de `scripts/comparer-outils.js` le dira :
  // elle vérifie qu'aucun indicatif n'est préfixe d'un autre, et refuse sinon —
  // pour qu'on écrive le régime au lieu de croire qu'il existe.
  //
  // Le tri porte sur une **copie** (`filter` en rend une), donc la table n'est pas
  // réordonnée — la leçon de 5.d.0, où un tri sur place réordonnait `REFS`.
  const match = PHONE_CODES
    .filter((p) => v.startsWith(p.c))
    .sort((a, b) => b.c.length - a.c.length)[0];
  if (match) return { code: match.c, number: v.slice(match.c.length).trim() };
  return { code: v.startsWith('+') ? '' : DEFAULT_PHONE_CODE, number: v };
}

export function phoneFieldHtml(id: string, value?: string, label?: string): string {
  const { code, number } = splitPhone(value);
  const opts = PHONE_CODES.map((p) =>
    `<option value="${p.c}" ${p.c === code ? 'selected' : ''}>${p.c} · ${escapeHtml(p.l)}</option>`).join('');
  return `<div class="shell-form-group">
    <label>${escapeHtml(label || 'Téléphone')}</label>
    <div class="phone-field">
      <select class="shell-input phone-code" id="${id}Code">${opts}</select>
      <input class="shell-input phone-number" id="${id}" type="tel" inputmode="tel"
             placeholder="97 00 00 00" value="${escapeHtml(number)}">
    </div>
  </div>`;
}

export function phoneFieldValue(id: string): string {
  // ── Le champ est **attendu**, le sélecteur **facultatif** ──
  //
  // L'original écrit `document.getElementById(id).value` : le champ absent y
  // lève, et on lève aussi, en nommant la cause (le choix tenu depuis 5.d.1).
  // Le sélecteur, lui, est testé par l'original — `codeEl ? … : ''` —, et
  // c'est voulu : une fenêtre peut poser le numéro sans l'indicatif.
  const champ = document.getElementById(id);
  if (!champ) throw new Error(`champ de téléphone introuvable : « ${id} »`);
  const num = ((champ as HTMLInputElement).value || '').trim();
  if (!num) return '';
  const codeEl = document.getElementById(`${id}Code`) as HTMLSelectElement | null;
  const code = codeEl ? codeEl.value : '';
  return (code ? `${code} ` : '') + num;
}
