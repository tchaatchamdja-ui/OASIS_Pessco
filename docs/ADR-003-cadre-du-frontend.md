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
           | portail (`public/js`) | 4 217 | **78 gestes nommés, 14 exercés, 56 motivés** — relevé figé et gardé (5.c.0) |
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
