# Politique de sécurité de l'application — OASIS

*Outils d'Administration et de Supervision Intégrée de la Sécurité — UEMOA / URSAC*

Ce document dit ce que l'application protège, comment, et où la mesure se lit
dans le code. Il sert au dossier de validation : chaque exigence y porte son
identifiant, son état et son emplacement, de sorte qu'un contrôle puisse être
refait sans nous.

Dernière revue : 24 septembre 2026.

---

## 1. Ce qui est protégé

| Donnée | Nature | Où elle vit |
|---|---|---|
| Comptes | nom, adresse électronique, rôle, portée | `data/users.json` |
| Actes de surveillance | plans, activités, constatations, rapports, mesures | `data/<module>.json` |
| Inspections sur aire de trafic | inspections, écarts, rapports POI | `data/ramp.json` |
| Pièces jointes | fichiers déposés par les agents et les exploitants | `data/uploads/` |
| Journal d'audit | qui a fait quoi, quand | `data/audit.json`, `data/module_audit.json` |

L'application ne traite aucune donnée de paiement et aucune donnée sensible au
sens des catégories particulières : ni santé, ni opinion, ni biométrie.

---

## 2. Authentification et sessions

| | Mesure | Où |
|---|---|---|
| SEC-01 | Mots de passe hachés par **scrypt**, sel de 16 octets par compte, jamais rendus | `src/auth.js` |
| SEC-02 | Comptes d'amorçage à mot de passe **tiré au hasard**, affiché une fois ; `OASIS_SEED_PASSWORD` pour l'imposer | `server.js`, `src/auth.js` |
| SEC-03 | **Limitation de débit** : 20 tentatives par adresse et par quart d'heure sur `/api/login` et les routes MFA, réponse 429 avec `Retry-After` | `server.js` |
| SEC-10 | **Plafond d'écritures par compte** : 600 par minute, paramétrable (`maxWritesPerMinute`, 0 le retire), réponse 429 avec `Retry-After` et trace au journal. Par compte et non par adresse : plusieurs agents derrière la même sortie ne se pénalisent pas | `server.js`, `config/oasis.config.json` |
| SEC-05 | Cookie de session **`HttpOnly`, `SameSite=Lax`, `Secure` hors développement**, sans `Max-Age` : la durée est tenue par le serveur | `server.js` |
| | **Verrouillage** du compte après 5 échecs, **expiration après 30 minutes** d'inactivité, **session unique** par compte | `config/oasis.config.json`, `src/auth.js` |
| | **Politique de mot de passe** : 12 caractères, majuscule, minuscule, chiffre, caractère spécial, renouvellement à 180 jours, 5 derniers interdits, changement imposé à la première connexion | `config/oasis.config.json`, `src/auth.js` |
| | **Authentification multifacteur** par code à usage unique (courriel), code valable 10 minutes, débit limité. Éteinte en développement, **requise en production** : au paramétrage (`security.mfaEnabled`) ou par `OASIS_MFA=1` ; un démarrage en production sans elle est signalé et journalisé | `src/auth.js`, `server.js` |

Les paramètres sont tenus au fichier de configuration, non dans le code : une
Autorité qui durcit sa politique ne modifie pas l'application.

---

## 3. Autorisations

- **Rôles du portail** : super-administrateur (régional ou national),
  administrateur AAC, utilisateur AAC, administrateur prestataire, utilisateur
  prestataire.
- **Privilèges par module** (`Gestion des Droits`) : gestionnaire, validateur,
  contributeur, lecteur — attribués par domaine et par secteur.
  `src/module_rights.js`.
- **Vue Prestataire** : un compte d'organisme ne voit que ses propres données ;
  le cloisonnement est posé au serveur, jamais à l'écran
  (`src/vues_prestataire.js`, `src/modules/*/vues.js`).
- **Instances** : chaque AAC ne voit et n'écrit que ses propres dossiers ; la
  vue régionale est réservée au super-administrateur régional
  (`src/instances.js`). Ce qui franchit délibérément cette frontière — les
  écarts régionaux du module RAMP, en lecture seule — est documenté à l'endroit
  où il est servi.

---

## 4. Requêtes, entrées, sorties

| | Mesure | Où |
|---|---|---|
| SEC-04 | **En-têtes de sécurité** sur toute réponse : politique de contenu (`default-src 'self'`), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production | `server.js` |
| SEC-12 | **Politique stricte sur les pages publiques** : la connexion et les témoins de connexion n'ont ni gestionnaire en ligne ni bloc inséré, et reçoivent `script-src 'self'` sans `'unsafe-inline'` — un script injecté n'y est pas exécuté. Ce sont les deux seules pages qu'un visiteur atteint sans être connu | `server.js`, `public/js/login-page.js`, `public/js/cookies-page.js` |
| SEC-06 | **Requêtes forgées** : toute écriture sur `/api` doit porter l'en-tête `X-OASIS-Request`, qu'un formulaire d'un autre site ne peut pas ajouter ; `SameSite=Lax` ferme le reste | `server.js` |
| SEC-08 | **Validation des corps de requête** sur les routes de création | `src/valider.js` |
| SEC-11 | **Forme du corps sur toutes les écritures de module** : garde commune posée sur chaque préfixe d'API, avant la route — nom de champ attendu, liste et imbrication bornées. Ses bornes sont relevées sur les données réelles | `src/valider.js`, `src/module_loader.js` |
| SEC-09 | **Dernier filet** : une exception non rattrapée est inscrite au journal et rendue sous une erreur normalisée avec une référence — jamais la trace d'exécution | `server.js` |
| | **Échappement systématique** des valeurs rendues au HTML (`_esc`, `_escAttr`) ; aucune interpolation d'attribut sans échappement | modules `public/modules/*/js` |
| | **Pièces jointes** : liste blanche d'extensions, 25 Mo par fichier, nom tiré au hasard sur le disque, stockage hors du magasin de données, chemin jamais construit depuis l'appelant | `src/multipart.js`, routes des modules |
| | **Messages d'erreur normalisés** : neuf familles, sans détail d'implémentation | `src/erreurs.js` |

