# Journal des modifications — OASIS

Les versions suivent les phases du projet ; les entrées les plus récentes en tête.

## Non publié

### Sécurité
- Les comptes créés au premier démarrage reçoivent un mot de passe **tiré au hasard**,
  affiché une seule fois sur la console. `OASIS_SEED_PASSWORD` permet de l'imposer.
  Les mots de passe ne figurent plus ni dans le code ni dans le README. *(SEC-02)*
- **Limitation de débit** sur `/api/login` et les routes MFA : 20 tentatives par
  adresse IP et par quart d'heure, réponse 429 avec `Retry-After`. *(SEC-03)*
- **En-têtes de sécurité** sur toutes les réponses : politique de contenu,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, et HSTS en production. *(SEC-04)*
- Cookie de session marqué **`Secure`** hors développement. *(SEC-05)*
- **Protection contre les requêtes forgées** : toute écriture sur `/api` doit porter
  l'en-tête `X-OASIS-Request`, posé par les pages de l'application. *(SEC-06)*
- **Validation des corps de requête** (`src/valider.js`) appliquée à la création de
  comptes, de plans, d'activités, de notifications et de rappels. *(SEC-08)*
- **Dernier filet** : une exception non rattrapée est inscrite au journal et rendue
  sous une erreur normalisée portant une référence — la trace d'exécution ne part
  plus au navigateur. *(SEC-09)*
- **Témoins de connexion** : page publique `/cookies.html` — ce que l'application
  dépose, pourquoi, pour combien de temps, et de quoi effacer ses préférences —,
  bandeau d'information à la première visite, et mention au pied de la page de
  connexion. Trois langues. *(SEC-10)*
- **Politique de sécurité** consignée : `docs/SECURITE.md` — mesures en place,
  emplacement dans le code, et ce qui reste ouvert.
- Dépendance `nodemailer` relevée (faille de niveau « high » sur la validation du
  domaine destinataire) ; l'intégration continue échoue désormais à ce niveau,
  là où elle n'arrêtait que le niveau « critical ».

### Exploitation
- `Dockerfile` multi-étages (utilisateur non privilégié, sonde de santé),
  `docker-compose.yml` et intégration continue GitHub Actions. *(DEP-01)*
- Point de santé **`GET /api/health`** : état, version, modules montés, accès en
  écriture au stockage, temps de fonctionnement. *(DEP-02)*
- Script de sauvegarde horodatée avec rétention : `scripts/sauvegarde.sh`. *(DEP-02)*

### Performance
- **Compression gzip** des réponses et des fichiers statiques textuels :
  `exec-app.js` passe de 664 Ko à 137 Ko. *(PERF-01)*
- Cache des fichiers statiques avec revalidation par ETag. *(PERF-02)*
- Le cache mémoire du stockage se **relit quand le fichier change** sur le disque :
  deux processus servant le même répertoire ne s'ignorent plus. *(PERF-04)*

### Magasin de données
- **Le magasin PostgreSQL a tourné contre un vrai serveur** (16.15), et deux défauts
  en sont sortis que la base simulée des contrôles avait couverts.
- `jsonb` → **`json`** pour les deux colonnes. `jsonb` réordonne les clés ; le sceau
  d'une entrée d'audit couvrant `JSON.stringify(details)`, les six chaînes des données
  réelles — 1 667 entrées du socle, 1 582 des modules — étaient **rompues** après un
  aller-retour. La chaîne du socle ne cédait qu'à la 29ᵉ entrée : un petit échantillon
  serait passé. Après correction, 15 collections et 3 249 entrées reprises, six chaînes
  intactes.
- **`modifier(nom, defaut, transformer)`** : lire-modifier-réécrire atomique par `rev`.
  La base rend l'écriture atomique, pas le geste complet — deux agents qui lisent une
  collection, y ajoutent chacun une ligne et la réécrivent en perdaient une, *en base
  comme sur fichier*. Cinquante écritures concurrentes, aucune perdue ; un conflit sans
  issue est refusé plutôt qu'écrasé.
- Consigné : si ce geste est sûr aujourd'hui sur fichiers, c'est parce que `load` et
  `save` sont **synchrones**. La conversion en asynchrone détruit cette garantie avant
  même qu'un second processus existe.
