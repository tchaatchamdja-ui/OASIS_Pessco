package int_.uemoa.ursac.oasis.droits;

import com.fasterxml.jackson.databind.JsonNode;
import int_.uemoa.ursac.oasis.magasin.Magasin;
import int_.uemoa.ursac.oasis.securite.Sessions;
import int_.uemoa.ursac.oasis.securite.Utilisateur;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Le moteur de droits, porté depuis {@code src/module_rights.js}.
 *
 * <p>Il ne sert pas que l'écran « Gestion des Droits » : <strong>dix-sept
 * fichiers du socle Node l'interrogent</strong> pour décider ce qu'un compte
 * peut lire et écrire dans chacun des six modules. C'est un noyau, non un
 * module — et le manifeste de DROITS, qui déclare {@code provides: []} et
 * {@code requires: []}, le cache plutôt qu'il ne le dit.
 *
 * <p>Cette classe est donc la première pièce du socle Java, et non la
 * première pièce d'un module. Elle sera lue par tout ce qui suivra.
 *
 * <h2>Les règles, et l'ordre dans lequel elles s'appliquent</h2>
 *
 * <ol>
 *   <li><strong>L'accès au module d'abord.</strong> Le champ {@code modules}
 *       du compte est la première porte. Deux exceptions : un compte dont la
 *       liste n'a jamais été renseignée les garde tous — l'état antérieur à ce
 *       champ — et le super-administrateur, qui coche ces cases et ne peut pas
 *       s'enfermer dehors.</li>
 *   <li><strong>La portée la plus spécifique l'emporte</strong> :
 *       domaine + secteur, puis secteur seul, puis domaine seul, puis le
 *       privilège général.</li>
 *   <li><strong>Le domaine manquant se déduit du secteur.</strong> Sans cela,
 *       une portée posée par domaine resterait sans effet chaque fois que
 *       l'appelant ne transmet que le secteur — un droit refusé qu'on croyait
 *       accordé, et personne pour le dire.</li>
 * </ol>
 */
@Component
public class MoteurDeDroits {

  public static final List<String> PRIVILEGES =
      List.of("GESTIONNAIRE", "VALIDATEUR", "CONTRIBUTEUR", "LECTEUR");
  public static final List<String> PRIVILEGES_DE_PORTEE =
      List.of("GESTIONNAIRE", "VALIDATEUR", "CONTRIBUTEUR", "LECTEUR", "AUCUN");
  public static final String PRIVILEGE_PAR_DEFAUT = "LECTEUR";

  /**
   * L'échelle, du plus large au plus étroit. « PRESTATAIRE » n'y figure pas :
   * ce n'est pas un échelon mais un mode d'accès distinct — le compte ne voit
   * que les données de l'organisme auquel il est rattaché. Le laisser hors de
   * l'échelle fait que {@link #peut} le refuse pour les gestes de l'autorité,
   * et c'est au module d'ouvrir son propre périmètre.
   */
  private static final List<String> ECHELLE =
      List.of("GESTIONNAIRE", "VALIDATEUR", "CONTRIBUTEUR", "LECTEUR", "AUCUN");

  private static final List<String> ROLES_GERES = List.of("SUPERADMIN", "ADMIN", "AAC");

  private final Magasin magasin;
  private final Sessions sessions;

  public MoteurDeDroits(Magasin magasin, Sessions sessions) {
    this.magasin = magasin;
    this.sessions = sessions;
  }

  /** Les privilèges offerts par un module : deux d'entre eux servent aussi l'organisme surveillé. */
  public List<String> privilegesDe(String moduleCode) {
    if ("SURV".equals(moduleCode) || "RAMP".equals(moduleCode)) {
      List<String> avecPrestataire = new ArrayList<>(PRIVILEGES);
      avecPrestataire.add("PRESTATAIRE");
      return avecPrestataire;
    }
    return PRIVILEGES;
  }

  /** Les rôles que l'écran de droits gère pour un module. */
  public List<String> rolesGeresDe(String moduleCode) {
    if ("SURV".equals(moduleCode) || "RAMP".equals(moduleCode)) {
      List<String> avecAdminPrestataire = new ArrayList<>(ROLES_GERES);
      avecAdminPrestataire.add("ADMIN_PRESTATAIRE");
      return avecAdminPrestataire;
    }
    return ROLES_GERES;
  }

