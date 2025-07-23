const assert = require('assert');

process.env.AWS_REGION = 'us-east-1';
process.env.AWS_STORAGE_BUCKET_NAME = 'test-bucket';
process.env.AWS_S3_CUSTOM_DOMAIN = 'https://cdn.example.com';

const { uploadBufferToS3 } = require('../server/utils/s3');

class FakeClient {
  async send(cmd) {
    this.cmd = cmd;
    return {};
  }
}

(async () => {
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_STORAGE_BUCKET_NAME = 'test-bucket';
  process.env.AWS_S3_CUSTOM_DOMAIN = 'https://cdn.example.com';

  const fake = new FakeClient();
  const url = await uploadBufferToS3(Buffer.from('hi'), 'path/file.txt', 'text/plain', fake);
  assert.strictEqual(fake.cmd.input.Bucket, 'test-bucket');
  assert.ok(url === 'https://cdn.example.com/path/file.txt');
  console.log('s3 util test passed');
})();
