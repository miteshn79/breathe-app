// server/index.js
import express from "express";
import rateLimit from "express-rate-limit";
import { Octokit } from "octokit";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "500kb" }));
app.use(rateLimit({ windowMs: 60_000, max: 30 }));

// ---- GitHub client (for /api/report)
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const REPO    = { owner: "miteshn79", repo: process.env.REPO_NAME || "breathe-app" };
const scrub   = s => String(s)
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
  .replace(/\+\d{1,3}[-\s]?\d{6,12}/g, "[redacted]");

app.post("/api/report", async (req, res) => {
  try {
    const { type = "Feedback", title = "", body = "" } = req.body || {};
    if (!title || !body) return res.status(400).json({ err: "bad" });
    const issue = await octokit.rest.issues.create({
      ...REPO,
      title : `[${type}] ${scrub(title)}`.slice(0, 120),
      body  : scrub(body),
      labels: [type.toLowerCase() === "bug" ? "bug" : "enhancement", "from-app"]
    });
    res.json({ ok: true, number: issue.data.number, url: issue.data.html_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "srv" });
  }
});

// ---- Static frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, "../frontend");
console.log("Serving static files from:", staticDir);
app.use(express.static(staticDir));

// health/debug route
app.get("/__health", (req, res) => {
  res.json({ ok: true, staticDir, cwd: process.cwd() });
});

// SPA fallback so "/" and unknown routes work
app.get("*", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

// start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