- **`src/magasin.js`** — la façade qui permet de basculer une collection à la fois.
  Asynchrone des deux côtés : un appel converti fonctionne sur fichiers comme en base.
  Liste d'autorisation : ce qui n'y est pas nommé reste sur fichiers. Sur fichiers,
  `modifier` est rendu atomique par une file d'attente par collection.
- **Première collection passée en base** : `ramp_aeronefs`, la nomenclature des aéronefs.
  8 fonctions de magasin, 7 routes, 9 fichiers touchés ; **299 contrôles RAMP verts dans
  les deux régimes**, et la base porte bien la nomenclature seule — 9 550 appareils.
- Trois routes qui *vérifiaient puis écrivaient* — doublon, bascule d'activité, refus de
  suppression — passent leur vérification **dans** la transformation : une autre requête
  s'intercale désormais entre les deux gestes.
- **`src/route.js`** — `asynchrone(fn)`. Express 4 ne regarde pas la promesse d'un
  gestionnaire `async` : un rejet laissait la requête **ouverte jusqu'à expiration**, sans
  erreur 500 ni trace. Six gestionnaires étaient dans ce cas ; ils sont enveloppés.
- Le serveur **attend l'amorçage avant d'écouter** : une collection en base s'amorce par
  le réseau, et servir une route avant qu'elle soit posée rendrait une liste vide.
- **Le bus de services est asynchrone par contrat.** `services.call` et `callOr` rendent
  une promesse quoi que fasse le producteur. Fait pendant que tous les producteurs sont
  encore synchrones : le jour où l'un passera en base, ses consommateurs n'auront rien à
  reprendre. Sept consommations converties, **57 gestionnaires de route enveloppés**.
- `OASIS_BUS_DIFFERE=1` rend tout producteur asynchrone — mise en situation de la bascule,
  et recette de chacune des suivantes. La campagne complète y reste verte.
- **`emails` passée en base**, deuxième collection. `queue()` rendant déjà une promesse,
  la propagation s'arrête à ses cinq appelants. Son écriture dérive l'identifiant de la
  longueur du registre : trois envois simultanés donnent trois entrées avec `modifier`,
  **une seule** avec `load` puis `save`.
- Le garde-fou « plus rien par `store` » a trouvé un appel que rien d'autre n'aurait
  signalé : la reprise SAFA → RAMP lisait le registre des envois sur fichier au démarrage.
  Elle passe par la façade, et le serveur l'attend avant d'écouter.
- Le contrôle des trois envois concurrents **passait pour la mauvaise raison** — un Mailpit
  sur le port 1025 espaçait les envois sur le réseau. L'épreuve force désormais une
  configuration sans hôte SMTP ; la contre-épreuve mord.
- **Les journaux d'audit passés en base** — `audit` et `module_audit`. 64 inscriptions
  dans 12 fichiers, 21 fichiers touchés. `log` ne relit plus le journal entier mais
  seulement sa propre chaîne.
- **Une chaîne d'audit ne peut plus forcher** : index unique `(nom, cle, rang)` sur la
  table `journal`. Le premier essai posait la condition dans le `WHERE` de l'insertion —
  il ne protégeait rien, faute de ligne à verrouiller, et vingt inscriptions concurrentes
  l'ont montré. La garantie est désormais dans le schéma, donc valable pour tout code qui
  écrit dans cette base.
- `magasin.journalChainer` rend l'inscription atomique dans les deux régimes : file
  d'attente par journal sur fichiers, contrainte d'unicité en base.
- **Les garde-fous de forme ne regardaient pas `server.js`** — 1 200 lignes, la moitié des
  inscriptions au journal. Corrigé ; le contrôle élargi a aussitôt trouvé un gestionnaire
  asynchrone sans enveloppe.
- La vérification d'horloge écrivait au journal **avant que les tables existent**, et son
  `catch` avalait l'échec : l'entrée « horodatage non vérifié » était perdue. Elle attend
  désormais la préparation du magasin, et un échec est tracé.
- Deux garde-fous : toute inscription au journal est attendue, et le plafond d'écritures
  est lu avec `await` — sans quoi il rendrait une promesse toujours vraie et ne se
  déclencherait plus jamais.
