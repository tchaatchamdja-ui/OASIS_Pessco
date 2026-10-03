# Journal des modifications — OASIS

Les versions suivent les phases du projet ; les entrées les plus récentes en tête.

## Non publié

### Sécurité
- **`nodemailer` 9.1.1 → 10.0.13** — une vulnérabilité *haute* préexistante, trouvée en
  installant l'outillage du frontend : le cache DNS, global au processus, réutilisait le
  `servername` TLS d'un transport à l'autre, **exposant les justificatifs SMTP d'une AAC à
  une autre**. Trois autres avis du même paquet sont corrigés avec elle (déni de service par
  récursion de destinataires, enveloppe mal formée, retour arrière quadratique).
  L'API employée — `createTransport` — est inchangée, et les six contrôles d'envoi passent.
  `npm audit` : **0 vulnérabilité**, dépendances de développement comprises.
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
- **Java rafraîchit l'activité d'une session**, et un agent servi par Java seul ne se voit
  plus redemander son mot de passe en pleine séance. Il ne le faisait pas, faute d'arbitre :
  écrire dans `sessions.json` pendant que Node l'écrit fait perdre des sessions à l'un ou à
  l'autre, en silence. Les sessions vivant en base, l'arbitre existe — `Magasin.modifier`
  écrit par comparaison de version, le même geste que `magasin.modifier` côté Node.
  Mesuré : inactivité retombée de **29 minutes à 1 seconde** sur un appel à Java, table
  intacte, jeton toujours reconnu par Node. Sans base, la méthode ne fait rien et le dit :
  un second écrivain serait pire que l'expiration qu'il prétend éviter.
- Cinq contrôles Java sur la décision, dont celui qui compte : **une session ouverte par Node
  entre la lecture et l'écriture n'est pas perdue**. La décision repose une marque dans l'état
  que la base vient de rendre, au lieu de reconstruire la table telle qu'on la croyait —
  reconstruire l'aurait fait disparaître, et l'agent se serait simplement vu redemander son
  mot de passe.
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
- **`mesures` en base**, troisième magasin de module — 118 appels, 3 fichiers. Le module des
  actes de sanction, et **le geste le plus sensible de toute la bascule** : `prochaineReference`
  lisait le dernier numéro, l'incrémentait et réécrivait. Deux mesures prononcées ensemble
  auraient porté la même référence `MES-0042` — notifiée au prestataire, et qui désigne un acte
  d'autorité. L'allocateur est devenu pur : il avance le compteur dans l'état qu'on écrit.
- **Deux gardes que leur propre commentaire dénonçait** : « sans cette garde, un double clic
  notifierait deux fois » — et la garde était hors de l'écriture qu'elle gardait. Onze refus du
  module se relisent désormais dans la transformation.
- **Le dossier de traitement s'ouvrait deux fois** : deux routes faisaient « chercher, créer si
  absent », et deux requêtes simultanées ouvraient deux dossiers pour une même carence. Comme
  `traitementDe` n'en rend qu'un, le travail consigné dans l'autre devenait inatteignable.
- **Le circuit complet d'une carence n'était exercé par aucun contrôle** — investigation,
  qualification, suivi, soit le cœur du module. Vingt-trois contrôles le traversent maintenant,
  dont celui qui vérifie que deux mesures arrêtées d'un même geste portent deux références
  distinctes. Troisième fois que la conversion révèle ce trou.
- Le garde-fou des magasins de module **a cessé de couvrir « Mesures d'Application » sans le
  dire** : la fabrique y prend des options, et la regex de détection exigeait une parenthèse
  juste après le nom de la collection. Le défaut que ce garde-fou existe pour empêcher, dans le
  garde-fou lui-même.
- Un message de refus porté dans une variable **sortait de l'endroit où le garde-fou des
  traductions le lit**. Il l'a dit. Le refus porte un code, la phrase reste où la réponse se forme.
- **`ramp` en base**, quatrième magasin de module — 155 appels, 7 fichiers, et **86
  gestionnaires de route encore synchrones**. Il entraîne `src/vues_prestataire.js`, le socle
  de la bascule AAC / Prestataire alors partagé avec un module resté sur fichiers : le socle
  sert donc les deux régimes, ce que la façade existe pour permettre.
- Les références `POI-xxxx` s'allouent **par lots** — un classeur porte les inspections du
  mois — dans la transformation qui écrit les inspections. L'import entier, qui faisait une
  écriture par ligne, est une transformation.
