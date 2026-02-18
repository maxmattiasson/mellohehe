const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const roomsRoutes = require('./routes/rooms.routes');
const { connectDb } = require('./db');

dotenv.config();

const app = express();
app.use(express.json());

const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/rooms', roomsRoutes);

app.get('/vote', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'vote.html'));
});

app.get('/results', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'results.html'));
});

app.get('/lobby', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'lobby.html'));
});

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
