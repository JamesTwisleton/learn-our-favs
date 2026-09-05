package faves.learn.platform.ports;

/**
 * Secret storage: AWS Secrets Manager or GCP Secret Manager.
 *
 * <p>Spotify refresh tokens are held here, never in a database column
 * (PRD §3.2). The {@code spotify_links} table stores only the reference
 * returned by {@link #put}.
 */
public interface SecretStore {

    /** Store a secret value, returning an opaque reference to persist. */
    String put(String logicalName, String value);

    /** Resolve a reference previously returned by {@link #put}. */
    String get(String reference);

    void delete(String reference);
}
