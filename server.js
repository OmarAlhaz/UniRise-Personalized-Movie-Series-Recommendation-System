// server.js (ES module version)
import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import process from "process";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.get("/api/recommendations", (req, res) => {
  const movieShowTitle = req.query.movieShowTitle;
  if (!movieShowTitle) {
    return res.status(400).json({ error: "movieShowTitle parameter is required" });
  }

  const pyPath = path.join(__dirname, "recommendations_service.py");
  const pyProcess = spawn("python", [pyPath, movieShowTitle], {
    cwd: __dirname,
  });

  let result = "";
  pyProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pyProcess.stderr.on("data", (data) => {
    console.error(`Python error: ${data}`);
  });

  pyProcess.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: `Python exited with code ${code}` });
    }
    try {
      const recommendations = JSON.parse(result);
      return res.json(recommendations);
    } catch (err) {
      return res.status(500).json({ error: `Error parsing Python output: ${err}` });
    }
  });
});

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
