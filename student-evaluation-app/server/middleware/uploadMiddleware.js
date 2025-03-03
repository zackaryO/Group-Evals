/**
 * @file uploadMiddleware.js
 * @description Provides a configured multer instance using in-memory storage.
 *              The actual S3 upload happens in the controller using AWS SDK v3.
 */

const multer = require('multer');

/**
 * Memory storage:
 * - No files are saved on disk. 
 * - The file is available in `req.file.buffer`.
 * - Suitable for images or small/medium files.
 *   (For large files, consider streaming or disk storage.)
 */
const storage = multer.memoryStorage();

/**
 * Initialize Multer with memory storage
 */
const upload = multer({ storage });

/**
 * Export helpers:
 *  - uploadSingle(fieldName): for single-file field in a form
 *  - uploadArray(fieldName, maxCount): for multiple files
 */
exports.uploadSingle = (fieldName) => upload.single(fieldName);
exports.uploadArray = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
