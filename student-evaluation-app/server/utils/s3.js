
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');


const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_STORAGE_BUCKET_NAME;
const AWS_S3_CUSTOM_DOMAIN = process.env.AWS_S3_CUSTOM_DOMAIN;

const s3 = new S3Client({ region: REGION });

async function uploadBufferToS3(buffer, key, mime, client = s3) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mime,
  });
  await client.send(command);
  const baseUrl = AWS_S3_CUSTOM_DOMAIN || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
  return `${baseUrl}/${key}`;
}


async function deleteFromS3(key, client = s3) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await client.send(command);
}

module.exports = { uploadBufferToS3, deleteFromS3, s3 };

