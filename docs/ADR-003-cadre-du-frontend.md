# ADR-003 : Cadre du frontend

**Statut :** Accepté
**Date :** 3 octobre 2026
**Décideurs :** maîtrise d'ouvrage OASIS ; GT2 pour la conformité à la fiche technique
**Clôt :** le jalon n° 8 d'[ADR-002](ADR-002-migration-spring-boot.md) — « acter par écrit
le cadre du frontend »
**Remplace :** la recommandation contraire de [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md) § vague 4

---

## Contexte

La fiche technique prescrit un frontend **PWA React + TypeScript**. L'application en
produit la PWA — manifeste, icônes, service worker, mode dégradé éprouvé — mais son
code d'écran est du **JavaScript sans cadre** : zéro fichier `.ts`, zéro dépendance de
développement, aucune étape de construction. Le constat est porté par
[CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md) depuis l'audit.

Deux documents de ce dépôt **déconseillaient** d'y aller : le plan de conformité
(« réécriture complète, aucun gain fonctionnel ») et ADR-002 (« un second chantier, de
même ampleur »). Ces avis étaient techniques, et ils reposaient sur une mesure juste —
celle du volume. Ils ne tranchaient pas la question, qui n'est pas technique : **la
conformité à la fiche technique est une exigence de la maîtrise d'ouvrage**, et c'est
elle qui en dispose.

### Ce que disent les mesures

| | |
|---|---|
| JavaScript d'écran | **63 434 lignes**, 93 fichiers |
| Pages HTML | **9** |
| Modules à reprendre | **7**, du plus petit au plus gros |
| Fichiers TypeScript | **0** |
| Dépendances de développement | **0** — aucune étape de construction |
| Contrôles qui couvrent les écrans | **22** (parcours, vrai navigateur) + **24** (traductions) |

Le détail par module, qui décide de l'ordre :

| Module | Lignes | Fichiers |
|---|---|---|
| DROITS | **933** | 2 |
| `public/shared/js` (socle commun) | 2 250 | 12 |
| `public/js` (portail) | 4 217 | 9 |
| PLAN | 5 949 | 13 |
| CARE | 6 428 | 9 |
| PR | 7 315 | 11 |
| RAMP | 12 470 | 13 |
| SURV | **23 731** | 24 |

### Ce qui ne change pas, et c'est ce qui rend l'opération faisable

**Le backend n'est pas touché.** Les écrans parlent à `/api/…` et rien d'autre ; le
contrat REST — 386 routes — est stable, éprouvé par 854 contrôles, et il vient d'être
rendu indépendant du magasin (ADR-002, jalon n° 13, clos). Un écran réécrit interroge
les mêmes routes avec les mêmes charges.

C'est la même raison qui rend la réécriture du socle en Java possible sans toucher au
front : **les deux chantiers sont séparés par le contrat REST**, et peuvent avancer
sans se croiser.

---

## Décision

**Le frontend passe à React + TypeScript, module par module, en cohabitation.**

1. **React + TypeScript**, tel que la fiche le prescrit. C'est le seul choix qui ferme
   le constat de conformité : React sans TypeScript le laisserait à moitié ouvert.
2. **Module par module**, chacun derrière sa suite de contrôles, les autres servis
   comme aujourd'hui pendant la bascule.
3. **DROITS d'abord** — 933 lignes, 2 fichiers, 20 contrôles. Le plus petit, pour
   mesurer le coût réel d'un module avant d'engager les sept autres. C'est la méthode
   qui a servi à la bascule du magasin, et elle a tenu cinq fois.

---

## Options considérées

### Option A — React + TypeScript, module par module *(retenue)*

| Dimension | Évaluation |
|---|---|
| Complexité | **Haute**, mais découpée en huit morceaux inégaux |
| Coût | Proportionnel au volume ; DROITS le dira |
| Conformité | **Complète** — c'est la prescription, mot pour mot |
| Risque | **Borné par module** : un module en cours de reprise est le seul exposé |

**Pour** : le constat se ferme ; chaque module reste éprouvé par sa suite pendant
l'opération ; le contrat REST isole le backend ; un échec sur un module n'emporte pas
les autres.
**Contre** : huit chantiers à mener, dont un de 23 731 lignes ; une étape de
construction à introduire là où il n'y en a aucune, donc un `Dockerfile` et un
déploiement à reprendre.

### Option B — React sans TypeScript

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne — pas de typage à écrire |
| Conformité | **Partielle** : le cadre arrive, le typage non |

**Pour** : sensiblement moins de travail ; pas de typage des charges des 386 routes à
tenir à jour.
**Contre** : le constat de conformité resterait ouvert, et il faudrait l'écrire tel
quel. On aurait payé la réécriture sans en retirer la conformité qui la motivait.

### Option C — Réécriture d'un bloc

**Pour** : une seule migration, pas de cohabitation à tenir.
**Contre** : l'application serait sans contrôle de bout en bout pendant des mois. C'est
un outil d'autorité en service dans huit États ; ce n'est pas défendable.

### Option D — Rester sans cadre

C'était la recommandation technique de ce dépôt, et elle avait ses raisons : aucun gain
fonctionnel, et l'offline-first ne l'exige pas — un service worker s'écrit en
JavaScript ordinaire. **Écartée par la maîtrise d'ouvrage** : la conformité à la fiche
est une exigence, non un arbitrage d'ingénierie.

---

## Analyse des compromis

Le compromis n'est pas « React contre vanilla ». Il est **« payer 63 434 lignes de
réécriture pour une conformité exigée, ou la laisser ouverte »** — et cette question
n'appartient pas à l'ingénierie.

Ce que l'ingénierie peut dire, et qui a été dit :

1. **Le volume est réel et il ne se négocie pas.** SURV seul pèse 23 731 lignes, plus
   que les quatre plus petits modules réunis.
2. **Le découpage est possible**, et c'est ce qui change tout. Le contrat REST sépare
   les deux moitiés de l'application ; la bascule du magasin vient de prouver qu'une
   migration collection par collection tient, cinq fois de suite, sous contrôles.
3. **Le typage a un coût qu'on sous-estime toujours** : les charges de 386 routes à
   décrire, et à tenir d'accord avec un backend qui bouge. C'est aussi ce qui donne sa
   valeur à l'opération — un contrat de route décrit est un contrat vérifié.

---

## Conséquences

**Ce qui devient plus facile**
- Le constat de conformité « React + TypeScript » se ferme, module par module.
- Les charges des routes, aujourd'hui tacites, deviennent des types vérifiés à la
  construction. Un champ renommé au backend ne passera plus en silence.
- Les écrans de 2 000 lignes se découpent en composants, ce que les garde-fous de
  taille réclament déjà fichier par fichier.

**Ce qui devient plus difficile**
- **Une étape de construction là où il n'y en avait aucune.** Aujourd'hui `COPY public`
  suffit, et `express.static` sert les fichiers tels quels. Il faudra un `Dockerfile` à
  deux temps, une commande de construction au déploiement, et décider ce qui est versionné.
- **La cohabitation** : deux manières d'écrire un écran dans le même dépôt, le temps de
  la bascule. Les garde-fous de forme devront nommer les deux.
- Le mode dégradé et le service worker — éprouvés, 25 contrôles — sont à reprendre avec
  le cadre, et non à côté.

**Ce qu'il faudra revoir**
- Après DROITS : le coût réel, mesuré, avant d'engager les sept autres modules. Si le
  coût d'un module de 933 lignes ne se projette pas raisonnablement sur 23 731, cet ADR
  se rouvre.
- L'ordre des modules, si une échéance métier l'impose.

---

## Suites

0. [x] **Éprouver l'écran avant de le réécrire** — fait le 3 octobre 2026, et c'est venu
       en premier pour une raison qu'il faut dire : **aucun contrôle n'ouvrait l'écran
       DROITS dans un navigateur.** Les vingt contrôles de la suite « droits » parlent à
       l'API, et une API verte ne dit rien d'un écran qui reste blanc.

       On ne mesure pas une réécriture contre rien. Quatre contrôles décrivent donc ce que
       l'écran fait **aujourd'hui**, en vanilla : il se monte et se remplit, il liste les
       comptes avec leur privilège en pastille, il ne déborde pas à droite, et sa page de
       journal montre que la chaîne d'audit est intacte. Contre-éprouvés trois fois — rendu
       supprimé, pastille retirée, bandeau d'intégrité ôté.

       C'est à ces quatre contrôles que la version React devra répondre, à l'identique.
       Ils sont la définition de « la réécriture marche ».

1. [x] **Reprendre DROITS en React + TypeScript** — l'écran le 3 octobre 2026, le module
       **entier le 6**. Les six contrôles de navigateur passent, à l'identique, et les 20
       contrôles de la suite « droits » n'ont pas bougé : l'API n'est pas touchée.

       **Ce jalon est resté trois jours « fait » avec 379 lignes de JavaScript dedans.**
       `dr-i18n.js`, le répertoire de traduction, chargé en `<script>` classique et lu par
       quatre déclarations écrites à la main. Le compte des lignes converties était juste ;
       le mot « fait » ne l'était pas.

       `socle.ts` portait la justification : « 390 lignes de tables, que **rien ne gagnerait**
       à passer en TypeScript et qu'un portage exposerait à la faute de frappe ». **C'était
       faux, et la conversion l'a prouvé avant d'être finie.** Les trois volets se typent les
       uns par l'autre, et le volet français définit les clés :

       | Ce que le type interdit | Contre-essai |
       |---|---|
       | Une traduction manquante dans un volet | `nav_audit` ôté du portugais → `TS2741` |
       | Une clé en trop dans un volet | `cle_inventee` en anglais → `TS2353` |
       | Une clé appelée qui n'existe pas | `dt('chargement')` → `TS2345` |

       Les trois arrêtent la **construction**, ce qu'aucun contrôle de forme ne peut faire.

       **Et la troisième a trouvé un défaut réel, en place depuis la réécriture.**
       `dt('chargement')` était appelée dans `App.tsx` et **absente de la table** : la légende
       d'attente de l'écran annonçait « chargement », en français comme en anglais comme en
       portugais. Aucun contrôle ne l'aurait dit — la suite « parcours » attend que l'attente
       s'en aille, non qu'elle se nomme.

       Corrigé en **ôtant l'appel** : `oasis-loader` porte déjà « Chargement… » dans les trois
       langues et la lit du contenu de l'élément. Une clé de moins à traduire, et le libellé
       au seul endroit qui le dessine.

       **Quatre affirmations sur `window` s'en vont** — `window.dt`, `window.DR`, et les deux
       globales lexicales `dtPriv` / `dtPrivDesc`. C'est ici que vivait `dtPriv`, **le premier
       des deux mensonges déclaratifs** qui ont motivé la suite `frontend`. Ne reste que
       `ICONS`, qui partira avec le dernier `const` publié par un sas.

       **Un état par défaut supprimé plutôt que gardé.** La première écriture réglait la langue
       par un `poser(lang, module)` appelé avant le premier rendu : le même défaut déplacé. Un
       état qu'il faut régler avant de lire a un état « pas encore réglé », et son secours —
       français, espace `PLAN` — est *plausible*, donc silencieux. L'ancien code **levait**
       (« DR is not defined »), et c'est ainsi qu'on l'avait trouvé. La langue se lit donc de
       `localStorage` au chargement, comme la lisent déjà quatre fichiers du socle ; l'espace
       de `window.DR_MODULE`. Plus d'ordre à tenir pour personne.

       Les trois volets sont repris **à l'octet**, et l'équivalence mesurée sur **3 000
       comparaisons** : 101 clés × 5 langues × 5 espaces, les six échelons de privilège, leurs
       descriptions, les textes à trou, la clé inconnue, la langue inconnue. Trois
       contre-essais, trois morsures — dont une qui ne rend pas un écart mais une exception :
       ôter le repli de langue fait lever la comparaison. Elle refuse de passer, et c'est ce
       qui compte, mais le message est une pile d'appels et non un écart nommé.

       **Deux garde-fous qui se taisaient, ou allaient se taire.**

       · *Le contrôle des accents portugais était **muet** sur la table convertie.* Il cherche
         `pt: {` ou `EXEC_TR.pt` ; une table en TypeScript ouvre `const PT … = {`. Faute de
         marqueur, le fichier tombait dans la branche des paires et des triplets — **lu, et
         vide**. « Gestao » sans tilde, « Codigo » sans accent : verts tous les deux.
         **Deuxième fois que ce contrôle se tait au changement de forme d'une table** ; la
         première avait coûté 84 traductions non vérifiées. Trouvé en contre-essayant, non en
         relisant.
       · *Le répertoire des tables était écrit à la main.* Il se déduit désormais —
         `frontend/<nom>` quand il existe, `public/modules/<nom>/js` sinon. Celui-là ne s'est
         **pas** tu : il a rendu « DROITS (fr:0 en:0 pt:0) », et c'est ainsi qu'on l'a su. Mais
         il ne faut pas compter là-dessus cinq fois de suite.

       **Un garde-fou de plus, écrit pour les cinq conversions qui suivent** : aucun fichier ne
       nomme le `js/` d'un module converti. Celui du socle ne couvre que `shared/js` ; il ne
       dirait rien d'une page chargeant encore `/modules/droits/js/…`, c'est-à-dire d'un **404
       sur un écran entier**. Les deux formes du chemin mordent — écrit d'un trait, et assemblé
       par `path.join`.

       **Et il a dénoncé le texte même qui l'annonçait.** Ce paragraphe nommait
       `/modules/droits/js/…`, et le garde-fou l'a refusé — à juste titre : un fichier qui
       écrit ce chemin est un fichier qui le demande. Mais le garde-fou du socle, lui, ne voit
       pas les trois chemins que cet ADR nomme déjà, **et il y échappe par chance** :
       l'indentation du Markdown place plus de douze caractères entre `'js',` et le nom de
       fichier à la ligne suivante, et sa fenêtre s'arrête à douze.

       La frontière est donc posée explicitement, plutôt que laissée à la largeur d'un retrait :
       `docs/` est **hors de portée** des deux garde-fous — un ADR a le droit de nommer ce qu'il
       raconte avoir supprimé —, et tout le reste y est, **`README.md` et `DEPLOYMENT.md`
       compris** : ceux-là donnent des gestes qu'on recopie, et un chemin mort dans une
       instruction est un chemin qu'un exploitant va taper. Les quatre cas sont contre-essayés.

       **Et un défaut antérieur, trouvé par un contre-essai.** `horsPortee` **n'était pas
       importé** dans la suite « taille », qui l'appelle six fois : chacun de ces six appels
       levait un `ReferenceError`, c'est-à-dire que la suite tombait en exception **pile au
       moment où elle devait dire « hors de portée »**. Aucune des six conditions n'étant jamais
       remplie, personne ne l'avait vu. Trouvé en contre-essayant un septième appel, en ôtant
       le `main.tsx` dont il se déduit.

2. [x] **Le coût réel, mesuré** — c'est lui qui chiffre les sept autres.

       | | |
       |---|---|
       | Avant — `dr-app.js`, vanilla | **554 lignes** |
       | Après — `frontend/droits/`, React + TS | **1 208 lignes**, 8 fichiers |
       | dont la frontière avec le socle non typé (`socle.ts`) | 119 |
       | dont les contrats des huit routes (`api.ts`) | 121 |
       | Paquet servi, minifié | **240 Ko** |
       | Dépendances ajoutées | 4 de développement, 2 de production |

       **Deux fois plus de lignes, et il faut dire où elles vont.** Un cinquième tient
       dans deux fichiers qui n'existaient pas et ne se réécriront pas à chaque module :
       `socle.ts` déclare ce que l'écran emprunte au socle commun — il disparaîtra le jour
       où celui-ci sera porté —, et `api.ts` décrit des charges qui étaient tacites.
       Le reste vient du JSX, plus verbeux qu'une chaîne de balisage, et de l'état rendu
       explicite là où un objet global mutable suffisait.

       **Projeté sur les sept autres :** environ 1,8 ligne écrite pour une remplacée, et
       moins pour les gros modules, où la part fixe pèse moins. SURV, à 23 731 lignes,
       serait donc un chantier d'environ 40 000 lignes à lui seul. Ce chiffre est le fait
       qui doit guider la suite, et il n'est pas une raison de s'arrêter — c'est la mesure
       de ce que la conformité coûte.

       **Quatre défauts trouvés, dont deux de mon fait.** Le répertoire de traduction lit
       un global `DR` que l'écran d'avant portait, et il a fallu le lui rendre. `dtPriv` et
       `dtPrivDesc` sont déclarés en `const` : ils ne sont pas sur `window`, et les y lire
       rendait `undefined`. Mon alias déclaré pour éviter un masquage de nom **mentait** —
       il n'existait pas à l'exécution. Et `exactOptionalPropertyTypes` a refusé de me
       croire sur un champ filtré puis reposé : il avait raison, et `filter` suivi de `map`
       masquait la question.

       **Et un défaut de mon propre contrôle**, trouvé parce que l'écran React échouait :
       `body.textContent` compte le **source des scripts en ligne**. L'écran paraissait
       « rempli » alors qu'il ne rendait rien. C'est `innerText` qu'il fallait lire, et le
       contrôle était plus faible que je ne le croyais depuis le début.
3. [x] **Reprendre le déploiement** — fait le 3 octobre 2026. Trois chemins mènent en
       production, et **les trois étaient faux, chacun à sa manière** :

       | Chemin | Ce qu'il faisait | Ce qu'il fait |
       |---|---|---|
       | `Dockerfile` | `npm ci --omit=dev` : esbuild absent, aucune construction possible ; `COPY public` copiait un `public/` sans le paquet | Un étage `construction` qui installe l'arbre de développement et lance `npm run build` ; l'image finale copie le paquet produit |
       | `render.yaml` | `buildCommand: npm ci` | `npm ci --include=dev && npm run build` |
       | `.dockerignore` | n'excluait pas `public/modules/*/app/` | l'exclut |

       Le défaut que ce point existait pour corriger a été **mesuré avant d'être
       réparé** : en retirant du `Dockerfile` la seule ligne qui copie le paquet,
       l'image démarre, `/api/health` rend 200, `/modules/droits/index.html` rend 200,
       et seul `/modules/droits/app/main.js` rend 404. Les trois vérifications
       évidentes restent vertes. **C'est un écran blanc que rien ne signale.**

       Deux pièges se sont révélés en cours de route, et ils se tiennent :
       `NODE_ENV=production` est ce qui fait bien construire — minification, pas de
       carte de source, React en régime de production : 244 Ko au lieu de 3,2 Mo — et
       c'est aussi ce qui fait mal installer, npm en tirant la conclusion qu'il peut
       écarter les dépendances de développement. D'où `--include=dev` écrit partout où
       la construction passe. Sans lui, l'échec annonce qu'esbuild est introuvable,
       **loin de sa cause**.

       Le `.dockerignore` est le point le moins visible et le plus important : le
       paquet présent sur la machine du développeur était emporté par `COPY public`.
       Une image construite ici aurait donc paru correcte alors que rien dans la chaîne
       ne l'aura construit — **un faux vert dont la seule cause est l'état d'un
       disque**.

       Deux contrôles posés, et c'est la leçon du point : « l'image se construit » ne
       dit rien de ce qu'elle sert.
       · La CI **démarre l'image et demande le paquet** (tâche `image`). Éprouvée dans
         les deux sens : 0 sur l'image correcte, 1 sur l'image dont on a ôté la ligne
         de copie.
       · Neuf garde-fous de forme dans `taille.smoke.js` tiennent les trois chemins
         d'accord — chacun contre-essayé, chacun mord. Le dernier a demandé deux
         écritures : la première cherchait `curl -sf` et `app/main.js` *quelque part*
         dans l'étape, et passait à vide — l'attente de démarrage porte déjà un
         `curl -sf`, et le chemin reste écrit dans son affectation. Le détecteur lie
         désormais les deux **sur la même ligne**, et un second contrôle vérifie que
         l'étape propage son échec : une étape qui constate sans échouer existerait
         sans rien garder.

       `DEPLOYMENT.md` porte le geste : § 1.1 pour les deux pièges, § 6 pour ce que
       l'image construit elle-même, et trois entrées aux ennuis courants — dont
       « écran blanc, la page répondant 200 », avec le `curl -I` qui le confirme.
4. [x] **Les deux manières sont nommées aux garde-fous de forme** — fait. Le paquet
       construit est exclu des gardes de source par son **chemin**, non par sa taille (un
       paquet de deux cents lignes resterait un paquet). Et trois gardes neufs tiennent la
       source React comme le reste : elle est trouvée, aucun fichier au-delà de 600 lignes,
       et **le typage n'est défait nulle part** — ni `any`, ni `as unknown as`. Ce dernier a
       d'abord dénoncé un commentaire qui disait qu'on ne le fait pas ; il écarte désormais
       les commentaires.
