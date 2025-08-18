// -----------------------------
// CDN Cache Invalidation Server
// -----------------------------

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const axios = require("axios");
const { runInvalidation } = require("./services/awsInvalidation");

// -----------------------------
// Config
// -----------------------------
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";
const PORT = process.env.PORT || 5000;

// Logs folder + file
const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "invalidation.log");

// ✅ Base API Gateway URL (without /invalidate at end)
const APIGW_URL =
  process.env.APIGW_URL ||
  "https://er304riwil.execute-api.ap-south-1.amazonaws.com/prod/invalidate";

// Simulation flag (set SIMULATE=true to avoid hitting API Gateway)
const SIMULATE = String(process.env.SIMULATE || "false").toLowerCase() === "true";

// -----------------------------
// Express App Setup
// -----------------------------
const app = express();
app.use(bodyParser.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// -----------------------------
// Dummy User for Development
// -----------------------------
const USER = {
  email: "seo@company.com",
  password: "12345",
  name: "SEO Operator",
  role: "admin"
};

// -----------------------------
// JWT Auth Middleware
// -----------------------------
function verifyToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ success: false, message: "No token provided." });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Unauthorized." });
    req.user = decoded;
    next();
  });
}

// -----------------------------
// Ensure Logs Directory
// -----------------------------
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -----------------------------
// 🔹 Login Endpoint
// -----------------------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === USER.email && password === USER.password) {
    const token = jwt.sign(
      { email: USER.email, name: USER.name, role: USER.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
      user: { email: USER.email, name: USER.name, role: USER.role }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
});

// -----------------------------
// 🔹 Invalidate Endpoint
// -----------------------------
app.post("/invalidate", verifyToken, async (req, res) => {
  const { paths } = req.body;



  console.log(111, paths)

  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ success: false, message: "'paths' must be an array" });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    user: req.user?.email || "unknown",
    role: req.user?.role || "unknown",
    paths,
  };

  try {
    if (SIMULATE) {
      fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
      return res.json({ success: true, message: "Simulated invalidation (simulation mode)", logEntry });
    }

    // Optional direct AWS invalidation (bypasses API Gateway)
    if (String(process.env.USE_LOCAL_AWS || "false").toLowerCase() === "true") {
      try {
        const result = await runInvalidation(paths);
        const id = result?.Invalidation?.Id || result?.Invalidation?.Id;
        const status = result?.Invalidation?.Status || result?.Invalidation?.Status;
        fs.appendFileSync(
          LOG_FILE,
          JSON.stringify({ ...logEntry, result: { id, status }, mode: "local-aws" }) + "\n"
        );
        return res.status(200).json({ success: true, message: "Invalidation triggered", result: { id, status } });
      } catch (e) {
        console.error("Local AWS invalidation failed:", e);
        fs.appendFileSync(
          LOG_FILE,
          JSON.stringify({ ...logEntry, error: e?.message || String(e), mode: "local-aws" }) + "\n"
        );
        return res.status(500).json({ success: false, message: e?.message || String(e) });
      }
    }

    console.log("Forwarding request to API Gateway:", `${APIGW_URL}/invalidate`);

    let gwStatus;
    let gwDataRaw;
    try {
      const gwRes = await axios.post(
        `${APIGW_URL}/invalidate`,
        { paths },
        {
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": req.user?.email || "",
            "X-User-Role": req.user?.role || "",
          },
          validateStatus: () => true, // do not throw on non-2xx
        }
      );
      gwStatus = gwRes.status;
      gwDataRaw = gwRes.data;
    } catch (err) {
      // Network or axios-level error
      console.error("Axios error while calling API Gateway:", err?.message || err);
      return res.status(502).json({ success: false, message: `Gateway call failed: ${err?.message || String(err)}` });
    }

    let finalBody = gwDataRaw;
    if (gwDataRaw && typeof gwDataRaw.body === "string") {
      try {
        finalBody = JSON.parse(gwDataRaw.body);
      } catch {
        finalBody = { message: gwDataRaw.body };
      }
    }

    const httpStatus = (typeof gwDataRaw?.statusCode === "number" && gwDataRaw.statusCode) || gwStatus;

    fs.appendFileSync(
      LOG_FILE,
      JSON.stringify({ ...logEntry, gwStatus: httpStatus, gwEnvelope: gwDataRaw, finalBody }) + "\n"
    );

    // Fallback: if API Gateway rejects due to body mapping (e.g., "paths array required"),
    // try running the invalidation locally using AWS SDK v3
    const messageText = String(finalBody?.message || "").toLowerCase();
    const shouldFallback = httpStatus >= 400 || messageText.includes("paths array required");

    if (shouldFallback && String(process.env.USE_LOCAL_AWS_FALLBACK || "true").toLowerCase() === "true") {
      try {
        const result = await runInvalidation(paths);
        const id = result?.Invalidation?.Id || null;
        const status = result?.Invalidation?.Status || null;
        fs.appendFileSync(
          LOG_FILE,
          JSON.stringify({ ...logEntry, result: { id, status }, mode: "fallback-local-aws" }) + "\n"
        );
        return res.status(200).json({ success: true, message: "Invalidation triggered", result: { id, status } });
      } catch (e) {
        console.error("Fallback local AWS invalidation failed:", e);
        return res.status(httpStatus).json(finalBody);
      }
    }

    return res.status(httpStatus).json(finalBody);

  } catch (err) {
    console.error("Error in /invalidate:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// 🔹 Fetch Logs Endpoint
// -----------------------------
app.get("/logs", verifyToken, (req, res) => {
  try {
    const lines = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(l => l.trim() !== "")
      : [];

    const items = lines.map(l => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    }).reverse();

    res.json({ success: true, logs: items });
  } catch (err) {
    console.error("Error reading logs:", err);
    res.status(500).json({ success: false, message: "Could not read logs" });
  }
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, () => {
  console.log(`✅ CDN Invalidation Server running at http://localhost:${PORT}`);
  console.log(
    `Mode: ${SIMULATE ? "Simulation (local logging)" : `Forwarding to API Gateway: ${APIGW_URL}`}`
  );
});
