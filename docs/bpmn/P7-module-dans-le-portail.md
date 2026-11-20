# P7 — Ouverture d'un module dans le portail et dialogue par messages

Diagramme : [`P7-module-dans-le-portail.bpmn`](P7-module-dans-le-portail.bpmn)

**Déclencheur** : l'agent clique une carte ou un menu du portail.
**Participants** : Agent ; Portail (fenêtre de tête) ; Module (iframe `prFrame`) ; Serveur (boîte noire, routes `/api/modules/…` après S2). Portail et module sont deux fenêtres : ils ne se parlent que par `postMessage`, d'où deux pools et des flux de messages.

## Étapes

1. Le portail charge, une fois, le registre (super-menus et cartes). Un 401 fait perdre la session (P2) ; toute autre erreur donne un registre vide.
2. Module absent du registre → « Module indisponible. » ; sinon plein écran et iframe sur la `src` du manifeste.
3. Dans le cadre, le module pose le socle (`fetch` enveloppé, langue, thème), lit ses super-menus, puis sert l'agent (P3, P8).
4. Trois issues :
   - **retour demandé** : `postMessage({ type: 'oasis:back-portal' }, '*')` ;
   - **autre module** : le cadre navigue vers lui ;
   - **réponse 401** : la fenêtre de tête part à la connexion.
5. Le portail écoute `window.message` :
   - `oasis:back-portal` → défaire le plein écran, aller à l'accueil ;
   - `…:page` → garder le plein écran ; tout autre type est ignoré.

## Règles et leur source

| Règle | Code |
|---|---|
| Registre chargé une fois ; rejouable après connexion | `frontend/portail/modules-hote.ts:90-106, 146-167` |
| Super-menus filtrés par rôle, puis par carte du module courant | `server.js:420-431` ; `frontend/socle/chrome.ts:272-283` |
| L'iframe prend la `src` déclarée par le manifeste | `frontend/portail/modules-hote.ts:122-135` |
| Retour au portail par message | `frontend/socle/chrome.ts:268-270` ; `modules-hote.ts:137-144, 170-177` |
| Les modules signalent leur page par `<préfixe>:page` | `frontend/mesures/coquille.ts:184` ; `public/modules/execution/index.html:132` |
| Navigation entre modules dans le même cadre | `frontend/socle/chrome.ts:243-246` |
| Session perdue dans le cadre : `window.top` part à la connexion | `frontend/socle/requete.ts:40-50` |

## Fins

Accueil du portail · « Module indisponible » · session perdue · autre module dans le même cadre.

## Écarts

- **[lu] Ni l'origine ni la source du message ne sont vérifiées** (`modules-hote.ts:171-177`), et le module envoie avec la cible `'*'` (`chrome.ts:269`). Toute fenêtre qui tient une référence au portail peut le renvoyer à l'accueil ou le mettre en plein écran. La portée se limite à la navigation : aucune donnée ne passe par ces messages.
- **[lu]** Une erreur du registre autre que 401 donne un registre vide (`modules-hote.ts:101-104`), qui s'affiche « Module indisponible » sans dire que le serveur a échoué.
