# OASIS — Spécifications techniques

**État mesuré au 6 octobre 2026**, après les migrations du magasin de données
([ADR-001](ADR-001-magasin-de-donnees.md), [ADR-002](ADR-002-migration-spring-boot.md)) et la
reprise du frontend ([ADR-003](ADR-003-cadre-du-frontend.md)).

---

## 0. Ce que ce document est, et ce qu'il n'est pas

Il décrit **ce que l'application est**, non ce qu'elle devrait être. La comparaison avec la
fiche technique URSAC/GT2 est l'objet d'un autre document —
[CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md) — et les décisions qui ont mené
ici sont dans les trois ADR.

**Chaque chiffre de ce document a été relevé le 6 octobre 2026, non recopié.** Le § 14 donne les
commandes qui permettent de le contredire, et c'est sa propriété la plus utile : la relecture du
même jour a trouvé **huit affirmations périmées** dans les documents voisins — *« la bascule du
magasin est complète »*, *« 0 fichier `.ts` »*, *« Dockerfile à deux étages »* — et toutes
étaient du côté rassurant. Personne n'écrit par inadvertance qu'un chantier est moins avancé
qu'il ne l'est. Un document d'état qui ne porte pas le moyen de le vérifier est une déclaration
d'intention.

Deux mentions sont donc portées partout où elles s'appliquent : **« mesuré »**, et **« non
mesuré »**. La seconde n'est pas une pudeur ; elle signifie qu'on ne sait pas.

---

## 1. Vue d'ensemble

OASIS sert la supervision de la sécurité de l'aviation civile pour les **huit États de
l'UEMOA** — Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo — sous
l'autorité de l'URSAC.

Une instance sert une Autorité de l'Aviation Civile (AAC). Le cloisonnement entre États est
**logique**, par un champ `instance` appliqué au serveur, et non physique par base dédiée : la
fiche prescrit l'inverse, et l'écart est assumé et documenté.

| | |
|---|---|
| Nature | Application web, servie par un serveur unique |
| Langues | **trois** — français, anglais, portugais, sur toute la surface |
| Rôles d'utilisateur | 7 : `SUPERADMIN`, `ADMIN`, `AAC`, `INSPECTEUR`, `ADMIN_PRESTATAIRE`, `PRESTATAIRE`, `INDEPENDANT` |
| Privilèges par module | 6 échelons : `AUCUN`, `LECTEUR`, `CONTRIBUTEUR`, `VALIDATEUR`, `GESTIONNAIRE`, `PRESTATAIRE` |
| Volume des données | **19 Mo** pour une AAC, dont 1,9 Mo de nomenclature d'aéronefs figée |
| Journaux d'audit | **3 229 entrées**, en deux chaînes SHA-256 |

---

## 2. Pile technique

### 2.1 Ce qui tourne

| Couche | Technologie | Version |
|---|---|---|
| Exécution serveur | Node.js | `>= 20` déclaré ; **22** dans l'image |
| Cadre serveur | Express | 4.19.2, modules CommonJS |
| Magasin | PostgreSQL *ou* fichiers JSON | `pg` 8.23 — PostgreSQL **16** éprouvé |
| Frontend | React + TypeScript, **en cours de reprise** | React 19.3, TypeScript strict |
| Construction du frontend | esbuild | sans fichier de configuration |
| Socle secondaire | Java / Spring Boot | **Java 21**, Maven, monodépôt |
| Rendu PDF | Puppeteer (Chromium) | 25.8 |
| Classeurs | SheetJS + `xlsx-js-style` | 0.20.3 |
| Courrier | Nodemailer | 10.0 |

**Huit dépendances de production, quatre de développement.** C'est un choix tenu : une
application d'autorité dont la chaîne d'approvisionnement est lisible par une personne.

### 2.2 Volumes du code

| | Lignes |
|---|---|
| Serveur — `server.js` | 1 323 |
| Serveur — `src/` (33 fichiers) | 5 682 |
| Modules métier — `src/modules/` | 14 142 |
| **Total serveur** | **≈ 19 800** |
| Frontend — TypeScript (53 fichiers) | **7 672** |
| Frontend — JavaScript restant | **58 515** |
| Socle Java (15 fichiers) | 2 255 |
| Suites de contrôle | 8 406 |
| Scripts d'exploitation | 1 380 |

### 2.3 Surface d'API

**390 déclarations de route**, comptées dans `server.js` et `src/` : 153 `GET`, 104 `POST`,
94 `PUT`, 39 `DELETE`. Deux d'entre elles enregistrent leur chemin depuis une variable, et une
depuis un tableau — le compte des *déclarations* est donc exact, celui des chemins exposés peut
en différer de peu.

---

## 3. Le magasin de données

### 3.1 Deux régimes, un seul code

`src/magasin.js` est une façade. Elle route collection par collection vers PostgreSQL ou vers
les fichiers **selon une seule condition** : la présence de `DATABASE_URL`.

| | |
|---|---|
| Collections hors journaux | **14** |
| Collections servies par PostgreSQL | **13** |
| Collections restant sur fichiers | **1** — `instances` ([ADR-002](ADR-002-migration-spring-boot.md) n° 14) |
| Journaux chaînés en base | **2** — `audit`, `module_audit` |

Les treize : `users`, `sessions`, `emails`, `mfa_challenges`, `referentiels`, `module_rights`,
`ramp_aeronefs`, `notifications`, `planification`, `execution`, `mesures`, `ramp`,
`profil_risque`.

