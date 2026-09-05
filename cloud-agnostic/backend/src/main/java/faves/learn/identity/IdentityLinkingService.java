package faves.learn.identity;

import faves.learn.platform.ports.FederatedIdentityProvider.ProviderIdentity;

import java.util.Optional;

/**
 * Turns a federated {@link ProviderIdentity} into an application user, and
 * attaches additional providers to an existing user.
 *
 * <p><strong>The rule that matters (ADR 0003): identities are never
 * auto-linked by email.</strong> A new provider identity with no match on
 * {@code (provider, providerUserId)} always creates a <em>new</em> user.
 * Attaching a second provider to an existing user happens only from an
 * already-authenticated session.
 *
 * <p>Without this, an attacker registers a provider account carrying a
 * victim's email, signs in, and is silently attached to the victim's account.
 */
public class IdentityLinkingService {

    private final IdentityRepository identities;
    private final UserRepository users;

    public IdentityLinkingService(IdentityRepository identities, UserRepository users) {
        this.identities = identities;
        this.users = users;
    }

    /**
     * Sign-in path. No authenticated session yet.
     *
     * <ul>
     *   <li>Known {@code (provider, sub)} → return that user.</li>
     *   <li>Unknown → create a new user and identity. Never attach to an
     *       existing user, whatever the email says.</li>
     * </ul>
     */
    public UserId resolveOnSignIn(ProviderIdentity incoming) {
        Optional<UserId> existing =
                identities.findUserByProviderSub(incoming.provider(), incoming.providerUserId());
        if (existing.isPresent()) {
            identities.refreshDisplayEmail(incoming);   // display only (ADR 0002)
            return existing.get();
        }
        UserId newUser = users.createFromFirstIdentity(incoming);
        identities.attach(newUser, incoming, LinkContext.SIGN_IN_NEW_ACCOUNT);
        return newUser;
    }

    /**
     * Linking path. The caller is already authenticated as {@code currentUser}
     * and has just completed a provider flow for a second provider.
     *
     * @throws IdentityAlreadyLinkedException if the incoming {@code (provider,
     *         sub)} already belongs to a different user — never silently merge.
     */
    public void linkToCurrentUser(UserId currentUser, ProviderIdentity incoming) {
        Optional<UserId> owner =
                identities.findUserByProviderSub(incoming.provider(), incoming.providerUserId());
        if (owner.isPresent() && !owner.get().equals(currentUser)) {
            throw new IdentityAlreadyLinkedException(incoming.provider());
        }
        if (owner.isEmpty()) {
            identities.attach(currentUser, incoming, LinkContext.AUTHENTICATED_LINK);
        }
    }

    enum LinkContext { SIGN_IN_NEW_ACCOUNT, AUTHENTICATED_LINK }
}
