package int_.uemoa.ursac.oasis.magasin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * L'adresse de la base, traduite pour JDBC.
 *
 * <p>Node et Java lisent la même variable {@code DATABASE_URL}, et ne la
 * comprennent pas de la même façon. Une traduction fausse ne se voit pas : elle
 * se solde par un refus de connexion au démarrage, loin de sa cause. D'où ces
 * contrôles — ils sont la seule chose qui tienne la correspondance.
 */
class AdressePostgresTest {

  @Test
  @DisplayName("l'adresse que Node reçoit est traduite pour JDBC")
  void formeOrdinaire() {
    AdressePostgres a = AdressePostgres.depuis("postgres://oasis:motdepasse@serveur:5432/oasis");
    assertEquals("jdbc:postgresql://serveur:5432/oasis", a.jdbc());
    assertEquals("oasis", a.utilisateur());
    assertEquals("motdepasse", a.motDePasse());
  }

  @Test
  @DisplayName("postgresql:// est accepté comme postgres://")
  void autreSchema() {
    assertEquals("jdbc:postgresql://h:5432/b",
        AdressePostgres.depuis("postgresql://u:p@h:5432/b").jdbc());
  }

  @Test
  @DisplayName("sans port, le port de PostgreSQL")
  void portParDefaut() {
    assertEquals("jdbc:postgresql://serveur:5432/oasis",
        AdressePostgres.depuis("postgres://u:p@serveur/oasis").jdbc());
  }

  @Test
  @DisplayName("sans identifiants, aucun n'est inventé")
  void sansIdentifiants() {
    AdressePostgres a = AdressePostgres.depuis("postgres://serveur:5433/oasis");
    assertEquals("jdbc:postgresql://serveur:5433/oasis", a.jdbc());
    assertNull(a.utilisateur());
    assertNull(a.motDePasse());
  }

  @Test
  @DisplayName("un utilisateur sans mot de passe reste un utilisateur")
  void utilisateurSeul() {
    AdressePostgres a = AdressePostgres.depuis("postgres://oasis@serveur/base");
    assertEquals("oasis", a.utilisateur());
    assertNull(a.motDePasse());
  }

  @Test
  @DisplayName("la requête est reportée telle quelle — sslmode y vit")
  void requeteReportee() {
    assertEquals("jdbc:postgresql://h:5432/b?sslmode=require",
        AdressePostgres.depuis("postgres://u:p@h:5432/b?sslmode=require").jdbc());
  }

  @Test
  @DisplayName("sans adresse, le régime des fichiers — et ce n'est pas une erreur")
  void sansAdresse() {
    assertNull(AdressePostgres.depuis(null));
    assertNull(AdressePostgres.depuis(""));
    assertNull(AdressePostgres.depuis("   "));
  }

  @Test
  @DisplayName("une adresse déjà en jdbc: n'est pas retouchée")
  void dejaJdbc() {
    AdressePostgres a = AdressePostgres.depuis("jdbc:postgresql://h/b");
    assertEquals("jdbc:postgresql://h/b", a.jdbc());
  }

  /**
   * Refuser plutôt que démarrer sur le mauvais régime : une adresse donnée mais
   * incomprise voudrait dire qu'on sert des fichiers alors que l'opérateur
   * croyait servir une base. Personne ne s'en apercevrait avant longtemps.
   */
  @Test
  @DisplayName("une adresse donnée mais incomprise arrête le démarrage")
  void adresseIncomprise() {
    assertThrows(IllegalArgumentException.class,
        () -> AdressePostgres.depuis("mysql://u:p@h/b"));
    assertThrows(IllegalArgumentException.class,
        () -> AdressePostgres.depuis("postgres://u:p@h:5432/"));
  }

  @Test
  @DisplayName("un message d'erreur ne porte jamais le mot de passe")
  void motDePasseJamaisCite() {
    IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
        () -> AdressePostgres.depuis("mysql://oasis:TRES-SECRET@h/b"));
    assertFalse(e.getMessage().contains("TRES-SECRET"), e.getMessage());
    assertTrue(e.getMessage().contains("oasis"), e.getMessage());

    // Et pas davantage dans une trace.
    String trace = AdressePostgres.depuis("postgres://oasis:TRES-SECRET@h/b").toString();
    assertFalse(trace.contains("TRES-SECRET"), trace);
  }
}
