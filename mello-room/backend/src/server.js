const path = require("path");
const os = require("os");
const express = require("express");
const dotenv = require("dotenv");
const roomsRoutes = require("./routes/rooms.routes");
const { connectDb } = require("./db");
dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

const frontendDir = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontendDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/rooms", roomsRoutes);

app.get("/vote", (_req, res) => {
  res.sendFile(path.join(frontendDir, "vote.html"));
});

app.get("/results", (_req, res) => {
  res.sendFile(path.join(frontendDir, "results.html"));
});

app.get("/lobby", (_req, res) => {
  res.sendFile(path.join(frontendDir, "lobby.html"));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function getLanUrls(port) {
  const networks = os.networkInterfaces();
  const urls = [];

  Object.values(networks).forEach((iface) => {
    (iface || []).forEach((entry) => {
      if (entry.family !== "IPv4" || entry.internal) return;
      urls.push(`http://${entry.address}:${port}`);
    });
  });

  return urls;
}

async function start() {
  await connectDb();
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);

    if (HOST === "0.0.0.0" || HOST === "::") {
      const lanUrls = getLanUrls(PORT);
      lanUrls.forEach((url) => console.log(`LAN:   ${url}`));
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
