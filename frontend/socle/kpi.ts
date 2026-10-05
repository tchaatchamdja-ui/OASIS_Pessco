// OASIS — Cartes d'indicateurs, socle commun aux tableaux de bord. En TypeScript
// (ADR-003, 5.b).
//
// Une carte porte son intitulé en tête, la mesure à gauche, et à droite une
// petite figure qui dit de quoi il s'agit : une jauge pour un taux, un
// calendrier pour un horizon, une échelle pour une gravité. Tout est en SVG,
// sans rien à charger, et prend la couleur de la carte.
//
// Les corps des figures et des deux constructeurs sont **repris au caractère
// près** du fichier d'origine, indentation comprise. Le typage passe par
// l'interface `Figures`, qui donne leur type aux paramètres sans qu'on touche
// aux corps.
//
// L'indentation n'est pas une coquetterie : ces corps sont des gabarits
// multilignes, et **l'espace de début de ligne fait partie de la chaîne
// produite**. Une première écriture les avait désindentés de deux espaces pour
// les mettre au premier niveau — 21 sondes sur 28 ont signalé la différence. Le
// code est donc indenté d'un niveau de trop ; les chaînes sont identiques, et
// c'est ce qui compte.
//
// Ce fichier ne touche pas à `window` : voir `globales/oasis-kpi.ts`.

const esc = (v: unknown): string => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const borne = (v: unknown): number => Math.max(0, Math.min(100, Number(v) || 0));

/** Les libellés d'une figure qui en porte. Tous facultatifs : chacun a son secours. */
export interface LibellesFigure {
  pastille?: string;
  legende?: string;
  min?: string;
  max?: string;
}

export interface Figures {
  jauge(pct: unknown): string;
  retard(libelles?: LibellesFigure): string;
  calendrier(moisEnAvant?: unknown): string;
  cloture(pct: unknown): string;
  echelle(position?: unknown, libelles?: LibellesFigure): string;
  barres(valeurs?: readonly unknown[]): string;
  etapes(liste?: readonly unknown[], actif?: number): string;
}

