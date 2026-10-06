#!/usr/bin/env node
// OASIS — Comparer un fichier du socle avant et après sa conversion (ADR-003, 5.b).
//
//   node scripts/comparer-socle.js oasis-utils
//
// Rend 0 si les deux fichiers se comportent à l'identique sur toutes les sondes,
// 1 sinon, en nommant celles qui diffèrent.
//
// ── Pourquoi un outil, et pas un contrôle de la campagne ──
//
// La comparaison n'est possible **qu'avant** la bascule : après, l'ancien
// fichier n'existe plus. C'est donc un outil de migration, employé une fois par
// fichier — mais neuf fois encore, et il porte le relevé de ce qui a été prouvé
// pour chacun. Les sondes restent ici après la conversion : c'est le registre.
//
// ── Les deux leçons payées, écrites ici pour ne pas les repayer ──
//
// **La page porte la balise elle-même.** Un script injecté après le chargement
// trouve `DOMContentLoaded` déjà passé : son branchement ne tourne pas, et les
// sondes qui le mesurent rendent la même chose des deux côtés — identiques **à
// ne rien faire**. Mesuré sur `oasis-loader` : trois verts vides sur treize, et
// c'étaient les trois qui comptaient.
//
// **Les sondes asynchrones s'attendent.** Sans `await`, on compare deux fois la
// chaîne « [object Promise] », ce qui est toujours vrai.
const puppeteer = require('puppeteer');
const { demarrer } = require('../tests/smoke/harness');

