-- CourtChek PostgreSQL Schema
-- Run with: psql $DATABASE_URL -f schema.sql

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

-- Seed data: Courts
INSERT INTO courts (name, address, city, state, num_courts, surface, public_private, maps_link, latitude, longitude, has_lights) VALUES
  ('Virginia Highlands Park', '3300 S 24th St', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Virginia+Highlands+Park+Tennis+Arlington+VA', 38.8486, -77.0574, true),
  ('Bluemont Park', '601 N Manchester St', 'Arlington', 'VA', 9, 'hard', 'public', 'https://maps.google.com/?q=Bluemont+Park+Tennis+Arlington+VA', 38.8773, -77.1090, true),
  ('Gunston Park', '2700 S Lang St', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Gunston+Park+Tennis+Arlington+VA', 38.8399, -77.0629, true),
  ('Towers Park', '900 N Vermont St', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Towers+Park+Tennis+Arlington+VA', 38.8868, -77.0938, true),
  ('Glebe Road Park', '3801 N Glebe Rd', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Glebe+Road+Park+Tennis+Arlington+VA', 38.9021, -77.1019, true),
  ('Quincy Park', '3700 N Quincy St', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Quincy+Park+Tennis+Arlington+VA', 38.9015, -77.0938, true),
  ('Barcroft Park', '4200 S Four Mile Run Dr', 'Arlington', 'VA', 5, 'hard', 'public', 'https://maps.google.com/?q=Barcroft+Park+Tennis+Arlington+VA', 38.8432, -77.1043, true),
  ('Bon Air Park', '850 N Lexington St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Bon+Air+Park+Tennis+Arlington+VA', 38.8871, -77.1154, true),
  ('Lyon Village Park', '1900 N Highland St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Lyon+Village+Park+Tennis+Arlington+VA', 38.8938, -77.0938, true),
  ('Arlington Tennis Center', '3700 S Four Mile Run Dr', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Arlington+Tennis+Center+Arlington+VA', 38.8451, -77.1013, true);

-- Seed data: Sample reports
INSERT INTO reports (court_id, status, comment, created_at) VALUES
  (1, 'Great', 'All 6 courts in great condition. Nets are tight, surface recently resurfaced.', NOW() - INTERVAL '45 minutes'),
  (1, 'Busy/Long Wait', 'Courts were full at 9am Saturday. Got on after 20 min wait.', NOW() - INTERVAL '5 days'),
  (2, 'Great', 'Courts are in good shape. Lights work well for evening play.', NOW() - INTERVAL '6 hours'),
  (2, 'Great', 'Midweek morning — had courts to ourselves. Surface is solid, nets are good.', NOW() - INTERVAL '3 days'),
  (3, 'Great', 'All dry now. Nets are a bit saggy on court 1 but playable.', NOW() - INTERVAL '20 hours'),
  (3, 'Wet/Puddles', 'Rained last night, courts 1-2 still have standing water. Court 3 drains better.', NOW() - INTERVAL '3 days'),
  (4, 'Busy/Long Wait', 'Saturday morning — all 4 courts occupied with people waiting. 20-30 min wait.', NOW() - INTERVAL '4 hours'),
  (4, 'Great', 'Courts in good shape. Got a nice breeze up on the hill.', NOW() - INTERVAL '6 days'),
  (5, 'Great', 'Clean courts, recently resurfaced. Lines are crisp and bright.', NOW() - INTERVAL '5 days'),
  (5, 'Great', 'Still looking great. Played for 2 hours with no wait.', NOW() - INTERVAL '30 minutes'),
  (6, 'Busy/Long Wait', 'Quincy is always packed on weekends. Come early or wait 30+ min.', NOW() - INTERVAL '24 hours'),
  (6, 'Great', 'Midweek morning — had courts to ourselves. Surface is solid.', NOW() - INTERVAL '3 days'),
  (7, 'Great', 'Played doubles here this morning. All 5 courts open. Clean and well-maintained.', NOW() - INTERVAL '18 hours'),
  (7, 'Great', 'Nice courts, not too crowded on a Tuesday.', NOW() - INTERVAL '7 days'),
  (8, 'Great', 'Nice spot near the rose garden. Courts are in good condition.', NOW() - INTERVAL '8 days'),
  (8, 'Cracks/Uneven', 'Small crack developing on court 1 near the service line. Court 2 is perfect.', NOW() - INTERVAL '90 minutes'),
  (9, 'Great', 'Two courts in a cute neighborhood park. Both in good shape.', NOW() - INTERVAL '7 days'),
  (9, 'Wet/Puddles', 'Morning dew still on the courts at 7am. Dry by 9.', NOW() - INTERVAL '2 days'),
  (10, 'Great', 'Six solid courts at the tennis center. Great facility with pro shop.', NOW() - INTERVAL '3 days'),
  (10, 'Great', 'Played on courts 3-4. Freshly resurfaced. Best courts in Arlington.', NOW() - INTERVAL '50 minutes');

-- Seed data: Photo reports
INSERT INTO reports (court_id, status, comment, created_at, photo_paths) VALUES
  (1, 'Great', 'Beautiful courts at Virginia Highlands — here is a photo from today.', NOW() - INTERVAL '2 hours', '["https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800"]'),
  (2, 'Great', 'Bluemont Park courts looking fantastic after the resurface.', NOW() - INTERVAL '5 hours', '["https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800"]'),
  (4, 'Great', 'Towers Park on a clear afternoon — courts are in great shape.', NOW() - INTERVAL '8 hours', '["https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800"]'),
  (6, 'Busy/Long Wait', 'Quincy Park packed as usual on the weekend.', NOW() - INTERVAL '1 day', '["https://images.unsplash.com/photo-1529926706528-db9e5010cd7e?w=800"]'),
  (10, 'Great', 'Arlington Tennis Center — freshly resurfaced courts.', NOW() - INTERVAL '4 hours', '["https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=800"]');