**Ce que ce régime double garantit, et qui est mesuré.** Trois choses distinctes, qu'il faut
nommer séparément parce qu'elles ne s'impliquent pas :

| Ce qui est éprouvé | Comment |
|---|---|
| Les deux magasins **tiennent le même contrat** | 6 contrôles de contrat contre une base de papier, **plus 12 contre un vrai serveur** — ces derniers couvrant ce qu'une `Map` ne peut pas dire : transactions, contraintes, concurrence |
| La **chaîne d'audit** survit au passage en base | **1 582 maillons SHA-256** revérifiés depuis PostgreSQL |
| Les **deux socles** rendent la même chose | **38 réponses identiques à l'octet**, Node contre Java, sur treize collections en base |

La tâche `base` de l'intégration continue rejoue la campagne **entière** contre un vrai
PostgreSQL 16 à chaque poussée : la vérification n'est pas un souvenir. C'est la leçon de la
suite n° 3 d'[ADR-001](ADR-001-magasin-de-donnees.md), où un jalon avait été clos sur une épreuve
faite une fois, à la main, que personne ne rejouait.

### 3.2 Le schéma

Deux tables seulement :

```sql
CREATE TABLE collections (
  nom    TEXT PRIMARY KEY,
  valeur JSON NOT NULL,
  rev    INTEGER NOT NULL DEFAULT 0,
  maj    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journal (
  nom    TEXT NOT NULL,
  ordre  BIGSERIAL PRIMARY KEY,
  cle    TEXT NOT NULL DEFAULT '',
  rang   INTEGER NOT NULL DEFAULT 0,
  entree JSON NOT NULL
);
CREATE UNIQUE INDEX journal_rang ON journal (nom, cle, rang) WHERE rang > 0;
```

### 3.3 `json`, et surtout pas `jsonb` — la décision la plus contre-intuitive du magasin

`jsonb` est le type que l'on choisirait, et la fiche technique l'invoque nommément. **Il est
refusé ici, et pour une raison qui ne se devine pas** : `jsonb` range les clés d'un objet par
longueur puis par octets. Le journal d'audit scelle chaque entrée par un SHA-256 calculé sur le
**texte** de ses détails. Des chaînes intactes sur fichiers se sont trouvées **rompues après un
aller-retour en `jsonb`**.

`json` conserve le texte tel qu'il a été écrit. Il coûte l'indexation GIN et les opérateurs de
`jsonb` — dont **aucun n'est employé** : on lit une collection entière, on la réécrit entière.
Le choix est tenu par un contrôle de forme.

### 3.4 L'écriture atomique

`magasin.modifier()` fait le cycle lire–modifier–écrire en un geste : file d'attente sur
fichiers, transaction en base. La distinction compte : `load` puis `save` sur trois envois
simultanés donne **une** entrée ; `modifier` en donne trois.

### 3.5 Un seul processus par répertoire de données

Le magasin par fichiers n'a pas de verrou de base : deux processus servant le même répertoire
s'effacent l'un l'autre **en silence**. `src/verrou.js` pose un `.verrou` au démarrage et refuse
de démarrer si un autre le tient. Un verrou laissé par un arrêt brutal est repris et signalé ;
celui d'une autre machine est refusé, faute de pouvoir le vérifier — c'est le cas de deux
conteneurs sur un même volume. `OASIS_VERROU=0` le lève.

### 3.6 Sauvegardes

`scripts/sauvegarde.sh` produit `oasis-data-AAAAMMJJ-HHMMSS.tgz`. L'écriture du magasin étant
atomique, une archive prise à chaud ne contient aucun fichier à moitié écrit. Le verrou n'entre
pas dans l'archive.

`src/sauvegardes.js` **dit l'état des sauvegardes**, dans `GET /api/health` et à la trace — au
démarrage puis chaque jour. Cinq verdicts, parce que la conduite à tenir diffère pour chacun :

| Verdict | Niveau | Pourquoi il est distinct |
|---|---|---|
| `ok` | `info` | Une archive de taille plausible, dans le seuil |
| `perimee` | **`erreur`** | La planification s'est arrêtée, et `age_h` dit depuis quand |
| `tronquee` | **`erreur`** | Un `tar` interrompu — **l'archive est fraîche et elle ne vaut rien** |
| `aucune` | **`erreur`** | Le répertoire existe et ne porte rien |
| `non_configure` | `alerte` | **La sonde ne sait pas.** Elle ne dit pas « ok » faute de pouvoir regarder |

Les deux derniers sont les seuls qui méritent discussion. « Introuvable » n'est pas « à jour » :
une sonde qui rassure faute de pouvoir regarder fournit l'assurance exacte qu'on n'a pas. Et
`non_configure` est une **alerte**, non une erreur — crier « erreur » sur ce qu'on ignore est la
meilleure façon de faire ignorer les vraies.

---

## 4. Le frontend

### 4.1 Deux régimes en cohabitation, et c'est délibéré

| | Lignes | État |
|---|---|---|
| **Socle commun** (`frontend/socle/`) | 3 209 | **TypeScript, 12/12** |
| **portail** — libellés, icônes, deux pages, état partagé, hôte des modules, démarrage, instances, et l'écran de configuration **en entier**, les libellés littéraux, la barre d'écran, l'écran des comptes, le profil, l'accueil, le journal d'audit, le téléphone et les aides (`frontend/portail/`) | 7 452 | **TypeScript, 100 %** — 5 169 comparaisons sans écart, puis **70 noms de surface figés** (5.e.5, 5.e.9) |
| **DROITS** (`frontend/droits/`) | 1 770 | **TypeScript, clos** |
| portail — le reste | **0** | `public/js/` n'existe plus (5.e.4). Les **84 gestes, 66 exercés** sont désormais relevés dans `frontend/portail/` |