// ── Figures ──
export const FIGURES: Figures = {
    // Anneau de progression, coche au centre : un taux atteint.
    jauge(pct) {
      const r = 15;
      const c = 2 * Math.PI * r;
      const p = borne(pct);
      return `<svg viewBox="0 0 40 40" class="oasis-kpi-fig">
        <circle cx="20" cy="20" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="5"/>
        <circle cx="20" cy="20" r="${r}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"
                stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p / 100)).toFixed(1)}"
                transform="rotate(-90 20 20)"/>
        <path d="M14.5 20.5l4 4 7-8" fill="none" stroke="currentColor" stroke-width="2.4"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    },

    // Échéance franchie : la pastille et le repère de départ dépassé.
    retard(libelles) {
      const l = libelles || {};
      return `<div class="oasis-kpi-fig-retard">
        <span class="oasis-kpi-pastille">${esc(l.pastille || 'Dépassé')}</span>
        <svg viewBox="0 0 64 20" class="oasis-kpi-fig-ligne">
          <line x1="4" y1="10" x2="52" y2="10" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/>
          <path d="M50 5l8 5-8 5z" fill="currentColor"/>
          <circle cx="14" cy="10" r="3.5" fill="currentColor"/>
        </svg>
        <span class="oasis-kpi-fig-legende">${esc(l.legende || 'Début')}</span>
      </div>`;
    },

    // Horizon : les premiers mois se détachent des suivants.
    calendrier(moisEnAvant) {
      const n = Number(moisEnAvant) || 3;
      const cases = [...Array(12)].map((_, i) => {
        const x = 6 + (i % 4) * 8;
        const y = 15 + Math.floor(i / 4) * 7;
        return `<rect x="${x}" y="${y}" width="5.5" height="4.5" rx="1" fill="currentColor"
                      fill-opacity="${i < n ? '.85' : '.22'}"/>`;
      }).join('');
      return `<svg viewBox="0 0 40 40" class="oasis-kpi-fig">
        <rect x="3" y="7" width="34" height="29" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="3" y1="14" x2="37" y2="14" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="28" y1="3" x2="28" y2="9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        ${cases}
      </svg>`;
    },

    // Traitement mené à son terme : la clé et la part close.
    cloture(pct) {
      const p = borne(pct);
      return `<svg viewBox="0 0 46 40" class="oasis-kpi-fig oasis-kpi-fig-large">
        <path d="M27 6a8 8 0 0 0-10.6 10.6L6 27l5 5 10.4-10.4A8 8 0 0 0 32 11l-4.5 4.5-3-3L29 8z"
              fill="currentColor" fill-opacity=".9"/>
        <rect x="4" y="34" width="38" height="4" rx="2" fill="currentColor" fill-opacity=".18"/>
        <rect x="4" y="34" width="${(38 * p / 100).toFixed(1)}" height="4" rx="2" fill="currentColor"/>
      </svg>`;
    },

    // Échelle de gravité, curseur placé sur la position voulue (0 à 100).
    echelle(position, libelles) {
      const l = libelles || {};
      const p = borne(position === undefined ? 90 : position);
      const x = 2 + (64 * p / 100);
      const id = `oasisKpiGrad${Math.random().toString(36).slice(2, 8)}`;
      return `<div class="oasis-kpi-fig-echelle">
        <svg viewBox="0 0 72 14" class="oasis-kpi-fig-barre">
          <defs><linearGradient id="${id}" x1="0" x2="1">
            <stop offset="0" stop-color="#22c55e"/><stop offset=".5" stop-color="#f59e0b"/>
            <stop offset="1" stop-color="#dc2626"/>
          </linearGradient></defs>
          <rect x="0" y="4" width="72" height="6" rx="3" fill="url(#${id})"/>
          <path d="M${x.toFixed(1)} 1l4 6-4 6z" fill="#7f1d1d"/>
        </svg>
        <div class="oasis-kpi-fig-bornes"><span>${esc(l.min || 'Faible')}</span><span>${esc(l.max || 'Élevé')}</span></div>
      </div>`;
    },

    // Répartition en volume : quelques barres, la plus haute mise en avant.
    barres(valeurs) {
      const v = (valeurs || []).slice(0, 5).map((x) => Math.max(0, Number(x) || 0));
      if (!v.length) return '';
      // Une seule mesure ne fait pas un histogramme : on complète pour que la
      // figure garde sa forme au lieu de s'étaler en aplat.
      while (v.length < 3) v.push(0);
      const max = Math.max(...v, 1);
      const l = 44 / v.length;
      return `<svg viewBox="0 0 48 40" class="oasis-kpi-fig">
        ${v.map((x, i) => {
          const h = Math.max(3, (x / max) * 30);
          return `<rect x="${(2 + i * l).toFixed(1)}" y="${(34 - h).toFixed(1)}"
                        width="${(l - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5"
                        fill="currentColor" fill-opacity="${x === max ? '.9' : '.35'}"/>`;
        }).join('')}
        <line x1="2" y1="35" x2="46" y2="35" stroke="currentColor" stroke-opacity=".3" stroke-width="1.5"/>
      </svg>`;
    },

    // Suite d'états, celui en cours mis en évidence.
    etapes(liste, actif) {
      return `<div class="oasis-kpi-fig-etapes">${(liste || []).map((e, i) => `
        <span class="oasis-kpi-etape${i === actif ? ' actif' : ''}">${esc(e)}</span>`).join('')}</div>`;
    },
};

/**
 * La figure d'une carte. `type` choisit le dessin ; les autres champs sont ceux
 * que ce dessin lit. `svg` permet d'en fournir un tout fait.
 */
export interface FigureCarte extends LibellesFigure {
  type?: 'jauge' | 'retard' | 'calendrier' | 'cloture' | 'echelle' | 'etapes' | 'barres';
  pct?: unknown;
  mois?: unknown;
  position?: unknown;
  liste?: readonly unknown[];
  actif?: number;
  valeurs?: readonly unknown[];
  svg?: string;
}

/**
 * Une carte d'indicateur.
 *
 * `onClick` rend la carte cliquable : elle sert alors de filtre, et `actif`
 * marque celle qui commande l'affichage en cours.
 */
export interface OptionsCarte {
  titre?: string;
  valeur?: unknown;
  precision?: string;
  couleur?: string;
  figure?: FigureCarte;
  alerte?: boolean;
  onClick?: string;
  actif?: boolean;
}

export function carte(o?: OptionsCarte): string {
    const c = o || {};
    const f = c.figure || {};
    let visuel = '';
    if (f.type === 'jauge') visuel = FIGURES.jauge(f.pct);
    else if (f.type === 'retard') visuel = FIGURES.retard(f);
    else if (f.type === 'calendrier') visuel = FIGURES.calendrier(f.mois);
    else if (f.type === 'cloture') visuel = FIGURES.cloture(f.pct);
    else if (f.type === 'echelle') visuel = FIGURES.echelle(f.position, f);
    else if (f.type === 'etapes') visuel = FIGURES.etapes(f.liste, f.actif);
    else if (f.type === 'barres') visuel = FIGURES.barres(f.valeurs);
    else if (f.svg) visuel = f.svg;

    const classes = ['oasis-kpi-card', c.alerte ? 'alerte' : '',
      c.onClick ? 'cliquable' : '', c.actif ? 'actif' : ''].filter(Boolean).join(' ');
    const action = c.onClick ? ` onclick="${esc(c.onClick)}" role="button" tabindex="0"` : '';
    return `
    <div class="${classes}"${action} style="--kpi-color:${c.couleur || 'var(--primary)'}">
      <div class="oasis-kpi-tete">${esc(c.titre || '')}</div>
      <div class="oasis-kpi-corps">
        <div class="oasis-kpi-mesure">
          <div class="oasis-kpi-value">${esc(c.valeur == null ? '-' : c.valeur)}</div>
          ${c.precision ? `<div class="oasis-kpi-sub">${esc(c.precision)}</div>` : ''}
        </div>
        ${visuel ? `<div class="oasis-kpi-visuel">${visuel}</div>` : ''}
      </div>
    </div>`;
  }
// Groupe titré de cartes : `oasisKpiGroupe('Activités', [carte, carte…])`.
export function groupe(titre?: string, cartes?: readonly string[]): string {
    return `
    <section class="oasis-kpi-groupe">
      ${titre ? `<h3>${esc(titre)}</h3>` : ''}
      <div class="oasis-kpi-grid">${(cartes || []).join('')}</div>
    </section>`;
  }