5. [ ] Les sept modules restants. **L'ordre par volume était le mauvais critère**, et
       la mesure l'a dit le 3 octobre 2026 :

       | | Chargé par |
       |---|---|
       | `public/js` (« portail », 4 217 l.) | **3 pages** — `index`, `login`, `cookies`. Une feuille. |
       | `public/shared/js` (socle commun, 2 250 l.) | **les neuf écrans**, DROITS compris |

       Le socle n'est pas un écran : il n'a ni interface, ni React. Le convertir veut
       dire autre chose que convertir un module — il devra servir **les deux régimes**
       pendant la cohabitation : des globales pour les sept écrans restés en
       JavaScript, des imports typés pour les écrans en React. Une seule source, deux
       consommations.

       5.a [x] **Mesurer le socle avant d'y toucher** — fait. C'est la leçon de la
           suite n° 0 appliquée là où elle compte le plus : neuf écrans en dépendent,
           et aucune suite ne regardait sa surface.

           **48 noms globaux, 12 fichiers**, relevés dans un navigateur et figés dans
           [`tests/smoke/surface-socle.json`](../tests/smoke/surface-socle.json).
           La mesure a été fausse deux fois avant d'être juste, et dans le sens
           rassurant les deux fois : partie de `login.html`, elle voyait un `window`
           déjà peuplé par les quatre fichiers que cette page charge — **quatre
           fichiers paraissaient alors ne rien apporter du tout** ; partie
           d'`about:blank`, aucun script ne se chargeait, faute d'origine. Il a fallu
           servir une page vierge sur l'origine du serveur.

           Et le constat qui justifie tout le reste : `frontend/droits/socle.ts`
           **déclare** ce que le socle pose, sans que personne ne le vérifie. Une
           déclaration est une affirmation sur le monde ; le compilateur la croit,
           c'est son rôle. Deux fois elle a menti :

           · `window.dtPriv` — `dr-i18n.js` le définit en `const`, qui ne pose rien
             sur `window`. L'écran s'arrêtait net. Trouvé en ouvrant la page.
           · `window.ICONS` — **même cause, et muet** : `oasis-utils.js` le déclare
             aussi en `const`, et `(window.ICONS || {}).shield || ''` rendait la
             chaîne vide sans rien dire. Celui-là, aucun contrôle ne l'aurait trouvé.

           Sa conséquence s'est révélée nulle, et il faut le dire plutôt que de
           s'attribuer une réparation : `module-chrome.js` retire `.header-module-title`
           de tous les écrans de module, pour y mettre ses super-menus. L'icône
           n'était donc visible nulle part. **Défaut réel, conséquence nulle — le
           pire des deux**, parce qu'il survit à toute inspection.

           D'où la suite [`frontend.smoke.js`](../tests/smoke/frontend.smoke.js), six
           contrôles, tous contre-essayés, tous mordants :
           · chaque `window.X` **lu** par le TypeScript existe sur l'écran qui le lit
             (les écritures sont exclues — poser une globale n'exige pas qu'elle
             préexiste) ; mord sur `window.ICONS`, mord sur `oasisEsc` renommé dans le
             socle, et **nomme le coupable** ;
           · chaque globale **lexicale** déclarée existe ; mord sur un nom inventé ;
           · la surface du socle est conforme au relevé ; mord sur un nom ajouté sans
             l'y déclarer — c'est ce qui protégera les sept écrans en JavaScript le
             jour de la conversion.

       5.b [x] **Le socle en TypeScript, servant les deux régimes — fait.** *(**12 sur
           12**, du 3 au 6 octobre 2026. `public/shared/js` n'existe plus.)*

           2 250 lignes de JavaScript deviennent 2 905 lignes de TypeScript, dont
           **306 pour les douze sas** — l'écart est là et dans les commentaires ; le
           code lui-même n'a pas bougé, c'était la règle. Les huit écrans restés en
           JavaScript ne voient aucun changement : chaque sas publie les mêmes noms,
           et le relevé de surface le vérifie à chaque campagne.

           **`oasis-hors-ligne`, le dernier et le plus engageant.** La file des
           écritures différées, le rejeu ordonné, le bandeau, le service worker. Le
           réseau se coupe **dans la sonde** — un témoin qui *lève* comme une panne, et
           non qui répond une erreur : la distinction est tout le sujet du fichier,
           puisque seule l'absence de réseau met une saisie en file. 20 sondes,
           6 contre-essais, tous mordants, dont les trois qui gardent la règle du
           métier : la borne `$` qui écarte `/submit`, la liste d'autorisation qui
           refuse ce qu'on a oublié d'y inscrire, et un rejeu refusé qui n'est **jamais
           jeté**.

           Trois défauts de mesure trouvés en route, et le troisième est antérieur :

           · *compter ne vaut pas identifier.* La sonde du rejeu marqué comptait la
             file. Or sans la marque, le rejeu se réenfile **et** l'original est retiré :
             la taille ne change pas. Elle suit maintenant l'identifiant et la date de
             saisie ;
           · *un bandeau se lit avec l'état qu'il prétend montrer.* Lus séparément, les
             deux semblaient se contredire — le rejeu du chargement s'étant intercalé
             entre les deux lectures. Lus ensemble, ils concordent, et une vraie
             contradiction se verrait ;
           · *la comparaison refuse désormais de tourner sur un fichier déjà converti.*
             L'ancien fichier supprimé, elle mesurait une page vide et rendait un diff
             où **tout** diffère — un rouge spectaculaire qui ne dit rien.

           **Et une lacune antérieure, comblée.** Le contrôle des accents portugais lit
           le troisième élément de chaque **triplet**. Or la table des phrases du
           serveur est faite de **paires** `[en, pt]`, le français y étant la clé : ses
           **84 traductions portugaises n'étaient pas contrôlées**. Trouvé en
           contre-essayant le branchement de ce contrôle sur le socle converti. Les
           paires sont désormais lues, et le contre-essai mord.

           Trois garde-fous ont dû apprendre à suivre la conversion : la liste des
           écritures différables — dont le détecteur nommait la forme JavaScript de la
           déclaration et rendait « 0 entrée(s) », c'est-à-dire qu'il **se taisait au
           moment même où la liste changeait de fichier** —, le contrôle des accents, et
           le parcours des répertoires, `public/shared/js` ayant disparu.

           Ce qu'il reste de dette déclarative : **deux noms**, dans
           [`sans-proprietaire.d.ts`](../frontend/socle/sans-proprietaire.d.ts) —
           `APP_STATE` et `PESSCO`, posés par une page et lus par plusieurs modules.
           Aucun module ne les définit, ils resteront.

           **`oasis-requete` — le premier maillon de la chaîne `fetch`.** L'en-tête
           anti-CSRF posé sur tout appel vers l'application, la déduplication des
           écritures identiques en vol, et le retour à la connexion sur 401. Chargé par
           les **neuf** pages, et **deux fois** sur `execution` et `ramp` — d'où un
           garde de réentrance qui n'est pas décoratif : sans lui, le second passage
           envelopperait le premier et chaque requête porterait deux fois la
           déduplication.

           14 sondes, 9 contre-essais, tous mordants. Mais **deux sondes étaient vides
           de sens**, et il a fallu les contre-essayer pour le voir :

           · celle qui éprouve le chemin « objet `Request` » mesurait la **cécité de mon
             témoin**, non le code : le témoin ne lisait que l'`init`, absent dans ce
             cas, et rendait donc « GET, pas d'en-tête » des deux côtés. Il lit
             maintenant l'objet `Request` ; la sonde rend « POST, en-tête posé » ;
           · celle de la session perdue tentait de redéfinir `window.top` — pas plus
             redéfinissable que `location.href`, et verte pour la même mauvaise raison.
             Elle est désormais **la dernière du jeu**, et laisse le geste agir : on
             relève synchroniquement le stockage vidé et le garde posé, avant que la
             page ne s'en aille.

           **Ce que la comparaison ne couvre pas, et c'est dit plutôt que supposé :**
           que la connexion s'ouvre dans la **fenêtre entière** et non dans le cadre du
           portail. C'est pourtant le point du commentaire d'origine. Vérifié : la suite
           « parcours » *tolère* les 401 sans éprouver la redirection, donc personne ne
           le couvre aujourd'hui.

           La part « fichiers du socle » de `sans-proprietaire.d.ts` est **close** :
           `oasisSessionPerdue` a trouvé son module. Ne restent dans ce fichier que les
           deux globales posées par une page et lues par plusieurs modules.

           Et le garde-fou des anciens chemins a trouvé sa quatrième prise, sous la
           forme **assemblée par segments** — `path.join(…, 'shared', 'js',
           'oasis-requete.js')` dans la suite « socle ». C'est précisément la forme
           qu'il avait appris à voir après avoir manqué la première.

           **`module-chrome` — 377 lignes, et deux leçons sur les sondes.** La barre
           supérieure des modules : super-menus, retour au portail, marque, bloc
           utilisateur, pied, actions déclarées par le module, et la réinjection
           continue sur mutation du shell. Deux requêtes partent au chargement :
           interceptées dans le jeu, sinon les deux côtés mesureraient deux échecs
           réseau identiques.

           **Cinq contre-essais, et trois ne mordaient pas** — pour trois raisons
           différentes, dont deux étaient des défauts de mes sondes :

           · *le jeu de données fait partie de la sonde.* Mon jeu fournissait trois
             super-menus et `hasAccess: true` ; les branches « un seul onglet qu'on
             masque » et « aucun accès » n'étaient donc **jamais atteintes**. Une
             seconde situation demande un second jeu, non une sonde de plus dans le
             premier : `module-chrome-un-seul` les couvre, et les deux contre-essais
             mordent ;
           · *une sonde qui erre des deux côtés est pire que son absence.* Celle qui
             éprouvait « le super-menu courant ne mène pas à lui-même » tentait de
             redéfinir `window.location.href`, ce que Chrome refuse : elle rendait
             « Cannot redefine property » **identiquement**, donc verte, et gonflait le
             compte en rassurant. Retirée, et l'ADR dit ce qui n'est pas couvert.

           **Une globale déclarée avec une forme incomplète.** `utils.ts` annonçait
           `APP_STATE?: { lang?: string }` ; `chrome.ts` y écrit `sidebarCollapsed`, et
           la construction a refusé. Même famille que les cinq signatures
           contradictoires de la veille. D'où un second volet à la règle : un nom que
           **plusieurs** modules lisent sans qu'aucun ne le définisse vit dans
           [`sans-proprietaire.d.ts`](../frontend/socle/sans-proprietaire.d.ts) — et
           un nom qu'un **seul** module lit se déclare chez ce lecteur.

           **Et un faux rouge de ma suite, à la racine du même sujet.** Une déclaration
           ambiante n'est importée par personne : le graphe d'imports ne la traverse
           pas, et le `?` d'`APP_STATE` y était invisible. Deux noms correctement
           déclarés optionnels étaient tenus pour obligatoires. La suite lit désormais
           les `frontend/socle/*.d.ts` en plus du graphe.

       5.b (détail des neuf premiers) *(**9 sur 12** :
           `oasis-theme`, `oasis-cookies`, `oasis-loader` le 3 octobre, `oasis-utils`,
           `oasis-dates`, `oasis-messages-serveur`, `oasis-kpi` le 5 octobre,
           `oasis-toast` et `oasis-commun` le 6 octobre 2026.)*

           **`oasis-commun` — le plus gros, et la règle qu'il a fallu poser.** 322
           lignes, neuf globales, la grande table des refus en trois langues, la
           composition accordée au genre, le client HTTP, la bascule de thème,
           l'anti-rebond, le chargement à la demande. 41 sondes, 6 contre-essais —
           guillemets non échappés, majuscule qui ne tombe plus, état non accordé,
           dépôt de fichier recevant un type JSON imposé, 204 non lu comme vide,
           anti-rebond qui n'annule plus : les six mordent.

           **Quatre globales de plus étaient déclarées deux fois, avec des signatures
           différentes** — après `oasisToast` la veille : `oasisPoserLangue` annoncé
           comme ne rendant rien alors qu'il rend la langue retenue,
           `oasisMessageErreur` à deux paramètres d'un côté et trois de l'autre,
           `oasisSaisieDifferee` sans son délai. Quatre fois la même cause : chaque
           module déclarait de mémoire ce qu'il lisait, et **rien ne confrontait les
           copies**. Cinq déclarations étaient simplement fausses.

           D'où la règle, désormais tenue partout : **le module qui définit un nom le
           déclare, et lui seul.** Ce qu'aucun module ne définit encore vit dans
           [`non-converti.d.ts`](../frontend/socle/non-converti.d.ts), à un seul
           endroit — **un nom reste** (`oasisSessionPerdue`), et la longueur de ce
           fichier mesure la dette.

           Deux précautions du fichier d'origine ont été gardées à dessein :
           `typeof window !== 'undefined'` et les `try/catch` autour de `document`.
           Ce ne sont pas des superstitions — la suite « traductions » charge ce
           fichier dans une **machine virtuelle sans `document`** pour éprouver la
           composition des messages sans navigateur. Le paquet construit y passe sans
           modification.

           Et les cinq tables du serveur restent **lues sur `window`**, non importées,
           alors que `messages-serveur.ts` les exporte : les importer embarquerait
           vingt kilo-octets de tables dans deux fichiers servis pour un bénéfice nul,
           les sept pages qui chargent l'un chargeant toutes l'autre. Mesuré avant de
           décider.

           DROITS y gagne deux déclarations de moins, dont une fausse. Coût : 322
           lignes deviennent 418 — l'écart est en commentaires et en types, le code
           ne bouge pas.

           **`oasis-toast` — et une contradiction que le typage a mise au jour.** Le
           panneau de retour, la confirmation et la saisie : des promesses, du clavier,
           la restauration du focus. 26 sondes, chacune mesurée non vide.

           La construction a refusé de passer, et elle avait raison :
           `Window.oasisToast` était déclaré **deux fois, avec deux signatures
           différentes** — `socle/utils.ts` annonçait deux paramètres rendant
           `unknown`, le sas en annonçait trois rendant un `HTMLElement`. Deux parties
           du code n'avaient pas la même idée de la même fonction, et rien ne l'avait
           jamais dit. La déclaration appartient désormais au module qui porte le
           comportement, une seule fois ; le sas ne fait que publier.

           Six contre-essais, et **deux d'entre eux ont révélé un défaut de
           l'instrument**. En retirant la réponse à Échap, la sonde qui l'éprouve
           attendait une promesse jamais tenue : `page.evaluate` attend
           indéfiniment, l'outil restait **muet**, et mon rapporteur lisait ce silence
           comme « ne mord pas ». Une sonde qui ne rend jamais est désormais un échec
           nommé, pas une absence. C'est exactement le genre de silence qu'on traque
           ailleurs ; il n'avait pas sa place dans l'instrument de mesure.

           Les quatre autres mordent sur ce qu'ils visent : le geste destructeur déduit
           du message, le focus rendu, `requis` qui tient le bouton fermé, et le
           plancher de 1 500 ms sur la durée d'affichage.

           **`oasis-kpi` — et la leçon de ce que « verbatim » veut dire.** Sept figures
           en SVG, deux constructeurs de cartes, 28 sondes. Les corps ont été repris du
           fichier d'origine, **indentation comprise**, et c'est le point : ce sont des
           gabarits multilignes, et **l'espace de début de ligne fait partie de la
           chaîne produite**. Une première écriture les avait désindentés de deux
           espaces pour les mettre au premier niveau — **21 sondes sur 28** ont signalé
           la différence. Le code est donc indenté d'un niveau de trop ; les chaînes
           sont identiques, et c'est ce qui compte.

           Cet épisode a servi de contre-essai à lui seul : les sondes distinguent **un
           espace** dans un tracé. Un contre-essai de plus, sur la logique, en retirant
           le bornage des pourcentages à [0, 100] : trois sondes le signalent.

           `echelle` tire au hasard l'identifiant de son dégradé, donc sa sortie n'est
           pas déterministe. L'identifiant est neutralisé dans la sonde plutôt que
           déclaré comme écart : une sonde qui dirait « différent » à chaque exécution
           n'apprendrait plus rien.

           **`oasis-messages-serveur` — et ce que le typage apporte à une table de
           données.** Six tables, 291 lignes, des centaines de chaînes en trois langues :
           le fichier où le risque de transcription était le plus élevé. Tout a été
           **extrait par script**, commentaires des tables compris.

           Les trois langues y sont **positionnelles** — indice 0 le français, 1
           l'anglais, 2 le portugais — et rien ne le disait. Une entrée à deux éléments
           au lieu de trois se lisait « traduction manquante » à l'affichage, sous la
           forme d'un `undefined` rendu tel quel. Contre-essayé en retirant une
           traduction portugaise : **refusé à la construction.** C'est le bénéfice du
           typage sur une table de données, et il se constate.

           La sonde décisive n'est pas un échantillon mais **l'égalité intégrale** : un
           relevé signé de chaque table — taille, nombre d'entrées, empreinte — plus le
           contenu en clair aux deux bouts, pour que l'écart soit lisible et non réduit
           à un nombre. Contre-essayé en changeant **un seul caractère** d'une seule des
           84 traductions : signalé.

           La suite « traductions », qui charge ce fichier dans une machine virtuelle,
           passe sans modification — le résolveur de chemin posé à la conversion
           précédente a fait son travail, et c'était bien son objet.

           **`oasis-dates` — 25 sondes, aucun écart.** Les deux règles des formulaires,
           les trois langues plus le repli d'une langue inconnue, les bornes posées sur
           les champs, la marque qui suit la correction sans s'allumer d'elle-même, et
           la configuration vide qui ne lève pas. Tables des trois langues extraites du
           fichier existant par script.

           Deux de mes sondes étaient **vides de sens**, et il a fallu les mesurer pour
           le voir :

           · le navigateur d'épreuve tourne en `Africa/Ouagadougou`, **UTC+0** : l'heure
             locale et l'universelle y coïncident, donc la sonde sur le décalage d'un
             jour — le défaut même que `jour()` existe pour empêcher — ne distinguait
             rien. En remplaçant la construction locale par `toISOString()`, la
             comparaison restait conforme. L'outil émule désormais
             `Africa/Porto-Novo`, UTC+1, le fuseau des instances concernées ;
           · la sonde de l'écouteur unique lisait le **marqueur** `dataset`, que `lier`
             pose dans les deux cas. Elle compte maintenant les inscriptions réelles,
             par une enveloppe d'`addEventListener` posée avant le chargement : `3|3`,
             trois au premier appel, toujours trois après deux de plus.

           **Trois défauts d'outillage trouvés par cette conversion, et le troisième est
           le plus instructif.**

           · *Un faux rouge de ma suite.* La mesure de surface rendait « Could not load
             script » pour **les douze fichiers**, y compris ceux qui venaient de
             passer. Cause : `oasis-hors-ligne.js` enregistre le service worker, et le
             contrôle par page visitait désormais six écrans au lieu de trois — dont
             RAMP et EXÉCUTION. La page de mesure héritait du service worker. Reproduit
             en isolation, la mesure passait : ce n'était pas la conversion, c'était
             l'état accumulé par la suite. La mesure se fait maintenant dans un
             **contexte de navigateur à part**.

           · *Un chemin écrit en dur, dans une suite.* La campagne est tombée sur un
             `ENOENT` : une épreuve de « socle » chargeait `oasis-dates.js` par son
             ancien chemin dans une machine virtuelle, et « traductions » en nommait
             deux autres qui auraient cédé aux conversions suivantes. Un seul endroit
             sait désormais où vit un fichier du socle — `harness.cheminSocle`, qui le
             **déduit** de l'existence du sas. Et 22 fichiers portaient encore l'ancien
             chemin en commentaire ou en documentation, dont un `README` montrant une
             balise `<script src>` qui rendrait 404 : corrigés, parce qu'une
             documentation fausse égare qui la suit.

           · *Et le garde-fou qui n'aurait pas attrapé le défaut pour lequel il était
             écrit.* Étendu des pages HTML à tout fichier suivi, il cherchait la chaîne
             littérale `shared/js/<nom>.js`. Or la ligne qui est réellement tombée
             l'assemblait **par segments** — `path.join(…, 'shared', 'js',
             'oasis-dates.js')` — et la chaîne littérale n'y figure nulle part. Mesuré
             en la réintroduisant : le garde-fou restait vert. Le détecteur cherche
             maintenant les trois morceaux dans l'ordre et à courte distance ; les deux
             formes mordent, et un fichier non encore converti reste permis.

           **`oasis-utils` était le fichier qu'on gardait pour la fin, et il est fait.**
           `ICONS` y était un `const` au premier niveau — globale lexicale, absente de
           `window` — avec ~90 lectures nues dans douze fichiers. Le sas le pose
           désormais sur `window`, et le nom est lisible **des deux façons** : les
           lectures nues continuent, et `window.ICONS` fonctionne enfin. C'est la
           correction, à la source, du défaut qui avait vidé l'icône de la coquille
           DROITS. Les deux écarts mesurés sont ceux-là, et ils sont déclarés comme
           voulus.

           Trente icônes et le tracé de l'attente ont été **extraits des fichiers
           existants par script**, jamais recopiés.

           **La comparaison est devenue un outil** — `scripts/comparer-socle.js` —, avec
           deux acquis payés d'avance : la page d'épreuve porte ses balises elle-même
           (sans quoi `DOMContentLoaded` est déjà passé et les sondes du branchement
           sont identiques **à ne rien faire**), et les sondes asynchrones s'attendent.
           Les préalables de chaque fichier y sont nommés : `oasis-utils` lit quatre
           globales d'autres fichiers du socle, et sans elles on ne mesurerait que des
           exceptions.

           Surtout, l'outil demande que **tout écart soit déclaré**, avec sa raison. Un
           écart non déclaré le fait échouer ; un écart déclaré qui ne se produit pas le
           fait échouer aussi — sinon la déclaration survivrait à ce qu'elle décrit. Les
           deux cas sont contre-essayés. Sans ce mécanisme, un écart passait pour
           acceptable **parce qu'on l'avait regardé et trouvé plausible**, ce qui n'est
           pas une méthode.

           **Et une règle que cette conversion a corrigée dans mes contrôles.** `utils.ts`
           lit `window.APP_STATE?.lang` pour le format des dates. Mesuré : `APP_STATE`
           n'est posé que par `pr-shell.js`, donc présent sur **une seule** des trois
           pages qui chargent ce fichier — et `formatDate` n'est appelé ni sur DROITS ni
           sur PLAN. L'absence est réelle, sans conséquence, et déjà déclarée : par le
           `?` du type, qui est un acte d'écriture et non un oubli. Les deux contrôles —
           par écran et par page de sas — honorent donc le `?`, **et impriment
           l'absence** : une optionnelle absente partout est une lecture morte, et il
           faut pouvoir le voir sans la chercher. Ce qui reste refusé, c'est un nom
           déclaré obligatoire et absent ; contre-essayé en ôtant le `?`.

           DROITS y gagne deux déclarations de moins : `api` et `esc` viennent de
           `socle/utils.ts`, et c'est **lui** qui dit d'où elles sortent.

           **L'inconnue du chantier est levée, et ce n'en était pas une.**
           `oasis-utils.js` déclare `ICONS` en `const` au premier niveau — une
           globale **lexicale**, qu'une IIFE construite ne peut pas reproduire —
           et ~90 lectures de `ICONS` nu l'attendent dans douze fichiers. Mesuré
           dans un navigateur : **`window.X = …` est lisible comme identifiant
           nu**, même posé depuis une IIFE. Le sas n'a donc qu'à l'affecter, et
           les 90 lectures continuent de fonctionner. La conversion améliore même
           la situation : le nom devient lisible des deux façons, ce que la
           déclaration de DROITS supposait à tort.

           **Un garde-fou étendu, puis restreint — et il faut dire pourquoi.** Un
           fichier converti pose `window.X` : sa collision avec un `const X` d'un
           autre fichier passerait d'une **erreur franche** qui arrête la page à
           un **masquage silencieux**. Le garde-fou « un nom global, une
           définition » ne voyait que les déclarations au premier niveau. Étendu à
           `window.X = …` partout, il a rendu **treize collisions, toutes
           délibérées** : un `const` exposé à `window` par un fichier voisin, une
           décoration explicite, une sauvegarde rendue dans un `finally`, le
           chaînage de `fetch` par deux couches du socle, et des `window.onload`
           qui n'étaient que du **texte dans un gabarit** d'impression. Cent pour
           cent de bruit. La détection est donc restreinte aux sas, où
           l'affectation *est* la déclaration de la surface publiée — le seul cas
           où cette forme ne soit pas ambiguë. Contre-essayé : un sas posant un
           nom que `dr-i18n.js` déclare, et les deux fichiers sont nommés.

           **Deux défauts de ma propre suite, révélés par ces deux conversions.**
           Elle ajoutait *tous* les fichiers de `frontend/socle/` à *chaque*
           écran : faux, un paquet n'embarque que ce qu'il **importe**, et
           `cookies.ts` lisant `window.t` — posé par `i18n.js` sur les trois pages
           du portail — faisait rougir DROITS pour une globale qu'il n'emploie
           pas. Elle suit maintenant le graphe d'imports. Et du coup cette lecture
           n'était plus vérifiée **nulle part** : un contrôle de plus ouvre, pour
           chaque sas, **les pages qui le chargent** et vérifie que ce qu'il lit y
           existe. C'est celui qui rendra les neuf conversions restantes sûres —
           un fichier du socle est chargé par plusieurs des neuf pages, et une
           globale présente sur l'une peut manquer sur l'autre. Contre-essayé : il
           nomme les trois pages.

           **Et trois verts vides dans ma comparaison, sur les sondes qui
           comptaient.** Le dessin de l'attente se branche sur
           `DOMContentLoaded` ; en injectant le script *après* le chargement,
           l'événement était déjà passé — les deux fichiers étaient identiques **à
           ne rien faire**, et trois sondes sur treize le disaient en vert. La page
           d'épreuve porte désormais sa balise elle-même, comme une vraie page, et
           les sondes asynchrones sont attendues. Les treize mesurent alors : deux
           blocs servis au chargement, un bloc ajouté après coup servi par
           l'observateur de mutations, le tracé à 5 276 octets identique.

           Le coût des trois fichiers, mesuré, et ce qui en sort :

           | Fichier | Avant | Après (source + sas) | Servi, minifié |
           |---|---|---|---|
           | `oasis-theme` | 64 l. | 78 + 38 | 2 633 → 557 o |
           | `oasis-cookies` | 79 l. | 93 + 21 | — |
           | `oasis-loader` | 135 l. | 144 + 27 | — |

           Le tracé SVG de l'attente — 5 254 octets — a été **extrait du fichier
           existant par script**, jamais recopié : quarante lignes de courbes
           retranscrites à la main sont une occasion de faute invisible. Le relevé des 48
           noms est le contrat à préserver, et la suite `frontend` le vérifie.
           **Un fichier sur douze converti** le 3 octobre 2026 — `oasis-theme.js`,
           choisi parce que trois des déclarations de DROITS en venaient.

           La forme, qui vaudra pour les onze suivants :

           | | |
           |---|---|
           | `frontend/socle/theme.ts` | la source typée, **sans un seul `window`**. Les écrans en React l'importent. |
           | `frontend/socle/globales/oasis-theme.ts` | le sas de cohabitation : il en publie les quatre globales, et rien d'autre. |
           | `public/shared/app/oasis-theme.js` | le fichier servi, construit. Les huit écrans en JavaScript ne voient aucun changement. |

           Les deux répertoires disent la vérité : `shared/js/` est ce qui est
           encore écrit en JavaScript, `shared/app/` ce qui est construit. Le jour
           où `shared/js/` est vide, les sas disparaissent avec lui et il ne reste
           que la source typée.

           **Le coût, mesuré.** 32 lignes de code deviennent 40 — 26 pour la source,
           14 pour le sas ; les commentaires, eux, doublent, parce que le double
           régime se documente. Et le fichier servi passe de 2 633 à **557 octets**
           minifié, soit 4,7 fois moins. Quatre déclarations ambiantes disparaissent
           de DROITS, dont une qui était **fausse** : `Window.ICONS` — plus personne
           ne la lisait depuis la correction, mais elle restait un piège posé pour
           le prochain qui la croirait.

           **Ce qui a été prouvé avant de basculer la moindre balise** : le fichier
           construit se comporte comme l'ancien, sur douze sondes dans un
           navigateur — la surface, les quatre fonctions, la conversion de
           l'ancienne clé `grey`, et la réécriture du stockage au chargement.
           Comparaison elle-même contre-essayée : en retirant la conversion de
           `grey`, elle signale trois écarts.

           **Et le défaut que cela a trouvé, qui est le plus gros de la journée.**
           Le contrôle d'image de la CI — posé à la suite n° 3, et dont la liste de
           paquets se **déduit maintenant du dépôt** plutôt que de s'écrire — a
           refusé l'image : `/shared/app/oasis-theme.js` en était absent. Le
           `Dockerfile` copiait `public/modules`, nommé à la main, et le socle ne
           s'y trouvait pas. L'image aurait servi un 404 sur `oasis-theme.js` **pour
           les neuf écrans**, pas pour un seul. Il copie désormais `public/` entier
           depuis l'étage de construction — qui ne porte que ce qu'il a produit.
           Le contrôle a payé son prix deux commits après avoir été écrit.

           Deux contrôles de plus, tous deux contre-essayés :
           · **aucune page ne charge un fichier converti depuis son ancien chemin**,
             le détecteur lisant `frontend/socle/globales/` plutôt qu'une liste ;
           · **chaque script et feuille de style qu'une page référence est servi** —
             114 ressources, 9 pages. Le contrôle le plus bête de la suite, et celui
             qui rendra les onze conversions suivantes sûres : une page oubliée ne se
             plaint pas, le navigateur reçoit 404 et continue.

           Deux garde-fous ont dû apprendre à suivre la conversion plutôt qu'à
           nommer un chemin : l'ordre `oasis-theme` avant `i18n.js`, et la mesure de
           surface elle-même. Écrits en dur, ils auraient **cessé de couvrir le
           fichier le jour de sa conversion**, sans rien dire — c'est ce qui est
           arrivé au garde-fou des magasins de module quand la fabrique a pris des
           options.
       5.c [~] Puis les écrans, en commençant par les feuilles : portail, PLAN, CARE,
           PR, RAMP, SURV.

           **L'état, au 6 octobre 2026.** Le volume dit ce qui reste, et il ne dit que cela :
           la suite n° 0 et la n° 5.c.0 ont montré deux fois que ce n'est pas lui qui ordonne.

           | Écran | Lignes | État |
           |---|---|---|
           | DROITS | — | **converti** (suite n° 1) ; dernier fichier passé le 6 octobre |
           | portail (`public/js`) | **0 — le dossier n'existe plus** | **84 gestes nommés, 66 exercés — le plafond atteignable —, 10 motivés, 8 indécidables** — relevé figé et gardé (5.c.0) ; schémas (5.d.0), CRUD des référentiels (5.d.1), exigences (5.d.2), organigramme (5.d.3), personnel et taxinomie (5.d.4), paramètres de l'instance (5.d.5) et le cycle de rendu (5.d.6) convertis — `app-config.js` supprimé ; le portail en **un** paquet (5.d.7) ; les libellés littéraux et la barre d'écran (5.e.0), l'écran des comptes (5.e.1), le profil (5.e.2), l'accueil et le journal d'audit (5.e.3), le téléphone et les aides (5.e.4) — **le portail est entièrement en TypeScript** ; pont de cohabitation déposé (5.e.5) — **135 noms de surface deviennent 72**, trois sas supprimés, les quatorze comparateurs faits pièces d'archive et remplacés par le relevé figé des 81 noms de la page ; le message de retour au portail corrigé et gardé des deux côtés (5.e.6) ; la construction ne produit plus que ce qu'une page charge — **4 484 Ko en 38 fichiers deviennent 1 224 en 8** (5.e.7) ; le contrat du socle avec le shell des modules écrit et gardé des deux côtés (5.e.8) ; les seize dettes de `window` rendues — **72 noms de surface deviennent 61** (5.e.9) ; la racine partagée des fenêtres a son module, et le dernier cycle non voulu est dissous (5.e.10) |
           | PLAN (`planification`) | 5 949 | non mesuré |
           | CARE (`mesures`) | 6 428 | non mesuré |
           | PR (`profil_risque`) | 7 315 | non mesuré |
           | RAMP | 12 470 | non mesuré |
           | SURV (`execution`) | 23 731 | non mesuré |

           « Non mesuré » est à prendre au mot : on ne sait pas, pour ces cinq écrans, quelles
           vues sont ouvertes par la suite « parcours » ni quels gestes y sont exercés. Le
           portail a été mesuré avant d'être touché, et la mesure a dit qu'un écran de 4 217
           lignes était couvert par « trois vues se remplissent ». Il n'y a aucune raison
           d'espérer mieux des cinq autres, et chacun aura donc sa suite n° 0.

           5.c.0 [x] **Éprouver le portail avant de le réécrire — reprise du 7 octobre 2026,
               et mon relevé de la veille était faux d'un facteur trois.**

               Le relevé du 6 octobre annonçait **quarante gestes**. Il y en a **cent vingt
               et un**, en **soixante-dix-huit noms distincts**. Les quarante étaient ceux
               d'`app.js` — et le portail porte **neuf fichiers**, dont `app-config.js` qui
               en a cinquante-six à lui seul. *Un relevé fait à la main compte le fichier
               qu'on regarde.*

               Et un dénominateur faux rend une couverture fausse **dans le sens
               rassurant** : c'est le troisième jour de suite que cette direction-là est la
               seule où je me trompe.

               **D'où un outil plutôt qu'un geste** : [`scripts/relever-gestes.js`](../scripts/relever-gestes.js).
               Il relève les gestes d'un écran, **les nomme** — « 121 » ne dit pas lequel
               manque —, puis mesure dans un navigateur lesquels le parcours exerce
               réellement. Les cinq écrans suivants n'auront qu'une ligne à y ajouter.

               | | |
               |---|---|
               | Gestes nommés | **78** (121 occurrences) |
               | Exercés par la suite « parcours » | **4** — 5 % |
               | Indécidables (cible créée en vol, sans identifiant) | 8 |
               | **Non exercés** | **66** |

               ── Ce que l'outil a trouvé, et qui n'était pas le sujet ──

               **La suite appelait les fonctions, elle ne cliquait pas les gestes.** Les onze
               contrôles de sous-vues faisaient `window.cfgNavigate(sous)`. Cela éprouve la
               fonction ; cela n'éprouve ni que l'onglet existe, ni qu'il est trouvable, ni
               qu'il porte son gestionnaire. **Les onze contrôles seraient restés verts sur
               un écran où personne n'aurait pu atteindre une seule sous-vue.**

               Corrigé : la suite clique le bouton. Et le contre-essai mesure la différence —
               l'appel direct laisse `cfgNavigate` **non exercé**, le clic le marque exercé.
               L'outil distingue donc « la fonction marche » de « le geste marche », ce qui
               est tout l'objet d'une suite n° 0.

               **Un contrôle de la veille était vert sur zéro sous-vue.** Il comparait
               `distinctes >= sousVues.length - 1` : sur une liste vide, `0 >= -1`, donc
               **vrai**. Le contrôle écrit contre la vacuité l'était lui-même dans le seul
               cas où la barre ne rend rien — et ce cas se produit en retirant le `onclick`
               des onze boutons. Mes deux contre-essais de la veille passaient tous deux par
               une liste **pleine** : *un contre-essai ne couvre que le chemin qu'il
               emprunte.*

               ── Quatre fautes de l'outil, toutes trouvées en le contre-essayant ──

               Aucune n'aurait été vue en le relisant, et chacune rendait un chiffre
               plausible :

               · **il rejouait le parcours au lieu de le lancer.** Il cherchait
                 `.cfg-nav-item[data-cfg]`, qui ne désigne rien, là où la suite emploie
                 `.cfg-sidebar-item` : il mesurait **sa propre cécité**. La correction n'est
                 pas de rectifier le sélecteur, c'est de supprimer l'imitation —
                 `OASIS_MOUCHARD` fait poser l'instrumentation par la suite elle-même ;
               · **il ne relevait qu'une page sur trois.** La suite en ouvre trois et en
                 ferme deux ; une page fermée n'a plus de `window`. Le registre est passé
                 dans `localStorage`, que les pages d'une origine partagent ;
               · **il comparait la source du gestionnaire mot pour mot.** Or c'est un
                 gabarit : la source écrit `cfgNavigate('${tab.id}')`, le navigateur porte
                 `cfgNavigate('general')`. L'identité d'un geste est **la fonction qu'il
                 appelle** ;
               · **il agissait à l'import.** Sans garde de module, `require()` lançait la
                 mesure entière — découvert en voulant le contre-essayer, qui démarrait un
                 second serveur et réécrivait le relevé avant de commencer.

               Ce que le rapprochement par nom coûte est dit plutôt que découvert : deux
               gestes appelant la même fonction avec des arguments différents ne se
               distinguent plus. La couverture est donc comptée en **noms distincts**, les
               occurrences à côté — annoncer 8/121 sur un seul clic serait une couverture
               surévaluée d'un facteur huit.

               ── Le dénominateur est désormais gardé ──

               Le relevé est figé dans
               [`tests/smoke/gestes-portail.json`](../tests/smoke/gestes-portail.json), et un
               contrôle de la suite « taille » le compare à chaque campagne. Un geste ajouté
               ou retiré sans refaire le relevé fait tomber le contrôle, et son message dit
               quoi lancer. Trois contre-essais : un geste ajouté, un geste retiré, le relevé
               effacé — qui met le contrôle hors de portée plutôt que de le laisser vert.

               C'est ce qui manquait le 6 octobre : non pas la mesure, mais **le fait qu'elle
               se rejoue**.

           5.c.0.b [x] **Couvrir les gestes, et motiver ceux qu'on ne couvre pas** — fait le
               7 octobre 2026. **14 gestes exercés sur 78**, contre 4 au relevé initial, et
               les **56 autres déclarés avec leur raison**.

               | | Avant | Après |
               |---|---|---|
               | Gestes exercés | 4 (5 %) | **14 (18 %)** |
               | Contrôles de la suite « parcours » | 39 | **46** |
               | Gestes non exercés **sans motif écrit** | 66 | **0** |

               ── Deux contrôles passaient par un appel direct, et non par le geste ──

               Après `cfgNavigate`, **`applyLang`** : les deux contrôles de bascule de langue
               faisaient `window.applyLang('en')`. Les trois boutons de la barre pouvaient
               perdre leur gestionnaire sans qu'aucun contrôle ne bouge — c'est-à-dire sur un
               portail où personne ne peut changer de langue. Ils pressent désormais le bouton,
               et un contrôle de plus vérifie que les trois le portent.

               ── Sept contrôles de gestes, et quatre viseurs faux avant d'y arriver ──

               Les palettes, le repli de barre, les deux présentations des modules, la
               recherche, les onglets des utilisateurs, les fenêtres de référentiel. Chacun
               **presse** et vérifie un effet observable. Les six contre-essais mordent, chacun
               sur son contrôle.

               Mais quatre fois le contrôle était rouge **sur le mauvais élément**, et il a
               fallu regarder dans la page plutôt que supposer :

               | Ce que je visais | Ce qui est vrai |
               |---|---|
               | la recherche sur l'accueil | elle est sur la vue « utilisateurs » et quatre sous-vues |
               | `#mainView > *`, puis `.portal-grid` | la classe bascule sur `#portalModules` |
               | `[class*="modal"]` | `closeRefModal` vide `#cfgModalRoot` |
               | les boutons de référentiel dans la sous-vue par défaut | ils sont dans six des onze, et il faut attendre le dessin |

               Aucun de ces quatre n'était un défaut de l'application. **Le dire importe** :
               un rouge qu'on attribue au code quand il vient du contrôle fait « corriger »
               ce qui marchait.

               ── Une cécité de l'instrument, trouvée par un contrôle qui échouait ──

               Le bouton de vidage de la recherche reçoit `reset.onclick = portailViderRecherche` —
               une **propriété**, non un attribut `onclick=`. Ni le relevé statique (qui lit les
               attributs) ni le mouchard (qui cherche `closest('[onclick]')`) ne la voyaient.
               Le contrôle rendait « bouton introuvable » sur un bouton bien présent et bien
               branché.

               Et le nom ne suffisait pas : `window.x = function () {}` **ne nomme pas** la
               fonction — l'inférence de nom de JavaScript ne s'applique pas à une affectation
               sur un membre. `fn.name` rend la chaîne vide. La fonction est donc rapprochée
               **par son identité** parmi les globales, ce qui est exact.

               Deux gestes du portail sont dans ce cas. Peu — mais *une cécité ne se compte pas
               en nombre de cas manqués* : elle se compte en ce qu'elle laisserait passer.

               ── Un contrôle mince, rendu bilatéral ──

               Le filtre de la recherche était éprouvé par « une ligne qui disparaît ». Le bac
               d'essai n'en donne **qu'une** à cette vue : un filtre qui cache tout, quoi qu'on
               tape, aurait passé. Il est désormais éprouvé dans les deux sens — un terme tiré
               de la ligne elle-même, qui doit la garder ; un terme absurde, qui doit la cacher.
               Contre-essayé en forçant le filtre à ne jamais correspondre : la version
               unilatérale passait, la bilatérale tombe.

               ── Et les 56 restants sont **déclarés**, non omis ──

               [`tests/smoke/gestes-non-couverts.json`](../tests/smoke/gestes-non-couverts.json)
               porte chacun avec son motif, en quatre blocs :

               | Bloc | Nombre | Pourquoi |
               |---|---|---|
               | **Ils écrivent** | 24 | Demandent un jeu d'essai, l'assertion du résultat en base, et la vérification du retour en arrière. `supprimerInstance` — retirer l'instance d'un État — est le plus lourd du portail |
               | **Hors de portée du parcours** | 7 | Quittent la session, ou demandent un régime que la suite n'ouvre pas (MFA, mot de passe imposé, changement d'instance) |
               | **À couvrir, pas encore fait** | 22 | Non destructeurs : c'est un reste de travail, non une dispense |
               | **Pas des gestes** | 3 | `event.stopPropagation`, une interpolation de gabarit, un doublon de forme. Déclarés plutôt que filtrés — un filtre silencieux cacherait un jour un vrai geste |

               **Un contrôle rend cette liste obligatoire**, et il mord dans les deux sens :
               un geste non exercé et non déclaré le fait tomber — c'est l'oubli ; un geste
               déclaré qui **est** exercé le fait tomber aussi — *une dispense périmée est une
               dispense qui ment, et c'est elle qu'on finit par croire*. Trois contre-essais.

               C'est ce qui distingue une suite n° 0 d'un vœu : au jour de la réécriture, ce qui
               était un choix et ce qui était un oubli se lisent séparément.

           5.c.1 [~] **Le portail en TypeScript — ses deux fichiers sans interface,
               faits le 7 octobre 2026.** `i18n.js` (859 l.) et `icons.js` (87 l.) deviennent
               `frontend/portail/`, servis depuis `public/app/`. **946 lignes sur 4 217.**

               Ils viennent en premier pour une raison mesurée : ils sont chargés par **les
               trois pages** — l'accueil, la connexion, les témoins — et ils n'ont pas
               d'interface. Leur équivalence se prouve donc entièrement, ce qui n'est vrai
               d'aucun des sept autres.

               | | |
               |---|---|
               | Comparaisons sans écart | **1 435** |
               | Contre-essais | 5, tous mordants (un par exception) |
               | Clés × langues | 268 × 5, dont deux langues inconnues |
               | Icônes × tailles | 46 × 2, plus une inconnue |

               ── `CURRENT_LANG` est tout le sujet de cette conversion ──

               `let CURRENT_LANG` au premier niveau d'un script classique est une globale
               **lexicale** : on l'atteint par son nom, et elle n'est posée **nulle part sur
               `window`**. Mesuré dans un navigateur sur une page vierge, pas supposé.
               `app.js` et `app-config.js` la lisent ainsi.

               Un module ne peut pas créer de globale lexicale. Sans la poser sur `window`, les
               deux lectures lèveraient `ReferenceError` **au premier rendu** et le portail ne
               s'ouvrirait plus. C'est exactement ce qui est arrivé à `window.dtPriv` sur
               l'écran des droits, et c'est pourquoi la surface se mesure avant de convertir.

               Le sas la pose donc, et la **tient à jour** : `applyLang` la réassignait.

               **La comparaison a mis trois passes à savoir le mesurer**, et c'est sa valeur :

               · première passe — elle ne relevait pas `CURRENT_LANG` du tout. Retirer la ligne
                 qui le tient à jour laissait « aucun écart » ;
               · deuxième — elle le relevait après `applyLang` seulement. Retirer la pose **au
                 chargement** laissait encore « aucun écart », sur un portail qui ne s'ouvrirait
                 plus. C'est le défaut le plus grave qu'elle pouvait manquer, et elle le
                 manquait ;
               · troisième — elle le relève **au chargement et après chaque bascule**, dans les
                 deux formes de lecture : `window.CURRENT_LANG` et l'identifiant nu. Le
                 contre-essai rend alors « `"fr"` ≠ `ERREUR: ReferenceError` ».

               ── Une différence **déclarée**, et qui doit se produire ──

               La conversion **ajoute** `window.CURRENT_LANG`. La comparaison ne l'ignore pas :
               elle exige que l'ancien ne l'ait pas et que le converti l'ait, sur chaque langue.
               Une différence déclarée qui ne se produit pas est le signe que la mesure regarde
               ailleurs.

               Ce que l'ajout change, et qui est dit plutôt que découvert : `dates.ts` et
               `toast.ts` lisaient `window.CURRENT_LANG || localStorage`. Ils trouvaient
               `undefined` et retombaient sur le stockage ; ils trouveront la valeur. Même
               langue partout **sauf un cas** — en navigation privée, l'écriture du stockage
               est avalée, et le socle rendait alors la langue d'**avant** la bascule. Il rendra
               la bonne. C'est un changement, et il est meilleur.

               ── La règle d'une seule déclaration, appliquée entre ensembles ──

               `t` et `CURRENT_LANG` étaient déclarés par **trois fichiers du socle** —
               `cookies.ts`, `dates.ts`, `toast.ts` — faute de définisseur : le portail était du
               JavaScript sans types. Il en a un maintenant, et la règle de 5.b veut que ce soit
               lui, et lui seul, qui déclare.

               Ils restent **optionnels**, et c'est la vérité : seules trois pages sur neuf
               chargent ce sas. Le relevé de surface les liste « optionnelle absente, déclarée
               telle » sur les six pages de module, et `/index.html` a cessé de le faire — la
               mesure de l'amélioration.

               ── Les tables scindées, parce qu'un garde-fou avait raison ──

               268 clés × 3 langues font **921 lignes**, au-delà des 600 qu'un garde-fou de
               forme accepte. Un fichier par volet plutôt qu'une exception déclarée : le diff
               d'une traduction corrigée ne touche qu'un fichier.

               La scission a été faite **après** le retrait de l'ancien, donc sans pouvoir être
               prouvée. L'ancien a été restauré depuis `git` le temps de rejouer les 1 435
               comparaisons, puis retiré de nouveau. *Une opération mécanique est exactement
               celle dont on croit n'avoir pas besoin de preuve.*

               ── Quatre garde-fous, dont trois nouveaux ──

               | Garde-fou | Ce qu'il empêche |
               |---|---|
               | Sortie de construction déclarée | Un ensemble converti qui **n'est pas construit** : la table de `construire.mjs` doit couvrir tout dossier `globales/`, sinon la construction s'arrête en le nommant |
               | Sorties ignorées des deux côtés | Un paquet versionné, ou **passé en fraude dans l'image** par `COPY public`. Les sorties se déduisent de la table, non d'une liste |
               | Anciens chemins du portail | Un `/js/i18n.js` encore demandé — **un 404 sur les libellés des trois pages** |
               | Déclarations ambiantes de tous les ensembles | Le contrôle de surface dénonçait `CURRENT_LANG` comme requis et absent sur six pages : son graphe d'imports ne peut pas atteindre une déclaration que le portail porte |

               **Et le garde-fou des anciens chemins ne mordait pas à sa première écriture.**
               J'y avais mis un regard arrière, `(?<![a-z/])js…`, pour écarter le `shared/js` du
               socle. Il rejetait le `/` — donc `src="/js/i18n.js"`, **exactement le cas pour
               lequel il existe**. Mesuré en remettant la balise : le contrôle restait vert.
               Il n'y avait rien à écarter, `i18n` et `icons` n'existant que dans le portail.
               *Un garde-fou qui se protège d'une collision qui n'existe pas se protège surtout
               de mordre.*

               Reste à convertir : `app.js` (1 171 l.), `app-config.js` (1 443 l.),
               `portail-instances.js` (206), `app-demarrage.js` (168), `login-page.js` (159),
               `modules-host.js` (100), `cookies-page.js` (24) — **3 271 lignes**, et celles-là
               portent l'interface. C'est là que React entre.

           5.c.2 [x] **Les deux pages séparées du portail** — faites le 7 octobre 2026.
               `cookies-page.js` (24 l.) et `login-page.js` (159 l.) passent en TypeScript.
               **1 129 lignes du portail converties sur 4 217** ; il reste 3 088.

               Elles viennent avant `app.js` et `app-config.js` pour une raison d'ordre : ce
               sont des **pages séparées**, et leur échec ne pouvait pas casser l'accueil. On
               apprend la forme — un dossier `pages/`, une troisième cible de construction —
               sur les fichiers dont la chute coûte le moins.

               | | |
               |---|---|
               | Globales lues en moins | **4** — `applyLang`, `applyTheme`, `t`, `oasisEffacerPreferences` |
               | Surface posée par les deux fichiers | **vide** : aucun sas |
               | Clés de libellé désormais typées | 12, toutes présentes — vérifié avant de convertir |
               | Contrôles de navigateur ajoutés | 3, tous contre-essayés |

               **Les douze clés existaient.** Il faut le dire plutôt que de laisser croire à une
               trouvaille : la même vérification sur DROITS avait débusqué `dt('chargement')`,
               ici elle ne trouve rien. Un contrôle qui ne trouve rien a fait son travail.

               ── Le geste d'effacement, couvert parce qu'on y touchait ──

               La page des témoins n'a qu'un geste — « Effacer mes préférences sur cet
               appareil » — et il était **déclaré non couvert**. Le convertir était le moment de
               le couvrir. Trois contrôles, dont le troisième est celui qui compte :

               · la durée de session est **demandée au serveur** ;
               · le geste efface les préférences rangées ;
               · il **n'efface que celles-là**. Un effacement glouton déconnecterait un agent
                 qui voulait remettre son thème à zéro, et le contre-essai le montre : rendu
                 glouton, le contrôle rend `gardeReste: false`.

               **Et le premier de ces trois était vide de sens.** Il lisait la durée affichée et
               vérifiait qu'elle porte un chiffre. Or le secours du code est **30** et la
               configuration d'essai dit **30** : couper la requête laissait le contrôle vert
               sur un nombre écrit en dur. Il observe désormais **l'appel lui-même**, qui est ce
               que l'affirmation veut dire — et le contre-essai rend
               « demandée: false ».

               ── `window.onLangChange` s'en va de cette page, et c'est déclaré ──

               L'ancien fichier posait `window.onLangChange = nommerOeil` pour que la bascule de
               langue réécrive l'attribut accessible de l'œil : un `data-i18n` ne couvre pas un
               attribut. Le détour par une globale n'avait d'autre raison que la séparation des
               fichiers. La bascule vit dans la page désormais, et appelle `nommerOeil()`.

               Le nom reste au contrat : `app-demarrage.js` le pose encore pour l'accueil, et le
               sas continue de l'appeler. C'est cette page seule qui n'en a plus besoin.

               ── Quatre fautes de mesure, et la plus instructive est la dernière ──

               · *le relevé des gestes a fait **baisser** la couverture de 14 à 12* au moment de
                 la conversion — sans qu'un seul geste cesse d'être exercé. Son extracteur ne
                 connaissait pas le chaînage optionnel `?.`, que `strict` rend naturel. *Un
                 relevé qui bouge quand rien n'a bougé mesure sa propre syntaxe* ;
               · *puis de 14 à 13* : la pose de `const oeil` est à vingt-cinq lignes de son
                 écouteur, et la fenêtre de rapprochement en faisait douze. Elle lit désormais
                 tout le fichier, et le risque d'une variable réaffectée est écrit ;
               · *le geste d'effacement était **couvert et absent du relevé*** : ma nouvelle page
                 était ouverte par `newPage()` et non par `ouvrirPage()`, qui pose
                 l'instrumentation. Un contrôle qui mord, et un rapport qui l'ignore ;
               · et **le garde-fou des anciens chemins ne voyait pas les fichiers non suivis.**
                 `git ls-files` ne liste pas un fichier nouveau. Les deux garde-fous passaient
                 donc au vert sur un fichier qui vient d'être écrit, et ne mordaient qu'**après
                 le commit** — c'est-à-dire au moment précis où l'on a cessé de regarder. Six
                 mentions ont été dénoncées à la campagne suivante, les fichiers étant devenus
                 suivis entre-temps. `--others --exclude-standard` les ajoute.

               ── Une exemption, et c'est une condition ──

               `scripts/comparer-portail.js` **doit** nommer l'ancien chemin : son objet est
               d'opposer l'ancien au converti. L'exemption ne lui est pas accordée pour son nom
               mais pour une **propriété vérifiable** — il doit porter son propre refus, un test
               d'existence et une sortie en erreur quand l'ancien a disparu. Contre-essayé : le
               refus retiré, l'exemption tombe.

               *C'est la différence entre une exception et une condition.* Le comparateur du
               socle, lui, échappait au garde-fou **par construction** — il assemble son chemin
               — et donc par chance.

               ── Et la palette extraite, re-prouvée ──

               Les trois gestes de `applyTheme` vivaient dans le sas ; la page de connexion les
               importe, et un fichier typé n'a pas à passer par `window` pour en atteindre un
               autre. L'extraction a été faite après le retrait de l'ancien : celui-ci a donc
               été restauré depuis `git` le temps de rejouer les **1 435 comparaisons**, pour la
               deuxième fois en deux étapes.

               Ce n'est pas la même fonction que `appliquerTheme` du socle, et c'est écrit dans
               le fichier : celle du socle **ne normalise pas** la clé. Un thème retiré y
               passerait tel quel. Elles ne sont pas interchangeables, et quelqu'un voudra les
               « dédoublonner ».

           5.c.3 [x] **Le couplage avant l'interface : l'état partagé du portail** — fait le
               7 octobre 2026. *C'est l'étape qui débloque toutes les suivantes, et elle n'était
               pas au plan.*

               ── La mesure qui a changé le plan ──

               L'étape suivante devait être `app-demarrage.js` (168 l.), le plus petit des
               fichiers d'interface. **Il n'est pas convertible seul**, et aucun des autres non
               plus. Mesuré dans un navigateur, et non déduit :

               | | |
               |---|---|
               | Noms déclarés au premier niveau d'un fichier et lus par un autre | **13** |
               | Dont **sur `window`** (déclarés en `function`) | 27 des noms éprouvés — lisibles par un module |
               | Dont **globales lexicales** (`let`/`const`) | **8** — *invisibles à un module* |

               Une globale lexicale n'est posée **nulle part** sur `window` : un module ne peut
               ni la lire ni l'écrire. Le blocage, fichier par fichier :

               | Fichier | Ce qui le bloquait |
               |---|---|
               | `modules-host.js` (100 l.) | lit `VIEWS` |
               | `portail-instances.js` (206 l.) | lit `ME`, `CFG_SUB` |
               | `app-demarrage.js` (168 l.) | **écrit** `VIEWS`, `CURRENT_VIEW`, `ME`, `NOTIF_LAST_SEEN` |

               **C'est le couplage, et non l'interface, qui bloquait la migration.** La même
               leçon que le socle, qui est passé avant les écrans parce que les neuf écrans en
               dépendaient — et qu'il a fallu redécouvrir, un étage plus bas.

               Et ma première mesure en voyait **huit** là où il y en a treize : j'avais listé
               les noms que je soupçonnais au lieu de relever les déclarations. `REFS`,
               `CFG_COLLAPSED`, `PRIO_COLORS`, `LEVEL_COLORS`, `PORTEE_LABELS`, `porteeDe`,
               `jeSuisRegional` manquaient. *Une liste de noms devinés mesure ce qu'on soupçonne.*

               ── Ce qui a été fait ──

               Sept noms passent de `let` au premier niveau d'`app.js` à des propriétés de
               `window`, posées par [`frontend/portail/etat.ts`](../frontend/portail/etat.ts) et
               son sas, **chargé avant `app.js`**.

               Les fichiers en JavaScript **n'ont pas changé d'un caractère** dans leurs
               lectures ni leurs affectations : un nom non déclaré atteint la propriété de
               `window`. Huit lignes de déclaration ont disparu, et c'est tout le diff côté
               JavaScript.

               La source de vérité reste `window`, et c'est délibéré : un module qui tiendrait
               sa propre copie divergerait au premier écrit d'un fichier en JavaScript, **en
               silence**. Le jour où le dernier s'en va, l'état devient un état de React et ce
               fichier disparaît.

               ── La seule différence de comportement, et elle est dite ──

               `let X` au premier niveau est dans sa zone morte avant sa ligne : un accès
               **lève**. Une propriété de `window` rend la valeur initiale. Aucun chemin du
               portail ne lit ces noms avant leur déclaration — et s'il en apparaissait un, il
               rendrait `null` au lieu de lever.

               C'est un affaiblissement, assumé : la contrepartie est qu'un module peut lire et
               écrire cet état, ce qu'aucune zone morte ne permet.

               ── Quatre contrôles de navigateur, et ce qu'ils éprouvent vraiment ──

               Pas « les noms existent » — **qu'ils soient la même chose pour les deux
               régimes**. Les deux sens sont mesurés : une affectation nue atteint `window`, et
               une écriture sur `window` est vue par une lecture nue.

               **Le contre-essai le plus instructif** : un `let ME` réintroduit dans `app.js`.
               Il fait tomber le garde-fou de forme *et* le contrôle de navigateur, qui rend
               « ME rempli: **false** » — l'écran afficherait un état vide pour un état chargé,
               sans erreur ni trace. Les deux disent la même chose, l'un par la forme, l'autre
               par l'effet.

               Et sans le sas, le portail s'effondre : « ReferenceError: CURRENT_VIEW is not
               defined », l'accueil à **0 caractère**.

               ── Un garde-fou, et sa vacuité refermée ──

               Aucun fichier du portail ne redéclare l'un des sept noms, et la liste se
               **déduit** du `declare global` d'`etat.ts` — en ajouter un à l'état le met sous
               garde sans qu'on y pense.

               Mais le contrôle **passait sur zéro nom** : liste illisible, aucune
               redéclaration trouvée, vert. *La même vacuité que celle du contrôle des
               sous-vues, corrigée la veille, reproduite dans le contrôle écrit juste après.*
               La connaître ne suffit pas : il faut l'écrire chaque fois.

               ── Ce qui reste du couplage, et pourquoi on le laisse ──

               Six noms partagés ne sont pas dans l'état : `PRIO_COLORS`, `LEVEL_COLORS`,
               `OASIS_LOGO_IMG`, `PORTEE_LABELS`, `porteeDe`, `jeSuisRegional`. Ce sont des
               **constantes et des fonctions pures**, non de l'état mutable : le fichier qui les
               définit les publiera par son sas le jour de sa conversion, comme le socle l'a
               fait pour les siennes. Elles ne bloquent personne.

           5.c.4 [x] **`modules-host.js` — la première preuve que 5.c.3 a servi** — fait le
               8 octobre 2026. 100 lignes, et il ne lisait qu'**un** nom bloquant : `VIEWS`.
               Posé sur `window` la veille, ce fichier est devenu convertible seul.
               **1 229 lignes du portail sur 4 217** ; il reste 2 998.

               ── Le compilateur a trouvé une collision que rien ne voyait ──

               **`window.api` porte deux fonctions différentes.** Le socle en publie une
               (`oasis-utils`), `app.js` en définit une autre — et une `function` au premier
               niveau se pose sur `window`. Déclarer la seconde a fait lever `tsc` : *aucun
               contrôle ne l'avait vu, et aucune relecture non plus.*

               | | portail (`app.js`) | socle (`utils.ts`) |
               |---|---|---|
               | Rend | la **réponse brute** | le JSON déjà lu |
               | En-têtes | `X-OASIS-Request` seul | plus `Content-Type` et un jeton |
               | Sur un refus | rend la réponse | **lève** avec un message traduit |

               La collision est **latente**, mesurée page par page : `oasis-utils` est chargé
               par trois écrans de module, `app.js` par l'accueil seul. **Aucune page ne charge
               les deux**, et celle qui le ferait prendrait celle que son dernier `<script>`
               pose — sans erreur. Un garde-fou de forme l'interdit désormais ; il ne résout pas
               la collision, il la tient latente jusqu'à la conversion d'`app.js`.

               ── Un garde-fou existant a refusé ma première réponse, et il avait raison ──

               J'avais lu l'appel du portail à travers une affirmation de type, « confinée et
               commentée ». Le contrôle *« le typage du frontend n'est défait nulle part »* l'a
               refusée. **Une affirmation justifiée reste une affirmation** — c'est ainsi que
               `window.dtPriv` avait menti.

               La bonne réponse n'était pas de contourner mais de **supprimer la dépendance**.
               Les deux choses que faisait cet appel sont déjà ailleurs : `X-OASIS-Request` est
               posé sur tout appel par l'enveloppe du socle, et le retour à la connexion sur 401
               est `sessionPerdue`, que le socle **exporte**. Un `fetch` nu suffit, et ce fichier
               ne dépend plus d'`app.js` du tout — une dépendance de moins **avant** sa
               réécriture, non une de plus.

               ── Le dénominateur a encore baissé, et c'était la deuxième fois ──

               Le relevé des gestes ne lisait que `public/js/` et `frontend/portail/pages/`.
               `modules-host.js` est parti vers la **racine** de `frontend/portail/`, et le geste
               `window:message` a disparu du relevé sans cesser d'exister.

               *Hier, la même faute avec `pages/`.* Corriger le chemin une fois de plus serait
               attendre la troisième : le relevé lit désormais l'ensemble, récursivement. Le
               dénominateur est stable — **78 gestes, 15 exercés**, inchangés par la conversion.

               ── Deux contre-essais qui ne mordaient pas, et ce qu'ils ont appris ──

               · *retirer l'enregistrement des vues `mod_<CODE>`* laissait la suite verte. Le
                 contrôle qui monte un module **clique une carte**, et passe donc par l'autre
                 famille de vues — celle des cartes. **L'accès direct n'était couvert par
                 personne.** Couvert : chaque module monté doit avoir sa vue, la liste venant du
                 serveur. Le contre-essai nomme maintenant les deux qui manquent — `PR` et
                 `DROITS`, les deux modules sans carte ;
               · *retirer le retour à la connexion sur 401* laisse la suite verte, et **ce reste
                 vrai**. La suite n'a jamais de session expirée sur le portail. C'est une lacune
                 antérieure à cette conversion, et elle est déclarée ici plutôt que comblée à la
                 hâte : l'éprouver demande d'invalider une session en cours de parcours, ce qui
                 mérite sa propre séance.

               ── Trois noms publiés que personne ne lit ──

               `moduleHostLoadRegistry`, `moduleHostRender`, `moduleHostChrome` étaient sur
               `window` sans lecteur : une `function` du premier niveau s'y pose, qu'on le veuille
               ou non. Ils y restent **parce qu'ils y étaient** — retirer un nom de la surface est
               un changement, qui se fera en le disant. Même conduite que pour `_icon`.

           5.c.5 [x] **`app-demarrage.js` — la navigation, les notifications, le démarrage**
               — fait le 8 octobre 2026. 168 lignes, et **1 389 du portail sur 4 217** ; il
               reste 2 828.

               Il **écrivait** quatre globales lexicales : c'était le plus bloqué des quatre, et
               la suite n° 5.c.3 l'a libéré. Un dernier nom manquait — `OASIS_LOGO_IMG`, une
               constante restée dans `app.js` au premier tri. *Le tri « mutable ou non » n'était
               pas le bon critère : ce qui compte est **ce qu'un fichier converti doit
               atteindre**.*

               ── Le compilateur trouve une deuxième collision, et une lacune réelle ──

               `window.showToast` porte **deux fonctions**, comme `window.api`. Celle du socle
               ne prenait que deux paramètres et appelait `oasisToast(message, type)` : **toute
               durée demandée partait en silence**. Celle d'`app.js` en prend trois et la passe.

               Mesuré appel par appel : les **douze** appels à trois arguments sont tous dans
               `public/js/`, donc sur le portail, qui emploie la version d'`app.js`. Aucun
               fichier de module n'en passe — la lacune était **latente**. Un avis de huit
               secondes demandé depuis un écran de module serait resté quatre.

               Comblée : une ligne, et `toast()` acceptait la durée depuis toujours. *Il n'y
               avait rien à ajouter là, seulement à ne plus l'oublier en route.*

               Et mon premier comptage était faux — mon motif attrapait le `1048576` d'un
               argument de message et annonçait un appel vivant dans `profil_risque`. *Un motif
               trop large transforme une lacune latente en défaut imaginaire.*

               ── Mon omission, et le contrôle qui l'a dite ──

               La conversion a **perdu l'affectation des cinq vues de base**. `naviguer` ne
               trouvait aucune vue et repliait tout sur l'accueil.

               Le contrôle a rendu : *« la vue du profil se remplit **et ne porte pas ses
               champs** »* — mille lignes de contenu, et les mauvaises. **C'est le contrôle de
               champs posé par la suite n° 0 qui l'a dit** ; « l'écran n'est pas vide » aurait
               passé. Quarante-huit heures entre poser un contrôle et lui devoir la découverte
               d'une régression qu'on vient d'écrire.

               Et les vues sont désormais **fusionnées** dans la table, non affectées :
               l'original faisait `VIEWS = {…}`, qui remplace. Cela marchait parce que l'hôte des
               modules chargeait après ; inverser les deux balises aurait effacé les vues des
               modules, sans erreur, et l'on aurait cherché du côté des modules.

               ── Trois comportements que personne n'éprouvait ──

               Les contre-essais les ont nommés, et tous trois sont couverts :

               | Ce qu'on ôtait | Ce que la suite disait | Désormais |
               |---|---|---|
               | `onLangChange` | rien | la bascule **redessine le contenu**, non seulement les menus |
               | le plein écran défait au retour | rien | sortir d'un module rouvre l'accueil et rend la barre |
               | l'écriture de la pastille | rien | la pastille porte le nombre non vu |

               Le premier mérite d'être dit : `poserLangue` retraduit les éléments marqués
               `data-i18n`, et les boutons de navigation en portent. Les deux contrôles de langue
               passaient donc **sans que la vue soit redessinée** — un portail dont les menus
               suivent la langue et dont le contenu reste en français, sans un mot.

               ── Et la pastille a demandé trois écritures ──

               1. *« elle s'affiche et porte un nombre »* : le jeu porte quatre-vingt-quatorze
                  notifications, et j'en avais déduit que le compte en verrait. **L'API en rend
                  zéro pour lui** — elles sont rangées par instance. La pastille disait vrai,
                  c'est le contrôle qui avait tort ;
               2. *« elle s'accorde au compte rendu par l'API »* : vrai, et **vide de sens** —
                  avec zéro notification, la pastille porte « 0 » qu'on l'écrive ou non ;
               3. l'état est **fabriqué** : trois notifications rendues par un `fetch`
                  substitué. Trois contre-essais, trois morsures distinctes.

               *Une mesure prise sur l'état que le jeu donne mesure le jeu, non le code.*

           5.c.6 [x] **`portail-instances.js` — et le geste le plus lourd du portail, couvert**
               — fait le 8 octobre 2026. 206 lignes. **1 595 du portail sur 4 217** ; il reste
               2 622, dans `app.js` et `app-config.js` seuls.

               ── Le blocage, à l'envers ──

               Les trois fichiers précédents étaient bloqués par ce qu'ils **lisaient**.
               Celui-ci l'était par ce qu'il **définit** : `PORTEE_LABELS`, `porteeDe` et
               `jeSuisRegional` sont des `const` — lexicales —, et ce sont `app.js` et
               `app-config.js`, restés en JavaScript, qui les lisent. Le sas les leur pose, et
               ils n'ont pas changé d'une ligne.

               Sa surface compte **douze noms**, dont quatre d'une famille qu'on ne trouve pas
               en cherchant des lecteurs : `basculerInstance`, `supprimerInstance`,
               `ouvrirInstance`, `changerInstance` sont nommés dans des attributs `onclick` que
               **ce fichier écrit lui-même**. Aucun fichier ne les lit, et les retirer casserait
               l'écran.

               ── `supprimerInstance`, couvert par une ronde complète ──

               Il retire l'instance d'un État, **sans retour**. Déclaré non couvert depuis le
               7 octobre ; le convertir était le moment de le couvrir.

               Trois contrôles, et la ronde ne laisse rien derrière elle — l'instance créée est
               celle qu'on supprime :

               | Geste | Ce qui est vérifié |
               |---|---|
               | ouvrir | la ligne paraît dans la table |
               | mettre en sommeil, réveiller | la ligne passe à `row-inactive`, puis en revient |
               | supprimer | la **confirmation est pressée**, et la ligne part |

               Quatre contre-essais, tous mordants, et le premier est le plus parlant : ôter la
               confirmation rend « `confirmation: false` » — le contrôle remarque que la fenêtre
               **n'apparaît plus**, et non seulement que la suppression a eu lieu. Un contrôle
               qui n'aurait regardé que la disparition de la ligne aurait approuvé une
               suppression sans garde-fou.

               ── Le garde-fou du typage mord pour la deuxième fois en deux jours ──

               J'avais lu `instance_vue` et `instance` sur le compte par **quatre affirmations**
               `as unknown as`. Le contrôle *« le typage du frontend n'est défait nulle part »*
               les a refusées.

               La signature d'index de `Moi` les laissait passer en `unknown` — exact, et
               inutilisable. *Un champ que l'application lit est un champ qui a un type* : six
               lignes de déclaration, et les quatre affirmations s'en vont.

               Hier, le même garde-fou avait refusé la même facilité sur l'appel d'API. **Deux
               fois en deux jours, et dans les deux cas la bonne réponse n'était pas de
               contourner mais de nommer ce qu'on lit.**

               ── Une nuance de type qui dit quelque chose du code ──

               `exactOptionalPropertyTypes` a refusé `instances: d.instances`, le serveur pouvant
               ne pas rendre la liste. L'original l'affectait telle quelle : une création
               réussie sans liste aurait mis `undefined`, et le bandeau serait retombé à sa forme
               sans choix. `?? []` donne **exactement le même effet observable** — le bandeau lit
               `(instances ?? []).length`, nul dans les deux cas — et le type cesse de prétendre
               qu'une liste est là.

               **Il ne reste que `app.js` et `app-config.js` dans `public/js/`.** Les deux
               collisions — `window.api` et `window.showToast` — s'y résoudront, et les
               cinquante-deux gestes encore découverts sont presque tous les leurs.

           5.c.7 [x] **Couvrir les écritures avant de réécrire** — fait le 8 octobre 2026.
               **20 gestes exercés sur 78**, contre 15 le matin ; 63 contrôles de parcours
               contre 57.

               C'est l'application de mon propre conseil, et il n'allait pas de soi : `app.js`
               et `app-config.js` restent à réécrire, et la tentation est de s'y mettre. Mais
               la suite n° 0 a déjà prouvé deux fois sa valeur en quarante-huit heures — la
               régression des vues le 8, l'omission des champs le 7 —, et **2 622 lignes
               réécrites sans contrôles se compareraient à peu de chose.**

               ── Un référentiel de bout en bout ──

               Le plus gros bloc de gestes non exercés : `openRefModal` huit fois,
               `closeRefModal` dix, `saveRef`, `deleteRef` quatre. Et ce sont des
               **écritures** — ces tables commandent les organigrammes, les domaines, les
               qualifications.

               `organisation_levels` choisi pour deux raisons **mesurées** : son schéma n'a que
               deux champs, et rien ne référence un niveau qu'on vient de créer. La ronde ne
               laisse rien derrière elle, comme celle des instances.

               | Contrôle | Ce qu'il éprouve |
               |---|---|
               | créer | la ligne paraît **avec sa valeur**, et la fenêtre n'est plus là |
               | modifier | la fenêtre d'édition **porte la valeur enregistrée**, et la remplace |
               | supprimer | la **confirmation est pressée**, et la ligne part |

               Le deuxième est celui qui compte : une fenêtre d'édition qui s'ouvrirait **vide**
               ferait écraser l'enregistrement par du vide, au premier enregistrement, sans
               erreur. Le contre-essai le montre — `relu: {"type":"","ordre":""}`.

               ── Et une assertion qui n'éprouve pas ce qu'elle semble dire ──

               « … et la referme » est satisfait par le **redessin**, non par la fermeture :
               ôter le `closeRefModal()` du chemin de succès ne fait pas tomber le contrôle.
               `<div id="cfgModalRoot">` fait partie du gabarit de la vue, que `renderConfig()`
               redessine ; la fenêtre part avec elle.

               L'appel explicite est donc **redondant sur ce chemin**. C'est écrit dans le
               contrôle : *il faut dire lequel des deux gestes obtient l'effet, sinon on croira
               l'autre couvert.* La ligne n'est pas retirée — elle est défensive, et
               `app-config.js` est le prochain fichier réécrit ; ôter du code mort d'un fichier
               qu'on va refaire est du remue-ménage, non du ménage.

               ── Ce qui reste à couvrir, et par quoi commencer ──

               **50 gestes**, dont **17 écritures**. Les plus lourdes d'abord, au même titre que
               `supprimerInstance` l'a été : `submitEditUser` et `saveUserModules` — qui donnent
               ou retirent l'accès d'un compte à un module —, puis `doImport`, qui écrit en
               masse.

           5.c.8 [x] **Les deux écritures les plus lourdes du portail** — fait le 9 octobre
               2026. **22 gestes exercés sur 78**, contre 20 ; 65 contrôles de parcours.

               `saveUserModules` **donne ou retire l'accès d'un compte à un module** ;
               `submitEditUser` modifie sa fiche. Ce sont les deux gestes dont une régression
               silencieuse coûterait le plus — un agent qui perd l'accès à son module, ou dont
               le nom change sans qu'il l'ait demandé.

               Les deux rondes sont **réversibles** : on bascule, on vérifie, on rétablit, on
               vérifie encore. *Une écriture qui marche dans un sens et pas dans l'autre est à
               moitié éprouvée.* Et le compte visé est `admin@anac.bj`, **non celui qui est
               connecté** : se modifier soi-même romprait la session, et tout ce qui suit.

               ── Le contre-essai qui vaut la séance ──

               La fenêtre d'édition ouverte avec un prénom **vide** : le contrôle rend
               `luDAbord: ""`, et la ligne devient `ADMIN — admin@anac.bj`. C'est le défaut
               complet, et il est silencieux de bout en bout — la fenêtre s'ouvre, on y change
               le téléphone, on enregistre, et le prénom est effacé. Aucune erreur, aucune
               trace.

               Deux autres mordent : les cases cochées non envoyées (`apres: "0/11"` — **tous
               les accès retirés**), et le prénom absent du corps de la requête.

               ── Et ma propre ronde n'en était pas une ──

               La bascule prenait « le premier module décoché » **à chaque appel**. Le second en
               trouvait donc un autre : RAMP accordé, puis CARE accordé, et la pastille passait
               de 2/11 à 3/11 à **4/11**. Le contrôle a rendu « rendu: 4/11 » là où il attendait
               2/11 : *il a dénoncé la ronde, non le code.*

               Le module visé est désormais nommé au premier passage et redonné au second.

               ── Ce qui reste ──

               **48 gestes**, dont **15 écritures**. La suivante par ordre de poids est
               `doImport`, qui écrit en masse depuis un classeur — elle demande un fichier
               d'essai, et c'est le premier geste de la liste qui ne se couvre pas en une
               ronde.


           5.c.9 [x] **L'import d'un classeur, la seule écriture en masse** — fait le
               9 octobre 2026. **24 gestes exercés sur 78**, contre 22 ; 69 contrôles de
               parcours, 955 pour la campagne.

               `doImport` lit un fichier Excel et écrit **autant de lignes qu'il en
               contient**. Les autres écritures du portail touchent une ligne, décidée par
               l'agent ; celle-ci en touche un nombre décidé par le fichier. C'était le
               premier geste de la liste qui ne se couvre pas en une ronde — il lui faut un
               classeur.

               ── Le classeur n'est pas fabriqué, il est pris à la fenêtre ──

               Le test aurait pu écrire un `.xlsx` de toutes pièces. Il porterait alors les
               en-têtes **que je crois justes**. Le classeur du contrôle est donc demandé au
               lien « Télécharger le modèle » de la fenêtre elle-même, rempli d'une ligne
               **dans l'ordre des en-têtes servis**, et renvoyé par le champ de fichier.

               Un contrôle à part compare ces en-têtes à `['code','nom','description','statut']`.
               Contre-essayé en ôtant `description` de `IMPORT_COLS` : **lui seul tombe**, et
               les trois autres restent verts — la dérive est nommée une fois, au lieu de faire
               échouer l'import sans raison lisible.

               ── Pourquoi `domaines`, et non les trois autres collections ──

               L'écran offre l'import sur quatre collections. `domaines` est la seule qui porte
               un **code**, donc la seule où la mise à jour sur le code — la propriété qui
               distingue ce geste de toutes les autres écritures — soit éprouvable. Sur
               prestataires, exigences ou personnel, importer deux fois le même fichier
               n'aurait rien à prouver.

               ── J'avais écrit le contrôle contre le mauvais défaut ──

               Je l'avais écrit contre la **duplication** : « un import qui créerait une
               seconde ligne à chaque passage ». Le contre-essai dit autre chose. Désactiver
               la mise à jour sur le code ne crée aucun doublon — le référentiel refuse un code
               déjà pris — mais rend **« 0 ajout(s), 0 mise(s) à jour — 1 ligne(s) ignorée(s) »** :
               l'import ne fait rien, et le dit à moitié.

               Le vrai danger était l'autre, et c'est le contre-essai qui vaut la séance : en
               ôtant l'écriture du chemin de mise à jour, le compte rendu annonce **« 0 ajout(s),
               1 mise(s) à jour »** et la ligne garde son ancien nom. *Le bandeau ment, et rien
               ne le dit.* C'est pour celui-là que le **nom relu** est asserté, et non seulement
               le message.

               ── Et l'écran, qui peut rester muet quand la base a reçu ──

               Troisième contre-essai : ôter la relecture et le redessin du chemin de succès.
               Les données entrent bien en base, le bandeau annonce « 1 ajout » — et **l'écran
               ne montre rien**. C'est le défaut qui fait importer deux fois. Le contrôle
               regarde donc l'accordéon, et pas seulement l'API.

               ── Cinq contre-essais, cinq rouges ──

               Les quatre contrôles étaient verts **du premier coup** : c'est exactement le cas
               où il faut réintroduire le défaut. Mise à jour désactivée ; mise à jour annoncée
               et non appliquée ; colonne retirée du modèle ; redessin ôté ; suppression non
               envoyée. Chacun mord là où il doit, et le quatrième a dénoncé au passage que la
               défaite de la ronde **dépend de l'affichage** — elle cherche la ligne à l'écran.

               La ronde se défait par l'écran, confirmation pressée, et le référentiel est
               recompté avant et après.

               ── Ce qui reste ──

               **46 gestes**, dont **14 écritures**. Les suivantes se tiennent par trois :
               `saveAAC`, `saveSecurite`, `saveSysteme` — la configuration de l'instance, qui
               se couvre en une ronde chacune. Puis les quatre gestes d'intérim de
               l'organigramme, les photos et logos (`uploadAacLogo`, `uploadProfilePhoto` —
               ils demandent un fichier, comme l'import), et `submitProfilePassword`, qui
               demande un compte dédié puisqu'il change le mot de passe de qui le presse.


           5.c.10 [x] **Les trois écritures de la configuration de l'instance** — fait le
               9 octobre 2026. **28 gestes exercés sur 78**, contre 24 ; 76 contrôles de
               parcours, 962 pour la campagne.

               *Les dénominateurs « sur 78 » de cette entrée et des précédentes sont faux :
               l'outil n'en voyait que 78 sur **84**, faute de connaître six types
               d'événement. Corrigé en 5.c.11, qui le mesure et dit comment. Les chiffres
               sont laissés tels qu'ils ont été relevés — un registre qu'on réécrit ne dit
               plus quand on a su.*

               `saveAAC`, `saveSecurite`, `saveSysteme`, et `openAacEdit` qui ouvre la
               première. Elles se couvrent ensemble parce que le danger qu'elles portent est
               **le même**, et qu'il n'est pas celui qu'on croit.

               Chacune envoie **tout son bloc** à chaque enregistrement : les sept paramètres
               de sécurité que l'écran montre, les huit champs de l'identité, les deux de la
               réplication. L'assertion qui compte n'est donc pas ce qui change, mais **ce qui
               ne doit pas changer** — et les champs visés sont choisis pour ne rien pouvoir
               rompre, puisque `mfaEnabled`, `forceChangeOnFirstLogin`, `sessionTimeoutMinutes`
               et `defaultLang` décident de la session même qui exécute les contrôles.

               ── Le contre-essai qui vaut la séance : la fenêtre ouverte vide ──

               `openAacEdit` privé de `cfg.aac` rend ses huit champs à `""`, et
               l'enregistrement **efface l'identité entière de l'Administration** :

               ```
               rendu : {"nom":"","sigle":"","etat":"","bigramme":"",
                        "pays":"Bénin","ville":"Cotonou","emailAdmin":""}
               ```

               `pays` et `ville` survivent — le premier parce que l'écran ne l'envoie jamais, le
               second parce que c'est le champ que la ronde avait remis. Tout le reste est parti,
               sans erreur et sans trace. C'est le défaut de `submitEditUser` à l'échelle de
               l'instance.

               ── Et ce que ce contrôle n'attrape pas, dit à voix haute ──

               J'ai contre-essayé la sécurité en **supprimant** `mfaEnabled` du corps de la
               requête. **Le contrôle reste vert.** Le serveur n'applique qu'un booléen qu'il
               reçoit (`typeof === 'boolean'`), si bien qu'une case que la fenêtre n'aurait pas
               su relire ne peut pas éteindre un drapeau par omission. *Le défaut du champ
               effacé n'a pas d'équivalent sur ce bloc, et c'est le serveur qui l'empêche, non
               l'écran.*

               Ce qu'il attrape est la valeur **inversée** : `!checked` rend `mfaEnabled: true`,
               le contrôle mord, et celui de la remise en place dénonce en plus que la ronde ne
               se défait pas. Au passage, la séance a **survécu** à cette MFA allumée — elle
               n'est vérifiée qu'à la connexion, et la session était déjà ouverte.

               ── Mon libellé disait six là où le contrôle en vérifie douze ──

               Le bloc `security` porte **treize** champs ; l'écran en montre sept. Les six
               qu'il n'offre pas — les quatre exigences de composition du mot de passe, le
               plafond d'écritures par minute, la profondeur de l'historique — ne doivent pas
               davantage être dérangés. Le contre-essai les a fait apparaître dans le
               diagnostic, et le libellé a été corrigé.

               ── Un diagnostic de 1,4 Mo ──

               Le premier contre-essai de l'identité a craché **1,4 Mo** : le logo de l'AAC est
               une image en base 64 de 374 498 caractères, et je rapportais le bloc entier. Il
               est désormais **comparé** comme le reste et **jamais rapporté** —
               `[image de 374 498 caractères]`. *Un contrôle dont l'échec est illisible n'aide
               personne.*

               ── Une asymétrie nommée, et pourquoi je ne la corrige pas ──

               Le serveur n'écrit l'adresse centrale que si elle est **non vide**
               (`if (replication.centralUrl)`). Vider le champ et enregistrer rend donc
               « Configuration enregistrée. » — et garde l'ancienne adresse. L'opérateur ne peut
               pas effacer la cible par l'écran, et rien ne le lui dit.

               Un contrôle **fixe** ce comportement plutôt que de le bénir : contre-essayé en
               corrigeant le serveur (`!== undefined`), il mord — c'est le propre d'un contrôle
               qui pose un comportement, sa correction devient un choix délibéré.

               Et je ne le corrige pas ici. Ce que signifie « effacer l'adresse du central »
               appartient à la spécification de la réplication, qui n'existe pas
               ([ADR-001](ADR-001-magasin-de-donnees.md) n° 1) : décider qu'un champ vide
               désactive la cible, ou qu'il est refusé, est une décision de cette
               spécification, non la mienne.

               ── Ce qui reste ──

               **42 gestes**, dont **11 écritures**. Les quatre gestes d'intérim de
               l'organigramme (`orgStartInterim`, `orgEndInterim`, `orgConfirmInterim`,
               `orgUnassign`) vont par paires et sont donc réversibles par construction. Puis
               les dépôts de fichiers — `uploadAacLogo`, `uploadProfilePhoto` et leurs retraits
               —, dont le chemin est désormais connu par l'import. Et `submitProfilePassword`,
               qui demande toujours un compte dédié.


           5.c.11 [x] **L'organigramme — et mon relevé ne voyait pas quatre gestes** —
               fait le 9 octobre 2026. **39 gestes exercés sur 84**, contre 29 sur 84 ;
               82 contrôles de parcours, 968 pour la campagne.

               ── D'abord : le dénominateur était faux, et dans le sens flatteur ──

               En allant couvrir l'organigramme, ses quatre gestes de glisser-déposer
               — `orgDragStart`, `orgAllowDrop`, `orgDragLeave`, `orgDrop` — n'étaient **ni
               dans le relevé, ni dans la liste des dispenses**. Ils n'étaient pas déclarés
               non couverts : *ils n'existaient pas pour l'outil.* L'extracteur et le mouchard
               ne connaissaient que `click`, `change`, `submit` et `input`.

               **Un geste qu'un outil ne sait pas voir ne manque jamais à l'appel.** Et
               l'erreur allait dans le sens qui flatte : 78 au dénominateur là où il y en a
               **84**, donc 36 % annoncés pour 35 % réels.

               La liste est élargie à `blur`, `mousedown`, `dragstart`, `dragover`,
               `dragleave`, `drop`. Deux conséquences immédiates :

               · `portailFermerRechercheSiVide` — quitter le champ de recherche le referme —
                 était **déjà exercé** depuis trois jours, sans que rien ne le dise ;
               · `event.preventDefault` du bouton de vidage apparaît, et il est **déclaré**
                 comme précaution plutôt que filtré. Un filtre silencieux cacherait un jour un
                 vrai geste.

               `load` n'y entre pas, et c'est dit : les trois `reader.onload` du portail sont
               des retours de lecture de fichier, non des gestes d'un agent.

               ── Et le commentaire du mouchard annonçait depuis trois jours ce que le code ne faisait pas ──

               « un écouteur en **capture** sur le document » — sans le drapeau de capture.
               Sans effet sur les quatre événements d'alors, qui tous remontent. Mais `blur`
               **ne remonte pas** : c'est pourquoi il était invisible. *Un commentaire juste
               sur un code qui ne l'est pas est la pire des deux erreurs : il dispense de
               regarder.*

               ── Le rattachement : la seule ronde parfaite du portail ──

               Déposer un nom sur une entité crée un rattachement ; la croix de la pastille le
               retire. C'est le seul geste d'écriture du portail dont **l'inverse est offert
               par l'écran au même endroit** — la ronde ne laisse rien, pas même une trace de
               registre.

               Le glisser-déposer ne se presse pas : on dispatche de vrais `DragEvent` portant
               **le même** `DataTransfer`, comme le fait un navigateur. Contre-essayé en ôtant
               le `setData` de `orgDragStart` : le contrôle rend `porte: ""` et toute la chaîne
               tombe. Deux objets distincts auraient mesuré mon montage, non le code.

               Et le survol se mesure **dans les deux sens** — il s'allume au `dragover`, il
               s'éteint au `dragleave`. Première écriture : unilatérale, donc satisfaite par un
               retour visuel qui ne s'éteint jamais et laisse toutes les entités marquées après
               un glisser abandonné. Contre-essayé, et corrigé avant d'être commis.

               ── L'intérim : ce qu'une ronde ne peut pas défaire, et pourquoi ──

               Signaler un intérim **redirige les demandes de validation** vers l'intérimaire.
               C'est l'écriture de cet écran qui porte un effet d'autorité.

               La ronde lève l'intérim mais ne se défait pas entièrement, et c'est **voulu par
               l'application** : le registre garde une entrée fermée — un registre qui s'efface
               ne sert à rien —, et la notification d'activation n'est pas retirée. Les deux
               traces sont donc attendues, et le contrôle les **mesure** plutôt que de les
               subir : l'entrée doit être fermée, et une seule.

               ── Les deux contre-essais qui valent la séance ──

               `orgEndInterim` privé de la fermeture de l'entrée : l'écran dit que le titulaire
               est revenu — `plusDActif: true`, `signalerOffert: true` — et le registre dit que
               l'intérim court toujours (`end: null`). **L'écran et le registre divergent, en
               silence.**

               `orgConfirmInterim` privé de son inscription : `alEcran: true`,
               `retourOffert: true`, `interim_actif: true` — tout est en place, et **rien au
               registre**. Un intérim qui redirige des validations sans laisser de trace est
               exactement ce qu'un auditeur viendrait chercher.

               Sept contre-essais, sept rouges : transfert vide, survol non allumé, survol non
               éteint, dépôt non envoyé, retrait non envoyé, registre non inscrit, entrée non
               fermée. Plus la bascule des deux présentations rendue inopérante.

               ── Ce qui reste ──

               **37 gestes non exercés**, dont **9 écritures** : les exigences et règlements
               (`openExigDrawer`, `saveExigDrawer`, `openReglementForm`, `saveReglement`), le
               profil (`saveProfileInfos`, `saveProfileExtra`), les dépôts de fichiers
               (`uploadAacLogo`, `uploadProfilePhoto` et leurs retraits), la création d'un
               compte (`createUser`, `verifyBtn`), et `submitProfilePassword` qui demande
               toujours un compte dédié. Plus huit **indécidables** — des écouteurs dont la
               cible n'est pas nommable statiquement.


           5.c.12 [x] **Les exigences réglementaires — et l'écriture la plus lourde du
               portail** — fait le 9 octobre 2026. **45 gestes exercés sur 84**, contre 39 ;
               88 contrôles de parcours, 974 pour la campagne.

               Une exigence est l'objet **réglementaire** du dispositif : c'est elle que la
               surveillance vient vérifier. Sa référence et son libellé fondent un écart, et un
               écart fonde une mesure d'application. Une exigence rattachée au mauvais
               règlement, ou dont le libellé s'est perdu, fait une surveillance mal fondée — et
               cela ne se voit pas à l'écran.

               ── `saveReglement`, et pourquoi l'ordre de la ronde n'est pas indifférent ──

               Renommer un règlement réécrit **toutes** les exigences du groupe, une requête par
               exigence, dans une boucle **sans retour en arrière**. Un renommage qui s'arrête au
               milieu **scinde le règlement en deux groupes**, et chaque moitié a l'air normale.

               Le jeu d'essai n'a qu'**une** exigence par règlement. La ronde en **crée donc une
               d'abord**, pour que le renommage porte sur deux : *une boucle qui s'arrête au
               premier tour est juste quand il n'y en a qu'un.* Le contrôle refuse en outre de
               passer si le groupe n'en compte pas au moins deux — la non-vacuité est dite par
               le contrôle, non laissée à qui le relit.

               Contre-essayé avec un `break` après le premier tour :

               ```
               annonce : "Appliqué à 2 exigence(s) de ce règlement."
               après   : ["RAB-OPS (Exploitation)",
                          "ESSAI-PARCOURS (Règlement renommé)",   ← la nouvelle
                          "RAB-145 (Maintenance)"]                ← l'ancienne, restée
               ```

               **Le formulaire annonce 2 et en fait 1.** Le règlement est scindé, et rien ne le dit.

               ── Le couplage que ni l'écran ni le serveur ne montrent ──

               En édition, `saveExigDrawer` n'envoie **que** la référence, le libellé et le
               statut : ni le règlement, ni la date d'adoption. L'exigence les garde uniquement
               parce que le serveur **fusionne** le correctif (`{ ...existant, ...correctif }`).
               Rien, d'aucun des deux côtés, ne dit que l'un dépend de l'autre — et la réécriture
               en React peut le défaire sans s'en apercevoir.

               Contre-essayé en passant `updateItem` du remplacement à la fusion
               (`{ ...champs, id }`) : le contrôle mord, et deux autres rondes avec lui — elles
               reposaient sur la même propriété sans le dire.

               ── L'exigence orpheline ──

               Contre-essai du préréglage : le « + » du bandeau passe le règlement en paramètre,
               le panneau l'affiche **en lecture seule**, et l'enregistrement le renvoie. Privé
               de ce renvoi, le panneau montre bien « RAB-145 (Maintenance) · 02/11/2022 »,
               l'enregistrement rend `reglement: ""`, et l'exigence **disparaît de la table** du
               groupe où l'agent vient de la créer. Elle n'est pas perdue : elle est dans « Sans
               règlement », ce qui est pire — on ne la cherchera pas là.

               ── Et mon propre contrôle a échoué d'abord, pour une raison d'écran ──

               La première écriture de la ronde ne retrouvait plus le groupe après renommage :
               **renommer un règlement replie son groupe**, l'état d'ouverture (`EXIG_OPEN`)
               étant indexé par le nom, qui vient de changer.

               C'est un désagrément d'écran, non un défaut de donnée. Il est désormais
               **constaté par le contrôle** (`renommeReplie`) plutôt que subi : le jour où le
               groupe restera ouvert, le contrôle le dira, au lieu de laisser la surprise à la
               ronde suivante.

               Six contre-essais, six rouges : boucle arrêtée, fusion remplacée par un
               remplacement, panneau ouvert vide, règlement non transmis, annulation qui ne
               referme pas, bandeau qui ne déplie pas.

               ── Ce qui reste ──

               **31 gestes non exercés**, dont **7 écritures** : le profil
               (`saveProfileInfos`, `saveProfileExtra`), les quatre dépôts et retraits de
               fichiers, la création d'un compte (`verifyBtn` puis `createUser`, non réversible
               par l'écran), et `submitProfilePassword` qui demande un compte dédié. Plus huit
               **indécidables** — des écouteurs dont la cible n'est pas nommable statiquement,
               et c'est une limite de l'outil, nommée.


           5.c.13 [x] **Le profil et les quatre dépôts de fichiers — rendre l'original, et
               non « un » logo** — fait le 9 octobre 2026. **50 gestes exercés sur 84**,
               contre 45, soit **60 %** ; 94 contrôles de parcours, 980 pour la campagne.

               Cinq gestes, dont quatre qui passent par un fichier. Le chemin est celui de
               l'import (5.c.9) : un fichier sur le disque, posé dans le champ par le
               navigateur. Ce qui change, c'est qu'il faut **rendre l'original**.

               ── La photo : une ronde parfaite, parce que le compte n'en a pas ──

               Le bouton de retrait **n'existe pas** tant qu'il n'y a pas de photo. Le contrôle
               le vérifie donc dans les deux sens — c'est ce qui distingue « le dépôt a marché »
               de « l'écran s'est mis à jour ».

               ── Le logo : 374 498 caractères à rendre octet pour octet ──

               L'instance **a** un logo. Le remplacer puis en remettre « un » ne serait pas une
               remise en place. La ronde décode donc l'original en un fichier et le
               **redépose par le même champ**, puis compare les deux chaînes **strictement**.
               C'est la seule façon de rendre un fichier par l'écran qui l'a reçu.

               Contre-essai de cette moitié, et il vaut la séance : la limite de taille du
               dépôt abaissée à 1 000 octets. Le PNG d'essai de 1×1 passe ; **l'original est
               refusé** ; le logo reste vide.

               ```
               original : 374 498    rendu : 0    identique : false
               ```

               *Une remise en place silencieusement refusée est pire qu'une ronde qu'on n'a pas
               faite* — on croit avoir rendu ce qu'on a pris.

               ── Le nom du compte connecté ──

               `saveProfileInfos` envoie nom, prénom, téléphone et fonction **à chaque fois**, et
               il s'agit du compte **connecté** — celui dont le nom s'affiche en haut de chaque
               écran. Contre-essayé en envoyant le nom vide : la fenêtre portait bien
               `ADMINISTRATEUR`, et `fullName` passe de « ADMINISTRATEUR Super » à « Super ».

               ── Deux fautes de ma main, dont une qui faisait accuser le code ──

               `allerSousVue` cliquait un élément de la barre latérale de la configuration **sans
               ouvrir cet écran d'abord**. Appelée depuis la vue du profil, elle ne cliquait rien
               et rendait sans erreur ; le contrôle suivant disait alors « le logo ne s'est pas
               remplacé » sur un écran qui ne portait pas de logo. *Un déplacement qui échoue en
               silence fait accuser le code de ce que la navigation n'a pas fait.*

               Et le compte d'amorçage n'a **aucune clé** `fonction` ni `telephone` : le premier
               enregistrement les matérialise à la chaîne vide, si bien que la ronde ne peut pas
               rendre l'enregistrement à l'identique au sens strict. Ce n'est pas un défaut — un
               écran envoie ses quatre champs, un serveur écrit ce qu'il reçoit. Mais c'est une
               asymétrie, et **une asymétrie qu'on normalise sans la nommer redevient une
               surprise** : elle est donc écrite à l'endroit de la normalisation.

               Cinq contre-essais, cinq rouges : nom envoyé vide, photo non transmise, retrait du
               logo non envoyé, limite de taille abaissée, et le nom vide dénoncé jusque dans la
               remise en place.

               ── Et une mesure qui change une dispense ──

               `saveProfileExtra` n'est **pas** couvrable depuis ce compte, et je ne le savais pas
               avant de le mesurer : les deux blocs qu'il enregistre sont **désactivés** pour un
               SUPERADMIN — le bouton n'est pas rendu. Vérifié ensuite, **hors connexion et par
               comparaison de hachage**, qu'aucun des neuf comptes du jeu d'essai autre que le
               super-administrateur ne porte le mot de passe du harnais.

               Sa dispense change donc de raison : non plus « écrit sur son propre profil », mais
               « demande un compte dont le rôle ouvre ce bloc ». Il rejoint la **chaîne du compte
               dédié**, qui est la suite : créer un compte par l'écran (`verifyBtn`,
               `createUser`), s'y connecter — le changement de mot de passe étant imposé au
               premier accès, cela couvre `pwdSubmit` —, puis `saveProfileExtra` et
               `submitProfilePassword`. **Quatre dispenses levées par un seul enchaînement.**

               ── Ce qui reste ──

               **26 gestes non exercés**, dont **4 écritures**, toutes dans la chaîne ci-dessus.
               Plus huit **indécidables**, limite nommée de l'outil.


           5.c.14 [x] **La création et l'effacement d'un compte — et la chaîne que j'avais
               annoncée n'existe pas** — fait le 9 octobre 2026. **59 gestes exercés sur 84**,
               contre 50, soit **70 %** ; 100 contrôles de parcours, 986 pour la campagne.

               ── D'abord : le plan annoncé à la fin de 5.c.13 ne tient pas ──

               J'avais écrit que créer un compte par l'écran permettrait de s'y connecter, et
               donc de lever d'un coup les trois dispenses qui demandent « un compte dédié » :
               `pwdSubmit`, `saveProfileExtra`, `submitProfilePassword`.

               **C'est impossible, et c'est voulu.** Le mot de passe temporaire est tiré au
               hasard et part par courriel ; ce courriel est marqué `secret: true` dans
               `src/email.js`, et **son corps n'est pas conservé** — le registre garde
               « (corps retiré : ce message portait un secret) ». Aucune route ne rend jamais un
               mot de passe : les deux seules générations du serveur passent directement à
               `email.accountCreated` et `email.passwordReset`.

               Les trois dispenses restent donc, **avec cette raison-là**, qui est meilleure que
               celle qu'elles portaient : ce n'est pas « on n'a pas encore fait le compte », c'est
               « l'application refuse de rendre ce mot de passe, et elle a raison ».

               ── Ce qui est couvrable, et qui l'est ──

               Neuf gestes : `newUserBtn`, `nuRole`, `closeModal`, `cancelModal`, `createUser`,
               `efValider`, `euEmail` (saisie), `closeUserModal`, `verifyBtn`.

               Les **deux chemins d'abandon** sont éprouvés la fenêtre remplie : une annulation
               qui enregistrerait ce qu'on vient de taper est le genre de défaut qu'on ne
               découvre qu'après avoir créé un compte par mégarde. Le **rôle** commande les
               champs offerts dans les deux sens — il paraît sur un rôle prestataire et
               **repart** sur un autre.

               ── Le contre-essai de sécurité ──

               L'effacement d'un compte exige de l'opérateur **son propre mot de passe**. Le
               contrôle l'éprouve d'abord avec un **mauvais** : le refus doit se voir dans la
               fenêtre, et le compte rester. Contre-essayé en ôtant la confirmation du serveur :

               ```
               message : null     fenêtre : fermée     comptes restants : 6
               ```

               Le mauvais mot de passe **a effacé le compte**, sans un mot. *La corbeille
               redevient un clic.*

               ── Et `euEmail` ne fait pas ce que je croyais ──

               J'avais écrit ce contrôle en croyant que ce geste vérifiait la **forme** de
               l'adresse. Il fait autre chose, et de plus important : l'adresse **est**
               l'identifiant de connexion, et la changer révèle un champ qui exige le mot de
               passe du super-administrateur. Éprouvé dans les deux sens — le champ paraît quand
               l'adresse diffère, et repart quand on remet l'originale. Sans la seconde moitié,
               un champ qui ne se cacherait jamais demanderait un mot de passe pour une
               modification qui n'en a pas besoin.

               ── Un refus provoqué par un contrôle, et une exception qui reste fine ──

               Le 403 de l'effacement refusé est journalisé par le navigateur, et le relevé de
               console le prenait pour un incident. Une exception de plus dans `ATTENDU` aurait
               rendu la suite **aveugle à tous les 403** — y compris celui d'une écriture sans
               en-tête d'origine, qui est précisément ce que ce relevé doit attraper.
               L'exception est donc liée à **l'étape** qui provoque le refus.

               Contre-essayé en cassant l'en-tête de l'enveloppe du socle : un 403 à l'étape
               « instances du dispositif » est bien dénoncé. L'exception ne rend pas aveugle.

               ── Un contre-essai qui m'a appris que de l'autre code était mort ──

               Mon premier essai pour produire ce 403 fut d'ôter `X-OASIS-Request` de l'`api()`
               d'`app.js`. **Rien n'a bougé** : l'enveloppe du socle (`oasis-requete`) pose cet
               en-tête sur *tout* appel vers l'application. La ligne d'`api()` est donc
               **redondante** — ce que `modules-hote.ts` disait déjà, et que le contre-essai a
               confirmé par l'autre bout. Elle partira avec la réécriture.

               ── Et une méfiance infondée, dite comme telle ──

               En cassant la chaîne d'audit du socle, j'ai vu rester vert un contrôle qui parle
               d'intégrité : « l'écran des droits montre l'intégrité de la chaîne d'audit ». J'ai
               cru à un vert creux.

               **Il n'en était pas un.** Les deux contrôles regardent **deux journaux
               différents** : celui des DROITS vérifie `module_audit.verifyChain(code)` — le
               journal du module —, le nouveau vérifie `audit.verifyChain` — celui du socle.
               Prouvé en cassant l'autre : le contrôle des DROITS mord, et le nouveau reste vert.
               Chacun attrape sa chaîne, aucun n'attrape celle de l'autre, et c'est ce qu'on veut.

               *Un vert qu'on soupçonne se vérifie avant d'être accusé — sinon on « corrige » ce
               qui marchait.*

               Et une faute de motif de ma main : le genre du bandeau est « succes », sans double
               « s » — c'est le mot français. Mon premier contrôle cherchait « success » et
               rendait rouge un journal intègre.

               Sept contre-essais : en-tête d'`api()` (muet, et instructif), en-tête de
               l'enveloppe, confirmation d'effacement ôtée, « Annuler » inerte, champ du rôle
               toujours visible, chaîne du socle rompue, chaîne du module rompue.

               ── Ce qui reste ──

               **17 gestes non exercés**, dont **2 écritures**, et toutes deux sont dans le
               blocage de sécurité ci-dessus. Le reste est de l'affichage : cinq bascules
               (`toggleAcc`, `togglePers`, `toggleCfgSidebar`, `toggleUserSidebar`,
               `toggleInspectorFields`), le panneau des notifications, le départ de session, les
               trois gestes du régime MFA — couverts côté serveur par la suite « mfa » —, et
               quatre que la forme relève sans qu'ils soient des gestes. Plus huit
               **indécidables**.


           5.c.15 [x] **Les six bascules, le départ de session — et le plafond atteint** —
               fait le 9 octobre 2026. **66 gestes exercés sur 84**, contre 59 ; 107 contrôles
               de parcours, 993 pour la campagne.

               **Le plafond atteignable du portail est 66, et il est atteint.** Il ne reste
               aucun geste qui soit à la fois couvrable et non couvert. C'est la fin de la
               suite n° 5.c.

               ── Les six bascules, mesurées trois fois chacune ──

               `toggleCfgSidebar`, `toggleUserSidebar`, `toggleAcc`, `togglePers`,
               `toggleInspectorFields`, et la cloche des notifications. Aucune n'écrit. Ce qui
               les rend néanmoins dignes d'un contrôle est la leçon de deux séances : **une
               bascule qui s'allume sans s'éteindre passe un contrôle unilatéral** — le survol
               du glisser-déposer et la présentation de l'organigramme l'ont montré tous les
               deux, et dans les deux cas la moitié manquante était celle qui défait.

               Chacune est donc mesurée **trois fois** : état de départ, état après le premier
               geste, état après le second. Un contrôle qui ne lirait que le deuxième ne
               distinguerait pas « la bascule agit » de « elle était déjà là ».

               Contre-essayées **toutes les six en une passe**, rendues à sens unique. Six
               rouges, chacun exactement sur son contrôle : `depart: false, apres: true,
               rendu: true` — la bascule ne revient jamais.

               ── Le départ de session, et pourquoi il est le dernier ──

               `logoutBtn` ferme la session : pressé ailleurs, il ferait échouer tout ce qui
               suit. C'est la raison que portait sa dispense depuis trois jours — « à couvrir en
               dernier geste de la suite ». Il l'est.

               Le contrôle mesure deux choses, et la seconde est celle qui compte : la fenêtre
               **entière** part vers la page de connexion, **et** la session est réellement
               close. Contre-essayé en ôtant l'appel à `/api/logout` et en gardant la
               redirection :

               ```
               url : /login.html    formulaire : présent    /api/me : 200
               ```

               L'écran paraît déconnecté, **la session est restée ouverte**. Un cookie valide
               derrière une page d'apparence close — c'est le défaut qu'un contrôle d'apparence
               aurait béni.

               Cela ferme aussi l'une des trois lacunes nommées au relevé du 7 octobre : « la
               redirection vers la connexion dans toute la fenêtre ».

               ── Une précaution d'outillage : pas d'`eval` dans la page ──

               La bascule générique lisait l'état par une expression passée en chaîne, évaluée
               par `new Function`. La page porte une politique de contenu **sans
               `unsafe-eval`** — que cette suite éprouve elle-même —, et le contrôle aurait
               échoué pour une raison étrangère à ce qu'il mesure. Le mode de lecture est donc
               un **mot** (`classe:collapsed`, `affiche`, `bloc`), non une expression.

               ── Le plafond, nommé pour qu'on ne poursuive pas un 100 % qui n'existe pas ──

               Sur 84 gestes nommés, **18 ne sont pas couverts**, et chacun pour une raison qui
               n'est pas un reste de travail :

               | Combien | Lesquels | Pourquoi |
               |---|---|---|
               | **8** | des écouteurs dont la cible est une variable locale | **indécidables** : le relevé ne peut pas les nommer statiquement. Limite de l'outil, nommée |
               | **4** | `${pdf}`, `event.preventDefault`, `event.stopPropagation`, `onchange="orgTypeChanged()"` | relevés par la forme, ce ne sont pas des gestes |
               | **3** | `mfaForm`, `mfaCancel`, `mfaResend` | régime MFA, désactivé dans la configuration d'essai — couverts côté serveur par la suite « mfa » (11 contrôles) |
               | **3** | `pwdSubmit`, `saveProfileExtra`, `submitProfilePassword` | **propriété de sécurité** : le mot de passe temporaire n'est jamais conservé (5.c.14). Un essai ne peut pas se connecter à un compte qu'il vient de créer |

               Le bloc « à couvrir mais pas encore » de `gestes-non-couverts.json` est désormais
               **vide**, et son étiquette est gardée pour que le prochain geste couvrable y
               retombe plutôt que de se glisser ailleurs.

               ── Le bilan de la suite 5.c ──

               | | Au relevé du 6 octobre | Aujourd'hui |
               |---|---|---|
               | Gestes nommés | 40 *(un fichier sur neuf)* | **84** |
               | Exercés | 0 | **66** |
               | Contrôles de parcours | 8 | **107** |
               | Contrôles de la campagne | 915 | **993** |

               Le dénominateur a été refait **trois fois**, chaque fois contre moi : quarante
               gestes d'un fichier sur neuf, puis 78 faute de six types d'événement, puis 84.
               *Un relevé qui n'a jamais démenti celui qui le tient ne mesure rien.*

               La réécriture d'`app.js` et `app-config.js` peut commencer : elle se mesurera
               contre **vingt rondes d'écriture** et 107 contrôles d'écran, et non contre
               « trois vues se remplissent et ne débordent pas ».

           5.c.0.a [x] *Le relevé du 6 octobre, conservé pour mémoire* — fait le 6 octobre
               2026, et c'est la leçon de la suite n° 0 appliquée au deuxième écran.

               **Mesuré d'abord.** Le portail déclare **cinq vues** : trois étaient
               ouvertes, `profile` jamais. Sa configuration porte **onze sous-vues** :
               une seule était atteinte, celle qui s'affiche par défaut. Et **aucun** de
               ses quarante gestes n'était exercé — *chiffre faux, voir la reprise du 7 octobre :
               il y en a 121*. 4 217 lignes couvertes par « trois
               vues se remplissent et ne débordent pas ».

               **Huit contrôles posés**, dont les onze sous-vues parcourues une à une,
               la vue du profil et ses champs, et la bascule de langue — l'attribut
               `lang` du document autant que les libellés des menus.

               **Et mon propre contrôle était vide de sens à sa première écriture.** Il
               attendait « plus de trente caractères et aucune attente en cours » : une
               condition déjà vraie du contenu **précédent**. Les onze sous-vues ont
               donc été mesurées à **1 490 caractères — la même, onze fois**. Deux
               erreurs s'y ajoutaient : un repli sur `mainView`, qui porte la vue
               entière et ne peut pas voir une sous-vue vide, et un conteneur nommé
               `#cfgContent` qui n'existe pas.
 
               Corrigé en attendant que le contenu **change**, et le contrôle refuse
               désormais de passer si les onze se ressemblent : « 1 empreinte distincte
               pour 11 sous-vues » est l'échec que la sonde immobile aurait dû
               produire. La non-vacuité est dite par le contrôle lui-même, non laissée
               à qui le relit.

               Contre-essayé dans les deux sens : une sous-vue rendue muette, et
               `cfgNavigate` qui ne change plus de sous-vue. Les deux mordent.
       **5.d — La réécriture d'`app-config.js` et d'`app.js`.** 5.c a payé le préalable :
       66 gestes exercés sur 84, 107 contrôles d'écran. La réécriture se mesure désormais
       contre du réel.

           5.d.0 [x] **La couche des schémas, extraite et typée** — fait le 9 octobre 2026.
               `app-config.js` passe de **1 443 à 1 272 lignes** ; 993 contrôles, code de
               sortie 0.

               ── Pourquoi cette pièce d'abord ──

               Mesuré, non choisi : c'est la **couche que toutes les autres lisent**.
               `refTable`, `openRefModal`, `fieldValue` et les onze sous-vues en dépendent ;
               aucune ne peut être réécrite avant elle. Elle est aussi la seule qui soit
               **pure** — ni DOM, ni appel d'API, ni état propre —, donc la seule qu'on puisse
               extraire sans rien déplacer d'autre.

               171 lignes partent dans `frontend/portail/schemas.ts` (308 avec son typage et
               ses commentaires) ; un sas de 63 lignes pose les onze noms sur `window` avant
               le chargement d'`app.js`.

               ── La preuve, écrite avant l'édition ──

               Une extraction de libellés et de clés est **exactement** l'opération dont on
               croit n'avoir pas besoin de preuve, et ce dépôt l'a payé deux fois : 84
               traductions portugaises non vérifiées, puis une extraction de thème faite après
               la suppression du fichier d'origine, donc sans recours.

               `scripts/comparer-schemas.js` lit donc la version d'origine **dans `git`**, non
               sur le disque — elle reste rejouable pour toujours. **2 820 comparaisons** sur
               les données réelles : les onze titres, la forme de chaque champ, chaque liste
               d'options, `fieldValue` sur chaque champ de chaque enregistrement, `refLabel` et
               `personnelName` sur chaque identifiant. Trois régimes : régional, national, et
               collections renversées.

               ── Ce que la preuve a trouvé, et que je n'avais pas vu ──

               **1. 486 écarts à la première exécution.** Tous sur `refLabel` demandé avec un
               champ qu'une collection ne porte pas — `refLabel('organisation_levels', …,
               'code')`. L'origine rend `undefined`, que l'interpolation d'un gabarit écrit
               « undefined » dans la page ; le module rend une case vide.

               Mesuré ensuite : l'application ne demande que **cinq couples**
               (collection, champ), et chaque enregistrement porte le champ demandé. La
               divergence est donc **inatteignable** — et la comparaison porte maintenant sur
               les couples **relevés dans la source**, non choisis par moi. Si un sixième
               paraît, il entre de lui-même.

               **2. L'origine trie `REFS` sur place.** Deux fournisseurs d'options écrivent
               `(REFS.organisation_levels || []).sort(…)` sans `slice()`. **Ouvrir une liste
               déroulante réordonne le référentiel**, et la table qui le parcourt ensuite
               l'affiche dans le nouvel ordre — sans qu'aucune écriture n'ait eu lieu.

               Trouvé en cherchant pourquoi un contre-essai ne mordait pas, et cela rendait
               ma preuve **inutilisable** : les deux versions partageaient un objet que
               l'origine modifiait. Chaque côté reçoit désormais sa propre copie.

               **3. `ME` absent fait lever l'origine.** `ME.instance_vue` est lu sans garde :
               la page s'interromprait. Le module lit `window.ME?.…` et rend une liste vide.

               Les trois divergences sont **assumées et vérifiées** : le script tombe le jour
               où l'une cesse d'être vraie. Une divergence tolérée en silence est une
               divergence qui reviendra.

               ── Et un contre-essai qui n'a pas mordu ──

               Ôter le tri par `ordre` des niveaux hiérarchiques ne changeait **rien** : le jeu
               d'essai était déjà dans le bon ordre. *Une assertion que les données satisfont
               par hasard ne vérifie pas le code.* D'où le troisième régime, aux onze
               collections renversées — et le contre-essai mord.

               Quatre contre-essais au total : un libellé retapé, deux champs permutés,
               l'ordre des cas de `fieldValue`, un tri ôté. Plus le refus du script quand son
               terme de comparaison manque (`exit(2)`, éprouvé).

               ── Ce que le typage impose, et qui n'existait pas ──

               Les champs n'avaient aucune forme déclarée : `{ k, l }` ici,
               `{ k, l, type, options, resolve }` là, `inspectorOnly` sur trois, `only` sur un.
               `Champ` impose désormais **une** forme, et un écart devient une erreur de
               compilation plutôt qu'un `undefined` silencieux.

               ── Une alarme du harnais, et ce qu'elle a vraiment attrapé ──

               La campagne a d'abord refusé : « **les données de travail ont été modifiées par
               les contrôles** ». Le coupable n'était pas la campagne — c'est le **serveur
               d'aperçu de la session** qui s'est relancé sur mes modifications de
               `public/index.html`, et `.claude/launch.json` ne lui donne pas de répertoire
               d'essai : il sert le vrai. Son contrôle d'horloge au démarrage a ajouté trois
               entrées au journal d'audit de travail.

               La chaîne a été vérifiée avant toute autre chose — **1 652 entrées, valide** —,
               l'aperçu arrêté, la campagne rejouée au vert. Rien n'a été perdu, et le
               garde-fou avait raison : un processus servait bien le vrai répertoire. *À
               retenir : une campagne et un aperçu ne cohabitent pas.*

               ── Ce qui reste de 5.d ──

               `app-config.js` : **1 272 lignes**, dont les onze sous-vues de configuration,
               les fenêtres de référentiel, l'organigramme et les exigences. `app.js` : 1 179.
               La pièce suivante par ordre d'utilité est `refTable` + `openRefModal` + `saveRef`
               + `deleteRef` — le CRUD générique, qui ne dépend plus que de la couche extraite
               aujourd'hui, et dont la ronde d'écriture est couverte depuis 5.c.7.

           5.d.1 [x] **Le CRUD générique des référentiels, converti** — fait le 12 octobre
               2026. `app-config.js` passe de **1 272 à 1 099 lignes** ; 993 contrôles, code
               de sortie 0.

               Huit fonctions : `refTable`, `openRefModal`, `closeRefModal`, `saveRef`,
               `deleteRef`, `orgTypeChanged`, `toggleInspectorFields`, `orgTopLevelType`. Ce
               sont les gestes les mieux gardés du portail — la ronde complète (créer,
               modifier, supprimer, confirmation pressée) est couverte depuis 5.c.7 —, et ils
               ne dépendaient plus que de la couche extraite en 5.d.0.

               ── `CURRENT_CFG` a dû monter sur `window`, et c'est la leçon de 5.b qui revient ──

               `openRefModal` y prend le sigle et le nom de l'Administration, pour les
               reprendre d'office sur l'entité de niveau 1 de l'organigramme. C'était un
               `let` du premier niveau : une globale **lexicale**, invisible à un module.

               *La dépendance, non l'interface, bloque la conversion.* C'est la même phrase
               qu'au 7 octobre, et c'est la troisième fois qu'elle décide de l'ordre des
               travaux.

               ── La preuve, et ce qu'elle ne couvre pas ──

               Deux des huit fonctions sont **pures** : elles rendent une chaîne de balisage.
               Ce sont aussi les plus volumineuses, et celles où une espace de différence se
               verrait à l'écran. `scripts/comparer-referentiels.js` les compare donc
               **caractère pour caractère** : **640 comparaisons**, les onze référentiels, la
               fenêtre de création, la fenêtre d'édition de chaque enregistrement réel, la
               fenêtre préréglée et un préréglage illisible — en quatre régimes (régional,
               national, configuration non lue, collections renversées).

               Les cinq autres touchent au document ou à l'API. Elles sont couvertes par la
               suite « parcours ». **Dire cette répartition importe** : une preuve qui
               laisserait croire qu'elle couvre les huit serait pire qu'aucune preuve.

               Et la couverture du navigateur a été vérifiée, non supposée : en ôtant un champ
               du corps de la requête, la ronde de la suite « parcours » rend
               `{"creee":true,"ordre":false}`. **Le navigateur exécute bien le module, et non
               une copie restée en place.**

               ── Deux fois où mon montage mesurait mon montage ──

               **1. Huit fonctions extraites, une seule prise.** La première écriture du
               comparateur découpait l'original entre deux bornes de texte, de `refTable` au
               bandeau des exigences. Or les huit fonctions **n'étaient pas contiguës** — les
               exigences et l'organigramme s'intercalaient. Le script est tombé sur
               « o.orgTopLevelType is not a function ». *Il valait mieux qu'il tombe là qu'il
               ne compare une fonction en croyant en comparer huit* ; l'extraction se fait
               désormais par **nom**, et refuse si un nom manque.

               **2. 629 écarts sur une balise `<svg>`.** Je donnais une icône factice à
               l'ancien côté et laissais le nouveau prendre celle du module construit. Les
               deux chargent maintenant `public/app/icons.js` — la même source que celle
               qu'embarque le converti.

               Quatre contre-essais, quatre rouges : une espace de plus dans la table (104
               écarts), le garde-fou du cycle de l'organigramme ôté (20), `allowEmpty` oublié
               (228), l'ordre des cas de la fenêtre changé (32).

               ── Une divergence nommée : un refus qui dit laquelle ──

               `REF_SCHEMAS[coll]` peut être absent, et le compilateur l'a dit. L'original
               lisait `schema.title` sur `undefined` et rendait « Cannot read properties of
               undefined » — un message qui ne dit pas **quelle** collection manque, sur un
               écran resté vide. Le module refuse en la nommant. Inatteignable aujourd'hui
               (les appels passent des littéraux), mais puisqu'il faut traiter le cas, autant
               qu'il se lise.

               ── Un coût qui croît, mesuré avant qu'il surprenne ──

               Chaque sas est **autonome** : esbuild y embarque le socle, les 268 libellés en
               trois langues et les icônes. Le paquet de ce fichier pèse **80 Ko**, comme ses
               deux aînés (86 et 82 Ko). La page du portail sert désormais **503 Ko** de
               JavaScript, dont une bonne part en trois ou quatre exemplaires.

               Ce n'est pas un défaut de cette séance, c'est le compromis du montage actuel —
               et il grossira à chaque conversion. Il se réglera d'un seul coup à la fin de
               5.d, quand les deux derniers fichiers en JavaScript partiront et que la page
               pourra charger **un** paquet au lieu de sept. *Mesuré maintenant pour que ce
               soit une décision, non une surprise.*

               ── Ce qui reste de 5.d ──

               `app-config.js` : **1 099 lignes** — l'organigramme (~250), les exigences
               (~130), le personnel, la configuration de l'instance, et `renderConfig` qui
               orchestre les onze sous-vues. `app.js` : 1 179.

               La pièce suivante est **les exigences** : six gestes, tous couverts depuis
               5.c.12, et un bloc nettement séparé. L'organigramme vient après — il est plus
               gros, et sa ronde d'intérim (5.c.11) le garde bien.

           5.d.2 [x] **Les exigences réglementaires, converties** — fait le 12 octobre 2026.
               `app-config.js` passe de **1 099 à 964 lignes** ; 993 contrôles, code de
               sortie 0.

               Sept gestes, **tous couverts depuis 5.c.12** — dont `saveReglement`, qui
               réécrit toutes les exigences d'un groupe dans une boucle sans retour en
               arrière. Une exigence est l'objet réglementaire du dispositif : sa référence et
               son libellé fondent un écart, et un écart fonde une mesure d'application.

               `EXIG_OPEN` et `fmtDay` partent avec le bloc : il en était le seul lecteur.
               Deux globales lexicales de moins dans `app-config.js`.

               ── La preuve, et les sept régimes ──

               Trois fonctions sur sept sont pures. **84 comparaisons** de balisage,
               caractère pour caractère :

               · bandeaux **tous fermés**, **tous dépliés**, et **un seul déplié** — un état
                 mesuré d'un seul côté n'est pas mesuré, c'est la leçon des bascules (5.c.15),
                 et la classe `collapsed` est précisément ce que la bascule commande ;
               · les **trois langues**, puisque `fmtDay` formate selon `CURRENT_LANG` ;
               · un jeu **bricolé** portant une exigence **orpheline** (sans règlement) et un
                 règlement **sans date** — deux replis du balisage que le jeu d'essai ne
                 contient pas, et qui seraient donc restés non éprouvés.

               Les deux côtés atteignent l'état des bandeaux par des **chemins différents** :
               l'original par son `Set`, que le bac remplit ; le module par son geste
               `toggleExigGroup`, seule porte d'entrée de son état privé. C'est volontaire —
               une erreur dans la bascule se voit alors dans le balisage.

               Cinq contre-essais, cinq rouges : une espace dans la table (7 écarts), le repli
               **inversé** (7), la clé `__none__` ôtée de la bascule (1 — et c'est le groupe
               sans règlement, le seul concerné), `fmtDay` rendant l'ISO brute (30), le tri des
               règlements ôté (7).

               Et la couverture du navigateur vérifiée, non supposée : en ôtant le préréglage
               du règlement, deux contrôles de parcours tombent — dont celui de l'exigence
               orpheline.

               ── Le coût de la page, suivi ──

               **563 Ko** servis, contre 503 au commit précédent : le huitième paquet en ajoute
               60. La courbe est celle qu'on attendait, et elle se renversera à la fin de 5.d.

               ── Ce qui reste de 5.d ──

               `app-config.js` : **964 lignes** — l'organigramme (~250), le personnel, la
               configuration de l'instance, et `renderConfig` qui orchestre les onze
               sous-vues. `app.js` : 1 179.

               L'organigramme vient ensuite : plus gros, mais gardé par la ronde d'intérim et
               le glisser-déposer (5.c.11). Il faudra y décider du sort de
               `normalizeOrgTopLevel`, qui **écrit dans `REFS` au moment du rendu** — la même
               famille que le tri sur place trouvé en 5.d.0.

           5.d.3 [x] **L'organigramme, converti — et deux contre-essais qui n'ont pas mordu**
               — fait le 12 octobre 2026. `app-config.js` passe de **964 à 672 lignes** ;
               993 contrôles, code de sortie 0.

               La plus grosse pièce de 5.d : douze gestes, deux présentations, un
               glisser-déposer et un registre de poste. C'est aussi l'écran qui porte le plus
               d'**autorité** — la chaîne de validation d'une personne, et qui valide à sa
               place en son absence. Tout est couvert depuis 5.c.11.

               ── Deux contre-essais qui n'ont pas mordu, et ce qu'ils disaient ──

               Ôter le **garde-fou du cycle** de `orgChainFor`, et changer la **couleur de
               repli** d'un niveau inconnu : *aucun des deux ne faisait d'écart*. La raison
               était la même — les données ne produisent pas la situation :

               · aucun `parent_id` ne boucle, et la boucle `while` s'arrête d'elle-même ;
               · aucune hiérarchie ne descend au-delà du cinquième niveau, si bien que
                 `levelIndex[type] ?? depth` rend toujours un indice valide de `LEVEL_COLORS`.

               *Un contre-essai qui ne mord pas ne dit pas que le code est bon : il dit que la
               donnée ne l'éprouve pas.* Deux régimes ont donc été **fabriqués** — un cycle de
               rattachement, et une hiérarchie de sept niveaux aux types inconnus. Les deux
               contre-essais mordent alors.

               Le cycle n'est pas une hypothèse d'école : le formulaire l'interdit depuis
               5.d.1 (une entité est ôtée de ses propres options), mais une donnée venue d'un
               **import** ne passe pas par le formulaire. Sans le garde-fou, l'écran se
               figerait.

               ── `normalizeOrgTopLevel` : un rendu qui modifie ce qu'il affiche ──

               Elle recopie le sigle et le nom de l'AAC sur l'entité de niveau 1, **en écrivant
               dans `REFS`**, à chaque rendu de l'écran. Ce n'est pas un oubli : l'entité de
               niveau 1 *est* l'AAC, et `saveRef` impose la même règle à l'écriture (5.d.1).

               Mais sur le jeu de travail elle **ne change rien** — l'entité enregistrée est
               déjà conforme — et son retrait passerait donc inaperçu. La comparaison lui
               fabrique un écart : l'entité porte « AUTRE / Un autre nom », et la normalisation
               doit le remplacer. Quatre configurations sont jouées : conforme, sigle seul, rien
               à reprendre, configuration non lue.

               **Troisième fois dans 5.d** qu'une assertion satisfaite par hasard oblige à
               fabriquer la donnée qui l'éprouve. C'est devenu une habitude de cette suite, et
               c'est tant mieux.

               La conversion ne corrige pas cet effet de bord : elle le **nomme**, à l'endroit
               où il se produit, avec les deux raisons de le savoir — son retrait est
               indétectable sur les vraies données, et c'est ici qu'il faudra regarder le jour
               où l'on voudra que l'entité garde son propre nom.

               ── `LEVEL_COLORS` quitte `app.js`, qui ne s'en servait pas ──

               Un `const` du premier niveau, donc une globale **lexicale** invisible à un
               module — et `app.js` ne la lisait pas : seul `app-config.js` s'en servait, par
               cet écran et par l'accordéon des domaines. Elle vient donc dans le module, qui la
               publie en attendant la conversion de l'accordéon (5.d.4).

               ── Une déclaration corrigée plutôt qu'un appel détourné ──

               `window.fmtDate` était déclaré `(iso: string)`. Le registre des postes lui passe
               des valeurs venues du magasin, de type `unknown`. J'aurais pu convertir à
               l'appel ; **une conversion que le code d'origine ne fait pas est une divergence,
               même inoffensive**. `fmtDate` commence par `if (!iso) return '—'` et accepte
               n'importe quoi : c'est la déclaration qui était fausse, et c'est elle qui a été
               corrigée.

               ── La preuve ──

               **243 comparaisons**, caractère pour caractère, en **onze régimes** : les deux
               présentations, deux langues, les collections renversées, un jeu bricolé (intérim
               actif, poste vacant, entité sans poste, type inconnu, rattachement vers une
               personne absente), une organisation vide, le cycle, et la hiérarchie profonde.
               Cinq contre-essais, cinq rouges après l'ajout des deux régimes manquants.

               Et la couverture du navigateur vérifiée : en ôtant la fermeture de l'entrée du
               registre, le contrôle de parcours tombe.

               ── Ce qui reste de 5.d ──

               `app-config.js` : **672 lignes**. Trois blocs :

               | Bloc | Lignes | Gardé par |
               |---|---|---|
               | accordéons, personnel, domaines | ~200 | 5.c.15 (bascules), 5.c.9 (import) |
               | AAC, sécurité, modules, système | ~290 | 5.c.10, 5.c.13 |
               | `renderConfig`, `cfgNavigate`, `CFG_TABS` | ~130 | 5.c.0 (les onze sous-vues) |

               `CFG_OPEN` lie les trois premiers — accordéons, personnel et domaines — et devra
               partir avec eux, d'un seul coup. `renderConfig` part en dernier : c'est lui qui
               décidera si l'écran devient un composant React.

               La page sert **625 Ko**, contre 563 au commit précédent.

           5.d.4 [x] **Le personnel et la taxinomie — et une garde qui a trouvé mieux que ce
               que je lui demandais** — fait le 12 octobre 2026. `app-config.js` passe de
               **672 à 476 lignes** ; 993 contrôles, code de sortie 0.

               ── Les deux écrans partent ensemble, et ce n'est pas un choix ──

               `CFG_OPEN` les lie : l'ensemble des éléments dépliés sert aux fiches du
               personnel (clés `pers-<id>`) **et** aux accordéons de la taxinomie (`dom-`,
               `sect-`, `sa-`). Les séparer en deux modules donnerait **deux ensembles**, et
               déplier un domaine n'agirait plus sur ce que l'écran rend — sans erreur et sans
               trace.

               C'était le dernier bloc d'`app-config.js` à porter un état partagé.

               ── Une garde posée pour une raison, qui en a trouvé une autre ──

               En rendant les trois prêts de l'organigramme (`LEVEL_COLORS`, `orgChainFor`,
               `circuitHtml`), j'ai posé dans le comparateur une garde exigeant que le
               balisage comparé porte **au moins une** chaîne de validation renseignée. Elle a
               mordu aussitôt, et pas pour la raison prévue :

               **les deux rattachements du jeu de travail désignent des `person_id` qui
               n'existent pas** dans le répertoire du personnel.

               Conséquences, toutes mesurées :

               · aucune personne n'a de chaîne de validation, et la branche « chaîne
                 renseignée » de `circuitHtml` — *le balisage qui dit qui valide les actes d'un
                 agent* — n'était éprouvée **nulle part** ;
               · la preuve de 5.d.3 la comparait cinq fois, **toutes sur `null`** : cinq
                 comparaisons du même cas, présentées comme cinq ;
               · `orgAssignedChips` rend la chaîne vide sur les vraies données : les pastilles
                 de l'organigramme ne paraissaient jamais dans la preuve.

               Les deux comparateurs ajoutent donc des rattachements vers des personnes qui
               **existent**, dont un sur une entité profonde et un sous un intérim actif.
               Contre-essai : casser la règle du validateur (intérim / titulaire / poste
               vacant) rend désormais **4 écarts**, là où il n'en rendait aucun.

               Les pastilles et la chaîne restaient couvertes par la ronde du glisser-déposer de
               la suite « parcours » (5.c.11), qui crée un **vrai** rattachement. Mais *une
               preuve de balisage qui ne rend jamais la pastille ne prouve rien d'elle*, et il
               fallait les deux.

               ── Et une décision que j'ai prise, puis défaite ──

               J'ai voulu retirer les trois publications du sas de l'organigramme, au motif
               qu'« un sas qui publie un nom que personne ne lit mentirait sur ce qui dépend de
               quoi ». Les deux comparateurs se sont cassés.

               **Ils avaient raison, et ma formule était inexacte** : le comparateur les lit.
               Faire tourner `cfgSectionPersonnel` *tel qu'il était* exige que ces noms soient
               dans la portée globale, puisque sa version d'origine les y cherchait. Le prêt se
               rendra avec `app-config.js` lui-même (5.d.6), quand les comparateurs des blocs
               convertis deviendront des pièces d'archive. La raison est écrite dans le sas.

               ── La preuve ──

               **22 comparaisons** de balisage en dix régimes : tout replié, tout déplié, les
               deux mélanges, les deux régimes d'instance — le second change le nombre de
               colonnes et donc le `colspan` —, les collections renversées, un jeu bricolé
               (domaine sans secteur, thème orphelin, fiche non-inspecteur, rattachements
               réels) et le vide.

               Les deux côtés atteignent l'état des éléments dépliés par des **chemins
               différents** : un ensemble rempli d'un côté, les deux gestes de l'autre.

               Cinq contre-essais, cinq rouges : une clé de bascule changée, un champ de détail
               remonté dans la table, le double `JSON.stringify` réduit à un, le bloc des thèmes
               orphelins ôté, le `colspan` mal calculé. Et le quatrième a d'abord **ne rien
               rendu du tout** — mon remplacement ne compilait pas, donc rien n'était mesuré ;
               *un contre-essai qui ne compile pas n'est pas un contre-essai vert, c'est un
               contre-essai absent*.

               ── Ce qui reste de 5.d ──

               `app-config.js` : **476 lignes**, deux blocs.

               | Bloc | Lignes | Gardé par |
               |---|---|---|
               | AAC, sécurité, modules, système | ~290 | 5.c.10, 5.c.13 |
               | `renderConfig`, `cfgNavigate`, `CFG_TABS` | ~130 | 5.c.0 (les onze sous-vues) |

               La page sert **694 Ko**, contre 625. C'est le point haut de la courbe : le
               prochain commit en ôte un bloc, et celui d'après fait disparaître
               `app-config.js`.

           5.d.5 [x] **Les paramètres de l'instance — et deux verts que le balisage ne pouvait
               pas voir** — fait le 13 octobre 2026. `app-config.js` passe de **476 à 259
               lignes** ; 994 contrôles, code de sortie 0.

               L'identité de l'Administration, les sept réglages de sécurité, l'activation des
               modules et le bloc système : dix gestes, aucun état partagé hors du bloc.

               ── Le dernier état d'`app-config.js` ──

               `AAC_CFG` retient la configuration que le dernier rendu a lue, pour que la
               fenêtre d'édition s'ouvre remplie. Aucun autre fichier ne le lisait : il devient
               une variable **privée** du module, sans passer par `window`.

               C'est la différence avec `CURRENT_CFG` et `CFG_OPEN`, qui ont dû monter sur
               `window` parce que du JavaScript les atteint. La règle de 5.b décide seule : **la
               dépendance, non l'interface**. `app-config.js` ne porte désormais plus aucun état.

               ── `PRIO_COLORS`, cinquième fois, et le premier prêt dans l'autre sens ──

               `cfgSectionModules` lit la palette des priorités, `const PRIO_COLORS` au premier
               niveau d'`app.js` — donc une globale **lexicale**, invisible à un module. Même
               obstacle que `CURRENT_CFG` (5.d.1) et `LEVEL_COLORS` (5.d.3), cinquième
               occurrence.

               Elle ne va pas dans le module converti, mais dans `icones.ts`, **parce que deux
               écrans la lisent** : la rangerait-on dans l'un, l'autre la lirait à travers
               `window`, ce qui est la dépendance qu'on retire. Conséquence assumée et écrite
               aux deux endroits : `app.js` la lit maintenant **sur `window`**, et c'est le
               premier prêt dans ce sens — jusqu'ici les modules empruntaient à `app.js`.

               ── Deux verts que le balisage ne pouvait pas voir ──

               Le premier m'a été dit par un contre-essai. `cfgSectionModules` trie sur une
               **copie** (`.slice().sort()`). Retirer le `.slice()` ne change **rien** au
               balisage : chaque côté de la comparaison reçoit déjà sa propre copie, et trier
               la sienne en place rend les mêmes lignes. Le contre-essai était vert, et la
               protection n'était prouvée nulle part. La comparaison rend donc aussi **la liste
               reçue après l'appel** ; le contre-essai mord alors.

               Le second ne l'a pas été, et c'est la forme la plus coûteuse : les deux côtés
               lisent la palette dans le **même** fichier construit, parce que c'est la règle
               depuis 5.d.3 — une fausse icône d'un seul côté avait rendu 629 écarts qui
               mesuraient mon montage. Mais alors **changer une teinte passe sans un écart** :
               la mesure est juste, et aveugle à ce que la conversion a déplacé. Les cinq
               teintes sont donc confrontées à la ligne d'`app.js` lue dans `git`.

               ── La fenêtre ouverte sans son écran : une divergence assumée ──

               L'original écrit `const cfg = AAC_CFG || {}` puis lit `cfg.instance.defaultLang`
               : appelée avant le premier rendu, la fonction lève. Le chemin est inatteignable —
               le bouton « Modifier » n'existe que dans le balisage que le rendu vient de
               produire —, mais le compilateur ne laisse pas écrire `{}` là où un `instance` est
               attendu.

               Le module **lève aussi**, avec un message qui nomme la cause : même choix qu'en
               5.d.1 pour un référentiel inconnu. La divergence est le texte, et elle est
               **assertée** — si l'un des deux cessait de lever, le contrôle le dirait.

               ── Un seul nom retiré de la surface, et il est dit ──

               `saveAacLogo` devient privée : ses deux appelants partent avec elle.
               `cameraIcon`, lui, reste publié bien que personne ne le lise hors du module —
               une `function` du premier niveau **était** sur `window`, et une conversion n'est
               pas le moment de décider d'en retirer un nom. C'est la règle que `_icon` tient
               depuis 5.c.

               ── La preuve ──

               **142 comparaisons** en vingt-trois régimes : les trois langues et une quatrième
               absente du catalogue, les trois langues par défaut et une hors des trois, une
               Administration vide, absente, puis hostile aux cinq caractères d'échappement,
               les quatre combinaisons d'interrupteurs, quatre nombres distincts, les modules
               renversés, tous actifs, tous inactifs, aucun, une priorité hors de la palette.

               Et le **corps des trois enregistrements** tel qu'il partirait au serveur : un
               faux document rend les champs, un faux transport capte l'appel, et la
               comparaison porte sur méthode, chemin et JSON. Les en-têtes ne sont pas
               comparés, et c'est dit : l'original appelle `api()` d'`app.js`, le module un
               `fetch` nu, l'en-tête anti-CSRF étant posé par l'enveloppe du socle (5.d.1).

               **Dix contre-essais, dix rouges** : le tri sur place, le nom non échappé (16
               écarts), deux interrupteurs échangés, la langue par défaut non marquée, la langue
               de l'écran figée, deux champs échangés à l'enregistrement, la fenêtre qui ne lève
               plus, une teinte changée, l'URL de réplication non échappée, et un champ absent
               qui rend une valeur vide.

               ── Le contre-essai du navigateur a mordu ailleurs, et y a trouvé mieux ──

               Pour prouver que c'est bien le module qui s'exécute et non un reste, j'ai renommé
               l'identifiant du champ « Sigle » de la fenêtre et relancé la suite « parcours ».
               Le contrôle visé est tombé — `{"ouvrir":true,"champs":false}` : le module est
               bien celui qui rend la fenêtre.

               Mais le **sigle de l'Administration est parti vide**, et il n'aurait pas dû. Mon
               lecteur de champ rendait `''` quand l'élément manquait ; l'original écrit
               `document.getElementById(id).value` et **lève**, donc rien ne part. Avec `''`, la
               requête part et le serveur écrit le champ vidé.

               C'est la famille du défaut de `submitEditUser` que la suite nomme depuis 5.c —
               *le champ effacé parce qu'il est parti vide* —, et je venais de l'introduire.
               Corrigé : le module lève, en nommant le champ, et les trois gestes sont assertés.

               **Et le même défaut était dans `exigences.ts` depuis 5.d.2.** Le panneau d'une
               exigence lit ses six champs du même lecteur ; le serveur fusionne le correctif à
               l'enregistrement, donc une référence absente aurait écrit une référence vide.
               Corrigé par le même remède.

               Dans `organigramme.ts`, le troisième cas est **nommé et non corrigé** : le
               sélecteur d'intérimaire absent rend `''`, ce que le garde suivant traite par un
               avertissement. Des deux côtés rien ne part — la divergence est inoffensive, et la
               dire suffit.

               ── Trois contrôles d'instance tombés sans cause, et je ne les accuse pas ──

               Le même passage a vu rougir trois contrôles du menu « Instances », 570 lignes
               **avant** celui que je cassais, puis un `Failed to fetch` final. Ils sont verts à
               la campagne complète d'avant, verts au contre-essai du serveur, verts à celle
               d'après. Le bac de données est recopié à chaque séance (`harness.js`), donc aucun
               reste ne les relie.

               Je les porte ici sans explication : *un vert qu'on soupçonne se vérifie avant
               d'être accusé, et un rouge sans cause se note avant d'être oublié.* Si le cas
               revient, cette ligne sera le premier indice.

               ── Et un chiffre faux depuis six étapes, trouvé en comptant ──

               En relevant les mesures de cette étape, `comparer-schemas.js` a rendu **2 751
               comparaisons** quand l'ADR et `app-config.js` en annonçaient **2 820** depuis
               5.d.0. Le script et le jeu de données n'ont pas changé d'une ligne — vérifié sur
               les cinq commits.

               La cause est dans le script, et elle vaut pour toute preuve bâtie de cette
               façon : il **relève** dans le code les couples (collection, champ) que `refLabel`
               reçoit, au lieu de les choisir — c'était la correction des 486 écarts de 5.d.0.
               Mais il ne relevait que les deux fichiers restés en JavaScript, et les cinq
               appels étaient **dans le bloc extrait**. Trois d'entre eux sont partis dans
               `schemas.ts` avec lui.

               Donc : la mesure a été prise **avant** le retrait du bloc, comme la méthode
               l'exige, et le retrait l'a invalidée dans le même commit. *Une preuve qui tire
               ses régimes du code qu'elle remplace s'affaiblit à l'instant où ce code part.*

               Le garde-fou existait et n'a pas mordu : il refuse un relevé **vide**, pas un
               relevé amputé. Deux corrections :

               · le relevé lit désormais **tout le portail**, modules typés compris — la portée
                 suit le code au lieu de vieillir avec lui, et le compte revient à **2 820** ;
               · les cinq couples sont **gelés** dans le script. Qu'un seul cesse d'être relevé
                 est un refus qui le nomme. Contre-essayé : oui.

               Les quatre autres comparateurs sont indemnes — ils lisent l'original dans `git`,
               à un commit figé, et fabriquent leurs régimes. `comparer-parametres.js` lit
               l'`app.js` d'origine de la même façon, et pour la même raison.

               Le commentaire du script annonçait aussi « cinq couples » là où il en relevait
               deux : vrai à la mesure, faux dès le commit. *Un commentaire juste sur un code
               qui ne l'est plus est la pire des deux erreurs — il dispense de regarder.*

               ── Une observation qui n'est pas de ce jalon ──

               `PUT /api/config` ne retient un nombre de sécurité que s'il est
               **strictement positif** (`parseInt`, puis `n > 0`). Saisir `0` ou un texte dans
               « longueur minimale du mot de passe » laisse donc la valeur d'avant, et l'écran
               annonce « Configuration enregistrée ». C'est la même forme que le défaut d'import
               trouvé en 5.c.9 : *une mise à jour annoncée et non appliquée*. Le régime est dans
               la comparaison (`secMinLen: '0'`, `secMaxFail: 'abc'`) — les deux côtés envoient
               la même chose —, mais la décision est côté serveur et appartient à la maîtrise
               d'ouvrage.

               ── Ce qui reste de 5.d ──

               `app-config.js` : **259 lignes**, un seul bloc — `renderConfig`, `cfgNavigate`,
               `toggleCfgSidebar`, `CFG_TABS`, gardés par 5.c.0 (les onze sous-vues).

               La page sert **742 Ko**, contre 694. J'avais écrit en 5.d.4 que 694 était « le
               point haut de la courbe » : c'était faux, et d'un paquet entier. Chaque sas est
               autonome et emporte ce qu'il importe — le douzième a ajouté 48 Ko pour 268 lignes
               retirées. La courbe monte à chaque conversion, et ne redescendra qu'au prochain
               commit : `app-config.js` disparaît, les trois prêts de l'organigramme et celui de
               la palette se rendent, et la page charge **un** paquet au lieu de douze.

           5.d.6 [x] **`app-config.js` n'existe plus — et la décision que 5.d laissait
               ouverte est prise** — fait le 13 octobre 2026.

               `renderConfig`, `cfgNavigate`, `toggleCfgSidebar` et `CFG_TABS` passent dans
               `frontend/portail/configuration.ts`. Le fichier qui portait **1 443 lignes** et
               les onze sous-vues est supprimé du dépôt ; `public/js/` ne contient plus
               qu'`app.js`.

               ── Non, pas React — et la raison n'est pas le coût ──

               Cette étape devait trancher si l'écran de configuration devient un composant
               React. **Il ne le devient pas**, et le motif est la perte de preuve :

               Les onze sous-vues rendent des **chaînes de balisage**, et leurs gestes sont des
               attributs `onclick` qui appellent des globales. Un composant React les poserait
               dans un `dangerouslySetInnerHTML` — ce qui n'est pas du React, c'est du balisage
               dans un emballage —, ou il faudrait réécrire les onze en JSX d'un seul coup. Or
               c'est exactement ce que six étapes se sont interdit : convertir sans changer, en
               comparant caractère pour caractère.

               L'écran reste donc un **assembleur de chaînes typé**. Son passage à React devient
               un chantier à part, qui commencera par les gestes et non par le rendu. Le dire
               ici évite qu'on le croie fait.

               ── Ce que cette preuve couvre, et qu'aucune autre ne couvrait ──

               `renderConfig` n'est pas une fonction de balisage : c'est un **aiguillage**. Les
               onze sous-vues étaient déjà éprouvées une à une. Ce qui ne l'était nulle part,
               c'est la **place** de chacune : une permutation de deux `case` rendrait deux
               écrans parfaitement corrects au mauvais endroit, et aucun des six comparateurs
               précédents ne l'aurait vu.

               D'où les six choses comparées à chaque régime : le balisage de `#mainView`, la
               sous-vue **après** le rendu — `case 'themes'` la réécrit —, `CURRENT_CFG` posé,
               les deux routes lues **dans l'ordre**, les écouteurs branchés, et le fait de
               lever ou non.

               **184 comparaisons**, douze sous-vues plus une inconnue pour le `default`, aux
               deux postes — national et régional —, plus le repli, les deux gestes de
               navigation, les référentiels absents, la vue principale manquante, et
               l'interrupteur d'un module : le seul geste de cet écran qui écrive au serveur.

               Le compte des régimes est **gardé** : les sous-vues sont relevées dans le `switch`
               d'origine, et il doit y avoir autant de régimes que de `case`. Une sous-vue
               retirée des régimes serait une sous-vue dont la place n'est plus prouvée — la
               leçon de `comparer-schemas.js`, découverte la veille.

               ── Quatorze contre-essais, et deux qui ont dû être refaits ──

               Deux `case` permutés (16 écarts), `case 'themes'` qui ne réécrit plus la sous-vue
               (4), le `default` renvoyé ailleurs, le filtre du poste régional inversé (31), le
               chevron du repli inversé (31), un titre de section rendu en bouton (31),
               `CURRENT_CFG` non posé (28), les référentiels non chargés, les interrupteurs non
               branchés (5), l'interrupteur qui envoie l'état inverse, la recherche non
               réinitialisée, la vue principale traitée en silence.

               Les deux derniers ont d'abord échoué comme contre-essais :

               · **« le repli qui ne bascule plus » était vert.** Remplacer
                 `!CFG_COLLAPSED` par `= true` ne se voit pas si l'on ne bascule **qu'une
                 fois** depuis « déplié » : les deux rendent `true`. Le vert disait que le
                 régime manquait, non que le code était bon. On bascule désormais deux fois,
                 l'aller et le retour.
               · **« les deux routes dans l'autre ordre » ne compilait pas.** Donc rien n'était
                 mesuré. Réécrit en deux attentes successives, il rend 28 écarts. *Un
                 contre-essai qui ne compile pas n'est pas un contre-essai vert, c'est un
                 contre-essai absent* — deuxième fois en deux jours.

               ── Et deux écarts qui mesuraient mon montage ──

               Les deux premiers écarts portaient sur les bandeaux de l'interrupteur : l'original
               appelle le `showToast` d'`app.js`, le module importe celui du socle. **Les deux
               sont le même code** — `if (typeof window.oasisToast !== 'function')` puis la
               délégation. Capter `showToast` mesurait donc le chemin et non le message. C'est
               `oasisToast` qu'il faut capter, et les deux écarts ont disparu sans qu'une ligne
               de code change. Troisième fois que ce piège se présente (5.d.3, 5.d.4, ici).

               ── Ce que la disparition d'`app-config.js` change aux sas, et qu'il faut dire ──

               Neuf noms — `cfgSectionAAC`, `refTable`, `cfgSectionOrganigramme`… — n'ont plus
               **aucun lecteur** dans la page : `configuration.ts` les importe de leur source.
               Les sas continuent pourtant de les publier, et ce n'est plus pour la
               cohabitation : c'est pour les **six comparateurs**, qui font tourner les versions
               d'origine, lesquelles les cherchent dans la portée globale.

               La couche des sas n'est donc plus seulement le pont de la cohabitation, elle est
               aussi le **banc des preuves**. C'est un coût, et il a une échéance : le jour où
               `app.js` partira, le pont n'aura plus d'usage et il faudra choisir — ou les
               comparateurs deviennent des pièces d'archive, ou on leur construit un paquet à
               eux. **La décision n'est pas de cette étape ; sa date, si.**

               J'avais annoncé en 5.d.4 que les trois prêts de l'organigramme se rendraient ici.
               Ils ne se rendent pas, et la raison est celle-ci : les rendre casserait deux
               preuves. L'annonce était faite sans avoir vérifié ce qui les lisait.

               ── Ce qui reste : la page, et elle a encore grossi ──

               **835 Ko**, contre 742. Pour la troisième fois j'ai annoncé une baisse qui n'est
               pas venue, et la cause est toujours la même : **chaque sas est un paquet
               autonome**, et douze paquets portent douze fois les mêmes modules — `icones`,
               `traductions`, `schemas`. `configuration.js` pèse 108 Ko à lui seul, parce qu'il
               importe les onze sous-vues.

               La baisse viendra d'un **seul point d'entrée**, et c'est désormais possible —
               plus rien n'oblige les douze à être douze fichiers.

               **J'ai voulu en faire une étape séparée, et c'était une erreur de jugement.**
               Mon raisonnement — « un changement d'empaquetage se mesure et se prouve à part »
               — était juste en forme et faux en fait : la suite « parcours » a rougi sur ce
               commit seul, et ce n'était pas un gain d'octets qui manquait, c'était une
               **correction**. Les douze paquets portaient douze copies de l'état des modules.
               Voir 5.d.7, qui n'est donc pas une étape d'après mais la moitié de celle-ci :
               les deux sont **un seul commit**, parce que la première seule laisse
               l'application fausse.

           5.d.7 [x] **Le portail en un seul paquet — et ce n'était pas une question
               d'octets** — fait le 13 octobre 2026.

               `index.html` chargeait **douze** paquets du portail. Il en charge **un**.
               Mais la raison n'est pas celle que j'annonçais depuis trois étapes.

               ── Ce que je croyais être un poids était un défaut de correction ──

               esbuild construit chaque sas comme un paquet **autonome** : douze fichiers qui
               portent douze fois `traductions`, `icones`, `schemas`. Je l'avais noté comme un
               coût en octets — 835 Ko servis pour 150 de code — et je me promettais de le
               réduire « au prochain commit », trois fois de suite.

               Ce n'était pas un coût. **Douze copies d'un module, ce sont douze copies de son
               état.** `traductions.ts` tient la langue courante dans un `let` de module :
               chaque paquet avait la sienne. `applyLang('en')` changeait celle du paquet des
               libellés, et **celle des onze autres restait au français**. Même chose pour
               `CFG_OPEN`, `CFG_INSTANCES`, `EXIG_OPEN`, `ORG_VIEW`, `AAC_CFG`.

               C'est exactement le mode de défaillance que 5.b avait nommé — *une copie
               lexicale fait que déplier une fiche n'agit plus sur ce que l'écran rend* — et je
               l'avais recréé par l'empaquetage, après l'avoir évité dans le code.

               ── Comment il s'est montré ──

               Le défaut était **latent**. Tant que `renderConfig` vivait dans `app-config.js`,
               il appelait les sous-vues par `window` : toujours la même copie que leurs propres
               gestes. En le convertissant (5.d.6), il a commencé à les importer de la source —
               sa copie — et le contrôle **« la bascule de langue redessine le contenu de la
               vue »** est tombé : `{"avant":972,"apres":972,"change":false}`.

               Ce contrôle avait été écrit pour autre chose : il vient d'un contre-essai de la
               conversion du démarrage, où ôter `onLangChange` laissait la suite verte. *Un
               contrôle écrit pour un défaut en a nommé un autre, d'architecture, que personne
               ne cherchait.*

               Et il était déjà là, avant 5.d.6, visible sur l'écran « Domaines & Secteurs » :
               changer de langue n'y traduisait rien jusqu'au rechargement de la page. Aucun
               contrôle ne passait par là.

               ── Ce que coûte la leçon, dite franchement ──

               J'ai annoncé trois fois une baisse de poids, et trois fois elle n'est pas venue —
               625, 694, 742, 835 Ko. À chaque fois j'ai écrit « le prochain commit la
               renverse », et à chaque fois j'ai ajouté un paquet. *Une prédiction répétée sans
               être vérifiée n'est pas une prévision, c'est une habitude.*

               Pire : je lisais la courbe comme un problème de place, et c'était un problème de
               **correction**. Le symptôme était juste, le diagnostic faux, et le faux
               diagnostic reportait la correction à un jalon « d'optimisation » qui n'aurait
               jamais été urgent.

               ── Le résultat ──

               Un fichier, `frontend/portail/globales/portail.ts`, qui n'ajoute **aucun code** :
               treize imports dans l'ordre où `index.html` les chargeait. Il ne fait rien
               d'autre, délibérément — un fichier qui décide de l'ordre d'exécution ne doit rien
               faire d'autre.

               Deux déplacements à noter, tous deux écrits dans la page :

               · le paquet se charge **après `app.js`**, parce qu'`app-demarrage` appelle
                 `demarrer()`, qui navigue et appelle les fonctions de rendu d'`app.js`. Le
                 premier niveau d'`app.js` ne contient que des déclarations — vérifié —, donc
                 rien n'y lit une globale du paquet avant son chargement ;
               · le bandeau des témoins passe **après** le paquet : il traduit ses libellés par
                 `window.t`, et il était entre les libellés et l'état dans la liste de douze.
                 Chargé avant, il retombait sur le français sans un mot.

               Les douze paquets continuent d'être construits, et c'est voulu : `login.html` et
               `cookies.html` chargent `i18n.js`, et les **sept comparateurs** les lisent pour
               faire tourner les versions d'origine. Ils ne sont plus servis au portail.

               ── La mesure ──

               La page sert **300 Ko**, contre 835 avant ce commit, et contre **503** au début
               de 5.d — la première baisse du jalon, et la seule qui compte : le portail en
               servait 503 quand il était en JavaScript sans types.

               | | Paquets du portail | Page servie |
               |---|---|---|
               | début de 5.d (f55e9e5) | 4 | 503 Ko |
               | après 5.d.5 | 11 | 742 Ko |
               | après 5.d.6 seul | 12 | 835 Ko |
               | **après 5.d.7** | **1** | **300 Ko** |

               `public/js/` ne contient plus qu'`app.js` (1 192 lignes). TypeScript :
               **10 448 lignes** en 68 fichiers ; JavaScript du front : **57 085**.

               ── Et un garde qui regardait la mauvaise chose depuis le début ──

               Le paquet unique fait **3 415 lignes**, et le garde « aucun fichier au-delà de
               2 000 lignes » l'a nommé. Il avait raison de mordre, et tort de regarder : son
               exclusion des paquets construits ne nommait que `public/modules/*/app/`.
               `public/app/` et `public/shared/app/` — les sas du portail et du socle,
               construits par le même esbuild depuis le même `frontend/` — **passaient pour de
               la source** depuis 5.b.

               Tous les gardes de ce fichier tournaient donc sur des paquets : longueur
               lisible, noms globaux, dates, appels au magasin. Personne ne l'a vu parce
               qu'aucun paquet n'atteignait le seuil. *Un garde qui ne mord qu'au-delà d'un
               seuil ne dit pas qu'il regarde la mauvaise chose* — il a fallu un paquet de
               3 415 lignes pour que l'erreur devienne visible.

               Les sorties se **déduisent** désormais de la table de `construire.mjs`, comme le
               faisait déjà le garde des fichiers ignorés de git et de l'image — une liste
               tenue à la main est exactement ce qui a produit l'oubli. Et un contrôle nouveau
               **nomme les exclusions** et exige qu'il y en ait au moins trois : une exclusion
               qui se vide en silence viderait les autres gardes avec elle. Contre-essayé en
               rendant la table illisible : trois contrôles tombent.




       ── La décision prise le 13 octobre 2026 : les comparateurs seront des pièces
          d'archive — **mise en œuvre le même jour, en 5.e.5** ──

       Les sas publient des noms que **plus personne ne lit** dans la page — neuf depuis
       5.d.6, et les trois rendus en 5.e.0 s'y ajouteront. Seuls les huit comparateurs les
       lisent, pour faire tourner les versions d'origine dans la portée globale.

       *Le compte « neuf » était une estimation, et elle était basse d'un facteur sept :
       le relevé écrit pour la mise en œuvre en a trouvé **soixante-trois** sur cent
       trente-cinq. On ne devine pas une surface — voir 5.e.5.*

       La maîtrise d'ouvrage a tranché : **les comparateurs deviendront des pièces
       d'archive**. Le jour où `app.js` disparaîtra, le pont de cohabitation n'aura plus
       d'usage, les sas cesseront de publier ce que rien n'appelle, et les
       `scripts/comparer-*.js` resteront au dépôt comme la trace d'une conversion — plus
       rejouables, mais lisibles.

       Ce que cela coûte, et il faut le dire : **les huit preuves cessent alors d'être des
       contrôles de non-régression.** Ce qu'elles tenaient — que le balisage de chaque
       écran n'a pas bougé — passe entièrement à la suite « parcours » et aux 108 contrôles
       du navigateur. C'est pourquoi la couverture des gestes du portail a été portée à son
       plafond (66 sur 84) **avant** 5.d, et non après : c'est elle qui prend le relais.

   5.e [x] **`app.js` — le dernier JavaScript du portail. Clos le 13 octobre 2026 :
       1 192 lignes devenues 0, et `public/js/` n'existe plus.** Il porte la navigation, les cinq vues, les utilisateurs, le profil et le
       journal d'audit.

       Le découpage n'est pas thématique : il suit **ce que les modules convertis
       empruntent encore**. Chaque pièce rend des prêts, et c'est ce qui décide de son
       rang.

       5.e.0 [x] **Les libellés littéraux et la barre d'écran — les trois prêts rendus** —
           fait le 13 octobre 2026. `app.js` passe de **1 192 à 973 lignes**.

           `tr`, `searchInputHtml` et `exportBar` étaient les trois noms que les cinq
           modules de 5.d lisaient sur `window`, faute de pouvoir les atteindre : leurs
           tables et leur état étaient des globales **lexicales** d'`app.js`. Sixième
           fois que cet obstacle décide d'un déplacement, et la dernière de cette forme —
           il ne reste plus de `const` du premier niveau qu'un module doive lire.

           Deux modules : `libelles.ts` (la table de 65 libellés français littéraux et
           `tr`) et `barre.ts` (la recherche, l'export PDF et Excel, l'import de
           classeur, le filtre client). `PORTAIL_RECHERCHE` devient **privé** — personne
           d'autre ne le lisait.

           ── Deux mécanismes de traduction, et ils restent deux ──

           `traductions.fr.ts` traduit des **clés** (`cfg_save`) ; `libelles.ts` traduit
           des **libellés français littéraux** (`"Date d'adoption"`), qui sont à la fois
           la clé et la valeur française. Les réunir demanderait d'inventer une clé pour
           chacun des 65 et de réécrire tous leurs appels : une amélioration, donc un
           changement, donc pas ici. Le rapprochement est un chantier à part.

           ── Une clé en double, trouvée par le compilateur ──

           `'Domaines'` figurait **deux fois** dans la table — une fois en titre de
           section, une fois en colonne —, avec la **même** valeur. Un littéral d'objet
           JavaScript garde la dernière et ne dit rien ; TypeScript refuse le doublon.

           Le retrait ne change donc rien, et le comparateur le **prouve** : il relève
           les clés dans la table d'origine, où le doublon est déjà effondré. Les deux
           côtés comparent 65 libellés.

           ── Les quatre comparateurs qui fabriquaient ces trois noms ──

           `comparer-referentiels`, `-exigences`, `-taxinomie` et `-parametres` les
           **fabriquaient** : `tr` en identité, les deux autres en marqueurs de
           commentaire. C'était juste tant que les deux côtés les lisaient sur `window`.

           Dès que le module converti les importe, la comparaison opposerait le vrai
           balisage à un marqueur — la mesure de mon montage, non du code, pour la
           quatrième fois (5.d.3, 5.d.4, 5.d.6, ici). Les deux bacs chargent donc le même
           `public/app/barre.js`, et ces quatre preuves comparent désormais le **vrai**
           champ de recherche et la **vraie** barre d'export. Elles en sortent plus
           fortes qu'avant.

           ── Un cycle évité, et le vrai couplage nommé ──

           `barre.ts` lisait `closeRefModal` de `referentiels.ts`, qui importe désormais
           `searchInputHtml` d'elle. L'import en retour ferait un cycle que les deux
           survivraient — les noms n'étant lus qu'à l'appel — mais qui dirait faux sur ce
           qui dépend de quoi. Le prêt reste donc dans ce sens-ci, et la vraie cause est
           écrite : la fenêtre d'import et celles des référentiels **partagent la racine
           `cfgModalRoot`**. Elle se dénouera quand cette racine aura son module.

           ── Une divergence assumée : la fenêtre d'impression bloquée ──

           `window.open` rend `null` quand le navigateur bloque les fenêtres, et
           l'original écrivait dedans sans le vérifier — `TypeError`, console, rien à
           l'écran. Le module **lève**, en nommant la cause ; la divergence est le texte,
           et les deux exports sont assertés.

           ── La preuve, et une comparaison qui tenait à la chance ──

           **355 comparaisons** : les 65 libellés dans les trois langues plus une
           quatrième absente du catalogue, les clés qui n'en sont pas, le champ de
           recherche dans ses cinq états — atteints **par les gestes** des deux côtés —,
           la barre d'export sur un intitulé hostile, le balisage de la fenêtre d'import,
           les deux **documents PDF entiers**, et le corps de l'import dans ses deux
           comptes rendus.

           Le second compte rendu a révélé que le premier passait **par hasard** :
           `doImport` pose un `onload` et ne l'attend pas, et je lisais le résultat juste
           après l'appel. Les deux chaînes avaient le même nombre de micro-tâches ; dès
           que l'enveloppe du module en a ajouté une, l'écart est apparu. *Une
           comparaison qui dépend de l'ordre des micro-tâches n'est pas une comparaison.*
           La promesse de chaque lecture est désormais retenue et attendue.

           **Seize contre-essais, seize rouges** — après deux verts qui ont nommé deux
           régimes manquants : une valeur de recherche posée **sans** ouverture (le cas
           d'un écran redessiné sous un champ rempli), et un import qui rend des lignes
           ignorées. Les deux sont entrés dans la preuve.

       5.e.1 [x] **L'écran des comptes — et les écouteurs, que nul balisage ne dit** —
           fait le 13 octobre 2026. `app.js` passe de **973 à 599 lignes**.

           La pièce la plus lourde de 5.e : six onglets, cinq fenêtres, et **quatre gestes
           qui écrivent** — dont l'effacement d'un compte, irréversible et confirmé par le
           mot de passe de celui qui le prononce.

           ── Trois états, et aucun n'a eu à monter sur `window` ──

           `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` étaient des `let` du premier
           niveau — des globales **lexicales** — et personne d'autre ne les lisait : ils
           deviennent privés. Troisième fois après `AAC_CFG` (5.d.5) et
           `PORTAIL_RECHERCHE` (5.e.0), et toujours le même critère.

           ── Ce que cette preuve couvre, et qu'aucune autre ne pouvait ──

           `renderUsers` écrit le balisage **puis branche six familles d'écouteurs** :
           `[data-action]`, `[data-presta]`, `[data-topersonnel]`, `[data-modules]`,
           `[data-edit]`, `[data-effacer]`. *Un écouteur manquant laisse un bouton muet,
           et aucun balisage ne le dirait* — c'est la défaillance la plus silencieuse de
           cet écran, et elle n'était éprouvée nulle part.

           Le faux document **relit le balisage qui vient d'être écrit** pour en tirer ses
           éléments : inventer une liste mesurerait mon montage. Et un garde refuse le
           vide — l'onglet « AAC » doit porter les cinq familles de boutons, celui des
           prestataires son sélecteur de rattachement.

           **100 comparaisons** : les six onglets aux deux privilèges — le privilège
           commande cinq boutons et une colonne —, le repli en aller et retour, les quatre
           fenêtres avec **le focus qu'elles posent**, `userRole` et `splitName` sur treize
           comptes bricolés (un nom en un mot, en quatre, aucun nom du tout), et les quatre
           corps de requête.

           ── Ce que la conversion ne corrige pas, et qui est nommé ──

           `submitEditUser` envoie **tous** les champs de la fenêtre, vides compris, et le
           serveur les écrit : un champ que la fenêtre n'aurait pas su relire effacerait la
           valeur enregistrée. C'est *le champ effacé parce qu'il est parti vide*, que la
           suite « parcours » nomme depuis 5.c — et la même famille que le défaut que j'ai
           **introduit puis corrigé** en 5.d.5.

           Il n'est pas corrigé : le corriger changerait ce que la route reçoit. Mais le
           typage le rend visible — les champs facultatifs passent par
           `valeurFacultative`, qui dit en son nom que l'absence et le vide s'y confondent,
           tandis que les champs attendus passent par `valeur`, qui **lève**.

           ── Une distinction assumée entre ouvrir et refermer ──

           La racine des fenêtres absente fait **lever** les cinq `show*`, comme
           l'original. `closeUserModal`, lui, reste permissif : *refermer une fenêtre qui
           n'est pas là n'est pas une erreur, en ouvrir une dans le vide l'est.* C'est le
           choix fait pour `closeRefModal` en 5.d.1, et il est maintenant écrit.

           ── Un contre-essai vert qui disait autre chose qu'un régime manquant ──

           « La recherche non réinitialisée au changement d'onglet » restait **vert**. J'ai
           d'abord cru à un régime absent et posé une valeur avant la bascule : la
           comparaison a alors rendu un écart — sur mon montage.

           La leçon de 5.d.7, revenue dans la mesure : le côté « origine » lit
           `searchInputHtml` sur `window`, posé par le paquet `barre.js` ; le côté
           « nouvelle » l'**importe**, et `utilisateurs.js` en porte donc **sa propre
           copie**. Poser une valeur par la globale touche la copie du sas — celle que
           l'origine rend, et pas celle du module.

           Sur la page il n'y a **qu'une** copie depuis 5.d.7 : le défaut est de la mesure,
           non du produit. Le régime a donc été retiré, la limite est **écrite dans
           l'en-tête du comparateur**, et la preuve est allée là où il n'y a qu'une copie —
           la suite « parcours » a reçu le contrôle « changer d'onglet des comptes remet la
           recherche au repos », contre-essayé en ôtant l'appel.

           *Un comparateur qui oppose un module à des globales ne voit pas par-dessus les
           frontières de paquet. Il faut le savoir avant de lui demander ce qu'il ne peut
           pas dire.*

           ── Et un garde-fou de taille qui a imposé un découpage — le bon ──

           `utilisateurs.ts` faisait **637 lignes**, et la limite du frontend est 600.
           Première fois qu'une limite de taille décide d'un découpage dans ce jalon, et
           le découpage qu'elle impose est juste : `comptes.ts` prend la **forme** d'un
           compte, les deux tables d'onglets et les deux lectures pures — rien qui touche
           au document, à `window` ou à l'API ; `utilisateurs.ts` garde l'écran.

           ── Un « meilleur nom » qui a fait perdre six gestes de couverture ──

           Le relevé des gestes a signalé six noms changés. J'avais écrit
           `const efValider = element('efValider')` — plus lisible, pensais-je, que
           `document.getElementById('efValider').addEventListener(…)` de l'original.

           `relever-gestes.js` nomme la cible d'un écouteur en **remontant la variable
           jusqu'à son `getElementById`**. Avec l'accesseur, il ne pouvait plus la suivre :
           les six gestes sont passés **indécidables**, et la couverture du portail est
           tombée de **66 à 60** — *sans que rien ne soit moins éprouvé*. J'avais échangé
           une mesure contre une ignorance.

           Deux réponses possibles : élargir l'outil pour qu'il connaisse l'accesseur, ou
           garder la source lisible pour lui. La seconde a été retenue — l'outil connaît
           les primitives du document, et lui apprendre les aides d'un module serait une
           dépendance de plus dans le sens où il ne faut pas. Les six cibles gardent donc
           leur `getElementById` à l'assignation, et le refus est **groupé** : une fenêtre
           à qui manque un champ est une fenêtre cassée, pas un champ à traiter à part.

           *Une mesure qui baisse sans que rien ait changé mesure l'outil, non le produit.*

           ── Seize contre-essais, seize rouges ──

           Dont un qui **ne compilait pas** d'abord — « l'écouteur du rattachement
           prestataire non branché » —, donc ne mesurait rien. Réécrit par un sélecteur qui
           ne trouve rien, il rend des écarts. Troisième fois en trois jours.

           Les quinze autres, du plus parlant : le nom et le prénom échangés (15 écarts),
           le compte par onglet faussé (14), la colonne des accès ouverte à un
           non-super-administrateur (12), le rôle « inspecteur » non replié sur « AAC » (7),
           le bouton d'effacement offert sur soi-même, la bascule d'activité offerte sur un
           pair administrateur, le mot de passe de l'opérateur non envoyé à l'effacement,
           l'identifiant modifié envoyé sans sa confirmation, la portée envoyée à la place
           de l'instance, le focus non posé, les cases lues sans leur filtre `:checked`.

       5.e.2 [x] **L'écran du profil — le premier bloc sans aucun état** — fait le
           13 octobre 2026. `app.js` passe de **598 à 453 lignes**.

           Le seul écran où un agent change **ses propres** identifiants : sa photo, son
           nom, sa fonction, son mot de passe.

           ── Aucun état, et c'est la première fois de 5.e ──

           Ce bloc ne portait pas une variable mutable : tout vient de `ME`, que
           `loadMe()` rafraîchit après chaque enregistrement. Il a donc pu être converti
           sans décider où mettre quoi que ce soit — et c'est assez rare dans ce jalon
           pour être noté.

           `ROLE_LABELS` part avec lui (un `const` lexical que seul cet écran lisait), et
           `saveProfile` devient **privée** : seul nom que ce bloc retire de la surface,
           ses cinq appelants étant partis avec elle.

           ── Huit champs de `ME.user` qui n'avaient pas de type ──

           `email`, `nom`, `prenom`, `telephone`, `fonction`, `active`, les deux dates,
           le rattachement prestataire et le bloc `extra`. La route `/api/me` les rendait
           depuis toujours ; le type ne les disait pas, parce qu'aucun module converti ne
           les avait encore lus. Ils sont déclarés dans `etat.ts`, chez le propriétaire de
           l'état — une forme déclarée deux fois est une forme qui finit par diverger.

           ── Les deux sections facultatives, et leurs deux branches ──

           `pfExtraSection` rend une carte **active** ou **grisée** selon le rôle, et la
           branche change six choses : la classe de la carte, la phrase de réserve,
           l'attribut `disabled` de chaque champ, et la présence du bouton
           d'enregistrement. Deux gardes exigent que le balisage comparé porte les deux —
           sans quoi la moitié de la fonction ne serait éprouvée nulle part, ce qui est
           arrivé à `circuitHtml` en 5.d.3.

           ── Une divergence invisible dans un navigateur, dont la preuve dépendait ──

           L'original écrit `reader.onload = () => saveProfile({…})`, qui **rend** la
           promesse de l'enregistrement. Le type de `onload` ne laisse rien rendre : le
           module l'écarte par `void`. Rien ne lit cette valeur — `FileReader` l'ignore —,
           donc le produit est intact.

           Mais la preuve, elle, **retenait cette promesse** pour savoir quand la requête
           était partie. Du côté converti elle n'existait plus, et la lecture arrivait
           avant la requête : deux écarts, qui disaient ma mesure et non le code. Le
           comparateur vide désormais la file des micro-tâches des deux côtés. *Une
           comparaison qui dépend de l'ordre des micro-tâches n'est pas une comparaison* —
           deuxième fois en deux pièces, et la cause est la même : un geste qui pose un
           `onload` que personne n'attend.

           ── Ce qui n'est pas comparé, et c'est dit ──

           `removeProfilePhoto` passe par la confirmation du socle, qui bâtit un dialogue
           dans le document et attend un clic. Un faux document ne le résoudrait pas, et
           le remplacer d'un seul côté mesurerait le montage. La suite « parcours » le
           couvre (5.c.14), et le corps qu'il envoie est celui de `saveProfile` — la même
           fonction que les quatre gestes comparés.

           ── La preuve ──

           **60 comparaisons** : les huit rôles — dont un inconnu, pour le repli du
           libellé —, avec et sans photo, un nom hostile aux cinq caractères, un compte
           inactif, un compte sans nom, un nom composé seul, un compte sans dates, les
           deux sections renseignées puis vides, un rattachement vers un prestataire
           absent, les référentiels manquants, `pfExtraSection` appelée directement en
           trois jeux, les **quatre corps de requête**, et les **quatre issues** du
           changement de mot de passe — ancien vide, confirmation discordante, politique
           refusée, succès — dont les trois champs que le succès doit vider.

           **Dix-huit contre-essais, dix-huit rouges.** Deux ont d'abord été écrits sur un
           motif absent ou trouvé deux fois, donc ne mesuraient rien : réécrits, ils
           mordent. Les plus parlants : la section grisée qui garde son bouton (19 écarts),
           les champs d'une section grisée restés actifs (19), la photo non remplacée par
           les initiales (18), les initiales prises à l'envers (15), la session non
           rechargée après l'enregistrement (12), la section des prestataires ouverte aux
           indépendants (12).

       5.e.3 [x] **L'accueil et le journal d'audit — et la moitié d'une fonction que la
           suite du navigateur n'atteint pas** — fait le 13 octobre 2026. `app.js` passe
           de **452 à 278 lignes**.

           Deux écrans en une pièce : l'accueil, que **tout le monde** voit, et le journal
           d'audit, le plus court du portail.

           ── La carte éteinte, éprouvée nulle part ──

           Un module fermé au compte s'affiche en gris, porte un `aria-disabled`, et son
           clic dit pourquoi au lieu de mener nulle part. Trois états le commandent : le
           rôle de super-administrateur ouvre tout ; une liste `modules` **absente** ouvre
           tout aussi — c'était l'état de l'application avant que ce champ n'existe ; une
           liste renseignée filtre.

           Le jeu d'essai de « parcours » n'ouvre qu'un compte de super-administrateur :
           **cette moitié de `card` n'était éprouvée nulle part**. Le comparateur la
           fabrique en cinq régimes — liste partielle, vide, absente, code inconnu, valeur
           qui n'est pas un tableau — et une garde exige que le balisage comparé porte les
           **deux** sortes de cartes. C'est la troisième fois qu'une garde de ce genre
           trouve une branche sans preuve, après `circuitHtml` (5.d.3) et le cadre de la
           photo (5.e.2).

           ── Une requête pour rien, et ce que sa mesure a appris ──

           `renderHome` demandait `/api/stats`, en lisait la réponse, et **ne s'en servait
           pas** : la route parcourt tous les comptes du serveur à chaque ouverture du
           portail. La conversion ne la retire pas — ce serait changer ce que la page
           fait —, et la comparaison des routes lues la fixe.

           J'avais écrit cela dans l'en-tête du comparateur **avant** de le vérifier, et le
           contre-essai m'a corrigé : retirer la **lecture** de la réponse ne rend aucun
           écart. Il fallait retirer l'**appel**, ce qui en rend quinze. La phrase était
           juste, le contre-essai visait à côté — et un contre-essai qui vise à côté laisse
           croire qu'on a prouvé ce qu'on a seulement affirmé.

           C'est aussi la mesure de ce que cette requête est morte : seule sa présence
           compte, rien de ce qu'elle rapporte.

           ── `PRIO_COLORS` revient chez lui, et le prêt change de raison ──

           Prêté par le sas des icônes depuis 5.d.5 **pour la carte du portail**, il est
           désormais importé par ce module. `app.js` ne le lit plus. Le sas continue
           pourtant de le publier — pour les comparateurs, qui font tourner les versions
           d'origine. Le prêt n'est donc pas refermé : il a changé de raison, et sa raison
           a l'échéance inscrite plus haut.

           ── Un acte posé puis défait, sur deux noms voisins ──

           Le premier jet du sas publiait `OASIS_FULLNAME_HTML`, et son commentaire disait
           le rendre « à sa place ». C'était faux dans les deux sens : un `const` du
           premier niveau n'est **pas** sur `window`, donc le publier *ajoutait* à la
           surface — ce qu'un sas n'a pas à faire —, et je le confondais avec
           `OASIS_LOGO_IMG`, qui lui **a dû** monter sur `window` en 5.c parce
           qu'`app-demarrage` le lit.

           Deux noms voisins, deux situations contraires. Le critère reste celui de 5.b :
           **ce qu'un autre fichier doit atteindre**. Les quatre globales lexicales de cet
           écran — `MODULES_VIEW`, `COULEURS_MODULE`, `THEMES_ORDER`,
           `OASIS_FULLNAME_HTML` — restent donc privées, et le sas ne pose que deux noms.

           ── Une protection ajoutée, et pourquoi elle n'est pas un changement ──

           `lireVueRetenue` entoure l'accès au stockage d'un `try`. L'original ne s'en
           protégeait pas : dans un script classique, une levée en navigation privée
           arrêtait `app.js` à cette ligne. Ici elle arrêterait **le paquet entier du
           portail**, chargé d'un seul fichier depuis 5.d.7. La portée du dégât a changé,
           donc la protection n'est pas une amélioration gratuite : c'est la même garantie
           qu'avant, dans un empaquetage différent.

           ── La preuve ──

           **87 comparaisons** : sept régimes de compte × deux présentations, les trois
           langues plus une absente, huit régimes de catalogue — vide, tout désactivé, un
           seul thème, sans le thème sans en-tête, un thème inconnu, renversé, un module
           hostile et sans teinte —, la bascule de présentation quatre fois dont un mode
           inconnu et une fois sans sa boîte dans le document, les **cinq issues du clic**
           d'une carte, et six états du journal d'audit avec son bouton de vérification.

           **Vingt et un contre-essais, vingt et un rouges**, après trois qui ne
           compilaient pas et un qui visait à côté. Les plus parlants : l'ordre du
           catalogue remplacé par l'ordre alphabétique (42 écarts), l'en-tête rendu au
           thème de la surveillance (24), la teinte propre au module ignorée (24), la
           requête retirée (15).

       5.e.4 [x] **`public/js/` n'existe plus — le portail est entièrement en
           TypeScript** — fait le 13 octobre 2026.

           Le téléphone (vingt-cinq indicatifs) et les quatre aides du portail —
           `escArg`, `fmtDate`, `reglesMotDePasse`, `loadRefs` — passent dans
           `telephone.ts` et `outils.ts`. `public/js/app.js` est supprimé du dépôt, et
           avec lui le dernier fichier de `public/js/`.

           **1 192 lignes de JavaScript devenues 0** en cinq pièces, du 13 octobre.

           ── Trois noms qui ne sont pas convertis, mais **retirés** ──

           `app.js` définissait aussi `api`, `esc` et `showToast`, et les trois étaient
           des **doublons** de ceux du socle :

           · `esc(s)` **était** `oasisEsc(s)` — la fonction du socle, qu'il écrasait sur
             `window` en se chargeant après lui ;
           · `showToast` était **le même code**, à la ligne près ;
           · `api` ajoutait `X-OASIS-Request` et ramenait à la connexion sur 401 — deux
             gestes déjà ailleurs : l'enveloppe du socle pose cet en-tête sur **tout**
             appel (contre-essayé en 5.c, où le retirer d'`app.js` ne changeait rien) et
             le retour est `sessionPerdue`.

           `window.api` et `window.showToast` portaient donc **deux fonctions**, ce que le
           garde-fou « aucune page ne charge deux définitions du même nom global » nommait
           depuis le 8 octobre 2026 — trouvé **par le compilateur** en déclarant la
           seconde, et par aucun contrôle. Les deux noms n'en portent plus qu'une.

           ── Un tri qu'on ne peut pas prouver, et qui le dit maintenant ──

           `splitPhone` trie les indicatifs correspondants par longueur décroissante, pour
           prendre le plus précis. J'avais écrit que c'était « la règle qu'on éprouve ».

           Deux contre-essais — tri inversé, tri retiré — sont restés **verts** :
           **aucun des vingt-cinq indicatifs n'est préfixe d'un autre**, donc le filtre
           n'en rend jamais deux et le tri ne décide de rien. *On ne peut pas prouver un
           tri que les données rendent sans objet.*

           Il est conservé — le retirer serait changer en convertissant, et la règle
           redeviendra vraie le jour où un indicatif court paraîtra. Une garde le dira :
           elle refuse si un indicatif devient préfixe d'un autre, **ou** si la table
           change de taille, pour qu'on écrive le régime au lieu de croire qu'il existe.

           Cette garde a elle-même échoué deux fois avant de mordre :

           · **elle lisait la table d'origine**, figée dans `git` — une garde qui
             surveille un fichier immuable ne garde rien. Elle lit la table vivante ;
           · puis mon contre-essai **ne modifiait rien**, le motif cherché n'existant pas
             dans le fichier (les indicatifs y vont deux par ligne). Troisième fois en
             trois jours qu'un contre-essai ne mesure rien, et toujours la même cause :
             avoir supposé le motif au lieu de le compter.

           ── Les cinq comparateurs qui fabriquaient ces noms ──

           `comparer-configuration`, `-barre`, `-utilisateurs`, `-profil` et `-accueil`
           **fabriquaient** `fmtDate`, `reglesMotDePasse`, `loadRefs` et les deux
           fonctions du téléphone. Cinquième fois que ce piège se présente (5.d.3, 5.d.4,
           5.d.6, 5.e.0, ici) : les deux bacs chargent désormais le même
           `public/app/outils.js`.

           Et le compteur d'appels de `loadRefs` a cédé la place à la **route lue** : le
           faux n'existe plus, le vrai fait un appel, et c'est l'appel qui se compare.
           Plus proche de ce que la page fait, et ne dépendant plus d'un compteur à moi.

           ── Une duplication nommée, et non corrigée ──

           `escArg` n'a **aucun lecteur** : `exigences.ts` et `instances.ts` en portent
           chacun une copie privée, et leurs commentaires disent d'où elle vient. Trois
           exemplaires du même calcul. Les réunir est une amélioration, donc un
           changement, donc pas ici — mais la copie n'a plus d'excuse : l'original était
           hors d'atteinte, celui-ci s'importe.

           ── La preuve ──

           **432 comparaisons** : les 25 indicatifs × quatre formes de saisie × trois
           langues, onze saisies qui n'en sont pas (un `+` inconnu, un vide, des espaces,
           `null`, `0`), cinq fenêtres de téléphone, cinq recompositions, `escArg` sur
           huit valeurs, `reglesMotDePasse` sur huit formes de détail, `fmtDate` sur huit
           dates dont deux impossibles, la route des référentiels et `REFS` posé, la levée
           sur un champ absent assertée des deux côtés, et les deux gardes.

           **Vingt contre-essais, vingt rouges** — après deux verts qui ont nommé le tri
           inatteignable et un qui ne compilait pas. Le plus parlant : le numéro non
           détaché de son indicatif, **309 écarts**.

           ── Les douze comparateurs, une dernière fois ensemble ──

           **5 169 comparaisons, aucune différence.** C'est le dernier état où ils tournent
           tous : la décision inscrite plus haut les fait pièces d'archive, et sa mise en
           œuvre est la suite immédiate (5.e.5) — un commit à part, pour que celui-ci reste
           vérifiable seul.

           *Le compte écrit ici disait d'abord 5 168. Les douze chiffres de ce document
           — 2 820, 640, 84, 243, 22, 142, 184, 355, 100, 60, 87, 432 — font 5 169, et
           les douze passages rejoués sur ce commit le 13 octobre 2026 les confirment un
           à un. L'erreur était dans l'addition, non dans la mesure ; elle est corrigée
           par un relevé, non par un calcul refait.*

       5.e.5 [x] **La dépose du pont — les sas cessent de publier ce que rien ne lit, et
           les comparateurs deviennent des pièces d'archive** — fait le 13 octobre 2026.

           Mise en œuvre de la décision de la maîtrise d'ouvrage inscrite plus haut.
           Commit à part, pour que 5.e.4 reste vérifiable seul.

           **135 noms publiés deviennent 72. Trois sas sur dix-huit disparaissent.**

           ── Ce que mesure l'outil, et pourquoi il a fallu l'écrire trois fois ──

           `scripts/relever-surface.js` relève ce qu'un sas publie et **qui le lit**. Il
           classe chaque lecteur par sa sorte, et les sortes ne valent pas la même
           chose :

           | Sorte | Ce que c'est | Impose la publication ? |
           |---|---|---|
           | **geste** | le nom est appelé depuis une chaîne qui devient du balisage (`onclick`) | **oui** — et c'est le seul lecteur qu'aucun compilateur ne voit |
           | **hors-paquet** | un autre paquet du même document lit `window.<nom>` | **oui** |
           | **intra** | le paquet qui publie se relit lui-même à travers `window` | **oui**, tant que la dette est là |
           | **essai** | seul un contrôle ou un comparateur le lit | **non** |

           **Les deux premières écritures de cet outil étaient fausses, et la seconde
           dangereusement.**

           La première comptait comme lecteur tout fichier « hors du paquet » qui
           mentionnait le nom : `icon` paraissait lu quarante-deux fois et `t` cent
           cinquante-huit. C'étaient des **homonymes** — les écrans de module ont leur
           propre `icon` et leur propre `t`, et aucun ne charge le moindre `/app/*.js`.
           Un nom global ne se lit que dans le document qui le porte ; le relevé part
           donc des pages HTML et suit les balises `<script>` jusqu'aux sources.

           La seconde n'avait pas la sorte **intra**, et déclarait muets **dix-sept
           noms que le portail se relit sur `window`** : `window.renderConfig()` appelé
           par huit de ses fichiers, `window.onLangChange()` par `applyLang` dans le sas
           lui-même, les cinq vues que `demarrage.ts` appelle ainsi. Les retirer n'aurait
           produit **aucune erreur de compilation** et aurait rendu huit écrans inertes
           au clic.

           ── Et une troisième faute, celle-là trouvée par un filet et non par l'outil ──

           Après la correction, deux noms restaient faussement muets : **`exportPdf` et
           `exportPdfActivites`**. `exportBar` écrit `onclick="${pdf}"` — le gestionnaire
           est **assemblé en deux temps**, et son attribut ne porte qu'une interpolation.
           Le relevé, qui ne lisait que les attributs `on…=`, ne voyait rien. Les
           retirer aurait rendu inertes les boutons « Exporter PDF » de onze
           référentiels et de la taxinomie, **sans une ligne de console**.

           Ce qui l'a trouvé n'est pas une relecture : c'est un `grep` grossier de chacun
           des soixante-trois noms dans tout le dépôt, posé comme filet sous l'outil. Il
           a rendu cinq signalements — trois faux (`class="group-icon"` n'appelle pas
           `icon`, `<tr>` n'appelle pas `tr`, `getElementById('userRole')` nomme un
           élément) et deux vrais. *Un filet grossier sous une mesure fine n'est pas une
           redondance.*

           Le critère est désormais : **le nom suivi d'une parenthèse dans une chaîne**.
           Du code écrit en texte ne peut être évalué que dans la portée globale, quel
           que soit le chemin par lequel il atteint le balisage.

           ── Trois accords indépendants, et c'est ce qui autorise le retrait ──

           1. **L'inventaire des gestes** (`relever-gestes.js`, écrit en 5.c pour une
              tout autre fin) nomme 84 gestes du portail. Les 84 sont dans l'ensemble
              « lu » du relevé de surface : zéro écart entre deux mesures écrites
              séparément, à six jours d'intervalle.
           2. **Le filet `grep`** ci-dessus, qui a corrigé la mesure.
           3. **La campagne**, et la suite « parcours » en particulier, qui exerce 66 des
              84 gestes dans un navigateur.

           ── Une dette qui n'en était pas une ──

           `PRIO_COLORS` comptait parmi les dix-sept lectures **intra** : `accueil.ts`
           lisait `window.PRIO_COLORS[…]`. Or le même fichier **importait déjà**
           `PRIO_COLORS` d'`./icones`, sans s'en servir — un import mort que seul
           `tsc --noUnusedLocals`, lancé pour vérifier que les déclarations retirées ne
           laissaient rien derrière, a nommé. Les deux désignent le même objet : un
           paquet, un module, une table. La ligne lit désormais l'import, le prêt de
           5.d.5 est rendu, et `globales/icons.ts` n'a plus rien à publier.

           Les seize autres dettes sont réelles et restent nommées : ces fichiers
           **pourraient** importer ce qu'ils appellent, et la publication tombera avec
           elles.

           ── Ce qui part, et ce qui reste ──

           | Sas | Publiait | Publie | Déposés |
           |---|---|---|---|
           | `schemas.ts` | 11 | — | le fichier est supprimé |
           | `outils.ts` | 7 | — | le fichier est supprimé |
           | `icons.ts` | 4 | — | le fichier est supprimé |
           | `portail-instances.ts` | 12 | 4 | les trois `const` lexicaux et cinq fonctions |
           | `utilisateurs.ts` | 13 | 6 | `userRole`, `splitName`, et les quatre fenêtres |
           | `barre.ts` | 14 | 9 | les trois prêts de 5.e.0, `pdfWindow`, `filterScope` |
           | `organigramme.ts` | 15 | 10 | les cinq prêts rendus en 5.d.4 et 5.d.6 |
           | `parametres.ts` | 11 | 6 | les quatre sous-vues et `cameraIcon` |
           | `referentiels.ts`, `exigences.ts`, `taxinomie.ts`, `profil.ts`, `app-demarrage.ts` | 8+7+4+7+6 | 7+6+2+6+5 | une sous-vue ou un nom sans lecteur chacun |

           Les déclarations `interface Window` partent avec les publications : *un
           `interface Window` qui nomme un nom que rien ne pose est une affirmation
           fausse sur le monde*, et c'est le défaut même que la suite « frontend » existe
           pour empêcher (`window.dtPriv`, `window.ICONS`). Quatre blocs `declare global`
           entiers disparaissent — `libelles.ts`, `outils.ts`, `telephone.ts`, et celui
           du sas des schémas avec son fichier.

           ── Un nom retiré pour une seconde raison ──

           `userRole` entrait en collision avec le balisage : la page porte un
           `<div id="userRole">`, et **un élément nommé se pose lui aussi sur `window`**.
           Le sas écrasait cette référence par la fonction. Rien n'en dépendait ; deux
           choses sous un même nom au même endroit ne se gardent pas.

           ── Un contrôle d'essai qui tenait un nom en vie ──

           La suite « parcours » appelait `window.planBackToPortal()` pour éprouver la
           sortie d'un module. Elle n'aurait pas dû : **un module ne connaît pas ce
           nom.** Il vit dans un cadre et sort en adressant `oasis:back-portal` à sa
           fenêtre parente. Le contrôle prouvait que la fonction marche, non que le
           chemin que la page emprunte marche. Il part désormais du message —
           contre-essayé en changeant le type d'un caractère : rouge — et c'est cela qui
           a permis de retirer le nom.

           **C'est la sixième fois qu'un montage de preuve se mesurait lui-même**, et la
           première où c'est la *surface de l'application* qu'il maintenait en vie.

           ── Ce qui défaille maintenant si un nom disparaît ──

           Deux contrôles neufs dans `tests/smoke/frontend.smoke.js`, et il faut les
           deux :

           · **`la surface du portail est conforme au relevé`** — les 81 noms que
             `/app/portail.js` ajoute à `window`, mesurés dans un navigateur sur une page
             vierge, figés dans `tests/smoke/surface-portail.json`. 72 viennent des sas,
             9 sont l'état partagé que `etat.ts` pose depuis le module. Un nom qui
             disparaît casse un `onclick` **en silence** : c'est ce contrôle qui le dit.
           · **`aucun sas du portail ne publie un nom que la page ne lit pas`** — le
             relevé statique, qui empêche la surface de se remettre à grossir.

           Les deux sont **complémentaires et ni l'un ni l'autre suffisant** : le premier
           gèlerait aussi bien soixante-trois noms morts ; le second ne voit pas un nom
           qui *part*. Contre-essayés tous les deux — une publication morte ajoutée
           (les deux rougissent), une publication vivante retirée (seul le relevé figé
           rougit), et le relevé rendu incapable de lire `SORTIE_SAS` (le contrôle
           rapporte le refus au lieu de passer).

           La mesure du portail diffère d'une chose de celle du socle : **le portail
           démarre**. On pose `__oasisSessionPerdue` avant de charger quoi que ce soit —
           le drapeau par lequel le socle s'interdit de revenir deux fois à la connexion
           —, et la mesure n'a ainsi aucune session à ouvrir.

           ── Les quatorze pièces d'archive ──

           Chacune porte en tête le commit où elle a tourné vert pour la dernière fois,
           son nombre de comparaisons, ce qui prend le relais, et la commande pour la
           rejouer sur ce commit. Les douze refusent de s'exécuter — `exit(2)`, le même
           refus que la suite « taille » exige d'elles depuis 5.b.

           Deux s'étaient archivées **elles-mêmes**, avant toute décision :
           `comparer-portail.js` depuis 5.c et `comparer-socle.js` depuis la dernière
           conversion du socle, leur terme de comparaison ayant disparu avec le fichier
           qu'il mesurait. C'est la démonstration, faite avant la décision, de ce que la
           décision généralise.

           ── Un défaut trouvé en chemin, et **non corrigé ici** ──

           En vérifiant par quel chemin un module revient au portail : **MESURES et RAMP
           envoient `oasis:back-to-portal`, et l'hôte écoute `oasis:back-portal`** —
           `mes-app.js:505` et `ramp-app.js:1228` contre `modules-hote.ts:184`. Rien
           n'écoute ce type ; le message part et tombe, car un `postMessage` sans
           destinataire **ne lève pas**.

           *J'ai écrit ici que « leur bouton Retour au portail ne fait donc rien », et
           c'était faux — corrigé en 5.e.6, après mesure dans un navigateur. La
           conclusion avait été tirée du code sans ouvrir la page.*

           Corrigé en 5.e.6, avec les deux contrôles qui l'auraient dit.

       5.e.6 [x] **Le message qui tombait, et les deux contrôles qui n'existaient pas** —
           fait le 13 octobre 2026.

           Correction du défaut relevé en 5.e.5, et de ce que j'en avais dit.

           ── Ce que la mesure a démenti ──

           J'avais annoncé « le premier défaut visible par un utilisateur ». Mesuré dans
           un navigateur, sur les trois modules ouverts au compte : **`.btn-back-portal`
           est à 0, `.oasis-back-btn` à 1.** Le bouton de MESURES et de RAMP **n'est pas
           là.** `module-chrome.js` remplace le contenu de `.sidebar-header` par la marque
           OASIS, et un `MutationObserver` le refait à chaque rendu du module — le shell
           étant redessiné à chaque navigation, la chance de cliquer sur ce bouton est
           nulle.

           `mesRetourPortail` et `rampRetourPortail` étaient donc du **code mort portant
           un nom de message faux**, et non un bouton cassé. La différence n'est pas de
           détail : l'une se corrige, l'autre s'enlève, et surtout *ce n'était pas visible
           par un utilisateur*. Le défaut réel est d'une autre nature : deux fonctions et
           leur balisage que personne ne pouvait atteindre, et que rien ne disait.

           **Troisième fois en deux jours qu'une conclusion tirée du code seul s'est
           trouvée fausse à l'ouverture de la page** — après les deux écritures du relevé
           de surface. Le code dit ce qu'il est écrit ; il ne dit pas ce qui survit au
           rendu.

           ── Ce qui est corrigé ──

           Les deux envois prennent le nom que l'hôte écoute. Le code reste mort tant que
           la coquille des modules n'est pas reprise — c'est leur suite n° 0 —, mais un
           code mort qui mentirait au réveil est pire qu'un code mort.

           **Et cinq autres messages tombaient dans le vide**, relevés par le même
           contrôle : `mes:unauthenticated`, `pl:unauthenticated`, `exec:unauthenticated`,
           `ramp:unauthenticated`, `pr:unauthenticated`. Vestiges d'avant que l'enveloppe
           du socle ne reprenne le 401 à son compte — elle ramène la **fenêtre entière** à
           la connexion, ce qu'une redirection locale dans un cadre ne ferait pas. Les cinq
           sont retirés, le jet qui arrête le montage conservé.

           **Sept types envoyés sur douze n'avaient aucun écouteur.**

           ── Les deux contrôles, et ce que chacun voit ──

           · **`aucun module n'adresse au portail un message que rien n'écoute`** (suite
             « taille », statique). Un écran de module ne partage **rien** avec le
             portail : les six pages de module ne chargent aucun `/app/*.js`, et
             `postMessage` est la seule voie. Le contrôle relève les types envoyés et les
             types écoutés — **lus dans le code de l'écouteur**, égalités `data.type === …`
             et motifs `endsWith(…)`, non tenus dans une liste qui aurait divergé. Si
             aucun écouteur ne se lit, il **refuse** : un dépôt sans écouteur et un relevé
             aveugle se ressemblent.

             Il dit l'un et pas l'autre, et il faut le savoir : un **écouteur sans
             émetteur** n'est pas refusé. C'est l'erreur bénigne des deux, et l'exiger
             interdirait d'écrire l'hôte avant le module.

             Contre-essayé trois fois : le mauvais nom remis (rouge, avec le fichier et la
             ligne), un `:unauthenticated` remis (rouge), et l'écouteur réécrit de façon
             que le relevé ne le lise plus (rouge, par le refus).

           · **`le bouton « Retour au portail » du cadre ramène à l'accueil`** (suite
             « parcours », dans un navigateur). Il part du **clic**, non du message : le
             bouton que le socle pose dans la barre du module, `backToPortal()`, le
             `postMessage`, `brancherMessages()` qui l'écoute, et le plein écran défait.

             Le contrôle voisin — celui de 5.e.5 — part du message et n'éprouve que
             l'hôte. **Aucun n'éprouvait le côté socle**, et c'est ce trou qui a laissé
             passer un nom de message pendant des semaines.

             Contre-essayé en changeant d'un caractère le type qu'envoie `chrome.ts` :
             le contrôle du clic rougit, celui du message reste vert — et **le contrôle
             statique rougit aussi**, en nommant `frontend/socle/chrome.ts:235`. Les deux
             neufs mordent donc sur un nom faux, et c'est tant mieux ; mais ils ne mordent
             pas sur les mêmes défauts. Le statique ne voit que des chaînes : un bouton
             que le shell n'affiche plus, un observateur qui l'efface, un écouteur jamais
             atteint le laissent vert. *C'est précisément le défaut qu'il a fallu un
             navigateur pour établir ici — le bouton de MESURES n'est pas là, et aucune
             chaîne ne le dit.*

       5.e.7 [x] **La construction ne produit plus que ce qu'une page charge** — fait le
           14 octobre 2026.

           Conséquence directe de 5.e.5, et mesurée parce qu'elle avait été annoncée.

           **4 484 Ko en 38 fichiers deviennent 1 224 Ko en 8.** Trois mégaoctets et trente
           fichiers écrits à chaque construction, servis par `express.static`, embarqués
           dans l'image — et chargés par **aucune balise**.

           ── Pourquoi ils étaient là, et pourquoi personne ne l'a vu ──

           La construction écrivait **tout** fichier de `globales/` et de `pages/` comme un
           paquet autonome. C'était juste tant que la page les chargeait un à un. Depuis que
           le portail tient en un seul paquet (5.d.7), ses quinze sas n'avaient plus qu'un
           lecteur : les comparateurs, qui chargeaient `public/app/<nom>.js` pour opposer
           l'original au converti. La décision qui en a fait des pièces d'archive (5.e.5) a
           laissé ces quinze paquets sans emploi, et le rapport de 5.e.5 les a comptés.

           Rien ne l'avait dit avant, et c'est le point : *l'écart entre ce qui est construit
           et ce qui est chargé n'était regardé par aucun garde-fou.* Les deux étaient tenus
           séparément — la campagne vérifie que chaque balise est servie, et personne ne
           vérifiait l'inverse.

           ── Trois situations, déduites des pages et non déclarées ──

           | Situation | Ce que fait la construction |
           |---|---|
           | une balise `<script>` le charge | **construit** : c'est un point d'entrée |
           | un point d'entrée l'importe | **non construit à part**, et nommé dans la sortie |
           | ni l'un ni l'autre | **refus**, en le nommant |

           Le refus est le cœur du garde-fou, et non une précaution. Un sas orphelin est du
           code que *rien* n'atteint : ni la page, ni un autre paquet. Le sauter en silence,
           c'est écrire un fichier qui ne sert à rien et ne jamais le savoir — ce qui vient
           d'arriver, en plus discret.

           Et le construire à part quand un paquet chargé l'importe déjà ne serait pas
           seulement du poids : **ce serait une seconde copie de son état de module**, le
           défaut exact que 5.d.7 a corrigé après qu'un contrôle écrit pour autre chose
           l'eut nommé.

           ── La symétrie, qui couvre l'autre moitié du défaut ──

           Un second refus va de la page vers la source : **une balise qui demande un paquet
           que rien ne produit.** Un `<script src="/app/schemas.js">` laissé après la
           suppression du sas rend un **404 silencieux** — la page se charge, le script
           manque, et la moitié de l'écran ne répond plus sans une ligne d'erreur. La
           campagne le dit déjà, mais après coup, un serveur démarré ; ici c'est dit avant
           de construire quoi que ce soit.

           La vérification ne porte que sur les répertoires que cette construction écrit :
           `public/modules/<module>/js/*.js` est du JavaScript non converti, servi tel quel.

           ── Un écran est nommé, non refusé, et c'est délibéré ──

           Un écran en React dont aucune page ne charge le `main.js` est **construit quand
           même**, et la sortie le dit. La raison est pratique : un écran en cours de
           conversion existe légitimement avant que sa page ne pointe sur lui, et un refus
           gênerait le travail sans rien protéger. Un sas n'a pas cette excuse — il n'existe
           que pour être chargé ou importé.

           Deux règles pour deux objets, chacune justifiée par ce qui s'est produit : le
           poids mort venait des sas, et un écran orphelin ne s'est jamais vu.

           ── Contre-essais ──

           Trois, trois fois le comportement attendu :

           · un `globales/orphelin.ts` ajouté : la construction s'arrête en le nommant, avec
             le chemin qu'il aurait servi ;
           · une balise `/app/schemas.js` remise dans `index.html` : la construction
             s'arrête en la nommant ;
           · la balise de l'écran DROITS retirée de sa page : l'écran est **nommé et
             construit**, la construction se poursuit — ce qui est la règle écrite.

           **1 001 contrôles, code de sortie 0**, et la campagne construit avant d'éprouver :
           un refus de construction la fait échouer entière, ce qui est la place juste pour
           ces deux gardes.

       5.e.8 [x] **Le contrat du socle avec le shell des modules — écrit, et gardé des
           deux côtés** — fait le 14 octobre 2026.

           Il existait depuis le premier jour, **nulle part écrit et par rien vérifié**.
           Il a coûté deux boutons morts, et c'est 5.e.6 qui l'a mis au jour.

           ── Ce que le socle exige, et ce qu'il interdit ──

           `module-chrome.js` décore le shell de chaque module. Trois ancres :

           | Ancre | Ce que le socle en fait | Si elle manque |
           |---|---|---|
           | `.sidebar-header` | il en **remplace le contenu** par la marque OASIS | pas de marque |
           | `.btn-logout` | il le **remplace** par « Retour au portail » | **pas de retour au portail** |
           | `.header-left` | il y pose les super-menus et la zone d'actions | pas de super-menus |

           La deuxième est la conséquente : **un module qui cesserait de rendre son bouton
           de déconnexion perdrait le seul chemin vers le portail**, sans une erreur. Le
           bouton de déconnexion d'un module n'est donc pas un geste, c'est une *ancre* —
           et son `onclick` est, à dessein, inatteignable. Le chrome l'annonçait depuis
           5.b (« le bouton Retour au portail, à la place de Déconnexion ») ; ce qu'il ne
           disait pas, c'est que la page doit le rendre pour l'obtenir.

           Et ce que le socle interdit : rendre quoi que ce soit dans `.sidebar-header`,
           et nommer un bouton de retour au portail. MESURES et RAMP faisaient les deux.
           Les deux balisages et les deux fonctions (`mesRetourPortail`,
           `rampRetourPortail`, et leurs publications sur `window`) sont retirés.

           ── Deux contrôles, et le premier ne peut pas voir le défaut qui l'a motivé ──

           · **Dans un navigateur** (suite « frontend »), page de module par page de
             module — les six, là où la suite « parcours » n'en exerce qu'une :
             `.oasis-back-btn` présent, `.btn-back-portal` absent. Il mesure le
             **résultat**, non le mécanisme, et ne sait donc rien de la façon dont le
             shell est écrit.

             Contre-essayé en renommant `.btn-logout` dans RAMP : rouge, et le relevé dit
             `{"socle":0,"propre":0,"ancre":0}` — l'ancre manquante et le retour perdu
             dans la même ligne. *C'est le contrôle qui rend la deuxième ligne du contrat
             tenable.*

           · **De source** (suite « taille ») : aucun écran de module ne nomme
             `btn-back-portal`.

             Il existe parce que le premier **ne mord pas** sur le cas qui a tout
             déclenché. Contre-essai : un `.btn-back-portal` remis **dans**
             `.sidebar-header` laisse le contrôle du navigateur **vert** — le socle vide
             ce conteneur avant la mesure, et le bouton n'est dans aucun DOM observable.
             *Un contrôle du DOM ne peut pas voir un balisage que le DOM n'a jamais
             porté.* Le même bouton placé hors du conteneur est, lui, dénoncé.

             Le garde de source, contre-essayé sur ce même cas invisible : rouge, en
             nommant le fichier.

           Ni l'un ni l'autre suffisant, et pour la raison exacte qui en demande deux à la
           surface du portail (5.e.5) : l'un voit un bouton vivant rendu ailleurs, l'autre
           un balisage mort. Aucun des deux ne voit les deux.

           ── Un contre-essai que je n'avais pas prévu ──

           Ma première rédaction du commentaire expliquant le vide de `.sidebar-header`
           était un commentaire **HTML, posé dans un littéral de gabarit**, et il portait
           des accents graves. Les deux écrans ont cessé de se charger.

           Le contrôle neuf l'a dit dans la seconde, et il l'a dit juste :
           `{"socle":0,"propre":0,"ancre":0}` sur **exactement** les deux pages que je
           venais de toucher. Un contrôle qui attrape une faute commise en l'écrivant est
           la meilleure épreuve qu'il puisse passer.

       5.e.9 [x] **Les seize dettes de `window` rendues — 72 noms de surface deviennent
           61** — fait le 14 octobre 2026.

           Le relevé de 5.e.5 avait nommé dix-sept lectures que le portail faisait **sur
           lui-même** à travers `window` : la navigation, les cinq vues, le redessin de la
           configuration lu par huit fichiers, la langue courante, la session rechargée.
           Aucune n'était une interface ; toutes étaient l'empreinte de l'ordre dans lequel
           les fichiers avaient été écrits. L'une s'est révélée n'être qu'un import oublié
           (`PRIO_COLORS`, rendue le 13 octobre) ; les seize autres sont rendues ici.

           | Dette | Lecteurs | Ce qui la remplace |
           |---|---|---|
           | `renderConfig` | **huit** fichiers de configuration | `import { renderConfig } from './configuration'` |
           | `CURRENT_LANG` | cinq fichiers | `langueRetenue()`, de son définisseur |
           | les cinq vues | `demarrage.ts` | cinq imports, et `Object.assign` sans enveloppe |
           | `navigate` | `accueil.ts`, `modules-hote.ts` | `naviguer` |
           | `loadMe` | `parametres.ts`, `profil.ts` | `chargerMoi` |
           | `portailReinitialiserRecherche` | `configuration.ts`, `demarrage.ts` | un import |
           | `majBandeauInstance`, `moduleHostRegisterViews`, `orgTopLevelType`, `refreshNotifications` | un fichier chacun | un import |

           ── Les cycles sont réels, assumés, et éprouvés ──

           `configuration.ts` importe les sous-vues de sept fichiers, et chacun des sept
           redemande le redessin. Le cycle est **inévitable** : c'est la forme même d'un
           écran dont les parties se redessinent l'une l'autre.

           Il est sûr pour une raison précise, et non par chance : *aucun de ces noms n'est
           lu à l'initialisation d'un module.* Un cycle entre modules ES se résout par des
           liaisons vivantes ; ce qui casse, c'est un `const` lu avant que l'autre module
           ne soit initialisé, et il n'y en a aucun ici — tous ces appels partent d'un
           geste ou d'un gestionnaire.

           Écrit plutôt que supposé : **110 contrôles de la suite « parcours »**, dont les
           rondes complètes de la configuration (les onze sous-vues, l'instance créée puis
           supprimée, le référentiel créé, modifié, supprimé), passent sans un écart.

           ── Deux dettes **restent**, et pour deux raisons différentes ──

           · **`closeRefModal`**, lue par `barre.ts` et `organigramme.ts`. La décision est
             de 5.e.0 et elle tient : l'import en retour ferait un cycle qui *dirait faux
             sur ce qui dépend de quoi*. La vraie cause est que la fenêtre d'import et
             celles des référentiels **partagent la racine `cfgModalRoot`** ; elle se
             dénouera quand cette racine aura son module, et la publication tombera alors
             d'elle-même. Elle reste publiée de toute façon : quatre `onclick` l'appellent.
           · **`onLangChange`**, appelée par `applyLang` dans le sas des libellés. Ce n'est
             **pas** une dette mais une **couture** : `/app/i18n.js` est un paquet à part
             sur la page de connexion et celle des témoins, où `demarrage.ts` n'est pas
             chargé. L'import ferait entrer le portail entier dans un paquet que deux pages
             légères chargent. Le `typeof … === 'function'` qui la garde est donc exact.

           ── Une couture d'essai, déclarée là où elle se paie ──

           Onze publications partent. La douzième, `refreshNotifications`, **reste** — et
           c'est la première exception à la règle « un lecteur d'essai ne justifie rien ».

           La pastille des notifications ne se mesure pas par son geste : `notifBell`
           rafraîchit **puis masque** la pastille, si bien que le nombre qu'on veut lire
           n'est observable à aucun instant par le clic. Le contrôle appelle donc la
           fonction, et un contrôle dans un navigateur n'atteint pas autrement une fonction
           empaquetée.

           La forme de la déclaration compte : un commentaire `couture-essai : <raison>`
           **sur la ligne qui précède la publication**. Une liste de dispenses dans un
           fichier à part aurait pourri — on l'a vu avec les gestes non couverts, dont
           trois dispenses étaient devenues fausses sans que personne ne le sache. Ici la
           raison part avec la publication, et la campagne l'**imprime** à chaque passage.

           Sa limite est nommée : *ce mécanisme accepte par construction une déclaration
           fausse.* Elle est bornée par deux choses — la raison est à côté de ce qu'elle
           justifie, et le relevé figé de la surface nomme le nom de toute façon.
           Contre-essayé en retirant la déclaration : le contrôle rougit en nommant
           `app-demarrage.ts → refreshNotifications`.

           ── Ce qui part de la surface, et ce qu'il reste ──

           **81 noms mesurés dans un navigateur deviennent 70** : 61 publiés par un sas
           (dont une couture déclarée) et 9 d'état partagé que `etat.ts` pose depuis le
           module. Le relevé figé est refait, et il nomme les onze partants.

           Deux sas de plus n'avaient plus rien à publier : `globales/audit.ts` est
           supprimé ; `globales/modules-host.ts` **reste**, et c'est une distinction qui
           vaut d'être écrite — *un sas n'est pas seulement une publication.* Celui-ci porte
           deux **effets** : brancher l'écoute des messages des modules, et enregistrer les
           vues dès le chargement. La place d'un effet est hors du module qu'il concerne,
           et c'est la même règle que le socle suit pour `module-chrome`.

           ── Et une publication qui s'appelait elle-même ──

           La dernière ligne du sas des libellés appelait `window.applyTheme(…)`, c'est-à-
           dire la publication qu'il venait de poser deux lignes plus haut. Elle appelle la
           source. *Une publication n'est pas faite pour être relue par son auteur.*

       5.e.10 [x] **La racine partagée des fenêtres a son module — la dernière dette
           structurelle du portail** — fait le 14 octobre 2026.

           Le portail n'ouvre pas ses fenêtres modales dans un conteneur par écran : il en
           a **deux**, et deux seulement. `cfgModalRoot`, rendue par l'écran de
           configuration, reçoit le balisage que **quatre** fichiers y écrivent à tour de
           rôle — les référentiels, l'organigramme, les paramètres, la barre d'écran ;
           `userModalRoot` est celle des comptes.

           ── Une dette nommée cinq jours avant d'être payée ──

           La fermeture vivait dans `referentiels.ts`. `barre.ts` et `organigramme.ts` la
           lisaient donc sur `window`, parce que l'importer aurait fait un cycle :
           `referentiels.ts` importe déjà `searchInputHtml` et `exportBar` de `barre.ts`.

           La décision de 5.e.0 fut de laisser le prêt dans ce sens-là **et d'écrire la
           vraie cause** : *la fenêtre d'import et celles des référentiels partagent une
           racine que personne ne possède.* Elle est restée écrite cinq jours, et 5.e.9 l'a
           laissée debout en la nommant pour la seconde fois.

           **Le cycle ne disparaît pas par ruse** : il disparaît parce que la racine n'avait
           jamais appartenu au CRUD des référentiels. Elle appartient à l'écran, et les cinq
           fichiers en sont des usagers. C'est la leçon qu'il faut retenir du détour : *un
           cycle d'imports n'est presque jamais un problème d'imports.* Il dit qu'une chose
           partagée n'a pas de propriétaire, et la nommer prend une minute là où la
           contourner prend une heure.

           ── Ce que le module apporte, et que l'ancien code ne pouvait pas avoir ──

           Dix requêtes s'écrivaient `document.querySelector('#cfgModalRoot …')` ou
           `('#userModalRoot …')`, l'identifiant répété dans autant de chaînes. **Une faute
           de frappe y rendait `null` sans un mot** — et le champ lu revenait vide, ce qui
           est le défaut que ce dépôt redoute le plus.

           Les deux racines sont désormais un **type** : `type Racine = 'cfgModalRoot' |
           'userModalRoot'`. Contre-essayé deux fois, et le compilateur refuse les deux :
           `ouvrir('cfgModalRoott', …)` et `dans('userModalRootX', …)` ne compilent plus.

           *Un contre-essai qui ne compile pas est d'ordinaire un contre-essai absent* —
           c'est la règle de 5.e.4. Ici le refus de compiler **est** le contrôle : ce que
           la garde affirme est précisément qu'une racine inventée n'atteint plus le
           navigateur. La distinction tient à ce qui est affirmé, non à l'outil.

           ── Deux conduites devant une racine absente, et elles restent deux ──

           | Geste | Racine absente | Décision |
           |---|---|---|
           | **ouvrir** une fenêtre de configuration | on renonce en silence | 5.d.1 |
           | **ouvrir** une fenêtre de comptes | on **lève**, en nommant la cause | 5.e.1 |
           | **refermer** l'une ou l'autre | on renonce en silence | *refermer une fenêtre qui n'est pas là n'est pas une erreur* |

           Les unifier serait un **changement de comportement**, et un changement ne se
           décide pas au passage d'un déplacement de code. Les deux conduites vivent donc
           côte à côte dans le module, chacune avec sa fonction et sa raison.

           **Et la divergence n'est pas couverte, il faut le dire** : rien n'éprouve que
           l'ouverture d'une fenêtre de comptes lève quand sa racine manque. Le geste n'est
           plus atteignable depuis un navigateur — `showNewUserModal` a quitté la surface
           en 5.e.5 —, et fabriquer un contrôle qui ne mesurerait que son propre montage
           serait pire que l'absence. Elle est nommée ici, et c'est tout ce qu'on peut en
           dire honnêtement aujourd'hui.

           ── La surface est **inchangée**, et c'est la preuve ──

           `closeRefModal` reste publié, sous le même nom, par un sas neuf — *le sas qui
           publie un nom est celui de son définisseur*, règle de 5.b. Les 70 noms du relevé
           figé sont les mêmes, aux types près : le contrôle de surface est passé **sans
           que le relevé soit refait**. Un refactoring qui changerait la surface ne serait
           pas un refactoring.

           ── Les cycles du portail, mesurés ──

           **Douze cycles de deux fichiers.** Dix sont ceux de 5.e.9, assumés et éprouvés —
           `configuration.ts` avec chacun de ses sept écrans, `demarrage.ts` avec trois de
           ses vues. Deux sont les tables de traduction, qui se lisent l'une l'autre depuis
           5.c. **`barre.ts ↔ referentiels.ts` n'y est plus** : c'est le seul qui n'était
           pas voulu, et c'est celui que cette étape dissout.

           ── Et un contrôle à moi qui ne tombait que sous charge ──

           La campagne entière est tombée **deux fois** sur le contrôle du bouton de retour
           écrit en 5.e.8 : « Attempted to use detached Frame », puis « Target closed ».
           Lancé seul, le même contrôle passait — quatre fois.

           La cause n'était pas dans le code mesuré, elle était dans la mesure :
           l'hôte des modules **remplace** l'élément `#prFrame` quand il redessine, et le
           contrôle gardait le cadre obtenu quelques secondes plus tôt. Sous charge, la
           fenêtre entre les deux s'ouvrait ; seul, la machine était trop rapide pour
           qu'elle s'ouvre.

           *Un contrôle qui ne tombe que sous charge tombera un jour en intégration
           continue, pour une raison qu'on n'aura plus sous la main.* Le cadre se reprend
           désormais à l'instant de s'en servir, aux **deux** endroits qui l'emploient — le
           premier n'était pas tombé, et il avait exactement la même fragilité.

           C'est la quatrième fois en trois jours qu'un montage de preuve est la cause d'un
           rouge, et la première où c'est la *charge de la machine* qui le révèle. Un
           contrôle lancé seul n'est pas un contrôle éprouvé.

   5.f [~] **Les cinq écrans de module.** 55 893 lignes de JavaScript, par poids : SURV
       (23 731), RAMP (12 470), PR (7 315), CARE (6 428), PLAN (5 949). Chacun commence par
       sa **suite n° 0** : *mesurer avant de réécrire*, la règle qui a tenu tout le portail.

       Trois temps par écran, et l'ordre compte : **0.a** relever ses gestes et figer le
       dénominateur ; **0.b** l'ouvrir dans un navigateur et mesurer ce que cela couvre ;
       **0.c** couvrir ses écritures, une ronde à la fois. C'est l'ordre qui a porté le
       portail de 14 gestes couverts à 66, et chacun des trois a trouvé des défauts que le
       précédent n'avait pas pu voir.

       5.f.0 [x] **SURV — le relevé de ses gestes, et trois défauts de l'instrument qu'un
           écran de cette taille a révélés** — fait le 14 octobre 2026.

           **503 occurrences, 310 gestes nommés, 0 exercé.** C'est le dénominateur, figé
           avant qu'une ligne soit réécrite — la leçon du portail, dont le premier relevé
           annonçait quarante gestes là où il y en avait cent vingt et un.

           | | |
           |---|---|
           | Fichiers relevés | 25 (`exec-*.js` + `index.html`) |
           | Occurrences | **503** — 495 en ligne, 6 écouteurs, 2 en propriété |
           | Gestes nommés | **310** — 269 noms de fonction (256 préfixés `exec`), 41 expressions |
           | Exercés par un navigateur | **0** |
           | Indécidables | 5 écouteurs dont la cible n'est pas nommable |
           | Les plus chargés | `exec-activites.js` 69, `exec-parametres.js` 61, `exec-constatations.js` 60 |

           ── Pourquoi zéro, et ce que ce zéro dit ──

           **Aucun des cinq écrans de module n'a de suite de navigateur.** Leurs 588
           contrôles passent par HTTP : ils éprouvent le serveur *derrière* l'écran, non
           les gestes de l'écran. Seules deux suites ouvrent un navigateur, et toutes deux
           portent sur le portail et le socle.

           Ce zéro n'est donc pas une négligence de ce jalon : c'est l'état qu'il **mesure
           pour la première fois**. Jusqu'ici personne ne pouvait dire combien de gestes
           SURV porte, ni lesquels.

           ── Une dispense d'écran, et pourquoi elle n'est pas un trou ──

           Le garde-fou de 5.c.0 exige qu'un geste non exercé soit **déclaré avec sa
           raison**. Trois cent cinq dispenses produiraient une liste que personne ne
           relirait — l'inverse de ce que ce garde-fou cherche.

           Un écran peut donc déclarer `_aucun_parcours` : une phrase, une fois. Elle tient
           pour deux raisons, et il a fallu corriger la première :

           · **le chiffre est imprimé** à chaque campagne — `gestes de « execution » :
             0/310 exercés, 503 occurrences, 5 indécidable(s)`. *Cette justification était
             fausse quand je l'ai écrite* : `verifier` n'imprime son détail qu'en cas
             d'échec, et une campagne verte ne montrait rien. Trouvé en relisant la sortie
             pour vérifier ce que je venais d'affirmer. Une couverture qu'on ne voit que
             lorsqu'elle tombe n'est pas une couverture suivie ;
           · **la dispense périme d'elle-même** : qu'un seul geste de cet écran devienne
             exercé, et le garde-fou le dit. Contre-essayé en marquant un geste exercé dans
             le relevé figé : rouge, en le nommant.

           Contre-essayé aussi en retirant la déclaration : rouge, **305 gestes sans
           motif**.

           ── Trois défauts de l'instrument, qu'un écran de 1 192 lignes n'avait pas
              révélés ──

           C'est le vrai produit de cette étape. `relever-gestes.js` a servi six jalons sur
           le portail ; SURV l'a mis en défaut trois fois.

           1. **Un gestionnaire qui n'est qu'une garde** — `onclick="event.stopPropagation();"`
              — rendait un nom **vide** : la garde était ôtée, et il ne restait rien. Quatre
              gestes de SURV étaient sans nom, donc sans existence dans un relevé qui
              compte par nom.
           2. **Un gestionnaire qui commence par une affectation** —
              `onchange="EXEC_STATE.filters.domaine=this.value;execRenderPage()"` — était
              nommé par ses quarante-huit premiers caractères. Vingt-cinq gestes portaient
              un fragment de code pour nom, et **deux fragments ne différant que par une
              interpolation comptaient pour deux gestes** là où il n'y a qu'un réglage. Le
              nom est désormais la cible de l'affectation, interpolations normalisées : le
              même réglage ne compte plus deux fois. Dix noms de moins, et quarante et un
              noms lisibles au lieu de fragments.
           3. **`on<événement> =` dans du JavaScript n'est pas un attribut.** Le portail en
              portait déjà la trace, et personne ne l'avait lue : son relevé figé contenait
              le geste `onchange="orgTypeChanged()"` — **un nom qui n'existe pas**, tiré de
              `let onchange = f.k === 'est_inspecteur' ? ' onchange="…"' : ''`. Un attribut
              s'écrit sans espace avant son `=` ; une affectation en porte toujours un.

           Le troisième laisse une dette que le dépôt n'avait pas : l'extracteur **dépend
           désormais d'une hypothèse de forme**. Un attribut écrit `onclick = "x()"` serait
           ignoré du relevé, donc absent du dénominateur, donc jamais à couvrir — la
           défaillance silencieuse dans le sens flatteur. D'où un garde-fou neuf, qui relit
           tout `public/` et tout `frontend/` : **aucun attribut de gestionnaire n'a
           d'espace avant son `=`**. Contre-essayé en en écrivant un : rouge.

           ── Ce que les deux instruments ne voient pas pareil ──

           Mesuré pour la première fois : les 57 noms que `relever-surface.js` tient pour
           des gestes du portail, contre les 84 du relevé des gestes. **Trois diffèrent**,
           et chacun pour une raison :

           · `exportPdf` et `exportPdfActivites` sont vus par la surface et **pas** par le
             relevé des gestes. Leur attribut ne porte qu'une interpolation
             (`onclick="${pdf}"`), et le nom de la fonction est ailleurs — c'est l'angle
             mort nommé en 5.e.5, qui avait failli coûter deux boutons d'export ;
           · `orgTypeChanged` différait par son **nom**, celui du relevé étant le faux nom
             du défaut n° 3 ci-dessus.

           Le premier cas reste. Un critère « toute chaîne qui est un appel » a été
           prototypé : sur le portail, il rend 64 noms dont **une vingtaine de faux** —
           `rotate(45deg)` d'une transformation CSS, `var(--x)` d'une feuille de style,
           `Number(…)` d'un calcul. Un dénominateur gonflé de 30 % de bruit est pire qu'un
           dénominateur qui manque deux gestes **nommés**, et les deux manquants sont
           gardés par l'autre instrument. Le choix est donc écrit, non subi.

       5.f.1 [x] **SURV ouvert dans un navigateur — un écran, une suite** — fait le
           14 octobre 2026.

           `tests/smoke/surv.smoke.js`, **douze contrôles**. L'écran se monte, ses sept
           pages se parcourent **par de vrais clics**, chacune se remplit, elles diffèrent,
           aucune ne déborde, et la console reste muette.

           **La couverture des gestes de SURV passe de 0 à 1 sur 310.** Un, et c'est la
           vérité : les sept boutons de la barre appellent tous `execNavigateTo`. Les 309
           autres gestes vivent *dans* les pages — boutons de table, volets, fenêtres — et
           ce sont les rondes d'écriture de la suite n° 0.c qui les atteindront, une par
           une, chacune avec l'assertion du résultat **en base** et le retour en arrière.

           ── Une suite à part, et non des contrôles de plus dans « parcours » ──

           `parcours.smoke.js` porte 3 200 lignes et 110 contrôles, tous sur le portail. Y
           ajouter un second écran ferait un fichier que personne ne lirait.
           **Un écran, une suite** — et c'est aussi ce qui permet au relevé des gestes de
           lancer *la suite de l'écran qu'il mesure* : `ECRANS` porte désormais le nom de
           la suite, là où l'outil lançait `parcours` en dur.

           Sans ce changement, mesurer SURV aurait rendu **zéro** : un zéro de la mesure,
           non de l'écran, et impossible à distinguer du vrai. C'est la même faute que la
           première version de l'outil, qui *rejouait* le parcours au lieu de l'instrumenter.

           ── Ce que la mesure a précédé l'écriture ──

           Les sept pages ont été ouvertes à la main **avant** qu'une assertion soit
           écrite : contenu de 759 à 3 873 caractères, aucun débordement, aucun incident de
           console. Les seuils de la suite viennent de là.

           ── Le contrôle qui ne se fie pas à une liste ──

           « La barre porte exactement les pages que la source déclare » lit `EXEC_NAV`
           **dans `exec-app.js`** et la compare au DOM. Une liste tenue dans la suite aurait
           divergé au premier ajout, et le contrôle aurait alors mesuré sa propre liste.
           Il **refuse** si la table ne se lit plus : une table illisible et un écran sans
           pages se ressemblent.

           ── Un contre-essai qui ne mesurait rien, et ce qu'il a fallu pour qu'il morde ──

           Premier essai : retirer `rapports` d'`EXEC_NAV`. **Vert** — la source et le DOM
           perdaient la page ensemble, donc ils concordaient toujours. Le contrôle compare
           deux choses ; les changer toutes les deux ne l'éprouve pas.

           Second essai, celui qui vise le défaut réel — *une page que la source déclare et
           que la barre ne rend pas* : un `continue` dans la boucle de rendu. **Rouge**, en
           nommant `rapports`. Et le refus de lecture, contre-essayé en renommant la
           table : rouge, par le refus.

           ── La dispense d'écran devient une **couverture déclarée** ──

           Le mécanisme écrit le matin déclarait `_aucun_parcours` — une phrase, sans
           chiffre. **Il est devenu faux le jour même**, dès que la suite de SURV a couvert
           son premier geste ; et il n'aurait rien dit si la couverture avait *baissé*.

           Un écran déclare désormais `_couverture_declaree: <n>`, et le garde-fou exige que
           le nombre déclaré **soit** le nombre mesuré. Une dispense cesse d'être une phrase
           vague pour devenir une mesure figée, qui rougit dans les deux sens.
           Contre-essayé des deux côtés : couverture montée à 3 (rouge, « déclarée 1,
           mesurée 3 »), couverture ramenée à 0 (rouge, « déclarée 1, mesurée 0 »).

           *Une dispense sans chiffre ne se vérifie pas.* C'est la leçon, et elle vaut pour
           les quatre écrans qui suivent.

       5.f.2 [x] **SURV — quatre pages que rien n'ouvre, trouvées en cherchant par où
           couvrir la cinquième** — fait le 14 octobre 2026.

           La suite n° 0.c devait couvrir les écritures de SURV, en commençant par
           `exec-activites.js` — **69 occurrences, le fichier le plus chargé de l'écran**.
           Elle a buté sur une chose qu'aucune lecture n'avait dite.

           ── Ce que la mesure a trouvé, et dans quel ordre ──

           1. **Le bac n'a aucun dossier.** `/api/m/execution/dossiers` rend une liste
              vide : le tableau des activités n'affiche que ses deux boutons, et ses 69
              gestes ne sont pas atteignables faute de données. *Un contre-essai qui ne
              mord pas dit que les données n'exercent pas le code* — la leçon est du
              portail, et elle valait encore ici.
           2. **La chaîne de données a été construite** dans le navigateur, par l'API, sur
              la recette de la suite HTTP : plan validé → notification → soumission →
              validation → envoi → accord. Le dossier est créé, l'API le confirme
              (`dossier_28a5bf42`, statut `ouvert`).
           3. **Le tableau reste vide**, même après rechargement complet de la page.
           4. En cherchant pourquoi : *le tableau des activités n'est pas une page du
              menu.* L'aiguillage de `execRenderPage` porte **treize** cas, les deux tables
              de navigation en offrent **neuf**, et **quatre pages ne sont atteignables par
              rien** — ni par un menu, ni par un appel de `execNavigateTo`, ni par une
              ancre d'URL.

           | Page sans chemin | Ce qu'elle rend |
           |---|---|
           | `execution` | le tableau des dossiers d'activité — **69 occurrences de geste** |
           | `prestataires` | le suivi par prestataire, et trois boutons vers le volet de dossier |
           | `declenchement` | le déclenchement d'une activité |
           | `prestataire_home` | l'accueil de l'espace prestataire — `EXEC_NAV_PRESTATAIRE` ouvre `dashboard` à sa place |

           ── Ce que cela ne dit pas ──

           **Le volet de dossier, lui, est atteignable.** `execOpenDossierSlider` est appelé
           par la page « Constatations » (`exec-constatations.js:133`) et par le tableau de
           bord (`exec-dashboard.js:1416`), toutes deux au menu. C'est la **table** qui est
           sans chemin, non le volet qu'elle ouvrait — et la suite n° 0.c passera donc par
           les constatations.

           Il a fallu le vérifier avant de l'écrire : conclure « 69 gestes morts » de la
           seule mort de la page aurait été faux, et dans le sens qui arrange.

           ── Pourquoi ce n'est pas à la conversion d'en décider ──

           Une page que l'aiguillage sait rendre et qu'aucun chemin n'ouvre est soit **un
           écran oublié d'un menu**, soit **du code mort**. Les deux se corrigent, et pas de
           la même façon : l'un est une ligne à ajouter dans `EXEC_NAV`, l'autre quelques
           centaines de lignes à retirer. *C'est une question de maîtrise d'ouvrage, et une
           conversion qui tranche à sa place se trompe une fois sur deux.*

           Les quatre sont donc **déclarées** dans la suite, avec ce que la mesure dit de
           chacune, et un contrôle neuf les tient : **« toute page de SURV est atteignable,
           ou déclarée sans chemin »**. L'aiguillage et les deux tables de navigation sont
           lus **dans la source** — une liste tenue dans la suite aurait divergé au premier
           ajout.

           Contre-essayé des deux côtés, comme toute déclaration de ce dépôt :

           · un `case 'orpheline'` ajouté à l'aiguillage : rouge, « sans chemin et non
             déclarée : orpheline » ;
           · `declenchement` ajouté à `EXEC_NAV` : rouge, « déclaration périmée ». Une page
             qui retrouve un chemin doit faire rougir autant qu'une page qui en perd un.

           Et le refus de lecture, pour que le contrôle ne passe pas en aveugle : si
           l'aiguillage ou les tables ne se lisent plus, il refuse au lieu de rendre vert.

           ── Et un rouge de la campagne qui ne venait pas de la campagne ──

           Le premier passage complet a rendu **1 017 contrôles verts et un code 1** :
           *« LES DONNÉES DE TRAVAIL ONT ÉTÉ MODIFIÉES PAR LES CONTRÔLES »*. Cinq fichiers
           de `data/`, dont une ligne de plus dans `audit.jsonl`.

           Ce n'était pas la campagne. Un serveur tournait sur le **vrai** répertoire de
           données, démarré à `18:23:00.164Z` ; l'entrée ajoutée au journal est son propre
           relevé de démarrage, `HORLOGE_NON_VERIFIEE`, horodaté **17 millisecondes plus
           tard**. Le `.verrou` du répertoire le nomme : PID 16692, cette machine, même
           seconde.

           Vérifié avant de conclure quoi que ce soit : **la chaîne du journal est
           intacte** — le `prevHash` de l'entrée nouvelle est exactement le `hash` de la
           précédente. Et la suite SURV lancée seule, empreinte de `data/` prise avant et
           après : **aucune modification**. Le second passage complet est vert, code 0.

           Le garde-fou a donc dit vrai sur le monde et faux sur la campagne, et les deux
           moitiés comptent : *il a vu une écriture dans les données de travail, ce pour
           quoi il existe*, et il ne pouvait pas savoir qu'elle venait d'ailleurs. Son
           message dirige vers `tests/smoke/bac.js` — la cause connue — là où la cause
           était un serveur voisin. C'est une **suite** à écrire : nommer le tenant du
           `.verrou` dans ce message, puisque le fichier le dit.

       5.f.3 [x] **SURV — la ronde du dossier, et une mesure qui se trompait en sa
           défaveur** — fait le 14 octobre 2026.

           La suite de SURV passe de treize à **dix-huit contrôles**, et sa couverture de
           gestes de **1 à 6 sur 310**.

           ── La ronde, et les trois obstacles qu'il a fallu mesurer pour l'écrire ──

           Elle construit son régime, l'exerce, et ne laisse rien :

           1. la chaîne par l'API — plan validé, notification, soumission, validation,
              envoi, accord — puis une constatation sur le dossier ouvert ;
           2. l'écran rechargé, la page « Constatations », le sous-onglet
              « En Préparation » ;
           3. le bouton du dossier, son volet, une étape commandée, le volet refermé ;
           4. la constatation effacée **par son propre geste**, confirmation pressée, et
              son absence vérifiée **auprès du serveur** ;
           5. le dossier supprimé — ce qui emporte sa notification.

           Chaque obstacle a coûté une mesure, et aucun ne se lisait dans le code :

           · **le bac n'a aucun dossier** — la ronde fabrique donc son régime (5.f.2) ;
           · **le tableau des dossiers n'est atteignable par rien** — elle passe par les
             constatations, où le volet s'ouvre (5.f.2) ;
           · **la page des constatations a trois sous-onglets**, et son défaut est
             « Suivi » ; une constatation en brouillon est dans « En Préparation ». La
             première écriture de la ronde mesurait une table vide avec une constatation
             bien créée.

           ── Le nettoyage mesuré plutôt qu'écrit ──

           Le premier jet supprimait le dossier **puis** la notification, et le second
           appel rendait 404. La console disait « Failed to load resource » **sans
           l'adresse** : il a fallu instrumenter les réponses pour savoir lequel. La suite
           relève désormais code et adresse de toute réponse ≥ 400, ce qui rend un incident
           actionnable au lieu d'énigmatique.

           La cause : *la suppression d'un dossier emporte sa notification et ses
           échanges* — « l'activité redevient à notifier », écrit dans la route elle-même.
           Le contrôle **vérifie la cascade** au lieu de la refaire. *Un nettoyage écrit
           sans être mesuré ajoute du bruit, et le bruit cache les vrais incidents.*

           ── Et une mesure qui se trompait en sa défaveur ──

           Après la ronde, la couverture annonçait **5** et non 6. Le sous-onglet des
           constatations, cliqué, comptait pour non exercé.

           La cause est de ma main, et de la veille : les trois règles de nommage ajoutées
           en 5.f.0 — la garde seule, la cible d'une affectation, les interpolations
           normalisées — n'avaient été appliquées **que d'un côté**. L'extracteur relevait
           le geste sous le nom `EXEC_STATE.currentConstSub` ; le rapprochement avec le
           journal du mouchard le nommait `execRenderPage`, par l'ancienne règle. Les deux
           ne pouvaient plus se rencontrer.

           *Une mesure qui se trompe en sa défaveur ne se fait pas remarquer* — c'est
           pourquoi celle-ci pouvait durer : elle sous-estimait la couverture, et une
           couverture basse n'alerte personne. Les deux côtés appellent désormais la même
           fonction. Vérifié sur le portail : **66/84 inchangé** — l'écart ne touchait que
           les gestionnaires en affectation, que le portail n'a pas.

           C'est la troisième fois en deux jours que deux moitiés d'un même instrument
           divergent : le relevé de surface contre le relevé des gestes (5.f.0), le DOM
           contre la source (5.e.8), et ici le relevé contre son propre rapprochement.
           **Un instrument en deux moitiés doit avoir une seule règle, écrite une fois.**

       5.f.4 [x] **SURV — le volet du dossier, geste par geste : 6 gestes couverts
           deviennent 14** — fait le 14 octobre 2026.

           La suite de SURV passe de dix-huit à **vingt-quatre contrôles**. La ronde entre
           dans le volet et y exerce ce qu'un inspecteur y fait.

           | Geste | Ce que le contrôle vérifie |
           |---|---|
           | `execSwitchDossierStep` | passer à « Notification » **redessine** le volet, et le retour le redessine |
           | `execAddRealisationEquipeMember` | un sélecteur d'inspecteur de plus |
           | `execAddRealisationProgrammeLine` | le message « aucune ligne » part, une ligne de saisie paraît |
           | `execOpenChecklistsPicker` + `shellCloseModal` | la fenêtre s'ouvre **et** se referme |
           | `execSaveRealisation` | l'équipe enregistrée, **relue chez le serveur** |
           | `execCloseSlider` | le volet part du document |
           | `execToggleSidebar` | replie **et** déplie |
           | `EXEC_STATE.filters.trimestre` + `execResetFilters` | la table se restreint, et revient |

           **Quatorze gestes nommés sur 310.** Le reste vit dans les étapes que la ronde
           n'ouvre pas encore — rapport, transmission, clôture, checklists remplies — et 69
           sur une page qu'aucun chemin n'ouvre (5.f.2).

           ── Trois sélecteurs qui ne mesuraient rien, et un qui mesurait trop ──

           Rien de cette séquence n'a pu s'écrire par lecture du code. Chaque sélecteur
           vient d'une mesure, et quatre étaient faux au premier jet :

           · `[class*="slider"]` pour le corps du volet : **zéro**. C'est `#execSlider`.
             Un contrôle qui aurait passé en ne regardant rien ;
           · `.real-prog-objet` pour les lignes de programme : **zéro**. La table est
             `#realisation_programme_table` ;
           · compter les lignes du programme : **1 avant, 1 après** sur un geste qui
             marche. La table porte déjà la ligne du message « aucune ligne », et le geste
             la **remplace**. Ce qu'on mesure est donc le départ du message et l'arrivée
             des champs de saisie ;
           · comparer le `className` entier de la barre latérale : **rouge** sur un geste
             qui marche. La chaîne de départ portait une espace de fin que le redessin ne
             remet pas. *Une assertion sur une chaîne entière mesure aussi ce qui n'a pas
             de sens* — on lit la classe qui porte l'état.

           Les deux derniers sont du même genre que les trois instruments divergents des
           jalons précédents, en plus petit : **l'assertion doit viser la propriété qui
           compte, jamais sa représentation.**

           ── L'écriture, et pourquoi elle est sûre ──

           `execSaveRealisation` écrit vraiment : l'équipe part dans le dossier. Le
           contrôle **redemande le dossier au serveur** et y cherche le nom de
           l'inspecteur choisi — *ce que l'écran montre doit être ce qui est enregistré,
           non ce qu'il espère.*

           Et elle se défait d'elle-même : la ronde supprime le dossier à la fin, ce qui
           emporte la notification. Le bac est une copie jetable, mais un contrôle qui
           laisse un reste fait échouer le suivant pour une raison qui n'est pas la sienne.

           `execCloseRealisation` est **laissé de côté**, et c'est écrit : il clôt l'étape
           et fait avancer le dossier, ce qui peut empêcher sa suppression — une ronde dont
           le ménage dépend de l'état qu'elle vient de changer n'est pas une ronde.

       5.f.5 [x] **SURV — le dossier parcourt son cycle : 14 gestes couverts deviennent
           18** — fait le 14 octobre 2026.

           Vingt-sept contrôles. La ronde ne s'arrête plus à la réalisation : elle **clôt
           le terrain**, rédige, et **soumet le dossier**.

           | Geste | Ce que le contrôle vérifie |
           |---|---|
           | `execCloseRealisation` | confirmation pressée, le dossier passe à « redaction » — **trois** étapes offertes |
           | `execAddAnnexeBlock` | un bloc d'annexe paraît |
           | `execSaveDossier` | l'objet de l'activité rédigé, **relu en base** |
           | `execSubmitDossier` | confirmation pressée ; en base, statut `soumis` et étape `validation` |

           ── La prudence de 5.f.4 était juste, et la mesure la lève ──

           `execCloseRealisation` avait été **laissé de côté** la veille, et c'était écrit :
           *une ronde dont le ménage dépend de l'état qu'elle vient de changer n'est pas une
           ronde.*

           Mesuré avant d'écrire une assertion, et dans cet ordre : terrain clos → étape
           `redaction` ; soumis → statut `soumis`, étape `validation` ; **et le dossier
           reste supprimable dans les deux états** (200), sa constatation aussi. Le ménage
           de la ronde tient donc sur tout le cycle qu'elle parcourt.

           Ce n'était écrit nulle part et aucune suite ne l'avait éprouvé : la suite HTTP
           mène le même cycle, mais elle clôt et archive — elle ne supprime jamais. *La
           réversibilité d'un cycle d'autorité est une propriété qu'on vérifie, pas qu'on
           suppose.*

           ── Ce qui est relevé et **non** exercé, et pourquoi c'est un contrôle ──

           À l'étape « Validation », le volet offre `execValidateRapport`,
           `execReturnDossier` et `execPreviewRapport`. La ronde ne les presse pas : valider
           ou renvoyer un rapport engage le cycle au-delà de ce qu'elle sait défaire.

           Mais elle **vérifie qu'ils sont là**, et c'est un contrôle à part entière : le
           jour où l'un disparaîtra de cette étape, la suite le dira, et la suite n° 0.d
           saura où reprendre. *Relever ce qu'on ne couvre pas encore vaut mieux que de
           l'ignorer, et bien mieux que de le couvrir à moitié.*

           ── Une assertion qu'il a fallu ne pas écrire — et qui était écrite à tort ──

           La suite HTTP affirme qu'un **rapport v1** naît à la soumission. La ronde a donc
           voulu l'asserter, et la mesure a rendu une liste **vide** pour ce dossier. J'en
           ai conclu que « le geste de l'écran ne passe pas par la même route que la suite
           HTTP », et renoncé à l'assertion.

           **Cette conclusion était fausse** — corrigée en 5.f.6 le même jour. Le geste
           appelle bien `PUT /dossiers/:id/submit`, le rapport naît, et il est visible. La
           liste était vide pour une raison de mon fait : *mon relevé interrogeait
           `/rapports` **après** avoir supprimé le dossier*, et supprimer un dossier
           emporte ses rapports.

           La maxime écrite ici — « reprendre l'affirmation d'une autre suite sans la
           mesurer chez soi, c'est hériter d'une vérité qui n'est pas la sienne » — est
           juste, mais elle ne s'appliquait pas : ce n'était pas une vérité héritée, c'était
           **ma mesure qui regardait après le ménage**. Le bon enseignement est ailleurs, et
           il est plus simple : *l'ordre d'un relevé fait partie du relevé.*

       5.f.6 [x] **SURV — le rapport, le renvoi, et une conclusion de la veille à
           corriger** — fait le 14 octobre 2026.

           Vingt-neuf contrôles ; **19 gestes couverts sur 310**.

           ── La correction, d'abord ──

           5.f.5 affirmait que le geste de soumission « ne passe pas par la même route que
           la suite HTTP », au motif que la liste des rapports était revenue vide.
           **C'était faux.** Le geste appelle bien `PUT /dossiers/:id/submit`, et le
           rapport naît : `RAP-2026-001-v1`, statut `soumis`, version 1.

           La liste était vide pour une raison de mon fait : *le relevé interrogeait
           `/rapports` **après** avoir supprimé le dossier*, et la suppression d'un dossier
           emporte ses rapports — la cascade que 5.f.3 avait justement mesurée pour les
           notifications. J'avais écrit une conclusion sur le code à partir d'un relevé mal
           ordonné.

           *L'ordre d'un relevé fait partie du relevé.* La maxime inscrite en 5.f.5 — ne
           pas hériter de la vérité d'une autre suite — reste juste, mais elle ne
           s'appliquait pas ici, et une leçon tirée d'un diagnostic faux est une leçon qui
           trompera la prochaine fois.

           ── Les deux contrôles que la correction permet ──

           | Contrôle | Ce qu'il vérifie |
           |---|---|
           | `la soumission fait naître un rapport « v1 » soumis` | un rapport, un seul, pour ce dossier : version 1, statut `soumis`, référence en `-v1` |
           | `effacer le dossier emporte sa notification **et son rapport**` | la cascade complète, cette fois interrogée dans le bon ordre |

           La seconde est l'assertion même dont l'absence avait masqué l'erreur : elle fait
           désormais du ménage une **propriété vérifiée**, et non une opération de confort.

           ── Le renvoi, exercé ; la validation, non ──

           Des trois gestes de l'étape « Validation », la ronde exerce `execReturnDossier` :
           il ramène le dossier à la rédaction, d'où la soumission l'avait tiré, et la
           soumission est déjà éprouvée. Le contrôle vérifie **en base** que l'étape est
           revenue à `redaction`.

           `execValidateRapport` reste relevé et non exercé, et c'est écrit : valider
           avance le rapport vers la transmission et les suites de « Mesures d'Application »
           — un état dont la réversibilité n'est **pas** mesurée. *On n'exerce pas un geste
           dont on ne sait pas défaire l'effet ; on le relève, et on dit pourquoi.*

       5.f.7 [x] **SURV — la validation du rapport, mesurée réversible avant d'être
           exercée** — fait le 14 octobre 2026.

           Trente contrôles ; **20 gestes couverts sur 310**. La ronde fait désormais le
           cycle entier : soumise, renvoyée, resoumise, validée.

           ── La mesure qui a levé le verrou ──

           5.f.5 et 5.f.6 avaient écarté `execValidateRapport` faute de savoir si son effet
           se défaisait. La question a été posée au système, à trois paliers et sur **trois
           dossiers distincts** — un palier ne se mesure pas sur un dossier qu'on vient de
           détruire :

           | Palier | Suppression du dossier |
           |---|---|
           | rapport **soumis** | 200 |
           | rapport **validé** | **200** — le verrou tombe |
           | rapport **transmis** | la transmission elle-même refuse (400) : non mesuré *(élucidé et mesuré en 5.f.8 : 200)* |
           | dossier **clôturé** | non mesuré — le jeu d'essai n'a pas de troisième activité *(mesuré en 5.f.8 : 200)* |

           Validé, le dossier reste supprimable : la ronde peut valider. Transmettre et
           clôturer **paraissaient** hors de portée, pour un refus qu'on n'avait pas élucidé
           et un manque du jeu d'essai. **Les deux raisons étaient mauvaises** : voir
           5.f.8.

           ── Ce que la validation change dans la page, et ce que cela a coûté ──

           Valider le rapport **fait sortir la constatation de « En Préparation »**. Deux
           contrôles qui passaient sont alors tombés — le filtre de trimestre, qui comptait
           une table devenue plus courte, et l'effacement d'une constatation, dont le bouton
           avait disparu. Les deux rouges portaient sur des gestes qui marchent.

           *Un contrôle dont la précondition est l'état de la page doit passer avant ce qui
           change cet état.* Les trois contrôles de page sont donc remontés avant
           l'ouverture du volet. **L'ordre d'une ronde fait partie de la ronde** — même
           leçon que l'ordre d'un relevé en 5.f.6, et payée deux fois le même jour.

           ── Deux constatations, et trois façons de désigner la bonne ──

           La ronde en crée **deux** : l'une s'efface pour éprouver son geste, l'autre porte
           la ligne qui ouvre le volet. Une seule ne pouvait plus servir aux deux.

           Désigner celle à effacer a pris trois essais, et chacun a dit quelque chose :

           1. **par son rang** — « la dernière, puisqu'elle a été créée en second ». Faux :
              la table trie par date **décroissante**. Le contrôle était vert sur « il en
              reste une » et faux sur *laquelle* ; seule une assertion ajoutée par
              prudence — *la jetable ne doit plus être là* — l'a dit. Sans elle, la ronde
              aurait détruit la ligne dont elle avait besoin et personne ne l'aurait su ;
           2. **par le texte de sa ligne** — la ligne est trouvée, le bouton n'y est pas :
              chaque constatation occupe **deux** `<tr>`, le résumé qui porte les actions et
              le détail, masqué, qui porte le texte ;
           3. **par l'identifiant que son `onclick` porte** — la ronde sait ce qu'elle a
              créé, et le balisage le nomme. *Désigner par ce qu'on a créé, non par où cela
              s'affiche.*

           ── Et une assertion de plus que la ronde a gagnée ──

           La seconde soumission fait un rapport **`v2`**, et la validation le marque
           `valide`. Les deux sont vérifiés **en base**, et c'est la ronde qui les mesure :
           la suite HTTP l'affirme aussi, mais 5.f.6 a montré ce que vaut une vérité qu'on
           hérite sans la mesurer chez soi.

       5.f.8 [x] **SURV — le cycle jusqu'à la clôture, et un « 400 non élucidé » qui était
           une phrase écrite dans la route** — fait le 15 octobre 2026.

           Trente-trois contrôles ; **22 gestes couverts sur 310**. La ronde mène le dossier
           de son ouverture à sa **clôture**.

           ── Le refus que j'avais laissé en énigme ──

           5.f.7 notait la transmission « hors de portée : la route refuse (400), non
           élucidé ». Le refus **est une phrase que la route écrit** :
           *« Le rapport doit être signé par l'inspecteur et le directeur avant
           transmission »*. Légitime, explicite, et lisible en deux minutes.

           Et ce n'est pas la route que l'écran emprunte. Le bouton « Envoyer », qui paraît
           dès que le rapport est validé, appelle `/rapports/:id/send` — la *transmission
           simple*, qui n'exige que le statut `valide`. Les deux coexistent et ne font pas
           la même chose : `/transmit` ouvre en outre les constatations restées en
           brouillon ; `/send` non.

           *Un 400 n'est pas une énigme : c'est une phrase que la route écrit.* Écrire « non
           élucidé » a coûté un jalon là où la lecture coûtait deux minutes — et c'est la
           deuxième fois en deux jours qu'une conclusion hâtive se paie, après le rapport
           prétendu absent de 5.f.6.

           ── Le second « hors de portée » était faux aussi ──

           La clôture était dite non mesurable faute d'une troisième activité dans le jeu
           d'essai. C'était vrai de **mon montage** — qui voulait un dossier neuf par
           palier — et faux du système : la clôture s'offre **sur le même dossier**, une
           fois son rapport transmis. Le balisage le dit (« la clôture n'est offerte qu'une
           fois le rapport transmis »), et le contrôle le vérifie en trouvant son bouton.

           ── La ronde, désormais complète ──

           | Palier | Geste | Vérifié en base |
           |---|---|---|
           | validation | `execValidateRapport` | rapport `valide` |
           | transmission | `execSendRapportValidated` | rapport **`transmis`** |
           | clôture | `execCloseDossier` | dossier **`cloture`** |

           Et la réversibilité, mesurée à **chaque** palier sur des dossiers distincts :
           soumis 200, validé 200, **transmis 200**, **clôturé 200**. Le dossier reste
           supprimable partout ; la ronde ne laisse rien, d'un bout à l'autre du cycle.

           ── Un geste perdu par effet de bord, et rattrapé ──

           `execCloseDossier` referme le volet lui-même. Le geste `execCloseSlider`, qui
           était pressé en fin de ronde, **n'était plus pressé par personne** — et la
           couverture a perdu un nom *sans qu'aucun contrôle ne tombe*.

           *Un geste couvert par effet de bord n'est pas un geste couvert.* Il est désormais
           pressé plus tôt, tant que la ligne qui réouvre le volet existe — après la
           validation, la constatation quitte « En Préparation » et cette ligne disparaît.
           Le contrôle éprouve les deux sens : le volet se referme, et il se réouvre.

       5.f.9 [x] **SURV — les checklists du dossier, et deux ordres qui ne tenaient pas** —
           fait le 15 octobre 2026.

           Trente-sept contrôles ; **25 gestes couverts sur 310**.

           ── Ce que la ronde fait désormais des checklists ──

           Le jeu d'essai porte **deux** modèles de checklist, et le sélecteur n'en propose
           qu'un — *« filtrées par le secteur de l'activité (1 disponible) »*, le secteur
           venant du prestataire du dossier. Le contrôle ne suppose donc **aucun nombre** :
           il exige qu'il y en ait au moins un, et coche le premier.

           | Geste | Vérifié |
           |---|---|
           | `execOpenChecklistsPicker` puis `shellCloseModal` | le sélecteur s'ouvre **et** se referme sans rien retenir |
           | `execSaveChecklistsPicker` | `realisation_checklists` porte l'identifiant coché, **relu chez le serveur** |
           | `execRemoveDossierChecklist` | confirmation pressée, la liste est **vide** en base |
           | `execSetDossierChecklistValidee` | à la rédaction : `checklists_validees` porte l'identifiant |

           La ronde retient une checklist, la retire, puis en retient une de nouveau : sans
           cela, la rédaction n'aurait rien à valider. *Un geste qui défait doit être suivi
           de ce qui rétablit, sinon la ronde se coupe les pieds.*

           ── Deux ordres qui ne tenaient pas, et ce qu'ils enseignent ──

           **Le premier.** Le bloc de l'équipe était avant le sélecteur. Valider le
           sélecteur **redessine le volet**, et la ligne d'équipe ajoutée plus tôt partait
           avec : l'enregistrement de la réalisation a rendu une équipe **vide**, et le
           contrôle de l'équipe est tombé — sur un geste qui marche.

           *Un geste qui redessine efface ce que les précédents ont saisi.* Dans une ronde,
           ce qui se **saisit** vient donc après ce qui **redessine**.

           **Le second.** Le retrait de la checklist était placé à la rédaction, avec sa
           validation. Son bouton n'existe **qu'à l'étape Réalisation** — relevé à la
           rédaction, il n'y est pas. Le contrôle rendait « bouton absent » sur un geste
           qui marche, trois étapes plus loin que là où il vit.

           C'est la troisième fois en deux jours que l'ordre d'une ronde ou d'un relevé est
           la cause d'un rouge — après le ménage qui masquait un rapport (5.f.6) et les
           contrôles de page que la validation déplaçait (5.f.7). **L'ordre fait partie de
           la mesure**, et il se mesure comme le reste.

       5.f.10 [x] **SURV — le remplisseur de checklist, et un indécidable qui se compte
           quand même** — fait le 15 octobre 2026.

           **Quarante-deux contrôles ; 30 gestes couverts sur 310.**

           ── Le dernier gros bloc du volet ──

           `execOpenChecklistFiller` ouvre un éditeur **plein écran** : il se superpose à
           tout, replie la barre du portail, et mémorise son état pour le restaurer en
           partant. Le jeu d'essai y met **141 items en 31 regroupements**, avec quatre
           statuts — Satisfaisant, Non Satisfaisant, Non Applicable, Non Évalué.

           | Geste | Vérifié |
           |---|---|
           | `execOpenChecklistFiller` | `#execChkFillerWrap` est là, avec des items **et** des regroupements |
           | `execChkFillExpandAll` | **les deux sens** : tous ouverts, puis aucun |
           | `execChkFillApplyFilter` | un terme introuvable réduit à **zéro** ligne visible, la remise à zéro les rend **toutes** |
           | `groupsEl:change` | un statut choisi, et la réponse **relue chez le serveur** |
           | `execCloseChecklistFiller` | le remplisseur n'est plus là |

           **Aucun de ces contrôles n'écrit 141 ni 31.** Ils exigent qu'il y ait des items
           et des regroupements, et comparent les états **entre eux** : « autant d'ouverts
           que de regroupements », « autant de lignes rendues qu'avant la recherche ». Un
           modèle de checklist changé ne doit pas faire rougir une mesure de pliage.

           ── Compter les regroupements, non les lignes ──

           La première mesure du dépliage comptait les **lignes** : 141 déplié, 141 plié.
           Le contrôle aurait été vert dans un sens et rouge dans l'autre sans que le geste
           soit en cause — `details.exec-chk-grp` ferme ses enfants par le rendu, non en
           les retirant du document. La propriété qui compte est `[open]` sur le
           regroupement. *L'assertion doit viser la propriété qui change, et non celle qui
           se laisse compter.*

           ── Une limite nommée plutôt qu'une assertion vide ──

           Le remplisseur replie la barre du portail et la restaure en partant. **Ce
           contrôle n'est pas écrit** : `.portal-wrapper` vit dans le cadre du portail,
           hors de la page du module que la suite pilote. Un `querySelector` y rendrait
           `null` avant comme après, et une assertion sur deux `null` égaux serait verte
           sans rien éprouver. Elle est déclarée manquante — c'est tout ce qu'on peut en
           dire honnêtement d'ici.

           ── Un indécidable qui se compte quand même ──

           J'avais annoncé que couvrir `groupsEl:change` **ne lèverait pas** le compte, ce
           geste étant l'un des cinq **indécidables** de SURV : un écouteur délégué posé
           sur une variable locale, que l'extracteur ne sait rattacher à aucune cible
           nommée. La mesure dit 25 → **30**, et non 29 : il est compté.

           Les deux chiffres ne parlent pas de la même chose. « Indécidable » est une
           propriété **statique** — l'extracteur ne sait pas nommer la cible ; « exercé »
           est une propriété **dynamique**, relevée par le mouchard à l'exécution. Un geste
           qu'on ne sait pas rapprocher de son origine se laisse très bien éprouver. Le
           compte des indécidables reste donc à 5, inchangé, pendant que la couverture
           monte. *Une mesure qu'on croit comprendre se vérifie comme les autres.*

       5.f.11 [x] **SURV — les exports : une méthode annoncée qui n'avait pas
           d'objet, et 74 lignes qui en ombrageaient 60** — fait le 15 octobre 2026.

           **Quarante-cinq contrôles pour SURV ; 33 gestes sur 310. Et huit
           contrôles de plus dans la suite HTTP : 111.**

           ── La méthode que j'avais annoncée était fausse ──

           En clôturant 5.f.10, j'ai écrit que les exports seraient « éprouvés
           par la **réponse HTTP** — code, type, taille — et non par une fenêtre
           qu'un navigateur sans tête rend mal ». Lecture faite, **la plupart ne
           parlent pas au serveur** : `execExportConstatations` en classeur
           fabrique un `Blob` et le télécharge par une ancre ; les fiches en PDF,
           comme `execDownloadRapport`, composent le document et l'ouvrent par
           `window.open` + `document.write`. Il n'y a pas de réponse HTTP à
           mesurer, parce qu'il n'y a pas de requête.

           *Une méthode s'arrête sur ce que le code fait, jamais sur ce que son
           nom laisse croire qu'il fait.* « Exporter » ne dit pas qui fabrique.

           ── Ce qui passe bien par le serveur, et son contrat ──

           Un chemin fait exception : les fiches **en Word**. Et le détour est
           motivé — une URL `blob:` téléchargée depuis une iframe est ignorée
           sans message par certains navigateurs, ce que la route écrit en
           commentaire. Le front dépose donc le document composé, puis le
           réclame par un GET.

           Ce dépôt a un contrat qui méritait d'être tenu, et il l'est :

           | Propriété | Éprouvée |
           |---|---|
           | un document vide est refusé | **400** |
           | le dépôt rend un jeton | 32 caractères hexadécimaux |
           | la remise | **200**, `application/msword`, `nosniff`, `attachment` au bon nom |
           | le contenu | rendu **intact** |
           | **usage unique** | la seconde réclamation : **404** |
           | un jeton inventé | **404** |
           | **nominatif** | un autre compte authentifié, jeton valide et non consommé : **404** — et le déposant l'obtient toujours |

           Huit contrôles dans `execution.smoke.js`, et non dans la suite de
           navigateur : ce sont des propriétés de route. Ils sont placés **avant**
           le bloc du privilège Prestataire, qui change l'identité du compte
           d'essai pour de bon — l'ordre, encore.

           Une chose n'y est **pas** contrôlée, et c'est écrit sur place : la
           route préfixe le document d'une BOM pour Word, mais le décodeur de
           `fetch` retire une BOM de tête avant que le texte nous parvienne.
           L'affirmer d'ici serait affirmer une propriété du décodeur, non de la
           route.

           ── L'aperçu du rapport, et ce qu'il prouve de plus ──

           `execPreviewRapport` est le geste par lequel un valideur lit ce qu'il
           va valider. Trois contrôles, à l'étape Validation :

           - le cadre est rendu, **et l'iframe du document est là** — sa seule
             présence prouve que `execDownloadRapport` a rendu un document ;
           - le pavé d'observations est **ouvert à l'écriture**, parce que le
             compte peut valider et que le rapport est « soumis » : c'est une
             branche de permission, et c'est elle qu'on éprouve ;
           - une observation saisie est enregistrée et **relue chez le serveur**,
             puis le retour ramène le volet à sa décision — le bouton de
             validation est repris **après** le retour, l'aperçu ayant remplacé
             le contenu du volet.

           Trois gestes de plus : `execPreviewRapport`, `execSaveApercuComments`,
           `execBackToValidation`. J'en annonçais **quatre** :
           `execDownloadRapport` ne compte pas, et l'instrument a raison — un
           geste est un gestionnaire atteignable **depuis le balisage**, non une
           fonction appelée par une autre. L'aperçu l'appelle en interne ; son
           bouton « Exporter PDF », lui, n'a pas été cliqué.

           ── 74 lignes mortes qui ombrageaient 60 vivantes ──

           `execPreviewRapport` était déclaré **deux fois** : dans
           `exec-rapports.js`, puis dans `exec-fiche.js`. Deux `function` du même
           nom au premier niveau de scripts classiques ne font pas une erreur —
           **la dernière l'emporte, en silence**. `index.html` charge
           `exec-rapports.js` en 105 et `exec-fiche.js` en 108.

           Je ne l'ai pas déduit de l'ordre des balises : mesuré dans le
           navigateur, `execPreviewRapport.toString()` portait bien le corps
           d'`exec-fiche.js`, qui le publie d'ailleurs explicitement sur
           `window`. Les 74 lignes d'`exec-rapports.js` sont supprimées, une note
           à leur place. Les deux auxiliaires qu'elles appelaient —
           `execBackToValidation`, `execSaveApercuComments` — sont appelés par la
           version vivante : ils restent.

           Effet secondaire mesuré, et instructif : l'inventaire est passé de
           **503 à 500 occurrences** pour **310 noms inchangés**. Les trois
           occurrences retirées étaient des **copies** de noms qui vivent
           ailleurs. Le garde-fou de dérive a signalé l'écart de lui-même.

           ── Le même défaut ailleurs, et pourquoi je n'y touche pas ──

           Un garde-fou refuse désormais qu'un nom soit déclaré deux fois sur une
           page de module. Sur les six pages, il trouvait **deux** cas. Le second
           est dans PR, et il est plus grave :

           `renderParamIndices` est déclaré **deux fois dans le même fichier**
           (`pr-parametres.js`, lignes 99 et 691), et les deux versions ne font
           pas la même chose. La **vivante est la seconde**, et c'est
           l'**ancienne** : elle n'oppose aucun contrôle de rôle. La **morte est
           la plus récente**, reprise de PESSCO : elle **désactive les champs**
           pour un compte qui n'est pas M1 Administrateur et masque le bouton
           d'enregistrement.

           L'autorité, elle, est tenue par le serveur : `PUT /api/indices` exige
           le rôle Gestionnaire, et son refus est éprouvé depuis longtemps
           (profil-risque, « barème des indices non réinscriptible », **403**).
           **L'ombrage ne fabrique donc pas une faille, mais une interface qui
           ment** : un non-gestionnaire voit un formulaire ouvert et un bouton
           qui sera refusé.

           Je ne le répare pas. Ici, contrairement à SURV, **la version morte est
           celle qu'on voudrait garder** : supprimer la plus récente pour
           « corriger le doublon » serait décider à la place de la maîtrise
           d'ouvrage. Le cas est donc **déclaré** dans le garde-fou, avec tout ce
           que la mesure en sait — sur le modèle de `PAGES_SANS_CHEMIN`. *Une
           déclaration n'excuse pas ; elle empêche d'oublier.*

           ── Ce que ce pas ne couvre pas, et comment il le couvrira ──

           Le point était « les exports et les fiches » : il est fait **à
           moitié**, et le reste est nommé. Les exports à fenêtre et à `Blob`
           vivent dans l'onglet « Constatations » du volet, qu'un sous-onglet de
           la rédaction ouvre. Leur méthode est arrêtée — capturer le **produit**
           du geste en interceptant `window.open` et `URL.createObjectURL`, ce
           qui prouve le document composé et **non** son rendu ni son
           téléchargement, limite à écrire —, mais ils demandent leur propre
           ronde de navigation. Je préfère le dire que l'écrire à l'aveugle.

       5.f.12 [x] **SURV — les exports par leur produit, la constatation
           engendrée, et un nettoyage qui n'a presque rien trouvé** — fait le
           15 octobre 2026.

           **Cinquante-et-un contrôles pour SURV ; 38 gestes sur 310.**

           ── Mesurer le code mort avant d'écrire : l'ordre, encore ──

           Le nettoyage est venu **en premier**, et non en dernier : couvrir un
           geste qu'on s'apprête à supprimer est du travail perdu. Trois
           instruments, et deux résultats contre-intuitifs :

           | Ce qui a été cherché | Trouvé |
           |---|---|
           | fonctions déclarées et jamais atteintes, par page de module | **0** sur les six pages — les 544 de SURV sont toutes utilisées |
           | fichiers `.js`/`.css` qu'aucune page ne charge et qu'aucun code ne nomme | **0** |
           | règles de style sans porteur | **4**, celles de `.btn-back-portal` |

           Le dépôt est plus propre que je ne le supposais, et le dire vaut mieux
           que de produire un nettoyage pour justifier la demande. Le premier
           instrument a d'ailleurs failli mentir : son critère rendait **0** dès
           la première passe, et il a fallu le contre-essayer — 544 fonctions
           vues, minimum **1** mention hors déclaration, et les dix plus rares
           vérifiées une à une. Toutes vivantes. *Un instrument qui rend zéro se
           vérifie exactement comme un qui rend beaucoup.*

           Les quatre règles de `.btn-back-portal` sont retirées de
           `oasis-module.css`. Elles avaient été **explicitement** gardées hors
           de portée du garde-fou de 5.e.8, au motif qu'elles servaient « les
           shells d'avant la reprise ». Tous sont repris, et deux contrôles le
           vérifient — l'un sur la source, l'autre sur le DOM. La justification
           avait expiré sans que personne la relise. Un garde-fou étroit la
           remplace. *Une mise en forme sans porteur est du code mort qui se lit
           comme une intention.*

           Ce garde-fou a d'ailleurs **rougi sur ma propre note** : sa première
           version interdisait le nom partout dans la feuille, et la note qui
           expliquait la suppression le contenait. Un garde qui interdit un nom
           jusque dans la prose qui en raconte l'histoire empêche d'écrire cette
           histoire. Les commentaires sont donc retirés avant la mesure — même
           leçon que le blanchiment du relevé des gestes. *Un contrôle porte sur
           ce que le code fait, jamais sur ce qui l'explique.*

           ── Les exports, par leur produit ──

           Les quatre exports de la rédaction sont cliqués, et leur produit
           capturé : `window.open` et `URL.createObjectURL` sont relayés le temps
           des clics.

           | Geste | Vérifié |
           |---|---|
           | `execExportConstatations` | un `Blob` typé tableur, **toutes ses lignes de la largeur de son en-tête** |
           | `execFichesConstatDossier` | une page complète et garnie |
           | `execExportFicheConstat` | idem |
           | `execExportFicheSuivi` | idem |

           Le classeur n'est pas éprouvé sur son contenu mais sur sa **forme** :
           autant de colonnes à chaque ligne que dans l'en-tête. C'est une
           propriété de la table, qui ne se dément pas si le jeu d'essai change.

           **Ce que cela ne prouve pas est écrit dans le fichier** : ni que le
           navigateur ouvre la fenêtre, ni qu'il enregistre le fichier —
           seulement que le geste a fabriqué le bon document et l'a remis au bon
           mécanisme. *Un relais mesure le geste jusqu'à la porte, jamais
           au-delà.*

           Les variantes **Word** ne sont pas cliquées ici, et pour une raison
           nommée : elles posent `window.location.href` sur la pièce jointe, ce
           qui emporterait la page et la ronde avec. Leur chemin passe par le
           serveur, et il est éprouvé pour lui-même en 5.f.11.

           ── La constatation engendrée depuis un item ──

           `execChkFillGenConstatation` transforme un item non satisfaisant en
           constatation. Trois contrôles :

           - le bouton est rendu pour **chaque** item mais masqué tant que le
             statut n'est pas non satisfaisant : masqué avant, **visible après**.
             Lequel l'est ne se devine pas d'un libellé — l'écran garde sa propre
             notion dans `_execChkFillerCtx.nonSatIds`, et c'est elle qu'on lit.
             *Deviner d'après un libellé éprouverait ma lecture du français, non
             la règle de l'écran* ;
           - la constatation est **relue chez le serveur**, son `cas_type`
             commence par « Checklist — », et elle porte l'identifiant de l'item ;
           - **le geste se referme sur lui-même** : l'item pourvu voit son bouton
             désactivé, et ne peut plus en engendrer.

           ── Et la cascade, qu'il a fallu étendre ──

           Cette constatation est créée par un geste, non par la chaîne d'API du
           début : la suppression finale du dossier devait donc l'emporter aussi.
           L'assertion de cascade ne regardait que la notification et les
           rapports ; elle compte désormais les constatations, et son libellé le
           dit. Vert du premier coup — mais il ne l'était par **rien** avant que
           ce contrôle existe. *La cascade se mesure sur tout ce que la ronde a
           créé, non sur ce dont on se souvient qu'elle a créé.*

