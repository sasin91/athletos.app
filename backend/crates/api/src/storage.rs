//! The object store that holds image bytes (ADR-0010).
//!
//! Deliberately a *narrow* interface — put, get-as-stream, delete, and nothing
//! else. In particular there is no method that produces a URL, presigned or
//! otherwise. ADR-0010 requires that every byte is proxied through Axum with
//! per-request authorization, and the cheapest way to keep that true is for the
//! capability to hand out a URL not to exist in the first place.
//!
//! The bucket is private. Nothing here grants an ACL, and nothing should.

use aws_sdk_s3::config::{BehaviorVersion, Credentials, Region};
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::get_object::GetObjectError;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;

use crate::config::ObjectStorageConfig;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    /// The key is not in the bucket. Its own variant because a missing object
    /// is a 404 to the caller, while every other failure is a 500 — conflating
    /// them would turn an outage into "the photo is gone".
    #[error("no such object")]
    NotFound,

    #[error("object storage failure: {0}")]
    Backend(String),
}

/// A handle on the bucket. Cheap to clone (the SDK client is internally
/// `Arc`-shared) and built once at startup, because constructing it resolves
/// credentials and TLS state that must not be rebuilt per request.
#[derive(Debug, Clone)]
pub struct ObjectStore {
    client: Client,
    bucket: String,
    key_prefix: String,
}

impl ObjectStore {
    /// Builds a client from our own configuration.
    ///
    /// Credentials are passed explicitly rather than through `aws-config`'s
    /// default chain. That chain would, on a miss, try environment variables,
    /// then a profile file, then the EC2/ECS instance-metadata endpoint — a set
    /// of fallbacks that in a self-hosted EU deployment (ADR-0011) can only
    /// produce a confusing failure or a request to the wrong place.
    pub fn new(config: &ObjectStorageConfig) -> Self {
        let credentials = Credentials::new(
            &config.access_key_id,
            &config.secret_access_key,
            None,
            None,
            "pixmyday-config",
        );

        let s3 = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(config.region.clone()))
            .endpoint_url(&config.endpoint)
            .credentials_provider(credentials)
            // MinIO serves `endpoint/bucket/key`; virtual-host addressing would
            // additionally need wildcard DNS for `bucket.localhost`.
            .force_path_style(config.force_path_style)
            .build();

        Self {
            client: Client::from_conf(s3),
            bucket: config.bucket.clone(),
            key_prefix: config.key_prefix.clone(),
        }
    }

    /// The full key for a logical path, including the configured prefix.
    ///
    /// Every call site goes through this rather than formatting keys by hand,
    /// so the test prefix that keeps parallel runs apart cannot be forgotten in
    /// one place and applied in another — which would leak objects that the
    /// cleanup step then fails to find.
    pub fn key(&self, path: &str) -> String {
        if self.key_prefix.is_empty() {
            path.to_owned()
        } else {
            format!("{}/{}", self.key_prefix.trim_end_matches('/'), path)
        }
    }

    pub async fn put(
        &self,
        key: &str,
        content_type: &str,
        bytes: Vec<u8>,
    ) -> Result<(), StorageError> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .content_type(content_type)
            .body(ByteStream::from(bytes))
            .send()
            .await
            .map_err(|error| StorageError::Backend(format!("{error:?}")))?;
        Ok(())
    }

    /// Opens an object for streaming.
    ///
    /// Returns the SDK's `ByteStream` rather than `Vec<u8>` on purpose: the
    /// serve handler passes it straight into the response body, so a master
    /// several megabytes wide never sits in the API's heap in full, once per
    /// concurrent reader.
    pub async fn get(&self, key: &str) -> Result<ByteStream, StorageError> {
        let object = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|error| match &error {
                SdkError::ServiceError(service) => match service.err() {
                    GetObjectError::NoSuchKey(_) => StorageError::NotFound,
                    _ if service.raw().status().as_u16() == 404 => StorageError::NotFound,
                    _ => StorageError::Backend(format!("{error:?}")),
                },
                _ => StorageError::Backend(format!("{error:?}")),
            })?;

        Ok(object.body)
    }

    /// Removes objects. Idempotent — S3 `DeleteObject` succeeds for a key that
    /// is not there, which is what makes retrying a half-finished erasure safe.
    pub async fn delete_many(&self, keys: &[String]) -> Result<(), StorageError> {
        // One request per key rather than `DeleteObjects`: a delete here is
        // three keys, and the batch API answers 200 with per-key errors in the
        // body, which is exactly the shape that gets a failure ignored.
        for key in keys {
            self.client
                .delete_object()
                .bucket(&self.bucket)
                .key(key)
                .send()
                .await
                .map_err(|error| StorageError::Backend(format!("{error:?}")))?;
        }
        Ok(())
    }
}
