/**
 * uploadMiddleware.js
 * Provides a configured multer instance for handling file uploads to AWS S3.
 */

const multer = require('multer');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const path = require('path');

// Load AWS credentials from .env (or environment variables on Render)
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_STORAGE_BUCKET_NAME,
  AWS_S3_CUSTOM_DOMAIN,
  AWS_REGION,
} = process.env;

/**
 * (Optional) Debug logs for verifying environment variables.
 * You may remove this in production if you prefer.
 */
// console.log('> AWS_ACCESS_KEY_ID:', AWS_ACCESS_KEY_ID ? 'AVAILABLE' : 'MISSING');
// console.log('> AWS_SECRET_ACCESS_KEY:', AWS_SECRET_ACCESS_KEY ? 'AVAILABLE' : 'MISSING');
// console.log('> AWS_STORAGE_BUCKET_NAME:', AWS_STORAGE_BUCKET_NAME || 'MISSING');
// console.log('> AWS_REGION:', AWS_REGION || 'MISSING');

// Explicit checks to avoid undefined variables
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

// Configure AWS
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const s3 = new AWS.S3();

/**
 * Multer configuration using multer-s3 to upload files to S3.
 * If AWS_STORAGE_BUCKET_NAME was empty, you'd get "Error: bucket is required",
 * so we check above to provide a clearer error message.
 */
const upload = multer({
  storage: multerS3({
    s3,
    bucket: AWS_STORAGE_BUCKET_NAME,
    acl: 'public-read', // or 'private' if you prefer
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Create a unique filename using date + original file extension
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueSuffix = Date.now().toString();
      cb(null, `inventory/${baseName}-${uniqueSuffix}${ext}`);
    },
  }),
});

// Export single-file and array-file upload middlewares
exports.uploadSingle = (fieldName) => upload.single(fieldName);
exports.uploadArray = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
