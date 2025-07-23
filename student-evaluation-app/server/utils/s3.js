// ────────────────────────────────────────────────────────────────
// Path: server/utils/s3.js
// Purpose: Upload / delete objects in S3 and return a public URL
// Works with env vars:
//   AWS_REGION                – e.g. "us-east-2"
//   AWS_STORAGE_BUCKET_NAME   – bucket-name (no scheme)
//   AWS_S3_CUSTOM_DOMAIN      – optional CloudFront host (no scheme)
// ────────────────────────────────────────────────────────────────

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// ────────────────── Environment
const REGION   = process.env.AWS_REGION;
const BUCKET   = process.env.AWS_STORAGE_BUCKET_NAME;
const CF_HOST  = process.env.AWS_S3_CUSTOM_DOMAIN || ''; // may be blank

if (!REGION || !BUCKET) {
  throw new Error(
    'Missing AWS_REGION or AWS_STORAGE_BUCKET_NAME in environment. ' +
    'S3 uploads cannot proceed.'
  );
}

// ────────────────── S3 client (can be overridden in tests)
const s3 = new S3Client({ region: REGION });

// ────────────────── Helpers
/** Ensure host string is returned as absolute https:// URL  */
function toHttps(hostOrUrl) {
  if (!hostOrUrl) return '';
  return hostOrUrl.startsWith('http://') || hostOrUrl.startsWith('https://')
    ? hostOrUrl
    : `https://${hostOrUrl.replace(/^\/+/, '')}`; // strip leading slashes then prefix
}

/** Build the public URL for a stored object key */
function buildPublicUrl(key) {
  const base = CF_HOST ? toHttps(CF_HOST) : `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
  return `${base.replace(/\/$/, '')}/${key.replace(/^\/+/, '')}`;
}

// ────────────────── Public API
/**
 * Upload a Buffer to S3 and return its public URL.
 * @param {Buffer} buffer
 * @param {string} key          Object key (path/filename)
 * @param {string} [mime]       MIME type (defaults to application/octet-stream)
 * @param {S3Client} [client]
 * @returns {Promise<string>}   Public URL
 */
async function uploadBufferToS3(buffer, key, mime = 'application/octet-stream', client = s3) {
  if (!buffer || !key) throw new Error('uploadBufferToS3: buffer and key are required');

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mime,
  });

  await client.send(command);
  return buildPublicUrl(key);
}

/**
 * Delete an object from S3
 * @param {string} key
 * @param {S3Client} [client]
 */
async function deleteFromS3(key, client = s3) {
  if (!key) throw new Error('deleteFromS3: key is required');
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await client.send(command);
}

module.exports = { uploadBufferToS3, deleteFromS3, s3 };
