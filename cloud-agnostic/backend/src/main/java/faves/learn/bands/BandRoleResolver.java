package faves.learn.bands;

import java.util.Optional;

/**
 * Resolves a user's role in a band <em>per request</em> (ADR 0004).
 *
 * <p>Band role is never a session-token claim: membership is volatile (people
 * join, get promoted, leave; ownership auto-transfers). The result is read from
 * the relational database and cached in Redis with a short TTL and explicit
 * invalidation on any membership write.
 *
 * <p>This is band scope only. Platform scope ({@code is_staff}) is a separate
 * authority checked separately (ADR 0005) and is never consulted here.
 */
public interface BandRoleResolver {

    enum BandRole { OWNER, ADMIN, MEMBER }

    /** Empty when the user is not a member of the band. */
    Optional<BandRole> roleOf(String userId, String bandId);

    /** Drop any cached role for this band (called after a membership write). */
    void invalidate(String bandId);
}