**La surface globale du portail est passée de 135 noms à 61** — 72 le 13 octobre 2026
(5.e.5), puis 61 le 14 (5.e.9). La cohabitation obligeait les sas à poser sur `window`
tout ce qu'un fichier resté en JavaScript appelait, et ce fichier n'existe plus ; les
seize lectures que le portail faisait **sur lui-même** à travers `window` sont devenues
des imports.

Ce qui prouvait le balisage — douze comparateurs, 5 169 comparaisons — est devenu **pièce
d'archive** par décision de la maîtrise d'ouvrage ; le relais est pris par la suite
« parcours » (110 contrôles, 66 des 84 gestes) et par deux contrôles de surface : le
relevé figé des **70 noms** que la page pose, et le refus d'un nom publié sans lecteur
(`scripts/relever-surface.js`).

Une seule exception, et elle est déclarée **sur la ligne qui précède sa publication** :
`refreshNotifications` reste posée pour la preuve de la pastille des notifications, dont
le geste masque ce qu'on veut lire. La campagne imprime cette couture à chaque passage.
| PLAN, CARE, PR, RAMP, SURV | 55 893 | JavaScript — **gestes non relevés** (voir ci-dessous) |

### 4.1.1 « Gestes non relevés » — ce que cela veut dire, et ce que cela ne veut pas dire

Le terme était trop court dans la première version de ce document, et il a été mal compris.
Il ne signifie **pas** « non testés ». Il faut séparer deux choses que le mot « test » confond :

| | Ce qui est éprouvé | Combien |
|---|---|---|
| **Le serveur derrière l'écran** — routes, règles métier, permissions, données | par HTTP, **sans navigateur** | **588 contrôles** pour ces cinq écrans |
| **L'écran lui-même** — ce qui se passe quand on clique | dans un **vrai navigateur** | **65 contrôles** pour les neuf écrans réunis |

Ces cinq écrans portent **1 334 occurrences de geste** — boutons, formulaires, menus, champs.
Ce sont des *occurrences* et non des gestes nommés : le portail en compte 131 pour **84** noms
distincts, et la couverture se mesure sur les noms. Le relevé nommé de ces cinq écrans n'est pas
fait — il le sera par `scripts/relever-gestes.js`, une ligne par écran, au moment de leur suite
n° 0.

| Écran | Lignes | Gestes |
|---|---|---|
| PLAN | 5 949 | 135 |
| CARE | 6 428 | 145 |
| PR | 7 315 | 186 |
| RAMP | 12 470 | 365 |
| SURV | 23 731 | **503** |
| **Total** | **55 893** | **1 334** |

**Aucun n'est exercé dans un navigateur.** La suite « parcours » ouvre **un** écran de module
dans son cadre et vérifie qu'il n'est pas vide — c'est tout. Elle ne clique sur rien à
l'intérieur.

**Pourquoi c'est écrit plutôt que passé sous silence.** Le portail était dans le même état, et
il a été mesuré avant d'être touché. Le relevé : sur **cinq** vues, trois étaient ouvertes ; sur
**onze** sous-vues de configuration, **une** ; et sur les **78 gestes nommés** que le relevé
voyait alors — il y en a **84**, voir ci-dessous —, **aucun**. Un écran de 4 217 lignes était
couvert par « trois vues se remplissent et ne débordent pas ».

Ce relevé a lui-même dû être refait **deux fois**. La première version annonçait « quarante
gestes », qui étaient ceux d'**un fichier sur neuf**. La seconde en nommait 78, et n'en voyait
toujours que les quatre types d'événement `click`, `change`, `submit`, `input` : les sept
attributs de glisser-déposer de l'organigramme et un `onblur` lui échappaient, soit **84** en
réalité. Un dénominateur faux rend une couverture fausse, et
toujours dans le sens rassurant. La mesure est désormais faite par
[`scripts/relever-gestes.js`](../scripts/relever-gestes.js), qui instrumente la suite réelle
dans un navigateur, et son inventaire est **gardé à chaque campagne**.

Il n'y a aucune raison d'espérer mieux des cinq autres, et c'est pourquoi chacun aura sa
**suite n° 0** : relever ses gestes et les couvrir **avant** de le réécrire. On ne mesure pas une
réécriture contre rien.

**Ce que ce trou laisse passer, concrètement** : un défaut d'affichage ou d'interaction. Comme
`window.ICONS` — une icône absente, rendue par la chaîne vide, sur un écran par ailleurs
fonctionnel. Défaut réel, parfaitement silencieux, qu'aucun des 588 contrôles de serveur ne
pouvait voir.

Le socle sert **les deux régimes** : chaque fichier typé a un « sas de cohabitation »
(`frontend/socle/globales/`) qui publie les mêmes globales pour les écrans restés en JavaScript,
et les écrans en React l'importent — **typés par la source**, non par une déclaration écrite à
la main.

**Pourquoi cette distinction est la raison du chantier.** Une déclaration ambiante est une
affirmation sur le monde que personne ne vérifie. Deux fois elle a menti, pour la même cause :
un `const` au premier niveau d'un script crée une liaison *lexicale* et ne pose **rien** sur
`window`.

