package faves.learn.platform.ports;

/**
 * The federated identity provider: AWS Cognito or GCP Identity Platform.
 *
 * <p>Its only job is to authenticate a browser flow and hand back a normalised
 * {@link ProviderIdentity}. The application then mints its own session token
 * (PRD §3.2); the provider's token never travels further into the system.
 *
 * <p>Cognito and Identity Platform differ in token format and user-pool model
 * (PRD §7 caveat 2). Those differences are absorbed here and nowhere else.
 */
public interface FederatedIdentityProvider {

    /** The authorization URL to redirect the browser to for a given provider. */
    String authorizationUrl(String provider, String redirectUri, String state);

    /**
     * Exchange the code returned to the redirect URI for a normalised identity.
     * The returned {@code providerUserId} is the OIDC {@code sub} — the value
     * identities are keyed on (ADR 0002).
     */
    ProviderIdentity exchangeCode(String provider, String code, String redirectUri);

    /**
     * Normalised federated identity. {@code email} is informational only and
     * must never be used as a lookup or linking key (ADR 0002, ADR 0003).
     *
     * @param provider       "google" | "facebook" | "apple" | "spotify"
     * @param providerUserId OIDC {@code sub}
     * @param email          may be {@code null}
     * @param emailVerified  as asserted by the provider
     */
    record ProviderIdentity(String provider,
                            String providerUserId,
                            String email,
                            boolean emailVerified) {}
}
