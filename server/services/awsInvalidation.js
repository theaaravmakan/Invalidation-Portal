// services/awsInvalidation.js (AWS SDK v3)
const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");

const AWS_REGION = "us-east-1"; // CloudFront control-plane region

async function runInvalidation(paths) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY;
  const distributionId = process.env.AWS_DISTRIBUTION_ID || process.env.DISTRIBUTION_ID;

  if (!distributionId) {
    throw new Error("Missing AWS_DISTRIBUTION_ID or DISTRIBUTION_ID env var");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)");
  }

  const client = new CloudFrontClient({
    region: AWS_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  const cmd = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  });

  return client.send(cmd);
}

module.exports = { runInvalidation };