- `window.dtPriv` — l'écran s'arrêtait net, trouvé en ouvrant la page ;
- `window.ICONS` — **muet** : `(window.ICONS || {}).shield || ''` rendait la chaîne vide sans
  rien dire. Aucun contrôle ne l'aurait trouvé. Sa conséquence s'est révélée nulle, et il faut
  le dire plutôt que de s'attribuer une réparation.

### 4.2 La chaîne de construction

```
frontend/<module>/main.tsx  ──tsc --noEmit──►  esbuild  ──►  public/modules/<module>/app/main.js
frontend/socle/globales/*.ts ──────────────────────────────►  public/shared/app/oasis-*.js
frontend/portail/globales/portail.ts ──────────────────────►  public/app/portail.js
```

**Un paquet est construit si, et seulement si, une balise `<script>` d'une page le charge.**
Les quinze sas du portail que `portail.ts` importe voyagent dans son paquet : les construire
à part en ferait une seconde copie, avec son propre état de module — le défaut que 5.d.7 a
corrigé. La règle se **déduit** des pages, et deux refus la tiennent dans les deux sens :

| Situation | Ce que fait la construction |
|---|---|
| Un sas que charge une balise | il est construit : c'est un point d'entrée |
| Un sas qu'un point d'entrée importe | **non construit à part**, et nommé dans la sortie |
| Un sas que rien n'atteint | **refus**, en le nommant : du code mort qui se construisait |
| Une balise vers un paquet que rien ne produit | **refus** : servi tel quel, ce serait un 404 silencieux |

Avant cette règle (14 octobre 2026), la construction écrivait **4 484 Ko en 38 fichiers**
dans `public/app/`, dont **3 260 Ko et 30 fichiers que plus aucune page ne chargeait**.

**esbuild n'est pas un vérificateur de types** : il retire les annotations sans les lire. Le
typage ne vaut donc que par `tsc --noEmit`, que `npm run build` exécute **avant** lui. Sans
cette passe, on aurait le coût de TypeScript sans son bénéfice — la pire des deux positions.

esbuild plutôt que Vite : le serveur de développement de Vite ne servirait à rien ici, les
écrans étant servis par Express avec leurs sessions, leurs témoins et leur politique de contenu.

**Le paquet n'est pas versionné.** Un paquet obsolète servi en production est un défaut qui ne
se voit pas, et un fichier construit dans un diff masque ce qui a réellement changé. La
conséquence est assumée : `npm run smoke` construit avant d'éprouver, et le `Dockerfile` a son
étape. *Un écran qui ne se construit pas ne se déploie pas.*

| | |
|---|---|
| Paquet DROITS, régime production | **254 Ko** |
| Paquet DROITS, régime développement | 3,2 Mo (React de développement + carte de source) |
| Sas du socle, douze fichiers | **372 Ko** |

### 4.3 Ce que le typage tient, et qu'aucun contrôle de forme ne peut tenir

Le répertoire de traduction de DROITS est typé par son volet français :

| Ce qui devient impossible | Erreur rendue |
|---|---|
| Une traduction manquante dans un volet | `TS2741` |
| Une clé en trop dans un volet | `TS2353` |
| **Une clé appelée qui n'existe pas** | `TS2345` |

La troisième a trouvé un défaut réel en place depuis la réécriture : `dt('chargement')`,
**appelée et absente de la table**. La légende d'attente de l'écran annonçait « chargement » en
français comme en anglais comme en portugais.

### 4.4 Hors-ligne

| Pièce | Rôle |
|---|---|
| `public/sw.js` | Trois régimes : navigation réseau d'abord, ressources cache d'abord, lectures d'API réseau d'abord avec repli marqué. **Les écritures n'y passent jamais.** |
| `frontend/socle/hors-ligne.ts` | La file des écritures différées (IndexedDB), son rejeu ordonné, le bandeau |
| `public/manifest.webmanifest` + icônes | L'application s'installe sur l'écran d'accueil |

**La décision qui gouverne ce chantier : une liste d'autorisation, pas une liste d'exclusion.**
Différer la saisie d'une fiche d'inspection est le but du mode dégradé. Différer une validation,
une transmission à l'exploitant ou une clôture d'écart serait autre chose : ce sont des **actes
d'autorité**, pris par quelqu'un qui décide, à un moment qui compte. Les rejouer trois heures
plus tard sur un dossier qui a bougé, c'est signer à l'aveugle.

**Six écritures** sont admises, et six seulement — la fiche d'inspection RAMP et ses
commentaires, le dossier de surveillance et ses constatations. Les bornes `$` des motifs
écartent `/submit`, `/close`, `/return`, `/transmettre`, `/validate-pac`. **Ce qu'on oublie
d'inscrire est refusé**, et un contrôle de source arrête quiconque y ajouterait un verbe de
circuit.

**Ce qui est assumé et écrit** : une écriture différée rend un 202, et l'écran affiche
« enregistré ». C'est vrai pour l'agent — sa saisie est retenue — mais pas pour le serveur.
L'écart se rattrape par le bandeau, qui reste tant qu'il y a quelque chose en attente et dit
combien. **Un rejeu refusé ne disparaît jamais** : il passe en « à reprendre » avec sa date de
saisie et la raison du refus.

---

## 5. Le socle Java

**2 255 lignes, 15 fichiers, Java 21, Maven en monodépôt** —
[ADR-002](ADR-002-migration-spring-boot.md) n° 3.

