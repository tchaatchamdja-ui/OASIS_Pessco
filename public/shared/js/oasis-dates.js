/**
 * OASIS — les deux règles communes aux dates des formulaires.
 *
 *   1. une date de début tombe dans l'année déclarée par le formulaire ;
 *   2. une date de fin ne précède jamais la date de début.
 *
 * Chaque module posait ses propres contrôles, ou n'en posait aucun : un même
 * couple de dates s'y saisissait à l'envers sans que rien ne le dise. Les deux
 * règles se tiennent ici, et chaque formulaire les branche de la même façon :
 *
 *   oasisDatesLier({ annee: 'planAnnee', debut: 'actDebut', fin: 'actFin' });
 *
 * `annee` est facultatif ; il accepte l'identifiant d'un champ ou l'année
 * elle-même — l'activité d'un plan tient l'année de son plan, non d'un champ.
 * Sans année, seule la seconde règle s'applique. `debut` l'est aussi : un
 * formulaire qui n'a qu'une échéance rattachée à une année garde la première.
 * Chaque clé accepte également un élément, pour les champs sans identifiant.
 *
 * `oasisDatesLier` pose les bornes des champs — le calendrier n'ouvre alors
 * que sur ce qui est acceptable — et les tient à jour. La saisie au clavier
 * passant outre, l'enregistrement appelle :
 *
 *   if (!oasisDatesValider({ annee: …, debut: …, fin: … })) return;
 *
 * qui rend `false` après avoir dit la règle par le panneau flottant et mis en
 * rouge les champs qu'elle concerne. La marque tient jusqu'à correction.
 */
(function () {
  const CLASSE = 'oasis-champ-invalide';

  const MESSAGES = {
    fr: {
      annee: (a) => `La date de début doit être dans l’année ${a}.`,
      ordre: 'La date de fin doit être postérieure ou égale à la date de début.',
    },
    en: {
      annee: (a) => `The start date must fall within ${a}.`,
      ordre: 'The end date must be on or after the start date.',
    },
    pt: {
      annee: (a) => `A data de inicio deve estar no ano ${a}.`,
      ordre: 'A data de fim deve ser igual ou posterior a data de inicio.',
    },
  };

  const langue = () => {
    const l = (window.CURRENT_LANG || localStorage.getItem('pr_lang') || 'fr').slice(0, 2);
    return MESSAGES[l] ? l : 'fr';
  };

  const elem = (x) => {
    if (!x) return null;
    if (typeof x === 'string') return document.getElementById(x);
    return x.nodeType === 1 ? x : null;
  };
  const valeur = (x) => { const e = elem(x); return e ? String(e.value || '').trim() : ''; };

  // L'année vient d'un champ, ou du formulaire lui-même quand elle n'y est pas
  // saisie — l'activité d'un plan, la constatation d'une inspection.
  const annee = (a) => {
    if (a === undefined || a === null || a === '') return '';
    const e = elem(a);
    if (e) return String(e.value || '').trim();
    return /^\d{4}$/.test(String(a).trim()) ? String(a).trim() : '';
  };

  // Rend le message à dire et les champs qu'il désigne, ou un message vide si
  // les dates se tiennent.
  function oasisDatesControler(config) {
    const c = config || {};
    const m = MESSAGES[langue()];
    const an = annee(c.annee);
    const debut = valeur(c.debut);
    const fin = valeur(c.fin);
    if (debut && an && debut.slice(0, 4) !== an) {
      return { message: m.annee(an), champs: [elem(c.annee), elem(c.debut)] };
    }
    if (debut && fin && fin < debut) {
      return { message: m.ordre, champs: [elem(c.debut), elem(c.fin)] };
    }
    // Sans date de début, une échéance seule se rattache tout de même à
    // l'année déclarée : c'est la première règle, sur l'autre bout du couple.
    if (!debut && fin && an && fin.slice(0, 4) !== an && c.finDansAnnee) {
      return { message: m.annee(an), champs: [elem(c.annee), elem(c.fin)] };
    }
    return { message: '', champs: [] };
  }

  function marquer(config, champs) {
    const c = config || {};
    [elem(c.annee), elem(c.debut), elem(c.fin)].forEach((e) => {
      if (e && e.classList) e.classList.toggle(CLASSE, champs.indexOf(e) !== -1);
    });
  }

  // Bornes portées par les champs eux-mêmes : le calendrier du début n'ouvre
  // que sur l'année déclarée, celui de la fin ne remonte pas avant le début.
  function oasisDatesBorner(config) {
    const c = config || {};
    const an = annee(c.annee);
    const debut = elem(c.debut);
    const fin = elem(c.fin);
    const bornee = /^\d{4}$/.test(an);
    if (debut) {
      debut.min = bornee ? `${an}-01-01` : '';
      debut.max = bornee ? `${an}-12-31` : '';
    }
    if (fin) fin.min = (debut && debut.value) || '';
    // La marque suit la correction : elle s'efface dès que les règles sont
    // tenues, et ne s'allume pas d'elle-même en cours de saisie — on ne
    // signale pas une faute à qui est encore en train d'écrire.
    const marque = [elem(c.annee), elem(c.debut), elem(c.fin)]
      .some((e) => e && e.classList && e.classList.contains(CLASSE));
    if (!marque) return;
    marquer(c, oasisDatesControler(c).champs);
  }

  // Branchement d'un formulaire : les bornes se posent tout de suite, puis à
  // chaque changement de l'année ou du début.
  function oasisDatesLier(config) {
    const c = config || {};
    const suivre = (x, evenement) => {
      const e = elem(x);
      if (!e || e.dataset.oasisDates === evenement) return;
      e.dataset.oasisDates = evenement;
      e.addEventListener(evenement, () => oasisDatesBorner(c));
    };
    suivre(c.annee, 'input');
    suivre(c.debut, 'change');
    suivre(c.fin, 'change');
    oasisDatesBorner(c);
  }

  // Contrôle à l'enregistrement. Rend `true` si les dates se tiennent ; sinon
  // dit la règle, marque les champs, y pose le curseur et rend `false`.
  function oasisDatesValider(config) {
    const c = config || {};
    const ctrl = oasisDatesControler(c);
    marquer(c, ctrl.champs);
    if (!ctrl.message) return true;
    if (typeof window.oasisToast === 'function') window.oasisToast(ctrl.message, 'warning');
    const dernier = ctrl.champs[ctrl.champs.length - 1];
    if (dernier && dernier.focus) dernier.focus();
    return false;
  }

  window.oasisDatesControler = oasisDatesControler;
  window.oasisDatesBorner = oasisDatesBorner;
  window.oasisDatesLier = oasisDatesLier;
  window.oasisDatesValider = oasisDatesValider;
}());
