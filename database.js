require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      num_courts INTEGER NOT NULL,
      surface TEXT NOT NULL,
      public_private TEXT NOT NULL,
      maps_link TEXT,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      has_lights BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      comment TEXT,
      photo_paths TEXT,
      flag_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add columns that may be missing on existing databases
  await pool.query(`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS has_lights BOOLEAN DEFAULT false;
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM courts');
  if (parseInt(rows[0].c) > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // [name, address, city, state, num_courts, surface, public_private, maps_link, lat, lng, has_lights]
    const courts = [
      ['Virginia Highlands Park', '3300 S 24th St', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Virginia+Highlands+Park+Tennis+Arlington+VA', 38.8486, -77.0574, true],
      ['Bluemont Park', '601 N Manchester St', 'Arlington', 'VA', 9, 'hard', 'public', 'https://maps.google.com/?q=Bluemont+Park+Tennis+Arlington+VA', 38.8773, -77.1090, true],
      ['Gunston Park', '2700 S Lang St', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Gunston+Park+Tennis+Arlington+VA', 38.8399, -77.0629, true],
      ['Towers Park', '900 N Vermont St', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Towers+Park+Tennis+Arlington+VA', 38.8868, -77.0938, true],
      ['Glebe Road Park', '3801 N Glebe Rd', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Glebe+Road+Park+Tennis+Arlington+VA', 38.9021, -77.1019, true],
      ['Quincy Park', '3700 N Quincy St', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Quincy+Park+Tennis+Arlington+VA', 38.9015, -77.0938, true],
      ['Barcroft Park', '4200 S Four Mile Run Dr', 'Arlington', 'VA', 5, 'hard', 'public', 'https://maps.google.com/?q=Barcroft+Park+Tennis+Arlington+VA', 38.8432, -77.1043, true],
      ['Bon Air Park', '850 N Lexington St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Bon+Air+Park+Tennis+Arlington+VA', 38.8871, -77.1154, true],
      ['Lyon Village Park', '1900 N Highland St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Lyon+Village+Park+Tennis+Arlington+VA', 38.8938, -77.0938, true],
      ['Arlington Tennis Center', '3700 S Four Mile Run Dr', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Arlington+Tennis+Center+Arlington+VA', 38.8451, -77.1013, true],
    ];

    for (const c of courts) {
      await client.query(
        'INSERT INTO courts (name, address, city, state, num_courts, surface, public_private, maps_link, latitude, longitude, has_lights) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        c
      );
    }

    const now = Date.now();
    const h = 3600000;
    const d = 86400000;
    const ts = (offset) => new Date(now - offset).toISOString();

    const reports = [
      [1, 'Great', 'All 6 courts in great condition. Nets are tight, surface recently resurfaced.', ts(45 * 60000)],
      [1, 'Busy/Long Wait', 'Courts were full at 9am Saturday. Got on after 20 min wait.', ts(5 * d)],
      [2, 'Great', 'Courts are in good shape. Lights work well for evening play.', ts(6 * h)],
      [2, 'Great', 'Midweek morning — had courts to ourselves. Surface is solid, nets are good.', ts(3 * d)],
      [3, 'Great', 'All dry now. Nets are a bit saggy on court 1 but playable.', ts(20 * h)],
      [3, 'Wet/Puddles', 'Rained last night, courts 1-2 still have standing water. Court 3 drains better.', ts(3 * d)],
      [4, 'Busy/Long Wait', 'Saturday morning — all 4 courts occupied with people waiting. 20-30 min wait.', ts(4 * h)],
      [4, 'Great', 'Courts in good shape. Got a nice breeze up on the hill.', ts(6 * d)],
      [5, 'Great', 'Clean courts, recently resurfaced. Lines are crisp and bright.', ts(5 * d)],
      [5, 'Great', 'Still looking great. Played for 2 hours with no wait.', ts(30 * 60000)],
      [6, 'Busy/Long Wait', 'Quincy is always packed on weekends. Come early or wait 30+ min.', ts(24 * h)],
      [6, 'Great', 'Midweek morning — had courts to ourselves. Surface is solid.', ts(3 * d)],
      [7, 'Great', 'Played doubles here this morning. All 5 courts open. Clean and well-maintained.', ts(18 * h)],
      [7, 'Great', 'Nice courts, not too crowded on a Tuesday.', ts(7 * d)],
      [8, 'Great', 'Nice spot near the rose garden. Courts are in good condition.', ts(8 * d)],
      [8, 'Cracks/Uneven', 'Small crack developing on court 1 near the service line. Court 2 is perfect.', ts(90 * 60000)],
      [9, 'Great', 'Two courts in a cute neighborhood park. Both in good shape.', ts(7 * d)],
      [9, 'Wet/Puddles', 'Morning dew still on the courts at 7am. Dry by 9.', ts(2 * d)],
      [10, 'Great', 'Six solid courts at the tennis center. Great facility with pro shop.', ts(3 * d)],
      [10, 'Great', 'Played on courts 3-4. Freshly resurfaced. Best courts in Arlington.', ts(50 * 60000)],
    ];

    for (const r of reports) {
      await client.query(
        'INSERT INTO reports (court_id, status, comment, created_at) VALUES ($1,$2,$3,$4)',
        r
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