| Paquet | Rôle |
|---|---|
| `magasin/` | `Magasin` route collection par collection, PostgreSQL ou fichiers — **ses deux listes recopient celles de `src/magasin.js`, et un contrôle compare les deux** |
| `journal/` | `JournalDesModules` — vérification de la chaîne SHA-256 |
| `securite/` | `Sessions`, `Utilisateur` |
| `droits/` | `DroitsControleur`, `MoteurDeDroits` — le module DROITS, porté |

`DATABASE_URL` est **la même variable pour les deux socles** : deux adresses à tenir
divergeraient, et chacun servirait une base différente en ayant raison de son côté. Une adresse
donnée mais incomprise **arrête le démarrage** plutôt que de servir en silence le mauvais
régime, et le mot de passe n'apparaît dans aucun message ni aucune trace.

`scripts/passerelle.js` permet de servir une partie des routes par Java et le reste par Node,
derrière une liste d'autorisation. La suite « droits » passe à travers : **20/20**, Java 11
routes, Node 7.

> **Le jalon n° 9 avait cassé ce socle sans que rien ne le dise.** Les journaux d'audit sont
> passés en base le 29 septembre ; `Magasin.java` lisait toujours les fichiers, et en régime
> base `module_audit.jsonl` n'existe même plus. La vérification de chaîne annonçait
> **`{valid: true, total: 0}`** — un satisfecit sur un journal vide, le pire mode de défaillance
> pour un outil d'autorité. **Aucun contrôle ne l'a dit.** C'est ce qui a motivé le contrôle qui
> compare désormais les deux listes de collections.

---

## 6. Les modules

### 6.1 Onze au catalogue, six montés

`config/modules.json` porte les **onze modules des TDR** — ce sont les cartes du portail.
`src/modules/*/module.json` porte les manifestes de ce qui est **réellement bâti**. Le chargeur
les découvre, les trie par priorité, et les monte.

| Code | TDR | Nom | Monté |
|---|---|---|---|
| PLAN | D.6 | Planification de la Surveillance | **✓** |
| SURV | D.7.1 | Exécution de la Surveillance | **✓** |
| CARE | D.7.2 | Mesures d'Application | **✓** |
| RAMP | D.8 | Inspections d'aéronefs sur aire de trafic | **✓** |
| PR | D.6 | Profils de Risques | **✓** |
| DROITS | *socle* | Gestion des Droits | **✓** |
| REG | D.1 | Réglementation | — |
| FORM | D.2 | Formations et Qualifications | — |
| DOC | D.3 | Documentation / GED | — |
| CERT | D.4 | Certifications & Autorisations | — |
| COM | D.5 | Communication États & Commission | — |
| RISK | D.9 | Gestion des Risques de Sécurité | — |
| PAY | D.10 | Paiement des Actes Courants | — |

**Six montés, mesuré au démarrage** : `CARE`, `DROITS`, `PLAN`, `PR`, `RAMP`, `SURV`. PR et
DROITS ne sont pas des modules des TDR — le premier sert la surveillance basée sur les risques,
le second est transversal.

Un module qui n'expose pas `register(app, deps)` n'est **pas monté**, et la trace le dit : un
module à demi chargé serait pire qu'un module absent.

### 6.2 Le bus de services

Les modules ne s'appellent pas directement : ils publient des contrats, nommés et documentés.
**Quinze contrats**, et `services.call` rend **toujours** une promesse, quoi que fasse le
producteur — converti pendant que tous les producteurs étaient encore synchrones, de sorte qu'il
n'y aura plus rien à reprendre chez les consommateurs le jour de chaque bascule.

| Module | Contrats publiés |
|---|---|
| PLAN | `plansValides`, `riskProfiles`, `volumeParInstance` |
| SURV | `activitesDeclenchees`, `constatationsOuvertes`, `pacDeConstatation`, `volumeParInstance` |
| RAMP | `constatationsCritiques`, `pacDeConstatation`, `volumeParInstance` |
| CARE | `mesuresParConstatation`, `suitesParConstatation`, `volumeParInstance` |
| PR | `riskProfiles` |
| MON | `service` |

**Le graphe du bus n'a qu'une seule composante** : PLAN et SURV forment un cycle
(`PLAN.plansValides` ↔ `SURV.activitesDeclenchees`), et `src/instances.js` consomme
`volumeParInstance` de **chacun** des six modules. « Avancer par grappes de bus » n'est donc pas
une voie intermédiaire — c'est le grand soir.

---

## 7. Sécurité