6. [~] Mettre à jour [CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md)
       module par module, et non d'un seul trait à la fin.

       **Premier passage le 6 octobre 2026**, pour le socle et DROITS. La ligne « Frontend »
       disait « **✗** — JavaScript sans cadre, 0 fichier `.ts` » cinq jours après la conversion
       du premier écran. Elle porte maintenant la mesure des deux côtés : **4 932 lignes** de
       TypeScript en 35 fichiers, **60 110** encore en JavaScript.

       **Et la commande de vérification de ce document était fausse.** Il porte, en fin de
       texte, les commandes qui permettent de le contredire — c'est sa meilleure propriété. Or
       celle du TypeScript cherchait dans `public/` :

       ```
       find public -name '*.ts' -o -name '*.tsx' | wc -l   # rendait 0
       ```

       Le TypeScript vit dans `frontend/` ; `public/` reçoit ce qu'esbuild en construit. La
       commande rendait donc **0 sur un dépôt qui porte 4 932 lignes de TypeScript**, et
       confirmait le « ✗ » de la ligne qu'elle était censée éprouver. Les deux fautes se
       tenaient l'une l'autre.

       La commande est corrigée, et une seconde a été ajoutée : le JavaScript qui reste. Une
       mesure qui ne dit que le numérateur ne mesure pas une conversion.

       Les cinq écrans restants mettront cette ligne à jour chacun à son tour. Le jalon reste
       ouvert jusqu'au dernier.
