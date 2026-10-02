// Module « Exécution de la Surveillance » — contexte, paramètres du module,
// checklists, comptes prestataire et échanges Excel.
const XLSX = require('xlsx');
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');
const vues = require('./vues');
const { asynchrone } = require('../../route');
const instances = require('../../instances');
const { enregistrement } = require('../../valider');
const comptesPrestataire = require('../../comptes_prestataire');
const acteurs = require('./acteurs');
const { introuvable, requis, inconnu, reserve, refuser } = require('../../erreurs');

// Collections servies par le CRUD générique, comme `register_crud` dans PESSCO.
const CRUD = {
  'exec-checklists': { coll: 'checklists', prefixe: 'exc' },
  'exec-checklist-items': { coll: 'checklist_items', prefixe: 'exe' },
  'exec-checklist-statuts': { coll: 'checklist_statuts', prefixe: 'ecs' },
  'exec-checklist-sous-themes': { coll: 'checklist_sous_themes', prefixe: 'est' },
  'exec-checklist-responses': { coll: 'checklist_responses', prefixe: 'ecr' },
  // Rôles tenus au sein d'une équipe d'audit / inspection.
  'exec-roles-equipe': { coll: 'roles_equipe', prefixe: 'ere' },
};

// Comparaison tolérante aux accents et à la casse, utilisée par les imports.
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig } = deps;

  const refs = () => referentiels.getAll();
  const admin = (req) => R.isAdmin(req.user, referentiels);

  // ══════════════════════════════════════
  //  Contexte utilisateur
  // ══════════════════════════════════════
  // Vue « utilisateur » attendue par le front PESSCO : identifiant, rôle M3
  // reconstitué depuis les droits SURV, et domaines de rattachement.
  const vueUtilisateur = (u) => {
    const droits = moduleRights.getRights(R.MODULE, u.username);
    const domaines = [...new Set((droits.scopes || []).map((s) => s.domaine_id).filter(Boolean))];
    return {
      id: u.username, username: u.username,
      nom: u.nom || '', prenom: u.prenom || '', nom_utilisateur: u.username,
      email: u.email || '', role: u.role,
      role_m3: R.roleM3(u, referentiels),
      prestataire_id: u.prestataire_id || '',
      domaines, actif: u.active !== false, photo: u.photo || '',
    };
  };

  // Bascule AAC / Prestataire : état courant, joint au contexte pour que la
  // barre supérieure affiche les boutons au bon endroit et dans le bon état.
  const etatVue = async (req) => {
    const reel = req.userReel || req.user;
    if (!vues.peutBasculer(reel)) return { disponible: false, vue: 'aac', prestataire_id: '', prestataires: [] };
    const active = await vues.vueDe(reel.username);
    return {
      disponible: true,
      vue: active.vue,
      prestataire_id: active.prestataire_id || vues.prestataireParDefaut(),
      prestataires: (instances.refs(req.userReel || req.user, loadConfig).prestataires || [])
        .map((p) => ({ id: p.id, nom: p.nom, trigramme: p.trigramme })),
    };
  };

  // ── Instance regardée ──
  // L'application tourne pour une AAC ; ses écrans ne servent que ses
  // dossiers. Le super-administrateur prend en barre supérieure le poste d'une
  // autre instance, ou les regarde toutes — la vue régionale. Le choix suit le
  // compte réellement connecté, non celui que la vue Prestataire simule.
  const etatInstances = (req) => instances.etat(req.userReel || req.user, loadConfig);

  app.get(`${M}/context`, requireAuth, asynchrone(async (req, res) => {
    const reel = req.userReel || req.user;
    if (!moduleRights.accesAuModule(R.MODULE, reel.username)) {
      return res.status(403).json({ error: 'no_module_access' });
    }
    return res.json({
      user: vueUtilisateur(req.user),
      privilege: R.meilleurPrivilege(req.user, referentiels),
      vue: await etatVue(req),
      instance: etatInstances(req),
    });
  }));

  app.get(`${M}/moi`, requireAuth, (req, res) => res.json(vueUtilisateur(req.user)));

  app.get(`${M}/instance`, requireAuth, (req, res) => res.json(etatInstances(req)));

  app.put(`${M}/instance`, requireAuth, asynchrone(async (req, res) => {
    const reel = req.userReel || req.user;
    if (!instances.estRegional(reel)) {
      return reserve(res, 'super_admin_regional');
    }
    // Vide : la vue régionale. Sinon, une instance déclarée — le nom borne ce
    // que les écrans serviront, il ne s'invente pas.
    const demandee = String((req.body || {}).instance || '').trim();
    if (demandee && !instances.liste(loadConfig).includes(demandee)) {
      return inconnu(res, 'instance');
    }
    instances.definir(reel.username, demandee);
    return res.json({ status: 'ok', instance: demandee });
  }));

  app.get(`${M}/vue`, requireAuth, asynchrone(async (req, res) => res.json(await etatVue(req))));

  app.put(`${M}/vue`, requireAuth, asynchrone(async (req, res) => {
    const reel = req.userReel || req.user;
    if (!vues.peutBasculer(reel)) return reserve(res, 'super_admin');
    const d = req.body || {};
    if (!vues.VUES.includes(d.vue)) return inconnu(res, 'vue');
    const prestataireId = d.vue === 'prestataire'
      ? (d.prestataire_id || (await vues.vueDe(reel.username)).prestataire_id || vues.prestataireParDefaut())
      : '';
    if (d.vue === 'prestataire' && !prestataireId) {
      return res.status(400).json({ error: 'Aucun prestataire disponible pour la vue Prestataire' });
    }
    // Le prestataire choisi en barre supérieure doit exister : c'est lui qui
    // borne les données servies.
    if (prestataireId && !(refs().prestataires || []).some((p) => p.id === prestataireId)) {
      return inconnu(res, 'prestataire');
    }
    await vues.definirVue(reel.username, d.vue, prestataireId);
    return res.json({ status: 'ok', vue: d.vue, prestataire_id: prestataireId });
  }));

  app.get(`${M}/utilisateurs`, requireAuth, asynchrone(async (req, res) => {
    const retenue = instances.courante(req.userReel || req.user, loadConfig);
    res.json(instances.filtrer(auth.getUsers(), retenue, loadConfig).map(vueUtilisateur));
  }));

  app.get(`${M}/aac`, requireAuth,
    (req, res) => res.json(instances.aac(req.userReel || req.user, loadConfig)));

  // ══════════════════════════════════════
  //  Niveaux de constatation (criticités) et types de cas
  // ══════════════════════════════════════
  const parametre = (route, coll, prefixe, champs, tri) => {
    app.get(`${M}/${route}`, requireAuth, asynchrone(async (req, res) => {
      res.json((await db.list(coll)).slice().sort(tri));
    }));

    app.post(`${M}/${route}`, requireAuth, asynchrone(async (req, res) => {
      if (!admin(req)) return refuser(res);
      const d = req.body || {};
      if (!String(d.item || '').trim()) return requis(res, 'item');
      const rec = await db.insert(coll, { id: db.uid(prefixe).toUpperCase(), ...champs(d) });
      res.json({ id: rec.id, status: 'ok' });
    }));

    app.put(`${M}/${route}/:id`, requireAuth, asynchrone(async (req, res) => {
      if (!admin(req)) return refuser(res);
      const d = req.body || {};
      if (!String(d.item || '').trim()) return requis(res, 'item');
      if (!await db.update(coll, req.params.id, champs(d))) return introuvable(res, 'element');
      res.json({ status: 'ok' });
    }));

    app.delete(`${M}/${route}/:id`, requireAuth, asynchrone(async (req, res) => {
      if (!admin(req)) return refuser(res);
      await db.remove(coll, req.params.id);
      res.json({ status: 'ok' });
    }));
  };

  parametre('criticites', 'criticites', 'CRIT',
    (d) => ({
      item: String(d.item).trim(), alias: String(d.alias || '').trim(),
      niveau: parseInt(d.niveau, 10) || 0, delai_cloture: parseInt(d.delai_cloture, 10) || 0,
      ordre: parseInt(d.ordre, 10) || 0, statut: d.statut || 'actif',
    }),
    (a, b) => (a.ordre - b.ordre) || (b.niveau - a.niveau) || String(a.item).localeCompare(String(b.item)));

  parametre('types-cas', 'types_cas', 'TC',
    (d) => ({
      item: String(d.item).trim(), description: d.description || '',
      ordre: parseInt(d.ordre, 10) || 0, statut: d.statut || 'actif',
    }),
    (a, b) => (a.ordre - b.ordre) || String(a.item).localeCompare(String(b.item)));

  // ══════════════════════════════════════
  //  CRUD générique des collections de checklists
  // ══════════════════════════════════════
  Object.entries(CRUD).forEach(([route, { coll, prefixe }]) => {
    app.get(`${M}/${route}`, requireAuth, asynchrone(async (req, res) => res.json(await db.list(coll))));

    app.get(`${M}/${route}/:id`, requireAuth, asynchrone(async (req, res) => {
      const rec = await db.get(coll, req.params.id);
      if (!rec) return introuvable(res, 'element');
      res.json(rec);
    }));

    // Une réponse de checklist porte une clé par champ paramétré : sa forme
    // n'est pas connue d'avance et ne peut pas se décrire champ par champ. Le
    // socle la borne tout de même — nombre de champs, taille des valeurs — et
    // retire ce que le serveur seul écrit, dont l'identifiant : le client le
    // choisissait, et pouvait ainsi écrire sous la clé d'un autre.
    app.post(`${M}/${route}`, requireAuth, enregistrement(), asynchrone(async (req, res) => {
      // Les réponses de checklist sont saisies par les inspecteurs ; les
      // autres collections relèvent du paramétrage, donc de l'administrateur.
      const ouvert = coll === 'checklist_responses';
      if (!ouvert && !admin(req)) return refuser(res);
      if (ouvert && !R.canContribute(req.user, null, referentiels)) return refuser(res);
      const id = db.uid(prefixe);
      res.status(201).json({ status: 'ok', id: (await db.insert(coll, { ...req.valide, id })).id });
    }));

    app.put(`${M}/${route}/:id`, requireAuth, enregistrement(), asynchrone(async (req, res) => {
      const ouvert = coll === 'checklist_responses';
      if (!ouvert && !admin(req)) return refuser(res);
      if (ouvert && !R.canContribute(req.user, null, referentiels)) return refuser(res);
      if (!await db.update(coll, req.params.id, req.valide)) return introuvable(res, 'element');
      res.json({ status: 'ok' });
    }));

    app.delete(`${M}/${route}/:id`, requireAuth, asynchrone(async (req, res) => {
      const ouvert = coll === 'checklist_responses';
      if (!ouvert && !admin(req)) return refuser(res);
      if (ouvert && !R.canContribute(req.user, null, referentiels)) return refuser(res);
      await db.remove(coll, req.params.id);
      // Supprimer une checklist emporte ses items, sous-thèmes et réponses.
      if (coll === 'checklists') {
        await db.removeWhere('checklist_items', (x) => x.checklist_id === req.params.id);
        await db.removeWhere('checklist_sous_themes', (x) => x.checklist_id === req.params.id);
        await db.removeWhere('checklist_responses', (x) => x.checklist_id === req.params.id);
      }
      res.json({ status: 'ok' });
    }));
  });

  // ══════════════════════════════════════
  //  Échanges Excel des checklists
  // ══════════════════════════════════════
  const libelles = async (coll) => Object.fromEntries((await db.list(coll)).map((r) => [r.id, r.libelle || '']));
  const themesSupervision = () => Object.fromEntries((refs().themes_supervision || []).map((t) => [t.id, t.libelle || t.nom || '']));

  // Construit le classeur : titre en ligne 1, en-têtes en ligne 3, données ensuite.
  function classeur(titre, entetes, lignes, largeurs, onglet) {
    const grille = [[titre], [], entetes, ...lignes];
    const ws = XLSX.utils.aoa_to_sheet(grille);
    ws['!cols'] = largeurs.map((w) => ({ wch: w }));
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: entetes.length - 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, onglet);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  function envoyerClasseur(res, buffer, nom) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.send(buffer);
  }

  // Retrouve la ligne d'en-tête à partir de son premier intitulé.
  function lignesApresEntete(buffer, premierIntitule) {
    if (buffer.length > 8 * 1024 * 1024) throw new Error('fichier_trop_volumineux');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const grille = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
    const i = grille.findIndex((r, idx) => idx < 20 && norm(r && r[0]) === norm(premierIntitule));
    if (i < 0) return null;
    return grille.slice(i + 1).filter((r) => r.some((c) => String(c).trim() !== ''));
  }

  const nomFichier = (base, nom) => `${base}_${String(nom || 'checklist').replace(/[\\/]/g, '_').slice(0, 60)}.xlsx`;

  // ── Items d'une checklist ──
  const ENTETES_ITEMS = ['Ordre', 'Réf. Item', 'Thème', 'Sous-thème', 'Réf. Règlement', 'Description', 'Directives'];

  app.get(`${M}/checklists/:id/export-xlsx`, requireAuth, asynchrone(async (req, res) => {
    const cl = await db.get('checklists', req.params.id);
    if (!cl) return introuvable(res, 'checklist');
    const themes = themesSupervision();
    const sousThemes = await libelles('checklist_sous_themes');
    const lignes = (await db.list('checklist_items'))
      .filter((it) => it.checklist_id === cl.id)
      .sort((a, b) => (a.ordre - b.ordre) || String(a.id).localeCompare(String(b.id)))
      .map((it) => [
        Number(it.ordre) || 0, String(it.ref_item || ''),
        themes[it.theme_id] || '', sousThemes[it.sous_theme_id] || '',
        String(it.ref_reglement || ''), String(it.description || ''), String(it.directives || ''),
      ]);
    envoyerClasseur(res,
      classeur(`Checklist : ${cl.nom || ''}`, ENTETES_ITEMS, lignes, [8, 14, 20, 20, 28, 50, 50], 'Items'),
      nomFichier('checklist', cl.nom));
  }));

  app.post(`${M}/checklists/:id/import-xlsx`, requireAuth, multipart(), asynchrone(async (req, res) => {
    if (!admin(req)) return refuser(res);
    const cl = await db.get('checklists', req.params.id);
    if (!cl) return introuvable(res, 'checklist');
    const f = (req.files || {}).file;
    if (!f) return requis(res, 'fichier');
    if (!/\.xlsx$/i.test(f.filename || '')) return res.status(400).json({ error: 'Format non supporté — utilisez .xlsx' });
    const lignes = lignesApresEntete(f.buffer, 'Ordre');
    if (!lignes) return res.status(400).json({ error: "Format non reconnu — colonne 'Ordre' introuvable dans les 20 premières lignes." });

    const mode = String((req.body || {}).mode || 'replace').toLowerCase();
    const themesParLibelle = {};
    Object.entries(themesSupervision()).forEach(([id, lib]) => { if (lib) themesParLibelle[norm(lib)] = id; });
    const sousThemesParLibelle = {};
    (await db.list('checklist_sous_themes'))
      .filter((s) => s.checklist_id === cl.id && s.libelle)
      .forEach((s) => { sousThemesParLibelle[norm(s.libelle)] = s.id; });

    // ── Tout le classeur en une seule transformation ──
    //
    // C'était un retrait des items existants, **puis une écriture par ligne**. Une
    // checklist de deux cents items faisait deux cent une écritures, et entre
    // elles l'écran montrait une checklist à moitié remplacée — vide, pour
    // commencer. Un échec au milieu l'y laissait, et c'est sur cette liste que
    // l'inspecteur s'appuie sur le terrain.
    const nouveaux = lignes.map((r) => ({
      id: db.uid('exe'), checklist_id: cl.id,
      ref_item: String(r[1] || '').trim(),
      ref_reglement: String(r[4] || ''),
      description: String(r[5] || '').trim(),
      directives: String(r[6] || ''),
      theme_id: themesParLibelle[norm(r[2])] || '',
      sous_theme_id: sousThemesParLibelle[norm(r[3])] || '',
      statut_id: '', observations: '', ordre: parseInt(r[0], 10) || 0,
    }));
    await db.transformer((d) => {
      const garde = mode === 'replace'
        ? (d.checklist_items || []).filter((it) => it.checklist_id !== cl.id)
        : (d.checklist_items || []);
      d.checklist_items = garde.concat(nouveaux);
      return d;
    });
    res.json({ status: 'ok', imported: nouveaux.length, mode });
  }));

  // ── Checklist renseignée sur un dossier ──
  const ENTETES_FILL = ['Ordre', 'Réf. Item', 'Réf. Règlement', 'Thème', 'Sous-thème', 'Description', 'Directives', 'Statut', 'Observations'];

  app.get(`${M}/checklist-fill/:dossierId/:checklistId/export-xlsx`, requireAuth, asynchrone(async (req, res) => {
    const cl = await db.get('checklists', req.params.checklistId);
    if (!cl) return introuvable(res, 'checklist');
    const themes = themesSupervision();
    const sousThemes = await libelles('checklist_sous_themes');
    const statuts = await libelles('checklist_statuts');
    const reponses = {};
    (await db.list('checklist_responses'))
      .filter((r) => r.dossier_id === req.params.dossierId && r.checklist_id === cl.id)
      .forEach((r) => { reponses[r.item_id] = r; });
    const lignes = (await db.list('checklist_items'))
      .filter((it) => it.checklist_id === cl.id)
      .sort((a, b) => (a.ordre - b.ordre) || String(a.id).localeCompare(String(b.id)))
      .map((it) => {
        const r = reponses[it.id] || {};
        return [
          Number(it.ordre) || 0, String(it.ref_item || ''), String(it.ref_reglement || ''),
          themes[it.theme_id] || '', sousThemes[it.sous_theme_id] || '',
          String(it.description || ''), String(it.directives || ''),
          statuts[r.statut_id] || '', String(r.observations || ''),
        ];
      });
    envoyerClasseur(res,
      classeur(`Checklist : ${cl.nom || ''}`, ENTETES_FILL, lignes, [8, 14, 28, 20, 20, 44, 44, 22, 40], 'Checklist'),
      nomFichier('checklist_renseignee', cl.nom));
  }));

  app.post(`${M}/checklist-fill/:dossierId/:checklistId/import-xlsx`, requireAuth, multipart(), asynchrone(async (req, res) => {
    if (!R.canContribute(req.user, null, referentiels)) return refuser(res);
    const f = (req.files || {}).file;
    if (!f) return requis(res, 'fichier');
    if (!/\.xlsx$/i.test(f.filename || '')) return res.status(400).json({ error: 'Format non supporté — utilisez .xlsx' });
    const lignes = lignesApresEntete(f.buffer, 'Ordre');
    if (!lignes) return res.status(400).json({ error: "Format non reconnu — colonne 'Ordre' introuvable." });

    const { dossierId, checklistId } = req.params;
    const itemsParRef = {};
    (await db.list('checklist_items'))
      .filter((it) => it.checklist_id === checklistId)
      .forEach((it) => { const k = norm(it.ref_item); if (!(k in itemsParRef)) itemsParRef[k] = it.id; });
    const statutsParLibelle = {};
    (await db.list('checklist_statuts')).forEach((s) => { if (s.libelle) statutsParLibelle[norm(s.libelle)] = s.id; });
    const existantes = {};
    (await db.list('checklist_responses'))
      .filter((r) => r.dossier_id === dossierId && r.checklist_id === checklistId)
      .forEach((r) => { existantes[r.item_id] = r; });

    const maintenant = db.now();
    // Mêmes raisons qu'à l'import de la checklist : une écriture par ligne
    // montrait une checklist à moitié renseignée, et c'est le relevé sur lequel
    // l'inspecteur s'appuie. Les identifiants sont tirés **hors** de la
    // transformation, qui peut être rejouée.
    const aPoser = lignes
      .map((r) => ({ itemId: itemsParRef[norm(r[1])], r, id: db.uid('ecr') }))
      .filter((x) => x.itemId);
    await db.transformer((d) => {
      const liste = d.checklist_responses || [];
      aPoser.forEach(({ itemId, r, id }) => {
        const patch = {
          statut_id: statutsParLibelle[norm(r[7])] || '',
          observations: String(r[8] || ''),
          statut_resp: 'brouillon', date_maj: maintenant,
        };
        // L'existence se relit sur l'état qu'on écrit : une réponse posée entre
        // la lecture et l'écriture se serait doublée.
        const i = liste.findIndex((x) => x.dossier_id === dossierId
          && x.checklist_id === checklistId && x.item_id === itemId);
        if (i >= 0) liste[i] = { ...liste[i], ...patch };
        else liste.push({ id, dossier_id: dossierId, checklist_id: checklistId, item_id: itemId, ...patch });
      });
      d.checklist_responses = liste;
      return d;
    });
    res.json({ status: 'ok', imported: aPoser.length });
  }));

  // ── Sous-thèmes d'une checklist ──
  app.get(`${M}/checklists/:id/sous-themes/export-xlsx`, requireAuth, asynchrone(async (req, res) => {
    const cl = await db.get('checklists', req.params.id);
    if (!cl) return introuvable(res, 'checklist');
    const themes = themesSupervision();
    const lignes = (await db.list('checklist_sous_themes'))
      .filter((s) => s.checklist_id === cl.id)
      .sort((a, b) => (a.ordre - b.ordre) || String(a.libelle).localeCompare(String(b.libelle)))
      .map((s) => [themes[s.theme_id] || '', String(s.libelle || ''), Number(s.ordre) || 0]);
    envoyerClasseur(res,
      classeur(`Sous-thèmes — ${cl.nom || ''}`, ['Thème', 'Sous-thème', 'Ordre'], lignes, [34, 40, 10], 'Sous-themes'),
      nomFichier('sous_themes', cl.nom));
  }));

  app.post(`${M}/checklists/:id/sous-themes/import-xlsx`, requireAuth, multipart(), asynchrone(async (req, res) => {
    if (!admin(req)) return refuser(res);
    const cl = await db.get('checklists', req.params.id);
    if (!cl) return introuvable(res, 'checklist');
    const f = (req.files || {}).file;
    if (!f) return requis(res, 'fichier');
    if (!/\.xlsx$/i.test(f.filename || '')) return res.status(400).json({ error: 'Format non supporté — utilisez .xlsx' });
    const lignes = lignesApresEntete(f.buffer, 'Thème');
    if (!lignes) return res.status(400).json({ error: "Format non reconnu — colonne 'Thème' introuvable." });

    const themesParLibelle = {};
    Object.entries(themesSupervision()).forEach(([id, lib]) => { if (lib) themesParLibelle[norm(lib)] = id; });
    // Unicité par couple (thème, libellé) : un ré-import met à jour, il ne duplique pas.
    const existantes = {};
    (await db.list('checklist_sous_themes'))
      .filter((s) => s.checklist_id === cl.id)
      .forEach((s) => { existantes[`${s.theme_id}|${norm(s.libelle)}`] = s.id; });

    // Même geste unique que les deux imports précédents. L'unicité par couple
    // (thème, libellé) se relit **dans** la transformation : lue avant seulement,
    // un ré-import simultané aurait dupliqué ce qu'elle existe pour tenir unique.
    const aPoser = lignes
      .map((r) => ({
        libelle: String(r[1] || '').trim(),
        themeId: themesParLibelle[norm(r[0])],
        ordre: parseInt(r[2], 10) || 0,
        id: db.uid('est'),
      }))
      .filter((x) => x.libelle && x.themeId);
    await db.transformer((d) => {
      const liste = d.checklist_sous_themes || [];
      aPoser.forEach(({ libelle, themeId, ordre, id }) => {
        const i = liste.findIndex((s) => s.checklist_id === cl.id
          && s.theme_id === themeId && norm(s.libelle) === norm(libelle));
        if (i >= 0) liste[i] = { ...liste[i], libelle, ordre };
        else liste.push({ id, checklist_id: cl.id, theme_id: themeId, libelle, ordre });
      });
      d.checklist_sous_themes = liste;
      return d;
    });
    res.json({ status: 'ok', imported: aPoser.length });
  }));

  // ══════════════════════════════════════
  //  Mes utilisateurs — comptes rattachés au prestataire
  // ══════════════════════════════════════
  // Les routes vivent dans le socle (`src/comptes_prestataire.js`), partagées
  // avec les autres modules qui offrent cet écran. Le module n'en déclare que
  // ses libellés, ses droits et le champ où il les range.
  comptesPrestataire.register(app, deps, M, {
    module: R.MODULE,
    champDroits: 'droits_surv',
    droits: R.DROITS_PRESTATAIRE,
    roles: R,
    vueUtilisateur,
    logs: true,
    now: db.now,
    libelles: {
      admin: 'Administrateur du prestataire',
      aideAdmin: 'Gère les comptes de l’organisme et ses échanges avec l’Autorité.',
      agent: 'Utilisateur du prestataire',
      aideAgent: 'Accède à ce que l’administrateur de l’organisme lui confie.',
      sansRattachement: 'Aucun prestataire rattaché au compte',
    },
  });

  // ══════════════════════════════════════
  //  Processus — intervenants par secteur
  // ══════════════════════════════════════
  // Un processus dit, secteur par secteur, qui intervient à chaque étape ou
  // sous-étape : responsable d'activité, validateur, gestionnaire, supérieur
  // hiérarchique, et tout autre acteur que l'organisation juge utile. Le
  // module n'impose pas la liste des rôles : chaque étape porte ses acteurs.
  const peutProcessus = (req) => {
    const reel = ((req.userReel || req.user || {}).role || '');
    return ['SUPERADMIN', 'ADMIN'].includes(reel) || R.isAdmin(req.user, referentiels);
  };

  // Qui est attendu à une étape, pour l'afficher au fil d'avancement. Ouvert
  // à tout compte authentifié : savoir qui doit agir n'est pas un privilège.
  // `activite_id` ou `constatation_id` situe l'objet ; `etape` porte la clé.
  app.get(`${M}/processus/attendus`, requireAuth, asynchrone(async (req, res) => {
    const q = req.query || {};
    const cle = String(q.etape || '');
    if (!cle) return requis(res, 'etape');
    const perim = (prestataireId) => {
      const p = (refs().prestataires || []).find((x) => x.id === prestataireId) || {};
      const s = (refs().secteurs || []).find((x) => x.id === p.secteur_id) || {};
      return { secteur_id: p.secteur_id || '', domaine_id: p.domaine_id || s.domaine_id || '' };
    };
    let type = 'activite';
    let contexte = { secteur_id: q.secteur_id || '', domaine_id: q.domaine_id || '', dossier: null };
    if (q.constatation_id) {
      const c = await db.get('constatations', q.constatation_id);
      if (!c) return introuvable(res, 'constatation');
      type = 'constatation';
      const p = perim(c.prestataire_id);
      contexte = {
        secteur_id: p.secteur_id,
        domaine_id: c.domaine_id || p.domaine_id,
        dossier: c.dossier_id ? await db.get('dossiers', c.dossier_id) : null,
      };
    } else if (q.notification_id) {
      const n = await db.get('notifications', q.notification_id);
      if (!n) return introuvable(res, 'notification');
      const p = perim(n.prestataire_id);
      contexte = {
        secteur_id: n.secteur_id || p.secteur_id,
        domaine_id: n.domaine_id || p.domaine_id,
        dossier: (await db.list('dossiers')).find((d) => d.notification_id === n.id) || null,
      };
    }
    const a = await acteurs.attendus(type, contexte, cle);
    res.json({
      etape: cle,
      processus: a.processus ? { id: a.processus.id, libelle: a.processus.libelle } : null,
      declare: a.declare,
      lignes: a.lignes,
      // Les comptes servent à adresser un rappel à qui a réellement la main.
      // Réservés au côté AAC : un prestataire n'a pas à recevoir l'annuaire
      // des adresses de l'autorité.
      comptes: (req.user || {}).role === 'PRESTATAIRE' ? [] : a.comptes,
      // Le demandeur peut-il agir ? La réponse sert à griser les boutons.
      peut_agir: !await acteurs.refusEventuel(req.user, type, contexte, cle),
    });
  }));

  app.get(`${M}/processus`, requireAuth, asynchrone(async (req, res) => {
    if (!peutProcessus(req)) return reserve(res, 'admins_gestionnaires');
    res.json(await db.list('processus'));
  }));

  app.post(`${M}/processus`, requireAuth, asynchrone(async (req, res) => {
    if (!peutProcessus(req)) return reserve(res, 'admins_gestionnaires');
    const d = req.body || {};
    if (!String(d.libelle || '').trim()) return requis(res, 'libelle');
    if (!['activite', 'constatation'].includes(d.type)) {
      return inconnu(res, 'type_processus');
    }
    const rec = await db.insert('processus', {
      id: db.uid('proc'),
      libelle: String(d.libelle).trim(),
      type: d.type,
      secteur_id: d.secteur_id || '',
      domaine_id: d.domaine_id || '',
      description: d.description || '',
      // { "<etape>[:<sous-etape>]": [ { role, acteur_id, acteur_nom } ] }
      acteurs: d.acteurs && typeof d.acteurs === 'object' ? d.acteurs : {},
      actif: d.actif === false ? 0 : 1,
      created_by: req.user.username,
      date_creation: db.now(),
    });
    res.status(201).json(rec);
  }));

  app.put(`${M}/processus/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!peutProcessus(req)) return reserve(res, 'admins_gestionnaires');
    const d = req.body || {};
    const patch = {};
    ['libelle', 'type', 'secteur_id', 'domaine_id', 'description', 'acteurs', 'actif']
      .forEach((k) => { if (d[k] !== undefined) patch[k] = d[k]; });
    patch.date_maj = db.now();
    const rec = await db.update('processus', req.params.id, patch);
    return rec ? res.json(rec) : introuvable(res, 'processus');
  }));

  app.delete(`${M}/processus/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!peutProcessus(req)) return reserve(res, 'admins_gestionnaires');
    res.json({ status: await db.remove('processus', req.params.id) ? 'ok' : 'absent' });
  }));

  // Duplication : un processus déjà réglé sert de patron au suivant. Le
  // secteur visé est repris du corps, sinon la copie reste sur le même.
  app.post(`${M}/processus/:id/dupliquer`, requireAuth, asynchrone(async (req, res) => {
    if (!peutProcessus(req)) return reserve(res, 'admins_gestionnaires');
    const src = await db.get('processus', req.params.id);
    if (!src) return introuvable(res, 'processus');
    const d = req.body || {};
    const { id: _ignore, ...base } = src;
    const rec = await db.insert('processus', {
      ...base,
      id: db.uid('proc'),
      libelle: String(d.libelle || `${src.libelle} (copie)`).trim(),
      secteur_id: d.secteur_id !== undefined ? d.secteur_id : src.secteur_id,
      domaine_id: d.domaine_id !== undefined ? d.domaine_id : src.domaine_id,
      // Copie profonde : sans elle, les deux processus partageraient la même
      // table d'acteurs et se modifieraient l'un l'autre.
      acteurs: JSON.parse(JSON.stringify(src.acteurs || {})),
      duplique_de: src.id,
      created_by: req.user.username,
      date_creation: db.now(),
      date_maj: '',
    });
    res.status(201).json(rec);
  }));
};