| Mesure | État |
|---|---|
| Hachage des mots de passe | **scrypt** |
| Sessions | serveur, en collection `sessions` (migrée en base) |
| Second facteur | `mfa_challenges`, désactivable par `OASIS_MFA` |
| Politique de contenu | CSP posée ; **stricte** sur `/login.html` et `/cookies.html` — plus aucun script en ligne |
| En-têtes | `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Limitation de débit | **20 tentatives par 15 minutes** et par IP sur la connexion, avec `Retry-After` |
| Anti-CSRF | en-tête `X-OASIS-Request` exigé sur toute écriture ; `403 origine_non_reconnue` sinon |
| Journal d'audit | **chaîne SHA-256**, en ajout seul |

### 7.1 Le journal d'audit est scellé

Chaque entrée porte le condensé de la précédente :

```
h(n) = SHA-256( h(n-1) | ts | user | action | JSON(details) )
```

La chaîne part de `AEROSUP-GENESIS`. L'inscription passe par `magasin.journalChainer`, qui rend
le geste atomique — file d'attente sur fichiers, **contrainte d'unicité en base**. Retirer ou
modifier une entrée rompt la chaîne de façon détectable, et c'est le point : les traces d'une
autorité de l'aviation civile se citent.

### 7.2 Ce que le journal ne consigne pas

**Aucun verbe de consultation.** Lire un dossier n'est pas un acte : consigner chaque lecture
remplirait le journal de bruit et noierait les actes qu'il doit prouver. Un contrôle vérifie
qu'aucun verbe de consultation n'y entre.

### 7.3 Conservation des données

`src/retention.js` range chaque collection sous une durée et une conduite. Les actes
d'autorité — surveillance, mesures d'application, profils de risque — sont sous
**`conserver`** : *un logiciel qui effacerait de lui-même un acte de surveillance serait une
faute.* Un garde-fou de forme interdit tout `remove` ou filtre destructeur sur ces collections,
parce que le jour où l'on voudra « faire le ménage », la suppression paraîtra légitime.

Le journal des envois de courrier, lui, est borné à un trimestre : au-delà il ne prouve plus
rien et ne fait que conserver des adresses.

---

## 8. Déploiement

### 8.1 L'image

**Trois étages** — dépendances, construction des écrans, image servie. Compte non privilégié
(`USER oasis`), port 4750, sonde de santé toutes les 30 secondes.

L'étage de construction porte un piège qui a coûté une mise en production : `NODE_ENV=production`
fait sauter les dépendances de développement à `npm ci`, et **esbuild en est une**. D'où le
`--include=dev` explicite — sans lui, l'échec dit « esbuild introuvable », très loin de sa cause.

`.dockerignore` exclut `public/shared/app/` et `public/modules/*/app/` : sans cela, le paquet
construit sur le poste du développeur est **passé en fraude** dans l'image, qui paraît alors
correcte sans que rien dans la chaîne l'ait construite.

### 8.2 Render

| | |
|---|---|
| Région | Francfort — la plus proche de l'Afrique de l'Ouest |
| Commande de construction | `npm ci --include=dev && npm run build` |
| Sonde | `/api/health` |
| Déploiement | automatique sur `main` |

Un service à disque ne tourne qu'en une instance : la contrainte « un seul processus par
répertoire » est tenue par la plateforme, et le verrou ne fait que la rendre visible.

### 8.3 Intégration continue

Quatre tâches, et chacune éprouve ce qu'aucune autre ne couvre :

| Tâche | Ce qu'elle éprouve |
|---|---|
| `verifier` | Vulnérabilités, syntaxe, **la campagne entière sur fichiers** |
| `base` | Un service `postgres:16` : les 12 contrôles du magasin, **puis la campagne entière servie depuis la base** |
| `contrats` | Les vecteurs d'octets, et **Java qui les satisfait** |
| `image` | L'image construite, démarrée, et **chaque paquet d'écran effectivement servi** — la liste étant dérivée du dépôt, non recopiée |

Cinq garde-fous de forme tiennent ces tâches, chacun contre-essayé : le service doit être un
PostgreSQL, les deux épreuves doivent porter leurs adresses — distinctes à dessein —, et la
campagne sur fichiers ne doit porter **aucune** adresse de base.

### 8.4 Variables d'environnement

**26 variables**, toutes commentées dans `.env.example`. Les décisives :

| Variable | Effet |
|---|---|
| `DATABASE_URL` | **Donne le régime** : PostgreSQL si présente, fichiers sinon. La même pour Node et Java |
| `OASIS_DATA_DIR`, `OASIS_CONFIG_DIR` | Répertoires surchargeables |
| `OASIS_VERROU=0` | Lève le verrou de répertoire, pour l'opérateur qui sait pourquoi |
| `OASIS_SAUVEGARDES_DIR` | Où la sonde regarde |
| `OASIS_MFA` | Second facteur |
| `OASIS_SEED_PASSWORD` | Mot de passe d'amorçage |
| `OASIS_SMOKE_BASE` | Fait jouer les suites **contre une adresse** plutôt qu'un serveur local |

---

## 9. Contrôles automatiques

**917 contrôles**, verts, vérifiés au code de sortie.

| Suite | Contrôles | Portée |
|---|---|---|
| RAMP | **305** | Inspections sur aire de trafic |
| SURV | 103 | Exécution de la surveillance |
| CARE | 84 | Mesures d'application |
| PLAN | 65 | Planification |
| Socle | 61 | Serveur, authentification, référentiels |
| `taille` | 51 | **Garde-fous de forme** |
| Parcours | 39 | Navigateur réel |
| PR | 31 | Profils de risques |
| `traductions` | 24 | Les sept tables, les trois volets |
| DROITS | 20 | Gestion des droits |
| Unitaires | 110 | Magasin, verrou, sauvegardes, rétention |
| MFA | 11 | Second facteur |
| `frontend` | 8 | **Surface du socle et déclarations** |
| Magasin PostgreSQL | 5 *(+12 contre un vrai serveur)* | Contrats des deux magasins |

### 9.1 Le principe qui gouverne ces suites

**Un contrôle qu'on n'a pas vu échouer ne protège de rien.** Chaque contrôle de ce dépôt est
contre-essayé en réintroduisant le défaut pour lequel il est écrit, et les cas où le
contre-essai **ne mord pas** sont nommés dans les ADR plutôt que passés sous silence.

Ce n'est pas une précaution de style. La liste des défauts que cette discipline a trouvés dans
les contrôles eux-mêmes est longue, et quelques-uns méritent d'être cités parce qu'ils disent
tous la même chose :

- **le garde-fou des anciens chemins n'aurait pas attrapé le défaut pour lequel il était
  écrit** : il cherchait la chaîne littérale, et la ligne qui est réellement tombée assemblait
  le chemin par segments ;
- **un détecteur d'écritures différables rendait « 0 entrée(s) »** — il se taisait au moment
  même où la liste changeait de fichier ;
- **le contrôle des accents portugais a été muet deux fois**, aux deux changements de forme
  d'une table : la première lacune valait 84 traductions non vérifiées ;
- **un contrôle de sous-vues mesurait onze fois la même page** — les onze relevées à 1 490
  caractères ;
- **`horsPortee` n'était pas importé** dans la suite des garde-fous, qui l'appelle six fois :
  chaque appel levait, c'est-à-dire que la suite tombait en exception *pile au moment où elle
  devait dire « hors de portée »*.

Tous sont du même genre : **un instrument qui se tait quand la chose qu'il mesure change**. Et
tous ont été trouvés en contre-essayant, aucun en relisant.

### 9.2 Injection de fautes

Les régimes dégradés sont éprouvés, non supposés : `OASIS_BUS_DIFFERE=1` (bus asynchrone),
`OASIS_PG_ESSAI` (magasin contre un vrai serveur), `OASIS_MFA=1`, `OASIS_SONDE_SAUVEGARDES=0`,
`DATABASE_URL` (régime base de bout en bout).

---

## 10. Accessibilité et internationalisation

| | |
|---|---|
| Langues | **trois**, sur toute la surface — y compris les phrases d'erreur du serveur |
| Phrases du serveur traduites | table dédiée ; un contrôle vérifie que **chaque phrase émise** y figure avec ses deux traductions et les mêmes trous |
| Boutons à icône | `aria-label` exigé par un contrôle de forme — **105** en étaient dépourvus |
| Accents portugais | un contrôle interdit le retour de formes déjà corrigées |

---

## 11. Ce qui n'est pas fait

Nommé, parce qu'une spécification qui ne dit que ce qui marche n'est pas une spécification.

### 11.1 Chantiers mesurés et ouverts

| | Où |
|---|---|
| **`instances`**, la 14ᵉ collection | 15 accès dans un fichier, mais **135 appels** dans 18 fichiers. Deux de ses fonctions décident **ce qu'un agent voit des autres États** : un `await` oublié n'y rend pas une erreur, il rend un filtre qui ne filtre pas ([ADR-002](ADR-002-migration-spring-boot.md) n° 14) |
| **Le portail et cinq écrans** en React | 60 110 lignes. Le portail a ses contrôles posés ; les cinq autres sont **non mesurés** ([ADR-003](ADR-003-cadre-du-frontend.md) n° 5.c) |
| **La bascule en production** | Attend la spécification de réplication de l'URSAC — c'est elle qui décide de l'architecture ([ADR-001](ADR-001-magasin-de-donnees.md) n° 1) |

### 11.2 Écarts à la fiche technique, assumés

Keycloak, Camunda/Flowable, MinIO, Prometheus/Grafana, K3s : **aucun n'est en place**, et
chacun est un chantier nommé dans [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md). Le cloisonnement
entre États est **logique**, non physique — c'est exactement le modèle que la fiche écarte
nommément.

Les cinq atouts de PostgreSQL que la fiche invoque — réplication logique native, Row-Level
Security, `pgcrypto`, JSONB, recherche plein texte — **ne sont pas exercés**. Y être et s'en
servir sont deux états différents : le moteur sert treize collections, et aucun de ces cinq
atouts n'est mis en œuvre pour autant.

### 11.3 Limites connues, non corrigées

- **Pas de restauration à un instant donné.** Les archives horodatées sont le seul recours.
  Et une sauvegarde jamais restaurée est une hypothèse, pas une protection : **la restauration
  n'a pas été éprouvée**.
- **La construction ne nettoie pas sa sortie.** Un point d'entrée renommé laisserait l'ancien
  paquet en place, et la page continuerait de le servir. Sans conséquence en conteneur — l'arbre
  y est neuf — mais la propriété n'est pas tenue localement.
- **La redirection vers la connexion n'est couverte par personne.** Qu'elle s'ouvre dans la
  fenêtre entière et non dans le cadre du portail est le point du code qui la porte ; la suite
  « parcours » *tolère* les 401 sans éprouver la redirection.
- **`unsafe-inline` subsiste** sur les écrans internes, le temps que leurs gestionnaires hérités
  du portage soient externalisés. Les deux pages atteintes sans être connu en sont déjà
  dépourvues — c'est là que le durcissement vaut le plus et coûte le moins.
- **Deux noms globaux sans propriétaire** — `APP_STATE`, `PESSCO` : posés par une page, lus par
  plusieurs modules, définis par aucun. Ils resteront.

---

## 12. Les décisions qu'il faut connaître pour lire ce code

Cinq, et aucune ne se devine :

1. **`json`, pas `jsonb`** — `jsonb` réordonne les clés, ce qui brise le sceau SHA-256 des
   journaux (§ 3.3).
2. **Liste d'autorisation pour le mode hors ligne, pas liste d'exclusion** — ce qu'on oublie
   d'inscrire est refusé, parce qu'un acte d'autorité ne se rejoue pas trois heures plus tard
   (§ 4.4).
3. **Aucun verbe de consultation au journal** — consigner les lectures noierait les actes
   (§ 7.2).
4. **Rien n'est jamais purgé des actes de surveillance** — et un garde-fou interdit d'y revenir
   (§ 7.3).
5. **Le paquet du frontend n'est pas versionné** — un paquet obsolète en production est un
   défaut invisible (§ 4.2).

---

## 13. Les documents voisins

| Document | Ce qu'il dit |
|---|---|
| [CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md) | Le prescrit contre le livré, prescription par prescription |
| [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md) | Les vagues, et ce que chacune ferme |
| [ADR-001](ADR-001-magasin-de-donnees.md) | Magasin de données : différer la bascule, spécifier la réplication |
| [ADR-002](ADR-002-migration-spring-boot.md) | Migration Spring Boot : le chemin, et les quatorze jalons |
| [ADR-003](ADR-003-cadre-du-frontend.md) | React + TypeScript, module par module |
| [MAGASIN-POSTGRESQL.md](MAGASIN-POSTGRESQL.md) | Le magasin : gestes, épreuves, régimes |
| [SECURITE.md](SECURITE.md) | Politique de sécurité, mesures et points ouverts |
| [architecture-uml.md](architecture-uml.md) | Modèle de données et enchaînements |
| [../DEPLOYMENT.md](../DEPLOYMENT.md) | Les gestes de déploiement et d'exploitation |

---

## 14. Contredire ce document

Chaque chiffre ci-dessus se relève. Si l'une de ces commandes ne rend pas ce qui est écrit,
**c'est le document qui a tort** — et il faut le corriger plutôt que de s'en accommoder.

```bash
# Pile et volumes
node -e "const p=require('./package.json');console.log(p.engines, Object.keys(p.dependencies).length+' deps')"
wc -l server.js && find src -name '*.js' -exec cat {} + | wc -l       # serveur : 1 323 + 19 824
find frontend \( -name '*.ts' -o -name '*.tsx' \) | wc -l             # TypeScript : 53 fichiers
find frontend \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l   # 7 672 lignes
cat public/js/*.js public/modules/*/js/*.js | wc -l                   # JS restant : 58 515
find backend-java conformite-java -name '*.java' -exec cat {} + | wc -l    # Java : 2 255

# Routes
grep -rhoE "\b(app|router|r)\.(get|post|put|patch|delete)\(" server.js src/ | wc -l   # 390

# Magasin
node -e "const m=require('./src/magasin.js');console.log(m.MIGREES.size,'migrées —',[...m.JOURNAUX_MIGRES])"
ls data/*.json | wc -l                                                # 16 = 14 collections + 2 journaux
grep -c 'JSON NOT NULL' src/store_pg.js                               # et non JSONB

# Modules : les manifestes présents…
grep -o '"code": *"[A-Z]*"' src/modules/*/module.json | sed 's/.*: *//'
# …et ceux réellement MONTÉS, qui est une autre question : un module sans
# `register(app, deps)` porte un manifeste et n'est pas monté. La trace de
# démarrage est la seule à le dire.
#
# Le répertoire est jetable : le serveur y crée des comptes d'amorçage et en
# imprime les mots de passe, qui partent avec lui. Rend :
#   "modules":["CARE","DROITS","PLAN","PR","RAMP","SURV"]
T=$(mktemp -d)
OASIS_VERROU=0 OASIS_DATA_DIR="$T" PORT=4799 node server.js > "$T/boot.log" 2>&1 &
PID=$!; sleep 5; grep -o '"modules":\[[^]]*\]' "$T/boot.log"; kill "$PID"; rm -rf "$T"

