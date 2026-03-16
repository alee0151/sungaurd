const express = require('express');
const cors = require('cors');
require('dotenv').config();

const uvRoutes       = require('./routes/uvRoutes');
const statsRoutes    = require('./routes/statsRoutes');
const userRoutes     = require('./routes/userRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const initDb         = require('./initDb');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uv',       uvRoutes);
app.use('/stats',    statsRoutes);
app.use('/users',    userRoutes);
app.use('/reminders', reminderRoutes);

app.get('/health', async (req, res) => {
  // Basic health check — also tests DB connectivity
  try {
    const pool = require('./db');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
});

const PORT = process.env.PORT || 3000;

// Initialise DB schema then start listening
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Running on port ${PORT}`);
  });
});