- **Trois `forEach` auraient effacé les pièces d'autrui** : le retrait d'un partage demande au
  magasin, pièce par pièce, si le fichier est encore désigné ailleurs. Sans attendre les
  réponses, l'État destinataire tombait sur « Fichier introuvable ».
- **Un contrôle qui existait et ne gardait rien** : « les écarts partent avec leur inspection »
  passait avec la cascade supprimée. Et l'allocation groupée n'était exercée par rien — la
  suite n'importait jamais qu'une inspection neuve à la fois.
- **`execution` en base** — le dernier des cinq, 237 appels, 8 fichiers. **La bascule du
  magasin est complète : les quinze collections vivent en base.**
- Les références du circuit se déduisent **des références existantes**, sans compteur persisté.
  Calculées avant l'écriture, deux actes ouverts ensemble auraient porté la même. Elles se
  tirent désormais dans la transformation qui écrit l'enregistrement ; la soumission d'un
  rapport, qui tirait deux numéros par deux lectures avant trois écritures, est un seul geste.
- **Clôturer un dossier rend opposables au prestataire ses constatations en brouillon** :
  c'étaient deux écritures, puis une par constatation. Entre elles, un dossier clos dont les
  constatations ne l'étaient pas — et un échec au milieu les y laissait inopposables pour
  toujours. Six gestes de ce genre sont devenus six transformations.
- **Le défaut que seul un contrôle de comportement pouvait voir** : `res.json(rows.map(
  enrichirFnc))`. L'enrichissement touchant la base, `.map` rend un tableau de promesses que
  `res.json` sérialise en objets **vides** — une liste pleine d'enregistrements sans aucun
  champ, sans erreur. Le garde-fou de forme ne peut pas le voir : ce n'est pas un appel au
  magasin, c'est un `map`. Trois contrôles de la suite SURV l'ont dit, sur quatre listes.
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

### Frontend — React + TypeScript (ADR-003)
- **L'écran « Gestion des Droits » est en React + TypeScript** — premier des huit modules.
  Les six contrôles de navigateur passent **à l'identique**, et les 20 contrôles de la suite
  « droits » n'ont pas bougé : l'API n'est pas touchée.
  Coût mesuré : **554 lignes vanilla → 1 208 lignes**, 8 fichiers, paquet de 240 Ko minifié.
  Un cinquième des lignes neuves tient dans deux fichiers qui ne se réécriront pas à chaque
  module : la frontière avec le socle commun non typé (119 lignes, qui disparaîtront le jour
  où il sera porté) et les contrats des huit routes (121 lignes, des charges jusqu'ici
  tacites). Projeté : **environ 1,8 ligne pour une remplacée**, moins sur les gros modules.
- Le socle commun — 2 250 lignes de barre supérieure, thème, requêtes, messages — **n'est pas
  porté** : React vit dans `#app` et le consomme. C'est ce que « cohabitation » veut dire, et
  ce qui rend le premier module faisable sans en entraîner huit.
- **Quatre défauts trouvés, dont deux de mon fait** : le répertoire de traduction lit un
  global `DR` que l'écran d'avant portait ; `dtPriv` et `dtPrivDesc`, déclarés en `const`, ne
  sont pas sur `window` et les y lire rendait `undefined` ; mon alias déclaré pour éviter un
  masquage de nom **mentait**, n'existant pas à l'exécution ; et `exactOptionalPropertyTypes` a
  refusé un champ filtré puis reposé — il avait raison, `filter` suivi de `map` masquait la
  question.
- **Et un défaut de mon propre contrôle**, trouvé parce que l'écran React échouait :
  `body.textContent` compte le **source des scripts en ligne**, de sorte que l'écran paraissait
  « rempli » alors qu'il ne rendait rien. C'est `innerText` qu'il faut lire — le contrôle était
  plus faible que je ne le croyais depuis le début.
- **Les deux manières sont nommées aux garde-fous de forme.** Le paquet construit est exclu des
  gardes de source par son **chemin**, non par sa taille. Trois gardes neufs tiennent la source
  React comme le reste : elle est trouvée, aucun fichier au-delà de 600 lignes, et le typage
  n'est défait nulle part — ni `any`, ni `as unknown as`. Ce dernier a d'abord dénoncé un
  commentaire disant qu'on ne le fait pas ; il écarte désormais les commentaires.
