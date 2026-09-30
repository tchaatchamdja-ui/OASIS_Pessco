// Authentification à deux facteurs — le réglage que rien n'éprouvait.
//
// La fiche technique l'exige en production (SEC-12), le démarrage refuse de se
// taire quand elle manque, et **aucun des 767 contrôles ne la traversait** : elle
// est désactivée dans la configuration d'essai, et personne n'avait posé
// `OASIS_MFA=1`.
//
// Le manque s'est vu en cherchant la prochaine collection à basculer :
// `mfa_challenges` était la plus isolée du socle — un seul fichier — mais la
// convertir sans filet n'aurait rien appris. D'où cette suite, écrite d'abord.
//
// ── Ce qui peut s'éprouver, et ce qui ne peut pas ──
//
// Le code à usage unique n'est pas récupérable, et c'est voulu : il part par
// courriel, et le registre des envois retire le corps des messages à secret
// (SEC-11). **Aucun contrôle ne peut donc réussir une ouverture de session à deux
// facteurs.** Ce sont les refus qui s'éprouvent — et ce sont eux qui comptent :
// un code faux, un défi expiré, un plafond de tentatives, et surtout le plafond
// **sous des essais parallèles**, qui est ce qu'une force brute tenterait.
const { demarrer, verifier, bilan } = require('./harness');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';

module.exports = async function mfaSmoke(port) {
  console.log('\n── Authentification à deux facteurs ──');
  // `OASIS_MFA=1` force le réglage depuis l'environnement : c'est ce que fait un
  // hébergement, dont le fichier de configuration est cuit dans l'image.
  const srv = await demarrer({ port, env: { OASIS_MFA: '1' } });
  try {
    // ── Le mot de passe seul n'ouvre plus de session ──
    const juste = await srv.appel('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: IDENTIFIANT, password: MOT_DE_PASSE }),
    });
    verifier('un mot de passe juste ne donne plus qu’un défi',
      juste.statut === 200 && juste.corps.mfaRequired === true && !!juste.corps.challengeId,
      JSON.stringify(juste.corps).slice(0, 140));
    // L'identifiant du défi est hexadécimal sur 48 caractères : il contient
    // souvent six chiffres de suite, et c'est lui que la recherche d'un code
    // attrapait au premier essai. Il est donc retiré avant de chercher.
    const sansDefi = JSON.stringify({ ...juste.corps, challengeId: undefined });
    verifier('le défi ne porte ni le code ni la cible en clair',
      !/\d{6}/.test(sansDefi) && !sansDefi.includes(IDENTIFIANT), sansDefi.slice(0, 160));
    verifier('la cible est masquée, pour que l’agent sache où regarder',
      typeof juste.corps.masked === 'string' && juste.corps.masked.includes('•'),
      String(juste.corps.masked));

    // Aucune session : les routes protégées restent fermées.
    verifier('aucune session n’est ouverte avant le second facteur',
      (await srv.appel('/api/me')).statut === 401);

    const defi = juste.corps.challengeId;

    // ── Un code faux est refusé, et le reste décompté ──
    const faux = await srv.appel('/api/login/mfa', {
      method: 'POST', body: JSON.stringify({ challengeId: defi, code: '000000' }),
    });
    verifier('un code faux est refusé',
      faux.statut >= 400 && faux.corps.error === 'mfa_invalid_code', JSON.stringify(faux.corps));
    verifier('le refus dit combien d’essais restent',
      faux.corps.remaining === 4, JSON.stringify(faux.corps));

    // ── Un défi inconnu ne dit pas qu'il est inconnu par autre chose ──
    const inconnu = await srv.appel('/api/login/mfa', {
      method: 'POST', body: JSON.stringify({ challengeId: 'inexistant', code: '000000' }),
    });
    verifier('un défi inconnu est traité comme expiré',
      inconnu.corps.error === 'mfa_expired', JSON.stringify(inconnu.corps));

    // ── Le plafond de tentatives ──
    for (let i = 0; i < 4; i++) {
      await srv.appel('/api/login/mfa', {
        method: 'POST', body: JSON.stringify({ challengeId: defi, code: '111111' }),
      });
    }
    const trop = await srv.appel('/api/login/mfa', {
      method: 'POST', body: JSON.stringify({ challengeId: defi, code: '111111' }),
    });
    verifier('après cinq essais, le défi est consommé',
      ['mfa_too_many_attempts', 'mfa_expired'].includes(trop.corps.error), JSON.stringify(trop.corps));

    // ── Le plafond sous une rafale ──
    //
    // Dix codes faux d'un coup. **Ce contrôle ne prouve pas l'atomicité du
    // compteur**, et il faut le dire : deux requêtes HTTP ne se chevauchent côté
    // serveur que si chaque traitement dure assez longtemps, et ici il dure une
    // milliseconde. Mesuré : dix requêtes vers un gestionnaire retardé de 30 ms
    // se chevauchent bien à dix, mais vers celui-ci elles s'enchaînent.
    //
    // Ce qu'il prouve, et qui vaut d'être gardé : une rafale n'ouvre pas de
    // session, n'épuise pas le plafond de travers, et le défi finit hors
    // d'usage. L'atomicité du compteur, elle, est éprouvée en processus par la
    // suite « unitaires », où le croisement peut être forcé.
    const second = await srv.appel('/api/login', {
      method: 'POST', body: JSON.stringify({ username: IDENTIFIANT, password: MOT_DE_PASSE }),
    });
    const defi2 = second.corps.challengeId;
    const essais = await Promise.all(Array.from({ length: 10 }, () => srv.appel('/api/login/mfa', {
      method: 'POST', body: JSON.stringify({ challengeId: defi2, code: '222222' }),
    })));
    const restes = essais.map((r) => r.corps.remaining).filter((v) => v !== undefined);
    verifier('une rafale de dix essais décompte chaque essai',
      new Set(restes).size === restes.length,
      `restes annoncés : ${JSON.stringify(restes)}`);
    const apres = await srv.appel('/api/login/mfa', {
      method: 'POST', body: JSON.stringify({ challengeId: defi2, code: '333333' }),
    });
    verifier('une rafale de dix essais épuise bien le plafond',
      ['mfa_too_many_attempts', 'mfa_expired'].includes(apres.corps.error),
      JSON.stringify(apres.corps));

    // ── Le journal retient tout cela ──
    // Il n'est lisible que d'une session ouverte : on en ouvre une sans le second
    // facteur, ce que seul un second serveur permet. À défaut, la trace du
    // journal est éprouvée par la suite « socle », où la MFA est éteinte. Ici, on
    // vérifie que l'application n'a pas ouvert de session malgré tout.
    verifier('aucun essai n’a ouvert de session',
      (await srv.appel('/api/me')).statut === 401);
  } finally {
    srv.arreter();
  }
  return bilan('MFA');
};
