package int_.uemoa.ursac.oasis.droits;

import com.fasterxml.jackson.databind.JsonNode;
import int_.uemoa.ursac.oasis.journal.JournalDesModules;
import int_.uemoa.ursac.oasis.magasin.Magasin;
import int_.uemoa.ursac.oasis.securite.Sessions;
import int_.uemoa.ursac.oasis.securite.Utilisateur;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Le module « Gestion des Droits », en lecture.
 *
 * <p>Première tranche de la réécriture (ADR-002, jalon n° 6). Les huit routes
 * de lecture sont servies ; <strong>l'écriture ne l'est pas</strong>, et c'est
 * une contrainte du magasin, non un raccourci — voir
 * {@link #reglerLesDroits}.
 *
 * <p>Les formes rendues suivent celles de {@code src/module_rights.js} au
 * champ près : c'est le même front qui les lit, et il ne sait pas — il ne doit
 * pas savoir — qui les a servies.
 */
@RestController
@RequestMapping("/api/m/droits")
public class DroitsControleur {

  /** L'écran de droits est l'affaire de l'Autorité, jamais de l'organisme surveillé. */
  private static final List<String> ROLES_ORGANISME = List.of("PRESTATAIRE", "ADMIN_PRESTATAIRE");
  private static final List<String> ROLES_GESTION = List.of("SUPERADMIN", "ADMIN");

  private final Magasin magasin;
  private final Sessions sessions;
  private final MoteurDeDroits moteur;
  private final JournalDesModules journal;

  public DroitsControleur(Magasin magasin, Sessions sessions, MoteurDeDroits moteur,
      JournalDesModules journal) {
    this.magasin = magasin;
    this.sessions = sessions;
    this.moteur = moteur;
    this.journal = journal;
  }

  // ── Contexte ──────────────────────────────────────────────────────────────

  @GetMapping("/context")
  public ResponseEntity<?> contexte(HttpServletRequest requete,
      @RequestParam(name = "module", required = false, defaultValue = "") String module) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    if (ROLES_ORGANISME.contains(u.get().role())) {
      return refus(403, "reserve_autorite");
    }
    Map<String, Object> corps = new LinkedHashMap<>();
    corps.put("user", u.get().vuePublique());
    corps.put("aac", magasin.objet("../config/oasis.config").path("aac"));
    corps.put("instance", magasin.objet("../config/oasis.config").path("instance"));
    corps.put("privileges", moteur.privilegesDe(module.toUpperCase()));
    corps.put("scopePrivileges", MoteurDeDroits.PRIVILEGES_DE_PORTEE);
    corps.put("defaultPrivilege", MoteurDeDroits.PRIVILEGE_PAR_DEFAUT);
    corps.put("auditActions", JournalDesModules.ACTIONS);
    return ResponseEntity.ok(corps);
  }

  @GetMapping("/refs")
  public ResponseEntity<?> referentielsDePortee(HttpServletRequest requete) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    if (!ROLES_GESTION.contains(u.get().role())) {
      return refus(403, "forbidden");
    }
    List<Map<String, Object>> prestataires = new ArrayList<>();
    for (JsonNode p : moteur.referentiel("prestataires")) {
      Map<String, Object> vue = new LinkedHashMap<>();
      vue.put("id", p.path("id").asText(""));
      vue.put("nom", p.path("nom").asText(""));
      vue.put("trigramme", p.path("trigramme").asText(""));
      vue.put("secteur_id", p.path("secteur_id").asText(""));
      prestataires.add(vue);
    }
    prestataires.sort(Comparator.comparing(v -> String.valueOf(v.get("nom"))));

    Map<String, Object> corps = new LinkedHashMap<>();
    corps.put("domaines", moteur.referentiel("domaines"));
    corps.put("secteurs", moteur.referentiel("secteurs"));
    corps.put("prestataires", prestataires);
    return ResponseEntity.ok(corps);
  }

  // ── Le compte courant ─────────────────────────────────────────────────────

  @GetMapping("/{module}/me")
  public ResponseEntity<?> monPrivilege(HttpServletRequest requete, @PathVariable String module) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    String code = module.toUpperCase();
    Map<String, Object> corps = new LinkedHashMap<>();
    corps.put("module", code);
    List<String> modules = u.get().modules();
    if (modules == null || !modules.contains(code)) {
      corps.put("hasAccess", false);
      corps.put("privilege", "");
      corps.put("scopes", List.of());
      return ResponseEntity.ok(corps);
    }
    MoteurDeDroits.Droits r = moteur.droitsDe(code, u.get().identifiant());
    corps.put("hasAccess", true);
    corps.put("privilege", r.privilege());
    corps.put("scopes", r.portees());
    corps.put("isDefault", r.parDefaut());
    // Node étale l'enregistrement : quand il existe, il porte qui l'a posé et
    // quand. Un enregistrement par défaut n'en a pas, et ces deux champs sont
    // alors absents — non pas nuls. L'écran affiche « réglé par … le … » : les
    // omettre les ferait disparaître de la fiche.
    if (!r.parDefaut()) {
      corps.put("updatedAt", r.majLe());
      corps.put("updatedBy", r.majPar());
    }
    return ResponseEntity.ok(corps);
  }

  @GetMapping("/{module}/my-access")
  public ResponseEntity<?> monAcces(HttpServletRequest requete, @PathVariable String module) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    String code = module.toUpperCase();
    Map<String, Object> corps = new LinkedHashMap<>();
    List<String> modules = u.get().modules();
    if (modules == null || !modules.contains(code)) {
      corps.put("hasAccess", false);
      corps.put("privilege", "");
      corps.put("secteurs", Map.of());
      return ResponseEntity.ok(corps);
    }
    MoteurDeDroits.Droits base = moteur.droitsDe(code, u.get().identifiant());
    Map<String, String> secteurs = new LinkedHashMap<>();
    for (JsonNode s : moteur.referentiel("secteurs")) {
      secteurs.put(s.path("id").asText(""), moteur.privilegeEffectif(
          code, u.get().identifiant(), s.path("domaine_id").asText(""), s.path("id").asText("")));
    }
    corps.put("hasAccess", true);
    corps.put("privilege", base.privilege());
    corps.put("isDefault", base.parDefaut());
    corps.put("secteurs", secteurs);
    return ResponseEntity.ok(corps);
  }

  // ── Les comptes gérés ─────────────────────────────────────────────────────

  @GetMapping("/{module}/users")
  public ResponseEntity<?> comptesDuModule(HttpServletRequest requete, @PathVariable String module) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    if (!ROLES_GESTION.contains(u.get().role())) {
      return refus(403, "forbidden");
    }
    String code = module.toUpperCase();
    List<String> rolesGeres = moteur.rolesGeresDe(code);
    List<Map<String, Object>> liste = new ArrayList<>();
    for (Utilisateur c : sessions.comptes()) {
      List<String> modules = c.modules();
      if (!rolesGeres.contains(c.role()) || modules == null || !modules.contains(code)) {
        continue;
      }
      MoteurDeDroits.Droits r = moteur.droitsDe(code, c.identifiant());
      Map<String, Object> vue = new LinkedHashMap<>();
      vue.put("username", c.identifiant());
      vue.put("nom", c.nom());
      vue.put("prenom", c.prenom());
      vue.put("fullName", c.nomComplet());
      vue.put("email", c.courriel());
      vue.put("role", c.role());
      vue.put("active", c.actif());
      vue.put("prestataire_id", c.prestataireId());
      vue.put("privilege", r.privilege());
      vue.put("scopes", r.portees());
      vue.put("isDefault", r.parDefaut());
      vue.put("updatedAt", r.majLe());
      vue.put("updatedBy", r.majPar());
      liste.add(vue);
    }
    return ResponseEntity.ok(liste);
  }

  @GetMapping("/{module}/evaluateurs")
  public ResponseEntity<?> evaluateurs(HttpServletRequest requete, @PathVariable String module,
      @RequestParam(name = "domaine_id", required = false, defaultValue = "") String domaine,
      @RequestParam(name = "secteur_id", required = false, defaultValue = "") String secteur) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    String code = module.toUpperCase();
    List<String> eligibles = List.of("GESTIONNAIRE", "VALIDATEUR", "CONTRIBUTEUR");
    List<Map<String, Object>> liste = new ArrayList<>();
    for (Utilisateur c : sessions.comptes()) {
      List<String> modules = c.modules();
      // Le super-administrateur est un compte technique, non un évaluateur.
      if (!c.actif() || "SUPERADMIN".equals(c.role()) || modules == null || !modules.contains(code)) {
        continue;
      }
      String priv = moteur.privilegeEffectif(code, c.identifiant(), domaine, secteur);
      if (!eligibles.contains(priv)) {
        continue;
      }
      Map<String, Object> vue = new LinkedHashMap<>();
      vue.put("id", c.identifiant());
      vue.put("username", c.identifiant());
      vue.put("nom", c.nom());
      vue.put("prenom", c.prenom());
      vue.put("fullName", c.nomComplet());
      vue.put("email", c.courriel());
      vue.put("role", c.role());
      vue.put("privilege", priv);
      liste.add(vue);
    }
    liste.sort(Comparator.comparing(v -> String.valueOf(v.get("fullName"))));
    return ResponseEntity.ok(liste);
  }

  // ── Le journal du module ──────────────────────────────────────────────────

  @GetMapping("/{module}/audit")
  public ResponseEntity<?> journalDuModule(HttpServletRequest requete, @PathVariable String module,
      @RequestParam(required = false) String user,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Integer limit) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    if (!ROLES_GESTION.contains(u.get().role())) {
      return refus(403, "forbidden");
    }
    String code = module.toUpperCase();
    List<JsonNode> lignes = new ArrayList<>(journal.entrees(code));
    java.util.Collections.reverse(lignes);   // du plus récent au plus ancien

    String recherche = q == null ? "" : q.toLowerCase();
    List<JsonNode> retenues = lignes.stream()
        .filter(e -> user == null || user.equals(e.path("user").asText()))
        .filter(e -> action == null || action.equals(e.path("action").asText()))
        .filter(e -> from == null || e.path("ts").asText("").compareTo(from) >= 0)
        .filter(e -> to == null || e.path("ts").asText("").compareTo(to + "T23:59:59.999Z") <= 0)
        .filter(e -> recherche.isEmpty() || String.join(" ",
            e.path("user").asText(""), e.path("actionLabel").asText(""),
            e.path("objet").asText(""), e.path("ref").asText(""),
            String.valueOf(e.path("details"))).toLowerCase().contains(recherche))
        .toList();

    int plafond = Math.min(limit == null || limit <= 0 ? 500 : limit, 2000);
    Map<String, Object> corps = new LinkedHashMap<>();
    corps.put("total", retenues.size());
    corps.put("entries", retenues.subList(0, Math.min(plafond, retenues.size())));
    corps.put("integrity", journal.verifier(code));
    return ResponseEntity.ok(corps);
  }

  @GetMapping("/{module}/audit/verify")
  public ResponseEntity<?> verifierLaChaine(HttpServletRequest requete, @PathVariable String module) {
    Optional<Utilisateur> u = sessions.utilisateurDe(requete);
    if (u.isEmpty()) {
      return refus(401, "unauthenticated");
    }
    if (!ROLES_GESTION.contains(u.get().role())) {
      return refus(403, "forbidden");
    }
    return ResponseEntity.ok(journal.verifier(module.toUpperCase()));
  }

  // ── L'écriture, et pourquoi elle n'est pas là ─────────────────────────────

  /**
   * Régler les droits d'un compte : <strong>pas encore servi par Java</strong>,
   * et le dire franchement vaut mieux que de le servir mal.
   *
   * <p>Écrire demanderait deux choses que cette tranche ne peut pas faire sans
   * risque :
   *
   * <ul>
   *   <li><strong>Écrire {@code module_rights.json}</strong> pendant que Node
   *       le lit et l'écrit. Le magasin par fichiers n'a pas de verrou : lire,
   *       modifier, réécrire, et la modification de l'autre a disparu. Sans
   *       erreur, sans trace.</li>
   *   <li><strong>Ajouter au journal d'audit du module.</strong> Deux
   *       rédacteurs sur une chaîne SHA-256, c'est la chaîne rompue — ce
   *       qu'ADR-002 interdit nommément par la règle du sceau.</li>
   * </ul>
   *
   * <p>Un {@code 501} le dit à l'appelant plutôt qu'un {@code 404} qui
   * laisserait croire à une erreur d'adresse. La passerelle, elle, continue de
   * router cette route vers Node : c'est là qu'est l'écriture, et elle y reste
   * jusqu'au magasin partagé.
   */
  @PutMapping("/{module}/users/{username}")
  public ResponseEntity<?> reglerLesDroits(@PathVariable String module, @PathVariable String username) {
    Map<String, Object> corps = new LinkedHashMap<>();
    corps.put("error", "ecriture_non_migree");
    corps.put("detail", "Le réglage des droits reste servi par le socle Node : "
        + "deux écrivains sur le magasin par fichiers se perdent l'un l'autre, "
        + "et deux rédacteurs sur une chaîne d'audit la rompent (ADR-002).");
    return ResponseEntity.status(501).body(corps);
  }

  private ResponseEntity<Map<String, Object>> refus(int code, String erreur) {
    return ResponseEntity.status(code).body(Map.of("error", erreur));
  }
}
