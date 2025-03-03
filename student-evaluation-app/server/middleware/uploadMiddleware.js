/**
 * @file uploadMiddleware.js
 * @description Provides a configured multer instance (using multer-s3) for uploading files to AWS S3.
 *              Exports functions for handling single or multiple file fields.
 */

const multer = require('multer');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const path = require('path');

// Load AWS credentials from environment variables
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_STORAGE_BUCKET_NAME,
  AWS_REGION,
} = process.env;

/**
 * Safety checks to ensure required env vars exist.
 */
if (!AWS_ACCESS_KEY_ID) {
  throw new Error('Missing AWS_ACCESS_KEY_ID in environment variables.');
}
if (!AWS_SECRET_ACCESS_KEY) {
  throw new Error('Missing AWS_SECRET_ACCESS_KEY in environment variables.');
}
if (!AWS_STORAGE_BUCKET_NAME) {
  throw new Error('Missing AWS_STORAGE_BUCKET_NAME in environment variables.');
}
if (!AWS_REGION) {
  throw new Error('Missing AWS_REGION in environment variables.');
}

/**
 * Configure AWS SDK with region and credentials.
 */
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

/**
 * Create S3 instance
 */
const s3 = new AWS.S3();

/**
 * Create a multer upload handler configured for S3.
 */
const upload = multer({
  storage: multerS3({
    s3,
    bucket: AWS_STORAGE_BUCKET_NAME,
    acl: 'public-read', // 'private' if you want more restricted access
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Generate a unique filename: "inventory/{baseName}-{timestamp}{ext}"
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueSuffix = Date.now().toString();
      cb(null, `inventory/${baseName}-${uniqueSuffix}${ext}`);
    },
  }),
});

/**
 * Exports
 * - uploadSingle(fieldName) for single-file field
 * - uploadArray(fieldName, maxCount) for multiple files
 */
exports.uploadSingle = (fieldName) => upload.single(fieldName);
exports.uploadArray = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
