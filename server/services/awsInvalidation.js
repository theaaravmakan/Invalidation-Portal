// services/awsInvalidation.js
const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: "us-east-1",
});

const cloudfront = new AWS.CloudFront();

async function runInvalidation(paths) {
  const params = {
    DistributionId: process.env.AWS_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  };

  return cloudfront.createInvalidation(params).promise();
}

module.exports = { runInvalidation };
