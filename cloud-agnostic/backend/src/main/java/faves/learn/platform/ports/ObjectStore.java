package faves.learn.platform.ports;

import java.net.URI;
import java.time.Duration;

/**
 * Object storage: S3 on AWS, GCS on GCP, MinIO locally.
 *
 * <p>Media uploads use the claim-check pattern (ADR 0017): the client PUTs the
 * file straight to storage with a presigned URL, and only the object key
 * travels through Kafka.
 */
public interface ObjectStore {

    /** A time-limited URL the client can PUT a single object to. */
    URI presignedUpload(String objectKey, String contentType, Duration ttl);

    /** A time-limited URL the client can GET a single object from. */
    URI presignedDownload(String objectKey, Duration ttl);

    /** Remove an object. Used by account erasure and uploader-initiated delete. */
    void delete(String objectKey);

    boolean exists(String objectKey);
}