# Gestes des cinq écrans non relevés (§ 4.1.1) — attendu : 1 334
for m in planification mesures profil_risque ramp execution; do
  # Dix types d'événement, et non quatre : la première écriture de cette ligne en
  # connaissait quatre, et manquait tout le glisser-déposer (ADR-003, 5.c.11).
  printf "%-16s %s\n" "$m" "$(grep -rhoE 'on(click|change|submit|input|blur|mousedown|dragstart|dragover|dragleave|drop)=|addEventListener\(' \
    public/modules/$m/js/*.js public/modules/$m/*.html 2>/dev/null | wc -l)"
done

# Couverture des gestes d'un écran (§ 4.1.1) — portail : 66 sur 84, et c'est le plafond
node scripts/relever-gestes.js portail | head -8

# Surface globale du portail (§ 4.1) — attendu : 61 publiés, 1 couture, 0 muet
node scripts/relever-surface.js | tail -1

# Les noms publiés sans lecteur, s'il en reparaît un (la liste doit être vide)
node scripts/relever-surface.js --muets

# Les types de message qu'un module adresse au portail — attendu : 6 envois, et
# tous écoutés (`oasis:back-portal` et le motif `*:page`). La suite « taille »
# refuse un type sans écouteur ; voici de quoi le voir à l'œil.
grep -rhoE "postMessage\(\{[^}]*type: *'[^']+'" public/modules frontend \
  | grep -v '/app/' | sed -E "s/.*type: *'([^']+)'.*/\1/" | sort | uniq -c

# Contrôles
npm run smoke; echo "code de sortie : $?"                            # 1 003, et 0

# Composants prescrits et absents : chaque ligne doit rendre 0
grep -rli 'keycloak\|openid\|oidc' src server.js | wc -l
grep -rli 'bpmn\|flowable\|camunda' src public | wc -l
grep -rli 'prometheus\|grafana\|/metrics' src server.js | wc -l
grep -rn 'aes-256\|createCipher' src | wc -l
```

---

*Document d'état. Il périmera — c'est sa nature. Le § 14 est ce qui permet de s'en apercevoir.*