// Un jeu de sondes par fichier. `prealables` charge les fichiers du socle dont
// celui-ci a besoin — `oasis-utils` lit `oasisEsc`, `oasisSessionPerdue` et
// `oasisMessageErreur`, et sans eux l'on ne mesurerait que des exceptions.
//
// `attendus` nomme les sondes dont la différence est **voulue**, avec sa raison.
// Une conversion peut légitimement améliorer quelque chose ; ce qu'elle ne doit
// pas faire, c'est qu'un écart passe pour acceptable **parce qu'on l'a regardé et
// trouvé plausible**. Un écart non déclaré fait échouer l'outil, et un `attendu`
// qui ne se produit pas le fait échouer aussi — sinon la déclaration survivrait à
// ce qu'elle décrit.
const JEUX = {
  'oasis-commun': {
    // Les cinq tables du serveur sont lues sur `window` : sans elles, la
    // composition accordée ne rendrait que des chaînes vides des deux côtés —
    // identiques, et sans valeur.
    prealables: ['oasis-requete', 'oasis-messages-serveur', 'oasis-toast'],
    avant: "localStorage.setItem('pr_lang','fr'); window.PESSCO={lang:'fr'};"
      + "document.write('<input id=\"q\" value=\"abc\">"
      + "<span class=\"theme-dot\" data-theme=\"corporate\"></span>"
      + "<span class=\"theme-dot\" data-theme=\"blue-dark\"></span>');",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^oasis(Langue|PoserLangue|Esc|MessageErreur|ChampRequis|Json|AppliquerTheme|SaisieDifferee|Charger)$/.test(n)).sort().join(',')",
      // ── Échappement : les cinq caractères, et le zéro qui n'est pas un vide ──
      "oasisEsc('<a href=\"x\">&\\'</a>')",
      "JSON.stringify([oasisEsc(null),oasisEsc(undefined),oasisEsc(0),oasisEsc(false),oasisEsc('')])",
      // ── La langue, et l'attribut de la page ──
      "oasisLangue()",
      "(()=>{window.PESSCO={lang:'pt-BR'};const a=oasisLangue();window.PESSCO={lang:'fr'};return a;})()",
      "(()=>{const a=oasisPoserLangue('en');const b=document.documentElement.lang;oasisPoserLangue('fr');return a+'|'+b;})()",
      "(()=>{const a=oasisPoserLangue();return a+'|'+document.documentElement.lang;})()",
      // ── Les codes connus, dans les trois langues ──
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisMessageErreur({error:'privilege_insuffisant'},403));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      "oasisMessageErreur({error:'suites_care'},409).length",
      // ── La composition accordée : le cœur du métier ──
      // Le genre du nom commande l'accord de l'état ; la majuscule tombe au
      // milieu d'une phrase, sauf pour un sigle.
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisMessageErreur({error:'introuvable',objet:'carence'},404));r.push(oasisMessageErreur({error:'introuvable',objet:'rapport'},404));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      "oasisMessageErreur({error:'deja',objet:'plan',etats:['valide']},409)",
      "oasisMessageErreur({error:'deja',objet:'activite',etats:['valide','archive']},409)",
      "oasisMessageErreur({error:'en_usage',objet:'categorie',n:3},409)",
      "oasisMessageErreur({error:'en_usage',objet:'categorie',n:3,desactivable:true},409)",
      "oasisMessageErreur({error:'statut_requis',objet:'plan',etats:['valide'],precision:'v2'},409)",
      "oasisMessageErreur({error:'introuvable',objet:'objet_que_la_table_ignore'},404)",
      // Un état attendu manquant rend la composition vide : on retombe alors sur
      // la phrase générale, et c'est la règle.
      "oasisMessageErreur({error:'deja',objet:'plan'},409)",
      // Le rôle réservé, et son repli quand le rôle est inconnu.
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisMessageErreur({error:'reserve',role:'administrateurs'},403));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      "oasisMessageErreur({error:'reserve',role:'role_inexistant'},403)",
      // Le fichier trop volumineux, avec son nombre mis en forme par langue.
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisMessageErreur({error:'fichier_trop_volumineux',maxMo:2.5},413));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      "oasisMessageErreur({error:'fichier_trop_volumineux'},413)",
      // ── La phrase française du serveur, traduite, trous compris ──
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisMessageErreur({message:'Aucune donnée à exporter'},400));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      "(()=>{window.PESSCO={lang:'en'};const a=oasisMessageErreur({message:'Adresse invalide : jean@x'},400);window.PESSCO={lang:'fr'};return a;})()",
      "(()=>{window.PESSCO={lang:'pt'};const a=oasisMessageErreur({error:'Activité non réinitialisable : 3 constatation(s) et 2 rapport(s) en dépendent'},409);window.PESSCO={lang:'fr'};return a;})()",
      "oasisMessageErreur({message:'Phrase que la table ignore'},400)",
      // Un code inconnu se dit en clair, avec son code — et le point à la fin.
      "oasisMessageErreur({error:'code_inconnu_du_dictionnaire'},500)",
      "oasisMessageErreur({},500)",
      "oasisMessageErreur(null,500)",
      "oasisMessageErreur({},500,'Téléversement refusé.')",
      "oasisMessageErreur({error:'Infraction non trouvée'},404)",
      // ── Le champ requis, vu par l'écran ──
      "(()=>{const r=[];for(const l of ['fr','en','pt']){window.PESSCO={lang:l};r.push(oasisChampRequis('designation'),oasisChampRequis('motif'));}window.PESSCO={lang:'fr'};return r.join(' ~ ');})()",
      // ── Le client HTTP ──
      "(async()=>{let vu=null;const o=window.fetch;window.fetch=async(u,i)=>{vu={u,c:i.credentials,h:i.headers};return{status:200,ok:true,json:async()=>({ok:1})};};const r=await oasisJson('/x',{method:'POST'});window.fetch=o;return JSON.stringify([r,vu]);})()",
      // Un dépôt de fichier ne doit pas recevoir de type JSON imposé.
      "(async()=>{let h=null;const o=window.fetch;window.fetch=async(u,i)=>{h=i.headers;return{status:200,ok:true,json:async()=>(1)};};await oasisJson('/x',{body:new FormData()});window.fetch=o;return JSON.stringify(h);})()",
      "(async()=>{const o=window.fetch;window.fetch=async()=>({status:204,ok:true,json:async()=>({non:1})});const r=await oasisJson('/x');window.fetch=o;return JSON.stringify(r);})()",
      "(async()=>{let perdue=0;const op=window.oasisSessionPerdue;window.oasisSessionPerdue=()=>{perdue++;};const o=window.fetch;window.fetch=async()=>({status:401,ok:false,json:async()=>({})});let m='';try{await oasisJson('/x');}catch(e){m=e.message;}window.fetch=o;window.oasisSessionPerdue=op;return perdue+'|'+m;})()",
      "(async()=>{const o=window.fetch;window.fetch=async()=>({status:409,ok:false,json:async()=>({error:'deja',objet:'plan',etats:['valide']})});let m='';try{await oasisJson('/x');}catch(e){m=e.message;}window.fetch=o;return m;})()",
      // Un corps illisible : on retombe sur le texte du statut.
      "(async()=>{const o=window.fetch;window.fetch=async()=>({status:500,ok:false,statusText:'Boum',json:async()=>{throw new Error('x');}});let m='';try{await oasisJson('/x');}catch(e){m=e.message;}window.fetch=o;return m;})()",
      // ── La bascule de thème ──
      "(()=>{oasisAppliquerTheme('corporate');return [document.documentElement.getAttribute('data-theme'),localStorage.getItem('pr_theme'),[...document.querySelectorAll('.theme-dot')].map(d=>d.className).join('/')].join('|');})()",
      // ── La saisie différée : un minuteur par champ, le curseur rendu ──
      "(async()=>{const q=document.getElementById('q');let n=0;oasisSaisieDifferee(q,()=>{n++;},10);oasisSaisieDifferee(q,()=>{n++;},10);await new Promise(r=>setTimeout(r,60));return n;})()",
      "(async()=>{const q=document.getElementById('q');let n=0;oasisSaisieDifferee(q,()=>{n++;},0);await new Promise(r=>setTimeout(r,40));return n+'|'+(document.activeElement===q);})()",
      // ── Le chargement à la demande : une seule promesse par source ──
      "(()=>{const a=oasisCharger('/shared/css/ne-existe-pas.js');const b=oasisCharger('/shared/css/ne-existe-pas.js');return String(a===b);})()",
    ],
  },

  'oasis-toast': {
    avant: "localStorage.setItem('pr_lang','fr');"
      + "document.write('<button id=\"ailleurs\">ailleurs</button>');",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^oasis(Toast|Confirmer|Saisir)$/.test(n)).sort().join(',')",
      // ── Le panneau de retour ──
      "(()=>{const f=oasisToast('Bonjour','success');return [f.className,f.querySelector('.oasis-toast-titre').textContent,f.querySelector('.oasis-toast-message').textContent].join('|');})()",
      // Les alias de type, et le repli sur la réussite pour un type inventé.
      "['success','succes','ok','error','danger','erreur','warning','warn','alerte','info','inventé',''].map(t=>oasisToast('m',t).className.replace('oasis-toast-fond ','')).join(',')",
      // Un seul panneau : le dernier remplace le précédent.
      "(()=>{oasisToast('un');oasisToast('deux');return document.querySelectorAll('.oasis-toast-fond').length+'|'+document.querySelector('.oasis-toast-message').textContent;})()",
      // Le message est posé en texte, non en HTML : une balise ne s'interprète pas.
      "(()=>{const f=oasisToast('<b>gras</b>');return f.querySelector('.oasis-toast-message').innerHTML;})()",
      // Un clic referme.
      "(()=>{const f=oasisToast('x');f.click();return document.querySelectorAll('.oasis-toast-fond').length;})()",
      // Les trois langues du titre.
      "(()=>{const r=[];for(const l of ['fr','en','pt','xx']){localStorage.setItem('pr_lang',l);r.push(oasisToast('m','error').querySelector('.oasis-toast-titre').textContent);}localStorage.setItem('pr_lang','fr');return r.join(' ~ ');})()",
      // La durée : plancher à 1 500 ms, quoi qu'on demande.
      "(()=>{let d=null;const o=window.setTimeout;window.setTimeout=(f,ms)=>{d=ms;return 0;};oasisToast('x',null,10);const a=d;oasisToast('x',null,9000);const b=d;oasisToast('x');const c=d;window.setTimeout=o;return [a,b,c].join('|');})()",
      // ── La confirmation ──
      "(async()=>{document.querySelectorAll('.oasis-toast-fond,.oasis-confirm-fond').forEach(e=>e.remove());const p=oasisConfirmer('Continuer ?');const f=document.querySelector('.oasis-confirm-fond');const vu=[f.className,f.querySelector('.oasis-confirm-titre').textContent,f.querySelector('.oasis-confirm-non').textContent,f.querySelector('.oasis-confirm-oui').textContent,document.activeElement.className].join('|');f.querySelector('.oasis-confirm-oui').click();return vu+'|'+await p;})()",
      // `danger` se déduit du message — et le mot le dit.
      "(async()=>{const r=[];for(const m of ['Supprimer ceci ?','Enregistrer ?','Réinitialiser ?','Remove it?','Valider ?']){const p=oasisConfirmer(m);r.push(document.querySelector('.oasis-confirm-fond').className.includes('danger'));document.querySelector('.oasis-confirm-non').click();await p;}return r.join(',');})()",
      "(async()=>{const p=oasisConfirmer('Enregistrer ?',{danger:true});const d=document.querySelector('.oasis-confirm-fond').className.includes('danger');document.querySelector('.oasis-confirm-non').click();return d+'|'+await p;})()",
      // Échap répond non, Entrée répond oui.
      "(async()=>{const p=oasisConfirmer('Q');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return String(await p);})()",
      "(async()=>{const p=oasisConfirmer('Q');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return String(await p);})()",
      // Un clic sur le fond, en dehors du panneau, répond non.
      "(async()=>{const p=oasisConfirmer('Q');document.querySelector('.oasis-confirm-fond').click();return String(await p);})()",
      // Une nouvelle question clôt la précédente, par la négative.
      "(async()=>{const p1=oasisConfirmer('Q1');const p2=oasisConfirmer('Q2');document.querySelector('.oasis-confirm-oui').click();return [await p1,await p2,document.querySelectorAll('.oasis-confirm-fond').length].join('|');})()",
      // Le focus revient là où il était.
      "(async()=>{const b=document.getElementById('ailleurs');b.focus();const p=oasisConfirmer('Q');const pendant=document.activeElement.className;document.querySelector('.oasis-confirm-non').click();await p;return pendant+'|'+document.activeElement.id;})()",
      // Les libellés imposés, et les trois langues.
      "(async()=>{const p=oasisConfirmer('Q',{titre:'T',libelle:'Oui!',libelleAnnuler:'Non!'});const f=document.querySelector('.oasis-confirm-fond');const v=[f.querySelector('.oasis-confirm-titre').textContent,f.querySelector('.oasis-confirm-oui').textContent,f.querySelector('.oasis-confirm-non').textContent].join('/');f.querySelector('.oasis-confirm-non').click();await p;return v;})()",
      "(async()=>{const r=[];for(const l of ['fr','en','pt']){localStorage.setItem('pr_lang',l);const p=oasisConfirmer('Q');r.push(document.querySelector('.oasis-confirm-oui').textContent);document.querySelector('.oasis-confirm-non').click();await p;}localStorage.setItem('pr_lang','fr');return r.join(',');})()",
      // ── La saisie ──
      "(async()=>{const p=oasisSaisir('Motif',{valeur:'prérempli'});const f=document.querySelector('.oasis-confirm-fond');const v=[f.className,f.querySelector('.oasis-saisie-champ').value,f.querySelector('.oasis-confirm-oui').textContent,f.querySelector('.oasis-confirm-oui').disabled,document.activeElement.className].join('|');f.querySelector('.oasis-confirm-oui').click();return v+'|'+await p;})()",
      // `requis` tient le bouton fermé tant que le champ est vide.
      "(async()=>{const p=oasisSaisir('Motif',{requis:true});const c=document.querySelector('.oasis-saisie-champ');const o=document.querySelector('.oasis-confirm-oui');const a=o.disabled;c.value='  ';c.dispatchEvent(new Event('input'));const b=o.disabled;c.value='x';c.dispatchEvent(new Event('input'));const d=o.disabled;o.click();return [a,b,d,await p].join('|');})()",
      // Renoncer rend `null` — et non la chaîne vide.
      "(async()=>{const p=oasisSaisir('M');document.querySelector('.oasis-confirm-non').click();const r=await p;return typeof r+'|'+String(r);})()",
      "(async()=>{const p=oasisSaisir('M');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return String(await p);})()",
      // Entrée seule passe à la ligne ; Ctrl+Entrée valide.
      "(async()=>{const p=oasisSaisir('M',{valeur:'texte'});document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const encore=document.querySelectorAll('.oasis-confirm-fond').length;document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));return encore+'|'+String(await p);})()",
      // Une saisie clôt une confirmation en attente, par `null` de son côté.
      "(async()=>{const p1=oasisConfirmer('Q');const p2=oasisSaisir('M',{valeur:'v'});document.querySelector('.oasis-confirm-oui').click();return [await p1,await p2].join('|');})()",
      "(async()=>{const r=[];for(const l of ['fr','en','pt']){localStorage.setItem('pr_lang',l);const p=oasisSaisir('M');r.push(document.querySelector('.oasis-confirm-oui').textContent);document.querySelector('.oasis-confirm-non').click();await p;}localStorage.setItem('pr_lang','fr');return r.join(',');})()",
      // Rien ne doit lever sur un message absent.
      "(async()=>{const p=oasisConfirmer();const t=document.querySelector('.oasis-confirm-message').textContent;document.querySelector('.oasis-confirm-non').click();await p;const q=oasisSaisir();const u=document.querySelector('.oasis-confirm-message').textContent;document.querySelector('.oasis-confirm-non').click();await q;return JSON.stringify([t,u]);})()",
    ],
  },

  'oasis-kpi': {
    // `echelle` tire au hasard l'identifiant de son dégradé — la sortie n'est
    // donc **pas déterministe**. L'identifiant est incidentel : on le neutralise
    // plutôt que de déclarer un écart, sinon la sonde dirait « différent » à
    // chaque exécution et n'apprendrait plus rien.
    avant: "window.__n = (h) => String(h).replace(/oasisKpiGrad[a-z0-9]+/g, 'GRAD');",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^oasisKpi/.test(n)).sort().join(',')",
      "Object.keys(window.oasisKpiFigures).sort().join(',')",
      // Les sept figures, et leurs bornes : un pourcentage hors limites, nul,
      // absent, ou qui n'est pas un nombre.
      "oasisKpiFigures.jauge(42)",
      "[oasisKpiFigures.jauge(-10),oasisKpiFigures.jauge(150),oasisKpiFigures.jauge('x'),oasisKpiFigures.jauge()].join('~').length",
      "oasisKpiFigures.jauge(-10) === oasisKpiFigures.jauge(0)",
      "oasisKpiFigures.jauge(150) === oasisKpiFigures.jauge(100)",
      "oasisKpiFigures.retard({pastille:'<b>Dépassé</b>',legende:'Début'})",
      "oasisKpiFigures.retard()",
      "oasisKpiFigures.calendrier(5)",
      "oasisKpiFigures.calendrier()",
      "oasisKpiFigures.cloture(37.5)",
      "window.__n(oasisKpiFigures.echelle(90,{min:'Faible',max:'Élevé'}))",
      "window.__n(oasisKpiFigures.echelle())",
      // Une seule mesure ne fait pas un histogramme : la figure se complète.
      "oasisKpiFigures.barres([3])",
      "oasisKpiFigures.barres([1,2,3,4,5,6,7])",
      "oasisKpiFigures.barres([])",
      "oasisKpiFigures.barres()",
      "oasisKpiFigures.etapes(['a','<i>b</i>','c'],1)",
      "oasisKpiFigures.etapes()",
      // La carte entière, ses classes, son échappement et ses valeurs absentes.
      "oasisKpiCarte({titre:'Activités',valeur:12,precision:'sur 20',figure:{type:'jauge',pct:60}})",
      "oasisKpiCarte({titre:'<script>x</script>',valeur:null})",
      "oasisKpiCarte({titre:'T',valeur:1,alerte:true,onClick:\"f('a')\",actif:true,couleur:'#c00'})",
      "oasisKpiCarte({titre:'T',valeur:1,figure:{svg:'<svg/>'}})",
      "oasisKpiCarte()",
      "window.__n(oasisKpiCarte({titre:'T',valeur:1,figure:{type:'echelle',position:20,min:'bas',max:'haut'}}))",
      // Le groupe, avec et sans titre.
      "oasisKpiGroupe('Activités',[oasisKpiCarte({titre:'A',valeur:1}),oasisKpiCarte({titre:'B',valeur:2})])",
      "oasisKpiGroupe('',[])",
      "oasisKpiGroupe()",
    ],
  },

  'oasis-messages-serveur': {
    // Fichier de données pur : la sonde décisive n'est pas un échantillon, c'est
    // **l'égalité intégrale**. Les six tables sont comparées entière par
    // entière — 11 298 octets pour la seule table des phrases —, et un
    // `JSON.stringify` à clés triées rend la comparaison insensible à l'ordre
    // d'énumération, qui n'est pas une propriété du contenu.
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^OASIS_.*_SERVEUR$/.test(n)).sort().join(',')",
      // Un relevé signé de chaque table : si un seul caractère d'une seule
      // traduction diffère, l'empreinte change.
      "(()=>{const tri=(o)=>JSON.stringify(o,(k,v)=>(v&&typeof v==='object'&&!Array.isArray(v))?Object.keys(v).sort().reduce((a,c)=>(a[c]=v[c],a),{}):v);return ['MESSAGES','OBJETS','ETATS','OU','ROLES','GABARITS'].map(n=>{const t=window['OASIS_'+n+'_SERVEUR'];const s=tri(t);let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;}return n+':'+(Array.isArray(t)?t.length:Object.keys(t).length)+':'+s.length+':'+h;}).join(' | ');})()",
      // Et le contenu lui-même, pour que l'écart soit **lisible** et non réduit
      // à une empreinte. Découpé, parce qu'une sonde de 11 Ko ne se lit pas.
      "JSON.stringify(Object.keys(window.OASIS_MESSAGES_SERVEUR).sort()).length + '|' + JSON.stringify(Object.keys(window.OASIS_MESSAGES_SERVEUR).sort()).slice(0,300)",
      "JSON.stringify(Object.entries(window.OASIS_MESSAGES_SERVEUR).sort().slice(0,3))",
      "JSON.stringify(Object.entries(window.OASIS_MESSAGES_SERVEUR).sort().slice(-3))",
      "JSON.stringify(Object.entries(window.OASIS_OBJETS_SERVEUR).sort().slice(0,3))",
      "JSON.stringify(Object.entries(window.OASIS_ETATS_SERVEUR).sort().slice(0,3))",
      "JSON.stringify(window.OASIS_OU_SERVEUR)",
      "JSON.stringify(Object.entries(window.OASIS_ROLES_SERVEUR).sort().slice(0,2))",
      "JSON.stringify(Object.entries(window.OASIS_GABARITS_SERVEUR).sort().slice(0,1))",
      "JSON.stringify(Object.entries(window.OASIS_GABARITS_SERVEUR).sort().slice(-1))",
      // Toute entrée doit porter ses trois langues : c'est ce que le type
      // affirme désormais, et la sonde vérifie qu'il dit vrai des deux côtés.
      "Object.values(window.OASIS_MESSAGES_SERVEUR).filter(v=>!Array.isArray(v)||v.length!==2||v.some(x=>typeof x!=='string'||!x)).length",
      "Object.values(window.OASIS_ROLES_SERVEUR).filter(v=>v.length!==3).length",
      "Object.values(window.OASIS_OBJETS_SERVEUR).filter(v=>v.length!==3).length",
    ],
  },

  'oasis-dates': {
    // `oasis-toast` pour que `valider` puisse dire la règle ; sans lui il se
    // tairait, et l'on mesurerait un silence des deux côtés.
    prealables: ['oasis-toast'],
    avant: "localStorage.setItem('pr_lang','fr');"
      // L'enveloppe est posée **avant** le chargement du fichier mesuré : c'est
      // la seule façon de compter ses inscriptions d'écouteurs.
      + "window.__ecouteurs=[];const __ael=EventTarget.prototype.addEventListener;"
      + "EventTarget.prototype.addEventListener=function(t,f,o){"
      + "if(this.id)window.__ecouteurs.push(this.id+':'+t);return __ael.call(this,t,f,o);};"
      + "document.write('<input id=\"an\" value=\"2026\">"
      + "<input id=\"d\" type=\"date\"><input id=\"f\" type=\"date\">');",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^oasis(Jour|Horodatage|Dates)/.test(n)).sort().join(',')",
      // ── La date du calendrier local : le défaut d'un jour à UTC+1 ──
      "oasisJour(new Date(2026,0,1,0,30))",
      "oasisHorodatage(new Date(2026,11,31,23,59,58))",
      "oasisJour(new Date('pas une date'))",
      "oasisHorodatage(new Date('pas une date'))",
      "typeof oasisJour() === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(oasisJour())",
      // ── Règle n° 1 : le début tombe dans l'année déclarée ──
      "(()=>{d.value='2025-06-01';f.value='';return JSON.stringify(oasisDatesControler({annee:'an',debut:'d',fin:'f'}).message);})()",
      "(()=>{d.value='2026-06-01';f.value='';return JSON.stringify(oasisDatesControler({annee:'an',debut:'d',fin:'f'}).message);})()",
      // L'année donnée telle quelle, non par un champ — le cas de l'activité d'un plan.
      "(()=>{d.value='2025-06-01';return JSON.stringify(oasisDatesControler({annee:2026,debut:'d'}).message);})()",
      "(()=>{d.value='2025-06-01';return JSON.stringify(oasisDatesControler({annee:'pas-une-annee',debut:'d'}).message);})()",
      // ── Règle n° 2 : la fin ne précède pas le début ──
      "(()=>{d.value='2026-06-10';f.value='2026-06-01';return JSON.stringify(oasisDatesControler({debut:'d',fin:'f'}).message);})()",
      "(()=>{d.value='2026-06-10';f.value='2026-06-10';return JSON.stringify(oasisDatesControler({debut:'d',fin:'f'}).message);})()",
      // Une échéance seule, rattachée à l'année — et seulement si on le demande.
      "(()=>{d.value='';f.value='2025-06-01';return [oasisDatesControler({annee:'an',fin:'f'}).message,oasisDatesControler({annee:'an',fin:'f',finDansAnnee:true}).message].join('|');})()",
      // ── Les langues ──
      "(()=>{d.value='2025-01-01';const r=[];for(const l of ['fr','en','pt','xx']){localStorage.setItem('pr_lang',l);r.push(oasisDatesControler({annee:'an',debut:'d'}).message);}localStorage.setItem('pr_lang','fr');return r.join(' ~ ');})()",
      "(()=>{window.CURRENT_LANG='en';const m=oasisDatesControler({debut:'d',fin:'f'});d.value='2026-06-10';f.value='2026-06-01';const v=oasisDatesControler({debut:'d',fin:'f'}).message;delete window.CURRENT_LANG;return v;})()",
      // ── Les bornes posées sur les champs ──
      "(()=>{d.value='2026-03-05';oasisDatesBorner({annee:'an',debut:'d',fin:'f'});return [d.min,d.max,f.min].join('|');})()",
      "(()=>{oasisDatesBorner({annee:'pas-une-annee',debut:'d',fin:'f'});return [d.min,d.max].join('|');})()",
      // ── La marque, et le fait qu'elle ne s'allume pas d'elle-même ──
      "(()=>{d.value='2025-06-01';f.value='';['an','d','f'].forEach(i=>document.getElementById(i).classList.remove('oasis-champ-invalide'));oasisDatesBorner({annee:'an',debut:'d',fin:'f'});return [an,d,f].map(e=>e.classList.contains('oasis-champ-invalide')).join(',');})()",
      "(()=>{d.value='2025-06-01';f.value='';const ok=oasisDatesValider({annee:'an',debut:'d',fin:'f'});return ok+'|'+[an,d,f].map(e=>e.classList.contains('oasis-champ-invalide')).join(',');})()",
      // La marque suit la correction, sans qu'on la lui demande.
      "(()=>{d.value='2026-06-01';oasisDatesBorner({annee:'an',debut:'d',fin:'f'});return [an,d,f].map(e=>e.classList.contains('oasis-champ-invalide')).join(',');})()",
      "(()=>{d.value='2026-06-01';f.value='2026-07-01';return oasisDatesValider({annee:'an',debut:'d',fin:'f'});})()",
      // ── Le branchement : un seul écouteur par champ et par événement ──
      "(()=>{oasisDatesLier({annee:'an',debut:'d',fin:'f'});oasisDatesLier({annee:'an',debut:'d',fin:'f'});return [an.dataset.oasisDates,d.dataset.oasisDates,f.dataset.oasisDates].join('|');})()",
      // Le marqueur `dataset` ne suffit pas à mesurer l'écouteur unique : `lier`
      // le pose dans les deux cas. On compte les **inscriptions réelles** —
      // `window.__ecouteurs` est posé par `avant`, qui enveloppe
      // `addEventListener` avant que le fichier ne soit chargé.
      "(()=>{window.__ecouteurs.length=0;['an','d','f'].forEach(i=>delete document.getElementById(i).dataset.oasisDates);oasisDatesLier({annee:'an',debut:'d',fin:'f'});const a=window.__ecouteurs.length;oasisDatesLier({annee:'an',debut:'d',fin:'f'});oasisDatesLier({annee:'an',debut:'d',fin:'f'});return a+'|'+window.__ecouteurs.length;})()",
      "(()=>{an.value='2027';an.dispatchEvent(new Event('input'));return [d.min,d.max].join('|');})()",
      // Rien ne doit lever sur une configuration vide ou absente.
      "JSON.stringify([oasisDatesControler(),oasisDatesControler({}),oasisDatesValider(),oasisDatesBorner()])",
    ],
  },

  'oasis-utils': {
    prealables: ['oasis-requete', 'oasis-commun', 'oasis-toast'],
    avant: "localStorage.setItem('pr_token','jeton-essai'); window.APP_STATE={lang:'fr'};",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^(api|escapeHtml|formatDate|showToast|_pesSearchInput)$/.test(n)).sort().join(',')",
      // `ICONS` est le cas qui a retenu ce fichier pour la fin : `const` au
      // premier niveau, donc globale **lexicale** et non propriété de `window`.
      // Après conversion il est posé sur `window`, ce qui le rend lisible des
      // deux façons — les ~90 lectures nues continuent, et `window.ICONS`
      // fonctionne enfin. La sonde vérifie les deux.
      "typeof ICONS",
      "typeof window.ICONS",
      "Object.keys(ICONS).length",
      "Object.keys(ICONS).sort().join(',')",
      "ICONS.shield === window.ICONS.shield",
      "formatDate(null)",
      "formatDate('2026-10-05T12:00:00Z')",
      "(()=>{window.APP_STATE={lang:'en'};const v=formatDate('2026-10-05T12:00:00Z');window.APP_STATE={lang:'fr'};return v;})()",
      "formatDate('pas une date')",
      "escapeHtml('<b>&\"x\"</b>')",
      "typeof showToast",
      // L'appel d'API : le jeton, les deux en-têtes, et la fusion des options.
      "(async()=>{let vu=null;const o=window.fetch;window.fetch=async(u,i)=>{vu={u,h:i.headers};return{status:200,ok:true,json:async()=>({ok:1})};};const r=await api('/api/x',{headers:{'X-Perso':'1'}});window.fetch=o;return JSON.stringify([r,vu.u,vu.h]);})()",
      // Un 401 doit lever, et appeler `oasisSessionPerdue`.
      "(async()=>{let perdue=0;const op=window.oasisSessionPerdue;window.oasisSessionPerdue=()=>{perdue++;};const o=window.fetch;window.fetch=async()=>({status:401,ok:false,json:async()=>({})});let msg='';try{await api('/api/x');}catch(e){msg=e.message;}window.fetch=o;window.oasisSessionPerdue=op;return perdue+'|'+msg;})()",
      // Un refus ordinaire lève avec le message du serveur, traduit par le socle.
      "(async()=>{const o=window.fetch;window.fetch=async()=>({status:400,ok:false,json:async()=>({error:'champ_requis'})});let msg='';try{await api('/api/x');}catch(e){msg=e.message;}window.fetch=o;return msg;})()",
    ],
    attendus: {
      'typeof window.ICONS': 'L’ancien `const ICONS` ne posait rien sur `window` ; '
        + 'le sas l’y pose. Le nom devient lisible des deux façons — c’est la correction '
        + 'du défaut qui avait vidé l’icône de la coquille DROITS.',
      'ICONS.shield === window.ICONS.shield': 'Même cause : la lecture par `window` '
        + 'levait, elle rend maintenant le même objet que la lecture nue.',
    },
  },
};