---

## 5. Traçabilité

- **Journal d'audit chaîné** : chaque entrée porte l'empreinte SHA-256 de la
  précédente. Réécrire une ligne rompt la chaîne et se voit. Ajout seulement,
  jamais de réécriture — et le fichier lui-même l'applique désormais : une
  entrée par ligne, ajoutée en fin de fichier, ce qui ne touche pas un octet de
  ce qui précède (`src/journal.js`, `src/audit.js`, `src/module_audit.js`).
- Sont tracés : connexions et échecs, dépassements de débit, créations et
  modifications de comptes, attributions de droits, actes de surveillance,
  erreurs serveur.
- Le journal est lisible par les administrateurs depuis « Gestion des Droits ».

---

## 6. Données du navigateur et vie privée

- **Un seul témoin** : `oasis_session`, strictement nécessaire, `HttpOnly`,
  effacé à la déconnexion. Aucun témoin de mesure d'audience, aucun tiers.
- **Préférences locales** : palette, langue et dernier écran, rangés dans le
  navigateur de l'agent.
- **Page publique** `/cookies.html` : ce qui est déposé, pourquoi, pour combien
  de temps, et un bouton qui efface les préférences de cet appareil. La durée de
  session qu'elle annonce est lue au paramétrage, non recopiée.
- **Bandeau d'information** à la première visite (`public/shared/js/oasis-cookies.js`) :
  il informe, il ne demande pas un consentement qu'aucun choix ne suivrait — un
  témoin nécessaire ne se refuse pas sans renoncer à l'application.
- **Droits des personnes** : accès, rectification, suppression auprès de
  l'administrateur de l'Autorité ; la page les mentionne.

---

## 7. Exploitation

- **Transport** : TLS assuré par l'hébergeur ; HSTS d'un an en production.
- **Secrets** : par variables d'environnement, jamais dans le dépôt
  (`OASIS_SEED_PASSWORD`, paramètres de messagerie).
- **Conteneur** : image multi-étages, utilisateur non privilégié, sonde de
  santé (`Dockerfile`).
- **Sauvegardes** : `scripts/sauvegarde.sh`, archives horodatées avec rétention.
- **Supervision** : `GET /api/health` — état, version, modules, accès en
  écriture au stockage.
- **Dépendances** : cinq dépendances de production ; `npm audit` passe en
  intégration continue et **échoue au niveau « high »**
  (`.github/workflows/ci.yml`).
- **Contrôles automatiques** : neuf suites de fumée à chaque poussée, dont les
  en-têtes de sécurité, le refus de l'anonyme et le cloisonnement des données.

---

## 8. Ce qui reste ouvert

| Point | Pourquoi il n'est pas fermé |
|---|---|
| `'unsafe-inline'` dans la politique de contenu | **Fermé sur les deux pages publiques** (SEC-12). Les écrans internes le gardent : leurs gestionnaires d'évènements viennent du portage et s'externalisent module par module. |
| Schéma de validation par route | **Une garde commune borne désormais la forme de toute écriture de module** (SEC-11) ; elle ne dit pas ce qu'un champ doit contenir. Les routes valident champ par champ, sans schéma déclaré. |
| Authentification multifacteur éteinte hors production | **Décision prise** : elle reste éteinte en développement et en démonstration, et **doit être active en production**. Le réglage se force par `OASIS_MFA=1` sans toucher au fichier de configuration, qu'un hébergement ne laisse pas modifier. Un démarrage en production sans elle l'écrit sur la console et au journal d'audit — il ne la refuse pas, pour ne pas laisser une Autorité hors de son application. |
| Chiffrement au repos | Les fichiers de données reposent sur le chiffrement du volume de l'hébergeur ; aucune couche applicative. Le magasin PostgreSQL, quand il sera en service, apportera celui de la base. |
| Concurrence entre processus | Le magasin par fichiers n'a pas de verrou : deux processus servant le même répertoire s'écrasent l'un l'autre en silence. Une seule instance sert aujourd'hui une AAC, ce qui l'évite. Le magasin PostgreSQL est écrit et sa reprise éprouvée ; la bascule est documentée (`docs/MAGASIN-POSTGRESQL.md`). |
| Rétention des données | Aucune purge automatique : les actes de surveillance se conservent, leur durée n'est pas encore une règle de l'application. Les journaux d'audit, eux, sont en ajout seul par construction : leur croissance ne coûte plus rien à l'écriture, mais elle n'est pas bornée. |

Ces points sont connus, documentés et sans incidence sur les contrôles de la
présente revue ; ils sont à instruire au fil des versions.