- La base de papier des contrôles de contrat tient maintenant **la même contrainte** que le
  vrai schéma. Elle avait menti une quatrième fois.
- **`notifications` et `mfa_challenges` passées en base.** La seconde porte le geste le
  plus sensible de la bascule : le compteur d'essais du second facteur. Dix codes faux
  lancés ensemble liraient tous `attempts: 0` et le plafond de cinq essais ne se
  déclencherait jamais — mesuré, `4,3,2,1,0` avec le verdict arrêté dans la transformation,
  `4,4,4,4,4,4,4,4,4,4` sans.
- **Suite « mfa », 11 contrôles** — l'authentification à deux facteurs n'était traversée
  par aucun contrôle, étant éteinte dans la configuration d'essai. Elle a désormais son
  serveur et `OASIS_MFA=1`. Le harnais accepte des variables d'environnement pour cela.
- Le code à usage unique n'est pas récupérable et ne le sera pas : ce sont les refus qui
  s'éprouvent — code faux, défi expiré, plafond de tentatives, rafale.
- Un envoi de code qui échoue est désormais **tracé** : sans quoi un agent attendrait un
  code jamais parti, et rien ne le dirait.
- **Le socle Java lit PostgreSQL.** La bascule des journaux l'avait cassé sans que rien ne
  le dise : en régime base, `module_audit.jsonl` n'existe plus, et la vérification de chaîne
  annonçait « valide, zéro entrée » — un satisfecit sur un journal vide. Mesuré après
  correction : **14/14 réponses identiques à l'octet** et **1 582 maillons revérifiés depuis
  la base**, 20/20 à travers la passerelle.
- `DATABASE_URL` sert les deux socles : la traduction vers JDBC est explicite et éprouvée
  par 10 contrôles. Une adresse donnée mais incomprise arrête le démarrage ; le mot de passe
  n'apparaît dans aucun message ni aucune trace.
- **Un contrôle compare les listes de collections migrées des deux socles.** Leur divergence
  ferait lire à Java un fichier que personne n'écrit plus, sans aucune erreur.
- `scripts/cible-essai.sh` remet aussi la base à zéro : sans cela la remise à zéro ne portait
  que sur les fichiers, et les collections migrées gardaient le jeu de la veille.
- **`users` et `sessions` en base**, par une autre voie que les précédentes. `getUsers()`
  reste **synchrone** : le rendre asynchrone aurait atteint 101 prédicats de rôle et 545
  chaînes de tableau. `src/annuaire.js` en tient un instantané, rafraîchi une fois par
  requête dans `requireAuth` — deux contrôles de forme l'imposent.
- Les écritures sur un compte ne reportent que **les champs changés** : réécrire
  l'enregistrement entier effaçait le décompte de tentatives infructueuses qu'une connexion
  incrémente, et le compte cessait de se bloquer. Mesuré : 3 contre 4.
- `sessions` : la table en mémoire fait foi, le magasin la garde d'un démarrage à l'autre.
  Une session ouverte par Node est désormais reconnue par le socle Java **à travers la base**.
- **Le harnais de fumée n'isolait plus les suites** en régime base : la copie de `data/` était
  neuve, la base partagée. Et les fixtures n'y entraient jamais — trois comptes au lieu de
  quinze. Chaque suite reçoit son propre schéma PostgreSQL, garni puis détruit.
- `srv.donnees()` lit **là où la donnée vit** : un contrôle cherchait les restes d'un compte
  effacé dans un fichier figé sur les fixtures, et les y trouvait toujours.
- **`referentiels` et `module_rights` en base.** Même cas que `users` — lues depuis des
  prédicats synchrones — donc même traitement. La mécanique de l'instantané, qui vivait dans
  `src/annuaire.js`, est désormais dans **`src/instantane.js`** et sert les trois : une seule
  chose à tenir d'accord au lieu de trois. Les trois collections sont relues ensemble et en
  parallèle.
- Les lectures rendent l'instantané **et non une copie** : 45 copies d'un objet de 25 Ko par
  requête seraient coûteuses pour rien. Vérifié : aucun appelant extérieur ne le mute. Les
  deux écritures internes qui mutaient leur argument travaillent sur une copie.