  /** Ce qui est enregistré pour un compte, tel qu'il est écrit. */
  public Droits droitsDe(String moduleCode, String identifiant) {
    JsonNode parModule = magasin.objet("module_rights").path(moduleCode);
    JsonNode rec = parModule.path(identifiant);
    if (rec.isMissingNode() || !rec.isObject()) {
      return new Droits(PRIVILEGE_PAR_DEFAUT, List.of(), true, null, null);
    }
    List<JsonNode> portees = new ArrayList<>();
    rec.path("scopes").forEach(portees::add);
    return new Droits(
        rec.path("privilege").asText(PRIVILEGE_PAR_DEFAUT),
        portees,
        false,
        rec.path("updatedAt").asText(null),
        rec.path("updatedBy").asText(null));
  }

  /** La première porte : « Accès aux modules ». */
  public boolean accesAuModule(String moduleCode, String identifiant) {
    Optional<Utilisateur> u = sessions.compte(identifiant);
    if (u.isEmpty()) {
      return false;
    }
    if ("SUPERADMIN".equals(u.get().role())) {
      return true;
    }
    List<String> modules = u.get().modules();
    return modules == null || modules.contains(moduleCode);
  }

  /** Le privilège effectif : la portée la plus spécifique l'emporte. */
  public String privilegeEffectif(String moduleCode, String identifiant, String domaineId, String secteurId) {
    if (!accesAuModule(moduleCode, identifiant)) {
      return "AUCUN";
    }
    Droits r = droitsDe(moduleCode, identifiant);
    String domaine = (domaineId != null && !domaineId.isBlank())
        ? domaineId
        : domaineDuSecteur(secteurId);
    boolean sansPortee = domaine.isBlank() && (secteurId == null || secteurId.isBlank());
    if (sansPortee) {
      return r.privilege();
    }
    if (secteurId != null && !secteurId.isBlank()) {
      for (JsonNode p : r.portees()) {
        String pd = p.path("domaine_id").asText("");
        if (secteurId.equals(p.path("secteur_id").asText(""))
            && (pd.isBlank() || domaine.isBlank() || pd.equals(domaine))) {
          return p.path("privilege").asText(r.privilege());
        }
      }
    }
    if (!domaine.isBlank()) {
      for (JsonNode p : r.portees()) {
        if (domaine.equals(p.path("domaine_id").asText(""))
            && p.path("secteur_id").asText("").isBlank()) {
          return p.path("privilege").asText(r.privilege());
        }
      }
    }
    return r.privilege();
  }

  /** Un compte a-t-il au moins ce privilège sur ce périmètre ? */
  public boolean peut(String moduleCode, String identifiant, String privilege, String domaineId, String secteurId) {
    if (!accesAuModule(moduleCode, identifiant)) {
      return false;
    }
    String effectif = privilegeEffectif(moduleCode, identifiant, domaineId, secteurId);
    if ("AUCUN".equals(effectif)) {
      return false;
    }
    int exige = ECHELLE.indexOf(privilege);
    int detenu = ECHELLE.indexOf(effectif);
    return detenu >= 0 && exige >= 0 && detenu <= exige;
  }

  private String domaineDuSecteur(String secteurId) {
    if (secteurId == null || secteurId.isBlank()) {
      return "";
    }
    for (JsonNode s : referentiel("secteurs")) {
      if (secteurId.equals(s.path("id").asText())) {
        return s.path("domaine_id").asText("");
      }
    }
    return "";
  }

  /** Une collection du référentiel du socle. */
  public List<JsonNode> referentiel(String nom) {
    JsonNode n = magasin.objet("referentiels").path(nom);
    if (!n.isArray()) {
      return List.of();
    }
    List<JsonNode> liste = new ArrayList<>();
    n.forEach(liste::add);
    return liste;
  }

  /** Ce qu'un compte a d'enregistré sur un module. */
  public record Droits(
      String privilege, List<JsonNode> portees, boolean parDefaut, String majLe, String majPar) {}
}
