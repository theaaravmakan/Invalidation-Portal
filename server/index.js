// server/index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// AWS SDK v3 CloudFront client
const {
  CloudFrontClient,
  CreateInvalidationCommand,
} = require("@aws-sdk/client-cloudfront");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Config ----------
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";
const PORT = process.env.PORT || 5000;
const LOG_FILE = path.join(__dirname, "logs", "invalidation.log");
const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID || ""; // CloudFront distribution ID

// ensure logs folder exists
fs.mkdirSync(path.join(__dirname, "logs"), { recursive: true });

// ---------- Dummy login ----------
const USER = {
  email: process.env.TEST_USER_EMAIL || "seo@company.com",
  password: process.env.TEST_USER_PASSWORD || "12345",
  name: "SEO Operator",
};

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === USER.email && password === USER.password) {
    const token = jwt.sign({ email, name: USER.name }, JWT_SECRET, {
      expiresIn: "8h",
    });
    return res.json({
      success: true,
      token,
      user: { email: USER.email, name: USER.name },
    });
  }
  return res
    .status(401)
    .json({ success: false, message: "Invalid credentials" });
});

// ---------- Middleware: verify JWT ----------
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res
      .status(401)
      .json({ success: false, message: "Invalid auth format" });

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

// ---------- Middleware: time gate (IST) ----------
// ---------- Middleware: time gate (IST) ----------
function timeGate(req, res, next) {
  const devMode = true; // ✅ change to false when deploying

  if (devMode) {
    return next();
  }

  // Allowed windows (IST): 12:00-13:00 and 20:00-21:00
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000; // +5:30
  const ist = new Date(utc + istOffset);
  const hour = ist.getHours();

  const inWindow = hour === 12 || hour === 20;
  if (!inWindow) {
    return res.status(403).json({
      success: false,
      message:
        "Access not allowed at this time. Allowed: 12:00-13:00 & 20:00-21:00 IST",
    });
  }
  next();
}

// ---------- Helper: append log ----------
function appendLog(entry) {
  try {
    const line = JSON.stringify(entry);
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (e) {
    console.error("Failed to write log", e);
  }
}

// ---------- GET /logs (protected) ----------
app.get("/logs", verifyToken, (req, res) => {
  const lines = fs.existsSync(LOG_FILE)
    ? fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean)
    : [];
  const items = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    })
    .reverse();
  res.json({ success: true, logs: items });
});

// ---------- POST /invalidate (protected + time-gate) ----------
app.post("/invalidate", verifyToken, timeGate, async (req, res) => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide paths array (e.g. ['/index.html'] or ['/*'])",
    });
  }

  if (!DISTRIBUTION_ID) {
    return res.status(500).json({
      success: false,
      message: "Server not configured with DISTRIBUTION_ID",
    });
  }

  const cloudfront = new CloudFrontClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const params = {
    DistributionId: DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: `portal-${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  };

  try {
    const command = new CreateInvalidationCommand(params);
    const data = await cloudfront.send(command);

    const logEntry = {
      time: new Date().toISOString(),
      user: req.user?.email || "unknown",
      paths,
      distributionId: DISTRIBUTION_ID,
      result: {
        id: data.Invalidation?.Id || null,
        status: data.Invalidation?.Status || null,
      },
    };
    appendLog(logEntry);
    return res.json({ success: true, data: logEntry });
  } catch (err) {
    console.error("CloudFront error:", err);
    const logEntry = {
      time: new Date().toISOString(),
      user: req.user?.email || "unknown",
      paths,
      distributionId: DISTRIBUTION_ID,
      error: err.message || String(err),
    };
    appendLog(logEntry);
    return res.status(500).json({
      success: false,
      message: "Invalidation failed",
      error: err.message,
    });
  }
});

// ---------- Test route ----------
app.get("/api/test", (req, res) =>
  res.json({ message: "Backend se hello! 🚀" })
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