- **L'import de référentiel par classeur écrivait dans deux `forEach` imbriqués** : les
  écritures devenues asynchrones, il les aurait lancées sans les attendre — feuilles parent
  et enfant croisées, et un compte rendu rendu avant que rien ne soit écrit. Ce sont des
  boucles maintenant.
- **Une fenêtre ouverte et consignée** : les cinq suppressions gardées par
  `src/suites_care.js` vérifient auprès de « Mesures d'Application » puis effacent. Le bus
  n'étant plus synchrone, une mesure peut désormais être prononcée entre les deux gestes.
  La vérification lit un module et l'effacement en écrit un autre : il y faudra une
  transaction entre modules. Porté aux points ouverts d'ADR-002.
- **`profil_risque` en base — le premier magasin de module.** Propagation d'une autre nature
  que les trois précédentes : ces données ne sont pas lues par des prédicats mais dans le
  corps des gestionnaires, déjà asynchrones. L'instantané ne conviendrait pas — une évaluation
  est un acte d'autorité en écriture permanente. Conversion franche, sur le plus petit des
  cinq modules : 12 appels, 5 fichiers.
- **Trois gestes du module en faisaient plusieurs** : mettre à jour une évaluation puis
  horodater son étape (2 écritures), la supprimer puis libérer son parent puis ses deux séries
  de réunions (**4**), ouvrir un cycle puis le rattacher (2). Entre elles, l'application
  montrait une évaluation disparue dont le parent se disait encore « réévaluation en cours »,
  et des comptes rendus rattachés à rien ; un échec au milieu l'y laissait. Chacun est
  désormais **une seule transformation**.
- **Deux gardes se tenaient hors de l'écriture qu'elles gardaient** : deux réévaluations
  simultanées créaient deux clones dont un orphelin ; et un classeur de notes parti au moment
  d'une validation se posait après elle, de sorte que le profil servi à la Planification
  n'était plus celui qui avait été arrêté. Les deux se relisent dans la transformation.
