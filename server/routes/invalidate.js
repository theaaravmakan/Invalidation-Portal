const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");

// 🛠 Example: In a real scenario, this comes from JWT or session
const currentUser = {
  email: "test@company.com",
  role: "admin", // or "admin"
};

// 🕒 Middleware for role & time restriction
function timeAccess(role) {
  return (req, res, next) => {
    // ✅ DEV MODE → always allow access
    const devMode = true; // change to false when deploying

    if (devMode) {
      return next();
    }

    if (role === "admin") {
      return next();
    } else {
      // Time restriction logic (only runs if devMode = false)
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      const inNoonSlot = hours === 12 || (hours === 13 && minutes === 0);
      const inNightSlot = hours === 20 || (hours === 21 && minutes === 0);

      if (inNoonSlot || inNightSlot) {
        return next();
      } else {
        return res
          .status(403)
          .json({ error: "Access restricted to specific time windows" });
      }
    }
  };
}

router.post("/", roleAndTimeAccess(currentUser.role), async (req, res) => {
  const { accessKeyId, secretAccessKey, distributionId, paths } = req.body;

  if (!accessKeyId || !secretAccessKey || !distributionId || !paths) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region: "us-east-1", // CloudFront default
  });

  const cloudfront = new AWS.CloudFront();

  const params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  };

  try {
    const data = await cloudfront.createInvalidation(params).promise();
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