const nom = process.argv[2];
const jeu = JEUX[nom];
if (!jeu) {
  console.error(`Jeu de sondes inconnu : ${nom}\nDisponibles : ${Object.keys(JEUX).join(', ')}`);
  process.exit(2);
}

async function sonder(nav, base, repertoire) {
  const page = await nav.newPage();
  const incidents = [];
  page.on('pageerror', (e) => incidents.push(String(e.message).slice(0, 120)));
  // ── Le fuseau d'épreuve est **UTC+1**, et ce n'est pas un détail ──
  //
  // Le navigateur de Puppeteer tourne ici en `Africa/Ouagadougou`, c'est-à-dire
  // UTC+0 : l'heure locale et l'heure universelle y coïncident. Une sonde sur le
  // décalage d'un jour — le défaut que `jour()` et `horodatage()` existent pour
  // empêcher — ne peut alors **rien distinguer**. Mesuré : en remplaçant la
  // construction locale par `toISOString().slice(0,10)`, la comparaison restait
  // conforme.
  //
  // On émule donc le fuseau des instances concernées : Cotonou et Niamey sont à
  // UTC+1, et c'est là que minuit local tombe la veille à 23 h UTC.
  await page.emulateTimezone('Africa/Porto-Novo');
  await page.setRequestInterception(true);
  // La page porte les balises **elle-même** : `DOMContentLoaded` se déclenche
  // alors après les scripts, comme sur une vraie page. Voir l'en-tête.
  const balise = (r, f) => `<script src="/shared/${r}/${f}.js"><\/script>`;
  const corps = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
    + (jeu.avant ? `<script>${jeu.avant}<\/script>` : '')
    // Les préalables sont pris dans leur régime courant : converti s'il l'est,
    // d'origine sinon. C'est l'état réel des pages pendant la cohabitation.
    + (jeu.prealables || []).map((f) => balise(estConverti(f) ? 'app' : 'js', f)).join('')
    + balise(repertoire, nom)
    + '</body></html>';
  page.on('request', (r) => (r.url().endsWith('/__comparaison')
    ? r.respond({ status: 200, contentType: 'text/html', body: corps })
    : r.continue()));
  await page.goto(`${base}/__comparaison`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));
  const out = {};
  for (const s of jeu.sondes) {
    /* eslint-disable no-await-in-loop */
    // ── Une sonde qui ne rend jamais est un échec, non un silence ──
    //
    // `page.evaluate` attend indéfiniment : une promesse qui ne se résout pas
    // bloque l'outil, qui n'imprime alors rien du tout. Mesuré en retirant la
    // réponse à Échap d'`oasisConfirmer` — la sonde qui l'éprouve attendait une
    // promesse jamais tenue, l'outil restait muet, et le contre-essai passait
    // pour « ne mord pas ». C'est exactement le genre de silence qu'on traque
    // ailleurs ; il n'a pas sa place dans l'instrument de mesure.
    out[s] = await Promise.race([
      page.evaluate(
        `(async () => { try { return String(await (${s})); } catch (e) { return 'ERREUR: ' + e.message.slice(0,80); } })()`,
      ),
      new Promise((r) => setTimeout(() => r('SANS RÉPONSE : la sonde n’a jamais rendu (8 s)'), 8000)),
    ]);
  }
  await page.close();
  return { out, incidents };
}

