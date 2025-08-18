// -----------------------------
// CDN Cache Invalidation Server
// -----------------------------

const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

// -----------------------------
// Config
// -----------------------------
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";
const PORT = process.env.PORT || 5000;

// Logs folder + file
const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "invalidation.log");

// ✅ API Gateway ka base URL (sirf /prod tak, end me /invalidate nahi)
const APIGW_URL =
  process.env.APIGW_URL ||
  "https://er304riwil.execute-api.ap-south-1.amazonaws.com/prod";

// Dev mode flag
const devMode = process.env.NODE_ENV !== "production";

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

  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ success: false, message: "Invalid request format. 'paths' must be an array." });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    user: req.user?.email || "unknown",
    role: req.user?.role || "unknown",
    paths,
  };

  try {
    if (devMode) {
      // ✅ Dev mode: just log to file
      fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
      return res.json({ success: true, message: "Simulated invalidation (dev mode)", logEntry });
    } else {
      // ✅ Production: forward to API Gateway
      console.log("Forwarding request to API Gateway:", `${APIGW_URL}/invalidate`);

      const gwRes = await fetch(`${APIGW_URL}/invalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": req.user?.email || "",
          "X-User-Role": req.user?.role || "",
        },
        body: JSON.stringify({ paths }),
      });

      const gwData = await gwRes.json();

      // ✅ Log to file
      fs.appendFileSync(LOG_FILE, JSON.stringify({ ...logEntry, gwResponse: gwData }) + "\n");

      return res.json(gwData);
    }
  } catch (err) {
    console.error("Error in /invalidate:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
  console.log(`Mode: ${devMode ? "Development (local logging)" : "Production (API Gateway)"}`);
});
