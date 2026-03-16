require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// --- Spam protection ---

// Honeypot check — if the hidden "website" field is filled, it's a bot
function honeypotCheck(req, res) {
  if (req.body && req.body.website) {
    return true; // is spam
  }
  return false;
}

// In-memory rate limiter
const rateLimits = new Map(); // ip -> { reports: [timestamps], courts: [timestamps] }
const HOUR = 3600000;

function rateLimit(req, type) {
  const ip = req.ip;
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { reports: [], courts: [] });
  }
  const bucket = rateLimits.get(ip);
  const now = Date.now();
  // Prune old entries
  bucket[type] = bucket[type].filter(t => now - t < HOUR);

  const maxPerHour = type === 'courts' ? 2 : 5;
  if (bucket[type].length >= maxPerHour) {
    return false; // rate limited
  }
  bucket[type].push(now);
  return true; // allowed
}

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimits) {
    bucket.reports = bucket.reports.filter(t => now - t < HOUR);
    bucket.courts = bucket.courts.filter(t => now - t < HOUR);
    if (bucket.reports.length === 0 && bucket.courts.length === 0) {
      rateLimits.delete(ip);
    }
  }
}, 600000);

// --- API Routes ---

// Get all courts with optional filters and latest report
app.get('/api/courts', async (req, res) => {
  try {
    const { state, city } = req.query;
    let where = [];
    let params = [];

    if (state) {
      params.push(state);
      where.push(`c.state = $${params.length}`);
    }
    if (city) {
      params.push(city);
      where.push(`c.city = $${params.length}`);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const { rows } = await pool.query(`
      SELECT c.*,
        r.status AS latest_status,
        r.comment AS latest_comment,
        r.photo_paths AS latest_photo_paths,
        r.created_at AS latest_report_at
      FROM courts c
      LEFT JOIN (
        SELECT court_id, status, comment, photo_paths, created_at,
          ROW_NUMBER() OVER (PARTITION BY court_id ORDER BY created_at DESC) AS rn
        FROM reports
      ) r ON r.court_id = c.id AND r.rn = 1
      ${whereClause}
      ORDER BY c.name ASC
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('GET /api/courts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get filter options (distinct states and cities)
app.get('/api/courts/filters', async (req, res) => {
  try {
    const statesResult = await pool.query('SELECT DISTINCT state FROM courts ORDER BY state');
    const citiesResult = await pool.query('SELECT DISTINCT city, state FROM courts ORDER BY city');
    res.json({
      states: statesResult.rows.map(r => r.state),
      cities: citiesResult.rows,
    });
  } catch (err) {
    console.error('GET /api/courts/filters error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single court
app.get('/api/courts/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Court not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/courts/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create court
app.post('/api/courts', async (req, res) => {
  try {
    if (honeypotCheck(req, res)) return res.status(201).json({ id: 0 });
    if (!rateLimit(req, 'courts')) {
      return res.status(429).json({ error: 'You can only add 2 courts per hour. Please try again later.' });
    }

    const { name, address, city, state, num_courts, surface, public_private, maps_link } = req.body;

    if (!name || !address || !city || !state || !num_courts || !surface || !public_private) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { rows } = await pool.query(
      `INSERT INTO courts (name, address, city, state, num_courts, surface, public_private, maps_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, address, city, state.toUpperCase(), Number(num_courts), surface, public_private, maps_link || null]
    );

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('POST /api/courts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reports for a court
app.get('/api/courts/:id/reports', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reports WHERE court_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    const parsed = rows.map(r => ({
      ...r,
      photo_paths: r.photo_paths ? JSON.parse(r.photo_paths) : []
    }));

    res.json(parsed);
  } catch (err) {
    console.error('GET /api/courts/:id/reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create report with photos
app.post('/api/courts/:id/reports', upload.array('photos', 3), async (req, res) => {
  try {
    if (honeypotCheck(req, res)) return res.status(201).json({ id: 0 });
    if (!rateLimit(req, 'reports')) {
      return res.status(429).json({ error: 'You can only submit 5 reports per hour. Please try again later.' });
    }

    const courtId = req.params.id;
    const { rows: courtRows } = await pool.query('SELECT id FROM courts WHERE id = $1', [courtId]);
    if (courtRows.length === 0) return res.status(404).json({ error: 'Court not found' });

    const { status, comment } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const photoPaths = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];

    const { rows } = await pool.query(
      `INSERT INTO reports (court_id, status, comment, photo_paths)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [courtId, status, comment || null, JSON.stringify(photoPaths)]
    );

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('POST /api/courts/:id/reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Flag a report
app.post('/api/reports/:id/flag', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, flag_count FROM reports WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    await pool.query('UPDATE reports SET flag_count = flag_count + 1 WHERE id = $1', [req.params.id]);

    res.json({ flag_count: rows[0].flag_count + 1 });
  } catch (err) {
    console.error('POST /api/reports/:id/flag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nAllow: /\nSitemap: https://courtcheck-production.up.railway.app/sitemap.xml\n'
  );
});

// Dynamic sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = 'https://courtcheck-production.up.railway.app';
    const { rows } = await pool.query('SELECT id FROM courts ORDER BY id');
    const urls = [
      `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...rows.map(r =>
        `  <url><loc>${base}/court/${r.id}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
      ),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('GET /sitemap.xml error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// SPA fallback — serve court.html for /court/:id routes
app.get('/court/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'court.html'));
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`CourtChek running at http://localhost:${PORT}`);
  });
}

start();
