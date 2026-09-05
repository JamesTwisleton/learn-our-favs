package faves.learn.identity;

import faves.learn.platform.ports.FederatedIdentityProvider.ProviderIdentity;

import java.util.Optional;

/**
 * Supporting types for {@link IdentityLinkingService}. Kept together while the
 * persistence layer (JPA repositories, entities) is still to be written — the
 * service depends on these ports, not on Spring Data directly, so it stays
 * unit-testable against the ADR 0003 rule.
 */
final class IdentitySupport {
    private IdentitySupport() {}
}

/** Opaque application user id (UUIDv7 string; see db/migrations/README.md). */
record UserId(String value) {}

interface IdentityRepository {
    Optional<UserId> findUserByProviderSub(String provider, String providerUserId);

    void attach(UserId user, ProviderIdentity identity,
                IdentityLinkingService.LinkContext context);

    /** Update the stored display email. Never used for lookup (ADR 0002). */
    void refreshDisplayEmail(ProviderIdentity identity);
}

interface UserRepository {
    UserId createFromFirstIdentity(ProviderIdentity identity);
}

/** Thrown when a link would silently merge two distinct accounts (ADR 0003). */
class IdentityAlreadyLinkedException extends RuntimeException {
    IdentityAlreadyLinkedException(String provider) {
        super("This " + provider + " account is already linked to another user");
    }
}