- **Le transformateur recevait l'objet du cache**, sur fichiers — trouvé par un contrôle
  écrit pour autre chose. Mutation en place (`arr.splice`, la façon naturelle d'écrire) :
  l'écriture refusée, la valeur en mémoire restait fausse **durablement**, le cache étant
  indexé sur la date du fichier que rien n'avait changée. Il reçoit une copie, ce qui met les
  deux régimes au même comportement — l'objet même de la façade.
- **`magasin.INCHANGE`** : ne rien écrire, et le dire. Réécrire une collection entière pour
  répondre `404` coûtait un aller-retour sur plusieurs mégaoctets — la bibliothèque
  documentaire porte ses pièces en base64. Un **symbole** et non `undefined` : un `return`
  oublié rend `undefined`, et le prendre pour « ne rien écrire » ferait disparaître une
  écriture sans erreur ni trace. `undefined` lève, et nomme l'oubli.
- **Six routes de classeur n'étaient exercées par aucun contrôle** — export des indicateurs,
  modèle, export des notes, import. Un `await` oublié y rendrait un classeur vide et bien
  formé : trois feuilles, leurs entêtes, aucune ligne. Elles sont couvertes, et les deux
  `forEach` de leurs boucles sont devenus `for…of`.
- **`planification` en base**, deuxième magasin de module — 68 appels, 6 fichiers. C'est là
  que la **composition** compte : valider un plan posait son statut, reportait les avis saisis
  activité par activité, retirait les versions remplacées (deux écritures par ancêtre) et
  inscrivait la décision au circuit. Entre elles, **un plan était validé et son circuit ne le
  disait pas** — un acte d'autorité sans sa justification. Sept gestes du module sont devenus
  sept transformations.
- `D.inscrireWf` pose l'entrée de circuit **dans** l'état qu'on écrit ; `retirerAncetres` et
  `cibleDeSynchro` travaillent sur cet état sans rien écrire elles-mêmes.
- **Deux gardes de route étaient des prédicats synchrones** : `lecturePlan` et `ecriturePlan`
  lisent le plan pour décider. Devenues asynchrones, elles passent par `asynchrone` comme un
  gestionnaire — Express 4 ne traite pas mieux un middleware `async`, et sans l'enveloppe un
  échec laisse la requête ouverte.
- **`src/magasin_module.js`** porte le vocabulaire des cinq magasins de module une seule fois :
  `list`, `get`, `insert`, `update`, `remove`, `removeWhere`, `transformer`. Écrit cinq fois,
  il aurait fallu tenir d'accord cinq copies de la même subtilité.
- **Six routes de PLAN n'étaient exercées par aucun contrôle** — application de la
  synchronisation des risques, `transmettre`, `approuver-dg`, les archives du plan et les deux
  exceptions posées activité par activité. Deuxième fois que la conversion révèle ce trou ;
  c'est devenu la chose à vérifier avant de convertir. Dix contrôles, tous contre-éprouvés.

### Tests
- Jeu de données de référence versionné dans `tests/fixtures` : `npm run smoke`
  ne dépend plus de l'état de `data/`. *(TEST-01)*
- Suite **« magasin-pg »**, 12 contrôles contre un vrai PostgreSQL, dont deux
  contre-épreuves qui les empêchent d'être vides. Sans `OASIS_PG_ESSAI`, trois
  contrôles lisent le schéma et huit se déclarent hors de portée.
- Deux contrôles de forme ferment les portes de la bascule : **aucune collection migrée
  n'est plus lue par `store`** — un appel oublié lirait le fichier figé au dernier jour
  des fichiers, sans erreur —, et **tout gestionnaire de route asynchrone passe par
  `asynchrone`**. Les deux contre-éprouvés.
- **Aucun magasin de module en base n'est lu sans `await`** — le défaut le plus discret de
  la bascule, parce que ces appels ne sont pas des prédicats qu'on reconnaît mais le corps
  des gestionnaires. `res.json(promesse)` sérialise `{}` : un écran vide, sans erreur. Le
  critère est **que `list` soit asynchrone**, et non que le magasin requière la façade —
  celui de RAMP la requiert pour la seule nomenclature des aéronefs, et le premier jet
  désignait 150 lignes correctes.
- **Une garde « lire, vérifier, écrire » se tient dans la transformation** : deux contrôles
  de forme, et la preuve d'atomicité en processus avec sa contre-épreuve — la même garde
  hors de la transformation laisse passer plusieurs écritures.
- **Un vert creux retiré** : une rafale de dix réévaluations simultanées passait, et la
  contre-épreuve — l'ancienne logique, la garde hors de l'écriture — la passait aussi. Dix
  requêtes HTTP contre un gestionnaire rapide se sérialisent. Deuxième fois que ce piège se
  présente ; la première était le compteur du second facteur.
- Le garde-fou des magasins de module s'est trompé **deux fois avant de tenir** : le critère
  « requiert la façade » désignait 150 lignes correctes de RAMP, dont le magasin la requiert
  pour la seule nomenclature des aéronefs ; puis le balayage ligne à ligne en désignait 8, une
  lecture lancée en parallèle ne portant qu'un `await` pour deux appels. Il balaie désormais
  **par instruction**.
- **Trois contre-épreuves n'ont pas mordu, et chacune a appris quelque chose** : un `await`
  retiré sur une lecture que la transformation relit elle-même ne change rien ; une écriture non
  attendue passe par HTTP — la réponse part avant l'écriture, mais la requête suivante arrive
  après —, et c'est le garde-fou de forme qui l'attrape ; et la troisième a trouvé **une
  assertion trop faible de ma part**, qui ne distinguait pas une activité recopiée d'une
  activité créée.

### Accessibilité
- Contour de focus visible au clavier sur l'ensemble des écrans. *(A11Y-02)*

### Documentation
- `.env.example`, ce journal, et les diagrammes d'architecture
  (`docs/architecture-uml.md`). *(ARCH-02, DOC-02)*
- Spécification du module Planification : `docs/PLAN-specification.docx`.

## Phase 1 — Socle technique transverse

- Authentification (scrypt, sessions, MFA facultative, verrouillage),
  gestion hiérarchisée des utilisateurs, journal d'audit chaîné en SHA-256,
  multilinguisme FR/EN/PT, registre des dix modules du TDR.
- Modules montés : DROITS (privilèges et portées), PLAN (plans de surveillance),
  PR (profils de risque), SURV (exécution de la surveillance).
