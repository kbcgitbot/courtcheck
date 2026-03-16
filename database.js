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
      latitude DECIMAL,
      longitude DECIMAL,
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

  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM courts');
  if (parseInt(rows[0].c) > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // [name, address, city, state, num_courts, surface, public_private, maps_link, lat, lng]
    const courts = [
      ['Bluemont Park', '601 N Manchester St', 'Arlington', 'VA', 9, 'hard', 'public', 'https://maps.google.com/?q=Bluemont+Park+Tennis+Arlington+VA', 38.8714, -77.1128],
      ['Quincy Park', '1021 N Quincy St', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Quincy+Park+Tennis+Arlington+VA', 38.8835, -77.1078],
      ['Virginia Highlands Park', '1600 S Hayes St', 'Arlington', 'VA', 6, 'hard', 'public', 'https://maps.google.com/?q=Virginia+Highlands+Park+Tennis+Arlington+VA', 38.8575, -77.0596],
      ['Barcroft Park', '4200 S Four Mile Run Dr', 'Arlington', 'VA', 5, 'hard', 'public', 'https://maps.google.com/?q=Barcroft+Park+Tennis+Arlington+VA', 38.8525, -77.1050],
      ['Towers Park', '801 S Scott St', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Towers+Park+Tennis+Arlington+VA', 38.8608, -77.0753],
      ['Thomas Jefferson Park', '3501 2nd St S', 'Arlington', 'VA', 4, 'hard', 'public', 'https://maps.google.com/?q=Thomas+Jefferson+Park+Tennis+Arlington+VA', 38.8558, -77.0870],
      ['Fort Scott Park', '2800 Fort Scott Dr', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Fort+Scott+Park+Tennis+Arlington+VA', 38.8430, -77.0630],
      ['Gunston Park', '1200 28th St S', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Gunston+Park+Tennis+Arlington+VA', 38.8490, -77.0825],
      ['Marcey Road Park', '2800 N Marcey Rd', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Marcey+Road+Park+Tennis+Arlington+VA', 38.8978, -77.0730],
      ['Glebe Road Park', '4211 N Old Glebe Rd', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Glebe+Road+Park+Tennis+Arlington+VA', 38.8960, -77.1210],
      ['Walter Reed Community Center', '2909 16th St S', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Walter+Reed+Community+Center+Tennis+Arlington+VA', 38.8440, -77.0900],
      ['Jennie Dean Park', '3630 27th St S', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Jennie+Dean+Park+Tennis+Arlington+VA', 38.8445, -77.0863],
      ['Carver Community Center', '1415 S Queen St', 'Arlington', 'VA', 3, 'hard', 'public', 'https://maps.google.com/?q=Carver+Community+Center+Tennis+Arlington+VA', 38.8553, -77.0650],
      ['Lyon Village Park', '1998 N Highland St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Lyon+Village+Park+Tennis+Arlington+VA', 38.8890, -77.0940],
      ['Hayes Park', '1510 N Lincoln St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Hayes+Park+Tennis+Arlington+VA', 38.8870, -77.1010],
      ['Bon Air Park', '850 N Lexington St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Bon+Air+Park+Tennis+Arlington+VA', 38.8815, -77.1150],
      ['Maury Park', '3558 N Wilson Blvd', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Maury+Park+Tennis+Arlington+VA', 38.8880, -77.1025],
      ['Tuckahoe Park', '2409 N Tuckahoe St', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Tuckahoe+Park+Tennis+Arlington+VA', 38.8930, -77.1310],
      ['Stratford Park', '4264 23rd St N', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Stratford+Park+Tennis+Arlington+VA', 38.8962, -77.1115],
      ['Madison Manor Park', '6225 12th Rd N', 'Arlington', 'VA', 2, 'hard', 'public', 'https://maps.google.com/?q=Madison+Manor+Park+Tennis+Arlington+VA', 38.9000, -77.1365],
      ['Langston-Brown Community Center', '2121 N Culpeper St', 'Arlington', 'VA', 1, 'hard', 'public', 'https://maps.google.com/?q=Langston-Brown+Community+Center+Arlington+VA', 38.8920, -77.0960],
      ['Four Mile Run Park', '3700 S Four Mile Run Dr', 'Arlington', 'VA', 1, 'hard', 'public', 'https://maps.google.com/?q=Four+Mile+Run+Park+Tennis+Arlington+VA', 38.8410, -77.0920],
      ['Banneker Tennis Courts', '2500 Georgia Ave NW', 'Washington', 'DC', 8, 'hard', 'public', 'https://maps.google.com/?q=Banneker+Tennis+Courts+Washington+DC', 38.9220, -77.0240],
      ['Takoma Rec Center', '290 Van Buren St NW', 'Washington', 'DC', 6, 'hard', 'public', 'https://maps.google.com/?q=Takoma+Recreation+Center+Tennis+Washington+DC', 38.9630, -77.0220],
      ['Fort Stevens Park', '1327 Van Buren St NW', 'Washington', 'DC', 4, 'hard', 'public', 'https://maps.google.com/?q=Fort+Stevens+Park+Tennis+Washington+DC', 38.9580, -77.0310],
      ['Lafayette Rec Center', '5900 33rd St NW', 'Washington', 'DC', 4, 'hard', 'public', 'https://maps.google.com/?q=Lafayette+Recreation+Center+Tennis+Washington+DC', 38.9610, -77.0710],
      ['Palisades Community Center', '5200 Sherier Pl NW', 'Washington', 'DC', 3, 'hard', 'public', 'https://maps.google.com/?q=Palisades+Recreation+Center+Tennis+Washington+DC', 38.9250, -77.1010],
      ['Hearst Park', '3680 Quebec St NW', 'Washington', 'DC', 3, 'hard', 'public', 'https://maps.google.com/?q=Hearst+Park+Tennis+Washington+DC', 38.9500, -77.0600],
      ['Fort Reno Park', '4000 Chesapeake St NW', 'Washington', 'DC', 3, 'hard', 'public', 'https://maps.google.com/?q=Fort+Reno+Park+Tennis+Washington+DC', 38.9530, -77.0670],
      ['Chevy Chase Rec Center', '5601 Connecticut Ave NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Chevy+Chase+Recreation+Center+Tennis+Washington+DC', 38.9620, -77.0640],
      ['Forest Hills Park', '3999 Connecticut Ave NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Forest+Hills+Park+Tennis+Washington+DC', 38.9480, -77.0590],
      ['Friendship Turtle Park', '4500 Van Ness St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Friendship+Turtle+Park+Tennis+Washington+DC', 38.9440, -77.0610],
      ['Georgetown Rec Center', '3350 Q St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Georgetown+Recreation+Center+Tennis+Washington+DC', 38.9105, -77.0630],
      ['Hardy Rec Center', '1819 35th St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Hardy+Recreation+Center+Tennis+Washington+DC', 38.9070, -77.0680],
      ['Powell Recreation Center', '3149 16th St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Powell+Recreation+Center+Tennis+Washington+DC', 38.9300, -77.0360],
      ['Raymond Playground', '900 Rock Creek Church Rd NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Raymond+Playground+Tennis+Washington+DC', 38.9350, -77.0240],
      ['Reed Park', '2200 18th St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Reed+Park+Tennis+Washington+DC', 38.9190, -77.0420],
      ['Roosevelt HS Courts', '4301 13th St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Roosevelt+High+School+Tennis+Washington+DC', 38.9510, -77.0310],
      ['Volta Park', '3400 Q St NW', 'Washington', 'DC', 2, 'hard', 'public', 'https://maps.google.com/?q=Volta+Park+Tennis+Washington+DC', 38.9100, -77.0640],
      ['Bruce Monroe Community Park', '3000 Georgia Ave NW', 'Washington', 'DC', 1, 'hard', 'public', 'https://maps.google.com/?q=Bruce+Monroe+Park+Tennis+Washington+DC', 38.9280, -77.0250],
      ['Kennedy Rec Center', '1401 7th St NW', 'Washington', 'DC', 1, 'hard', 'public', 'https://maps.google.com/?q=Kennedy+Recreation+Center+Tennis+Washington+DC', 38.9090, -77.0220],
      ['Rock Creek Tennis Center', '5500 16th St NW', 'Washington', 'DC', 25, 'hard', 'public', 'https://maps.google.com/?q=Rock+Creek+Tennis+Center+Washington+DC', 38.9560, -77.0370],
      ['Montrose Park', '3050 R St NW', 'Washington', 'DC', 4, 'hard', 'public', 'https://maps.google.com/?q=Montrose+Park+Tennis+Washington+DC', 38.9120, -77.0590],
      ['Francis Field', '2300 N St NW', 'Washington', 'DC', 4, 'hard', 'public', 'https://maps.google.com/?q=Francis+Field+Tennis+Washington+DC', 38.9060, -77.0490],
      ['Rose Park', '2650 O St NW', 'Washington', 'DC', 3, 'hard', 'public', 'https://maps.google.com/?q=Rose+Park+Tennis+Washington+DC', 38.9080, -77.0580],
      ['Park Road Courts', 'Beach Dr NW & Park Rd NW', 'Washington', 'DC', 3, 'hard', 'public', 'https://maps.google.com/?q=Park+Road+Courts+Rock+Creek+Park+Washington+DC', 38.9380, -77.0500],
    ];

    for (const c of courts) {
      await client.query(
        'INSERT INTO courts (name, address, city, state, num_courts, surface, public_private, maps_link, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        c
      );
    }

    const now = Date.now();
    const h = 3600000;
    const d = 86400000;
    const ts = (offset) => new Date(now - offset).toISOString();

    const reports = [
      [1, 'Closed', 'Facility closed for renovation until late 2027. Fences are up around all courts.', ts(14 * d)],
      [1, 'Great', 'Courts are in good shape but the facility is closed for renovation until late 2027.', ts(6 * h)],
      [2, 'Great', 'Midweek morning — had courts to ourselves. Surface is solid, nets are good.', ts(3 * d)],
      [2, 'Busy/Long Wait', 'Quincy is always packed on weekends. Come early or wait 30+ min.', ts(24 * h)],
      [3, 'Busy/Long Wait', 'Courts were full at 9am Saturday. Got on after 20 min wait.', ts(5 * d)],
      [3, 'Great', 'All 6 courts in great condition. Nets are tight, surface recently resurfaced.', ts(45 * 60000)],
      [4, 'Great', 'Nice courts, not too crowded on a Tuesday. Surface has some wear but very playable.', ts(7 * d)],
      [4, 'Great', 'Played doubles here this morning. All 5 courts open. Clean and well-maintained.', ts(18 * h)],
      [5, 'Great', 'Courts in good shape. Got a nice breeze up on the hill.', ts(6 * d)],
      [5, 'Busy/Long Wait', 'Saturday morning — all 4 courts occupied with people waiting. 20-30 min wait.', ts(4 * h)],
      [6, 'Cracks/Uneven', 'Court 2 has a nasty crack along the baseline. Courts 1 and 3-4 are fine.', ts(10 * d)],
      [6, 'Great', 'They patched the crack on court 2! All 4 courts are now in good shape.', ts(1.5 * h)],
      [7, 'Great', 'Hidden gem — 3 courts tucked away and rarely busy. Surface is decent.', ts(4 * d)],
      [7, 'Great', 'Played singles at 7am, had the whole place to myself. Love this spot.', ts(2 * d)],
      [8, 'Wet/Puddles', 'Rained last night, courts 1-2 still have standing water. Court 3 drains better.', ts(3 * d)],
      [8, 'Great', 'All dry now. Nets are a bit saggy on court 1 but playable.', ts(20 * h)],
      [9, 'Great', 'Quiet courts in a nice wooded area. All 3 in good condition.', ts(8 * d)],
      [9, 'Busy/Long Wait', 'Surprisingly busy for a Wednesday evening. All 3 courts taken.', ts(2 * d)],
      [10, 'Great', 'Clean courts, recently resurfaced. Lines are crisp and bright.', ts(5 * d)],
      [10, 'Great', 'Still looking great. Played for 2 hours with no wait.', ts(30 * 60000)],
      [11, 'Cracks/Uneven', 'Some cracks forming near the net on court 2. Still playable but watch your step.', ts(12 * d)],
      [11, 'Great', 'Courts 1 and 3 are fine. Court 2 cracks are minor — no issue for casual play.', ts(3 * d)],
      [12, 'Great', 'Brand new courts at the renovated park! Surface is pristine.', ts(6 * d)],
      [12, 'Busy/Long Wait', 'New courts are popular — expect a wait on weekends. Weekday mornings are open.', ts(1 * d)],
      [13, 'Great', 'Good courts, well-lit for evening play. Surface is standard hard court.', ts(9 * d)],
      [13, 'Great', 'Played under the lights last night. Courts were empty after 8pm.', ts(4 * d)],
      [14, 'Great', 'Two courts in a cute neighborhood park. Both in good shape.', ts(7 * d)],
      [14, 'Wet/Puddles', 'Morning dew still on the courts at 7am. Dry by 9.', ts(2 * d)],
      [15, 'Great', 'Solid courts. Nothing fancy but clean and well-maintained.', ts(11 * d)],
      [15, 'Great', 'Stopped by after work. One court free, played for an hour. Good condition.', ts(5 * d)],
      [16, 'Great', 'Nice spot near the rose garden. Courts are in good condition.', ts(8 * d)],
      [16, 'Cracks/Uneven', 'Small crack developing on court 1 near the service line. Court 2 is perfect.', ts(90 * 60000)],
      [17, 'Great', 'Both courts in good shape. Some leaves on the court but easy to sweep.', ts(6 * d)],
      [17, 'Great', 'Played doubles this evening. Courts are well-maintained. Love this park.', ts(3 * d)],
      [18, 'Great', 'Courts are clean and lines are visible. Quiet residential area.', ts(10 * d)],
      [18, 'Great', 'Both courts open on a Saturday morning! Surface is good. Nets tight.', ts(4 * d)],
      [19, 'Wet/Puddles', 'Court 1 has a low spot that collects water. Court 2 drains fine.', ts(7 * d)],
      [19, 'Great', 'Both courts dry and playable. Nice quiet park for tennis.', ts(2 * d)],
      [20, 'Great', 'Two courts in a nice residential area. Well-maintained and rarely crowded.', ts(9 * d)],
      [20, 'Great', 'Played here after work. Had both courts to ourselves. Great surface.', ts(5 * d)],
      [21, 'Great', 'Single court but it\'s in great shape. Perfect for a quick hit.', ts(12 * d)],
      [21, 'Busy/Long Wait', 'Only one court so if anyone is there you\'re waiting. Came back in an hour.', ts(6 * d)],
      [22, 'Cracks/Uneven', 'Surface is rough — several cracks and some moss growing near the baseline.', ts(15 * d)],
      [22, 'Cracks/Uneven', 'Still in rough shape. Playable but not great. Bring outdoor shoes.', ts(3 * d)],
      [23, 'Busy/Long Wait', 'Saturday afternoon — packed as usual. Great facility though.', ts(5 * d)],
      [23, 'Great', 'All 8 lighted courts in excellent shape. Best public courts in NW DC.', ts(1 * h)],
      [24, 'Great', 'Six solid courts. Surface was just cleaned. Parking lot right there.', ts(8 * d)],
      [24, 'Great', 'Played doubles on courts 3-4. Good condition, nets properly tensioned.', ts(2 * d)],
      [25, 'Great', 'All 4 courts available on a weekday. Surface is clean and well-maintained.', ts(6 * d)],
      [25, 'Wet/Puddles', 'Rain earlier today left puddles on courts 1-2. Courts 3-4 are playable.', ts(1 * d)],
      [26, 'Great', 'Nice facility with 4 courts. Clean bathrooms nearby. Nets are tight.', ts(5 * d)],
      [26, 'Busy/Long Wait', 'Weekend league was using 3 courts. One available but had to wait 15 min.', ts(1 * d)],
      [27, 'Great', 'Three courts in a lovely neighborhood. All in great shape.', ts(7 * d)],
      [27, 'Great', 'Came for an evening session. Courts were empty and in perfect condition.', ts(3 * d)],
      [28, 'Great', 'All 3 courts clean and ready to play. Nice park setting.', ts(9 * d)],
      [28, 'Great', 'Surface is smooth, lines freshly painted. One of the better DC parks.', ts(4 * d)],
      [29, 'Great', 'High point in DC — great breeze. Courts are in solid condition.', ts(11 * d)],
      [29, 'Cracks/Uneven', 'Court 3 has some uneven spots near the net. Courts 1-2 are fine.', ts(5 * d)],
      [30, 'Great', 'Both courts in excellent shape. Popular with the neighborhood crowd.', ts(4 * d)],
      [30, 'Busy/Long Wait', 'Waited 25 minutes on a Sunday morning. Very popular spot.', ts(75 * 60000)],
      [31, 'Great', 'Two courts in a beautiful setting. Surface is well-maintained.', ts(8 * d)],
      [31, 'Great', 'Played at sunset — gorgeous. Courts are in great shape.', ts(2 * d)],
      [32, 'Great', 'Fun park with good courts. Kids playground nearby keeps the family happy.', ts(6 * d)],
      [32, 'Great', 'Both courts open and clean. Nice surface, no complaints.', ts(1 * d)],
      [33, 'Busy/Long Wait', 'Georgetown courts are always busy. Weekday mornings are your best bet.', ts(5 * d)],
      [33, 'Great', 'Got lucky — both courts empty at 7am Tuesday. Surface is solid.', ts(2 * d)],
      [34, 'Great', 'Two courts right in Georgetown. Well-maintained, nice setting.', ts(10 * d)],
      [34, 'Great', 'Courts in good shape. A bit noisy with traffic but that\'s Georgetown.', ts(4 * d)],
      [35, 'Great', 'Two courts in good condition. Neighborhood regulars are friendly.', ts(7 * d)],
      [35, 'Wet/Puddles', 'Heavy rain last night. Court 1 draining slowly. Court 2 is OK.', ts(2 * d)],
      [36, 'Great', 'Courts are clean and well-lined. Nice spot in the Rock Creek Church area.', ts(9 * d)],
      [36, 'Great', 'Played for 2 hours midday. Both courts available the whole time.', ts(3 * d)],
      [37, 'Great', 'Compact courts in Adams Morgan. Surface is decent, some wear but playable.', ts(6 * d)],
      [37, 'Busy/Long Wait', 'Evening crowd fills up fast. Waited 20 min but worth it.', ts(1 * d)],
      [38, 'Great', 'School courts open to public on weekends. Surface is OK — typical school courts.', ts(8 * d)],
      [38, 'Great', 'Played Saturday AM. Courts open and in decent shape. Bring your own net tension.', ts(3 * d)],
      [39, 'Great', 'Two courts in a charming Georgetown park. Well-kept grounds.', ts(5 * d)],
      [39, 'Great', 'Sunday morning session. Both courts clean, nets good. Love this spot.', ts(1 * d)],
      [40, 'Great', 'Single court but it\'s in great condition. Quick pickup games happen here often.', ts(10 * d)],
      [40, 'Busy/Long Wait', 'Only one court — if someone is there, you wait. Try early mornings.', ts(4 * d)],
      [41, 'Cracks/Uneven', 'Court surface is aging. Some cracks near the baseline but still usable.', ts(12 * d)],
      [41, 'Great', 'They did some patching! Court looks much better now. Still just one court.', ts(2 * d)],
      [42, 'Great', 'The crown jewel — 25 courts in excellent condition. Pro shop and lessons available.', ts(3 * d)],
      [42, 'Great', 'Played on courts 10-11. Freshly resurfaced. Best public courts in the area.', ts(50 * 60000)],
      [43, 'Great', 'All 4 courts available midweek. Beautiful setting next to Dumbarton Oaks.', ts(5 * d)],
      [43, 'Great', 'Courts freshly rolled. Hard courts in solid condition. Reservations recommended.', ts(3 * h)],
      [44, 'Great', 'Four courts right in Foggy Bottom. Great for GW students and locals.', ts(7 * d)],
      [44, 'Busy/Long Wait', 'Lunch hour rush — all 4 courts full with a wait. Try before 11am.', ts(2 * d)],
      [45, 'Great', 'Three courts in a classic Georgetown park. Surface is good.', ts(6 * d)],
      [45, 'Wet/Puddles', 'Courts 2 and 3 still have puddles from last night\'s rain. Court 1 is playable.', ts(8 * h)],
      [46, 'Wet/Puddles', 'Shaded by trees so they stay wet longer after rain. Court 1 was dry.', ts(5 * d)],
      [46, 'Great', 'Beautiful park, courts are in good shape. Nets could be tighter.', ts(12 * h)],
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
