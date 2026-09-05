package faves.learn.messaging;

/**
 * The four Kafka topics (PRD §8). In non-production every name is prefixed by
 * branch so PR previews sharing the dev cluster do not steal each other's
 * messages (PRD §9, ADR 0018).
 */
public final class Topics {

    public static final String MEDIA_UPLOADED = "media.uploaded";
    public static final String CATALOGUE_INGEST_REQUESTED = "catalogue.ingest.requested";
    public static final String BAND_OVERLAP_INVALIDATED = "band.overlap.invalidated";
    public static final String NOTIFICATION_RAISED = "notification.raised";

    private Topics() {}

    /** Prefix a logical topic name for the current environment. */
    public static String resolve(String prefix, String logicalTopic) {
        return (prefix == null || prefix.isBlank() || "prod".equals(prefix))
                ? logicalTopic
                : prefix + "." + logicalTopic;
    }
}
