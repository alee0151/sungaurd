const pool    = require('../db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const JWT_SECRET    = process.env.JWT_SECRET || 'sunguard_dev_secret';
const SALT_ROUNDS   = 10;
const TOKEN_EXPIRES = '7d';

// POST /users/signup
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.trim()]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Email or username already in use' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, skin_type, nickname, location, onboarded, created_at`,
      [username.trim(), email.toLowerCase(), hashed]
    );
    const user  = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[signup]', err.message);
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// POST /users/login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username.trim().toLowerCase()]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    res.json({
      token,
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        nickname:  user.nickname,
        skin_type: user.skin_type,
        location:  user.location,
        onboarded: user.onboarded,
      },
    });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// GET /users/me  (protected)
exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, nickname, skin_type, location, onboarded, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[getMe]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /users/me  (protected) — update nickname / skin_type / location / onboarded
exports.updateMe = async (req, res) => {
  const { nickname, skin_type, location, onboarded } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
         nickname  = COALESCE($1, nickname),
         skin_type = COALESCE($2, skin_type),
         location  = COALESCE($3, location),
         onboarded = COALESCE($4, onboarded)
       WHERE id = $5
       RETURNING id, username, email, nickname, skin_type, location, onboarded`,
      [
        nickname  ?? null,
        skin_type ?? null,
        location  ?? null,
        onboarded ?? null,
        req.user.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[updateMe]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
