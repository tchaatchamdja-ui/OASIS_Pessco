// OASIS — L'heure des journaux d'audit, et la preuve qu'elle vaut quelque chose.
//
// La fiche technique URSAC/GT2 (§3.3) exige un « horodatage synchronisé sur un
// serveur de temps ». L'horloge du système ne suffit pas : un journal
// inaltérable dont les dates dérivent est inaltérable et faux à la fois, et
// rien dans la chaîne SHA-256 ne le dirait — elle scelle l'heure écrite, non
// l'heure vraie.
//
// ── Ce que ce module fait, et ce qu'il refuse de faire ──
//
// Il interroge un serveur de temps en SNTP (RFC 4330, l'UDP nu du port 123) et
// mesure l'écart avec l'horloge locale. Si l'écart dépasse le seuil, il le dit,
// fort, et le journal en garde la trace.
//
// Il ne corrige pas. Décaler en silence les dates d'un journal d'autorité
// serait pire que la dérive : on ne saurait plus si une entrée porte l'heure de
// l'horloge ou celle d'une correction, ni de quand date la correction. La
// synchronisation appartient au système d'exploitation — `chrony`, `ntpd`,
// `timesyncd`. Ce module la vérifie et en témoigne.
//
// Sans serveur déclaré, il le dit aussi : « non vérifiée » est un état honnête,
// « supposée juste » n'en est pas un.
const dgram = require('dgram');

// 1er janvier 1900 → 1er janvier 1970, en secondes. NTP compte depuis 1900.
const EPOQUE_NTP = 2208988800;
const PORT_NTP = 123;
const DELAI_MS = 3000;
const SEUIL_DEFAUT_S = 5;

// Une requête SNTP tient en 48 octets dont un seul compte : LI=0, VN=4, Mode=3.
function trame() {
  const t = Buffer.alloc(48);
  t[0] = 0x23;
  return t;
}

// Interroge un serveur et rend l'écart, en millisecondes, entre son heure et
// la nôtre. Positif : notre horloge retarde.
function interroger(serveur, delaiMs = DELAI_MS) {
  return new Promise((resoudre, rejeter) => {
    const prise = dgram.createSocket('udp4');
    let fini = false;
    const finir = (err, valeur) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      try { prise.close(); } catch { /* déjà fermée */ }
      if (err) rejeter(err); else resoudre(valeur);
    };
    const minuteur = setTimeout(
      () => finir(new Error(`le serveur de temps « ${serveur} » n'a pas répondu en ${delaiMs} ms`)),
      delaiMs,
    );

    prise.on('error', (e) => finir(e));
    prise.on('message', (msg) => {
      if (msg.length < 48) return finir(new Error('réponse SNTP tronquée'));
      // Horodatage de transmission du serveur : secondes en 40..43,
      // fraction en 44..47.
      const secondes = msg.readUInt32BE(40) - EPOQUE_NTP;
      const fraction = msg.readUInt32BE(44) / 2 ** 32;
      const duServeur = (secondes + fraction) * 1000;
      // L'aller-retour se partage : on retire la moitié du temps de vol.
      const vol = (Date.now() - depart) / 2;
      finir(null, { serveur, ecartMs: Math.round(duServeur + vol - Date.now()), volMs: Math.round(vol * 2) });
    });

    const depart = Date.now();
    prise.send(trame(), 0, 48, PORT_NTP, serveur, (e) => { if (e) finir(e); });
  });
}

// Un écart se lit en millisecondes tant qu'il en est une poignée : « 0,0 s » ne
// dit rien à l'exploitant qui cherche de combien son horloge a bougé.
const dire = (ms) => (Math.abs(ms) < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

// L'état de l'horloge, tel que le journal et la sonde de santé le diront.
// Ne lève jamais : un serveur de temps injoignable est un fait à consigner,
// non une panne qui arrête l'application.
async function verifier(config) {
  const t = (config && config.temps) || {};
  // L'environnement l'emporte : le serveur de temps dépend de l'hébergement,
  // non du paramétrage versionné — même geste que pour la messagerie.
  const serveur = String(process.env.OASIS_TEMPS_SERVEUR || t.serveur || '').trim();
  const seuilS = Number(t.ecartMaxSecondes) > 0 ? Number(t.ecartMaxSecondes) : SEUIL_DEFAUT_S;

  if (!serveur) {
    return {
      verifiee: false,
      raison: 'aucun serveur de temps déclaré (config.temps.serveur)',
      seuilS,
    };
  }
  try {
    const { ecartMs, volMs } = await interroger(serveur, Number(t.delaiMs) || DELAI_MS);
    const derive = Math.abs(ecartMs) > seuilS * 1000;
    return {
      verifiee: true, serveur, ecartMs, volMs, seuilS, derive,
      raison: derive
        ? `l'horloge s'écarte de ${dire(ecartMs)} du serveur de temps (seuil ${seuilS} s)`
        : '',
    };
  } catch (e) {
    return { verifiee: false, serveur, seuilS, raison: e.message };
  }
}

// L'heure écrite dans les journaux. Une seule porte d'entrée : le jour où
// l'heure devra venir d'ailleurs, c'est ici qu'on le changera, et nulle part
// ailleurs.
const maintenant = () => new Date().toISOString();

module.exports = { interroger, verifier, maintenant, SEUIL_DEFAUT_S };
