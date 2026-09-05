package faves.learn.platform.local;

import faves.learn.config.AppProperties;
import faves.learn.platform.ports.ObjectStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

/**
 * Local object store backed by MinIO (docker-compose). This stub builds
 * path-style URLs against the MinIO endpoint; a real implementation would use
 * the MinIO / AWS S3 SDK to sign them. The AWS and GCP implementations produce
 * genuine presigned URLs — the claim-check upload (ADR 0017) works the same way
 * on all three.
 */
@Component
@ConditionalOnProperty(name = "app.cloud-provider", havingValue = "local")
public class LocalObjectStore implements ObjectStore {

    private final AppProperties props;
    private final Set<String> known = new HashSet<>();

    public LocalObjectStore(AppProperties props) {
        this.props = props;
    }

    @Override
    public URI presignedUpload(String objectKey, String contentType, Duration ttl) {
        known.add(objectKey);
        return objectUri(objectKey);
    }

    @Override
    public URI presignedDownload(String objectKey, Duration ttl) {
        return objectUri(objectKey);
    }

    @Override
    public void delete(String objectKey) {
        known.remove(objectKey);
    }

    @Override
    public boolean exists(String objectKey) {
        return known.contains(objectKey);
    }

    private URI objectUri(String objectKey) {
        return URI.create(props.objectStore().endpoint() + "/"
                + props.objectStore().bucket() + "/" + objectKey);
    }
}
