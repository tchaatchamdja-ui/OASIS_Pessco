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

1. [x] **Reprendre DROITS en React + TypeScript** — fait le 3 octobre 2026. Les six
       contrôles de navigateur passent, à l'identique, et les 20 contrôles de la suite
       « droits » n'ont pas bougé : l'API n'est pas touchée.

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

       5.b [ ] **Le socle en TypeScript, servant les deux régimes.** Le relevé des 48
           noms est le contrat à préserver, et la suite `frontend` le vérifie.
       5.c [ ] Puis les écrans, en commençant par les feuilles : portail, PLAN, CARE,
           PR, RAMP, SURV.
6. [ ] Mettre à jour [CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md)
       module par module, et non d'un seul trait à la fin.