- **Six contrôles de navigateur sur l'écran des droits, posés avant sa réécriture.** Aucun
  ne l'ouvrait : les vingt contrôles de la suite « droits » parlent à l'API, et une API verte
  ne dit rien d'un écran qui reste blanc. On ne mesure pas une réécriture contre rien.
  Ils décrivent l'écran tel qu'il est : il se monte et se remplit, il liste les comptes avec
  leur privilège en pastille, il ne déborde pas, sa page de journal montre que la chaîne
  d'audit est intacte, **il attribue un privilège** et **le serveur le porte**. Les deux
  derniers couvrent l'acte du module, que seul l'API éprouvait.
  Cinq contre-épreuves, chacune tombant sur le bon contrôle et sur lui seul.
- **L'étape de construction** : `esbuild` plutôt que Vite — une dépendance, pas de fichier de
  configuration, et pas de serveur de développement dont nous n'avons que faire (les écrans
  sont servis par Express, avec leurs sessions et leur politique de contenu).
  La **vérification des types est dans la construction**, non enchaînée à côté : esbuild
  retire les annotations sans les lire, et `tsc && esbuild` se saute d'un appel direct — on
  aurait eu le coût de TypeScript sans son bénéfice.
  La source vit dans `frontend/`, le paquet dans `public/modules/<module>/app/`, **non
  versionné** : un paquet obsolète servi en production est un défaut qui ne se voit pas.
  `npm run smoke` construit donc avant d'éprouver.

### Décisions de la maîtrise d'ouvrage
- **Ce qu'un autre module fonde est retiré, jamais détruit** *(3 octobre 2026)*. Une
  constatation de la surveillance ou un écart d'aire de trafic peut fonder une mesure
  d'application prise ailleurs. Les cinq suppressions gardées par `src/suites_care.js`
  vérifiaient auprès de CARE puis effaçaient — et depuis que le bus est asynchrone, une mesure
  peut être prononcée **entre la vérification et l'effacement**. La fenêtre ne se ferme pas :
  la vérification lit un module, l'écriture en touche un autre, et une transaction entre
  modules ferait divergir les deux régimes.
  **La fenêtre n'est pas fermée ; ce qui s'y passe a changé.** L'enregistrement porte
  `retire_le`, disparaît de toutes les listes, et subsiste : une mesure prononcée dans la
  fenêtre garde l'écart qui la fonde. Il ne s'y passe plus rien d'irréversible, et c'est la
  seule chose qui comptait.
- Trois choses rendent le geste complet : **les lectures ignorent ce qui est retiré** — une
  seule règle, dans `src/magasin_module.js`, rien à déclarer collection par collection ;
  **les contrats du bus continuent de le servir**, avec sa marque, parce que cacher à CARE le
  fondement de sa propre décision serait le pire des deux maux ; et **les preuves restent sur
  le disque** — garder le fondement en vidant sa substance ne vaudrait rien.
- Un garde-fou de forme **interdit la destruction de revenir** : aucun `remove` ni filtre
  destructeur sur ces deux collections, contre-éprouvé des deux manières. Le jour où l'on
  voudra « faire le ménage », la suppression paraîtra légitime — et la sanction perdrait son
  écart, sans erreur ni trace.
- **Le frontend passe à React + TypeScript** *(3 octobre 2026)* — [ADR-003](docs/ADR-003-cadre-du-frontend.md),
  qui clôt le jalon n° 8 d'ADR-002. Module par module, en cohabitation, **DROITS d'abord**
  (933 lignes, 2 fichiers, 20 contrôles) pour mesurer le coût réel avant d'engager les sept
  autres — la méthode qui a tenu cinq fois à la bascule du magasin. 63 434 lignes d'écran au
  total, dont 23 731 pour SURV seul.
  Deux documents de ce dépôt déconseillaient d'y aller ; leur avis est **conservé et daté**,
  non effacé : il était technique et sa mesure du volume juste, mais la conformité à la fiche
  est une exigence de la maîtrise d'ouvrage, non un arbitrage d'ingénierie.
  Ce que cela touche hors des écrans : une **étape de construction** là où il n'y en avait
  aucune — `Dockerfile`, commande de déploiement, et ce qui est versionné.
- **Les documents imprimés ne sont pas à traduire** *(3 octobre 2026)*. Les libellés des
  rapports de surveillance, de la fiche officielle de notification et de la fiche d'évaluation
  de risque restent en français et ne passent pas par la table de traduction : un acte de
  surveillance d'une AAC de l'UEMOA est rédigé en français. L'écran qui compose le document
  est trilingue, le document qu'il produit ne l'est pas. La décision est consignée dans les
  trois gabarits, pour qu'elle ne soit pas prise pour un oubli — le garde-fou des traductions
  ne couvre que les écrans, et n'a pas à être élargi.

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