function estConverti(f) {
  // eslint-disable-next-line global-require
  const fs = require('fs');
  // eslint-disable-next-line global-require
  const path = require('path');
  return fs.existsSync(path.join(__dirname, '..', 'frontend', 'socle', 'globales', `${f}.ts`));
}

(async () => {
  const srv = await demarrer({ port: 4781 });
  const nav = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const ancien = await sonder(nav, srv.base, 'js');
    const neuf = await sonder(nav, srv.base, 'app');
    const attendus = jeu.attendus || {};
    const nonDeclares = [];
    const attendusAbsents = new Set(Object.keys(attendus));
    for (const s of jeu.sondes) {
      const egal = ancien.out[s] === neuf.out[s];
      const declare = Object.prototype.hasOwnProperty.call(attendus, s);
      if (!egal && declare) attendusAbsents.delete(s);
      if (!egal && !declare) nonDeclares.push(s);
      const marque = egal ? '  =' : (declare ? '  ≈' : ' ≠≠');
      console.log(`${marque} ${s.slice(0, 96)}`);
      console.log(`      ${String(ancien.out[s]).slice(0, 180)}`);
      if (!egal) console.log(`      → ${String(neuf.out[s]).slice(0, 180)}`);
      if (!egal && declare) console.log(`      ↳ écart déclaré : ${attendus[s]}`);
    }
    attendusAbsents.forEach((s) => console.log(
      `  ⚠ écart déclaré qui ne s’est pas produit : ${s.slice(0, 90)}`,
    ));
    const ecarts = nonDeclares.length + attendusAbsents.size;
    // Une exception au chargement rendrait des sondes « identiques » et fausses :
    // les deux côtés échoueraient de la même façon.
    [['ancien', ancien], ['nouveau', neuf]].forEach(([quoi, r]) => {
      if (r.incidents.length) console.log(`  ⚠ ${quoi} — exceptions : ${r.incidents.join(' · ')}`);
    });
    const exceptions = ancien.incidents.length + neuf.incidents.length;
    const declares = Object.keys(attendus).length - attendusAbsents.size;
    console.log(`\n${ecarts === 0 ? 'CONFORME' : `${ecarts} ÉCART(S) NON DÉCLARÉ(S)`}`
      + ` — ${jeu.sondes.length} sondes, ${declares} écart(s) déclaré(s) et vérifié(s) — ${nom}`
      + (exceptions ? ` · ${exceptions} exception(s) au chargement` : ''));
    process.exitCode = ecarts === 0 && exceptions === 0 ? 0 : 1;
  } finally {
    await nav.close();
    await srv.arreter();
  }
})().catch((e) => { console.error(e); process.exit(1); });
