import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_GATEWAY_URL = "https://er304riwil.execute-api.ap-south-1.amazonaws.com/prod/invalidate"; 

const Dashboard = () => {
  const navigate = useNavigate();
  const [paths, setPaths] = useState("/*");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("invalidate");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) navigate("/");
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchLogs = async () => {
    try {
      if (!token) return;
      
      const res = await fetch("/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        console.error("Logs fetch failed:", res.status, res.statusText);
        return;
      }
      
      const data = await res.json();
      if (data.success) setLogs(data.logs.reverse()); // latest first
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleInvalidate = async () => {
    const arr = paths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    if (arr.length === 0)
      return showToast("error", "Bhai koi path to daal de pehle!");

    if (!window.confirm(`Confirm invalidate ${arr.length} path(s)?`)) return;

    setLoading(true);
    try {
      console.log("Sending body:", JSON.stringify({ paths: arr }));

      const res = await fetch(API_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paths: arr }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        console.error("Invalidate request failed:", res.status, res.statusText);
        const errorText = await res.text();
        console.error("Error response:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          showToast("error", errorData.message || "Invalidation failed ❌");
        } catch {
          showToast("error", `Request failed: ${res.status} ${res.statusText}`);
        }
        
        setLogs((prev) => [
          {
            user: "seo@company.com",
            time: new Date().toISOString(),
            paths: arr,
            error: `HTTP ${res.status}: ${res.statusText}`,
          },
          ...prev,
        ]);
        return;
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (data.success) {
        showToast("success", "Invalidation triggered ✅");

        setLogs((prev) => [
          {
            user: "seo@company.com",
            time: new Date().toISOString(),
            paths: arr,
            result: {
              id: data.invalidationId || "-",
              status: data.status || "Pending",
            },
          },
          ...prev,
        ]);
      } else {
        showToast("error", data.message || "Invalidation failed ❌");

        setLogs((prev) => [
          {
            user: "seo@company.com",
            time: new Date().toISOString(),
            paths: arr,
            error: data.message || "Failed",
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Server error ❌");

      setLogs((prev) => [
        {
          user: "seo@company.com",
          time: new Date().toISOString(),
          paths: arr,
          error: err.message || "Server error",
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {toast && (
        <div
          className={`toast ${
            toast.type === "success" ? "toast-success" : "toast-error"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <h3>SEO Portal</h3>
        <div
          className={`nav-item ${activeTab === "invalidate" ? "active" : ""}`}
          onClick={() => setActiveTab("invalidate")}
        >
          Invalidate Cache
        </div>

        <div
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </div>
        <div
          className={`nav-item ${
            activeTab === "documentation" ? "active" : ""
          }`}
          onClick={() => setActiveTab("documentation")}
          style={{
            marginTop: "auto",
            borderTop: "1px solid #444",
            paddingTop: 10,
          }}
        >
          ℹ Documentation
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="header">
          <h2>
            {activeTab === "invalidate"
              ? "Cache Invalidation"
              : activeTab === "history"
              ? "History"
              : "Documentation"}
          </h2>
          <div>
            <span className="user-badge">Logged in</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Invalidate Tab */}
        {activeTab === "invalidate" && (
          <div className="card wide">
            <h3>Invalidate CloudFront Cache</h3>
            <p className="muted">
              Note: This portal triggers invalidations for the configured
              distribution. Use responsibly.
            </p>

            <div className="form-group">
              <label>Paths to invalidate (one per line)</label>
              <textarea
                rows="5"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                placeholder="/index.html or /*"
              ></textarea>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn"
                onClick={handleInvalidate}
                disabled={loading}
              >
                {loading ? "Processing..." : "Invalidate Cache"}
              </button>
              <button
                className="btn secondary"
                onClick={() => setPaths("/*")}
                disabled={loading}
              >
                Reset to /*
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="card wide">
            <h3>Full Invalidation History</h3>
            <div className="logs">
              {logs.length === 0 && (
                <div className="muted">No history found</div>
              )}
              {logs.map((l, i) => (
                <div key={i} className="log-row">
                  <div>
                    <strong>{l.user}</strong> •{" "}
                    <span className="muted">
                      {new Date(l.time).toLocaleString()}
                    </span>
                  </div>
                  <div className="muted">
                    Paths: {Array.isArray(l.paths) ? l.paths.join(", ") : "-"}
                  </div>
                  <div className="muted">
                    Result:{" "}
                    {l.result
                      ? `${l.result.status || "Pending"} (${
                          l.result.id || "-"
                        })`
                      : l.error || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === "documentation" && (
          <div className="card wide">
            <h3>📄 Documentation</h3>
            <p>
              This portal automates AWS CloudFront cache invalidation, ensuring
              updated content delivery.
            </p>

            <h4>How to Use</h4>
            <ol>
              <li>
                Go to <b>Invalidate Cache</b> section.
              </li>
              <li>
                Enter path(s) to invalidate (e.g., <code>/about</code> or{" "}
                <code>{"/*"}</code>).
              </li>
              <li>
                Click <b>Invalidate Cache</b>.
              </li>
              <li>
                Check <b>History</b> for logs.
              </li>
            </ol>

            <h4>Best Practices</h4>
            <ul>
              <li>
                Use wildcards (<code>{"/*"}</code>) for full directory.
              </li>
              <li>Avoid unnecessary invalidations to save AWS cost.</li>
              <li>Schedule during off-peak hours if possible.</li>
            </ul>

            <h4>Support</h4>
            <p>
              Email:{" "}
              <a href="mailto:it-support@company.com">
                it-support@easterncapital.in
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
