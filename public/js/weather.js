// Weather widget for Arlington, VA
// NWS API for forecasts, Open-Meteo for sunrise/sunset only

const NWS_POINTS_URL = 'https://api.weather.gov/points/38.8816,-77.0910';
const SUN_URL = 'https://api.open-meteo.com/v1/forecast?latitude=38.8816&longitude=-77.0910&daily=sunrise,sunset&timezone=America/New_York';
const NWS_HEADERS = { 'User-Agent': 'CourtChek/1.0 (courtchek.com)' };
const CACHE_KEY = 'courtchek_nws_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// --- Helpers ---

function formatHour(isoStr) {
  const d = new Date(isoStr);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ' ' + ampm;
}

function formatSunTime(isoStr) {
  const d = new Date(isoStr);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}

function rainClass(pct) {
  if (pct <= 20) return 'rain-low';
  if (pct <= 50) return 'rain-possible';
  return 'rain-likely';
}

function rainLabel(pct) {
  if (pct <= 20) return 'Low';
  if (pct <= 50) return 'Possible';
  return 'Likely';
}

function rainHtml(label, pct) {
  const cls = rainClass(pct);
  return `<span class="weather-bar-item">${label}: <strong class="${cls}">${pct}% rain — ${rainLabel(pct)}</strong></span>`;
}

function shortForecastToEmoji(text) {
  const t = text.toLowerCase();
  if (t.includes('thunder')) return '⛈️';
  if (t.includes('rain') || t.includes('showers') || t.includes('drizzle')) return '🌧️';
  if (t.includes('snow') || t.includes('sleet') || t.includes('ice')) return '🌨️';
  if (t.includes('fog')) return '🌫️';
  if (t.includes('cloudy') && t.includes('partly')) return '⛅';
  if (t.includes('cloudy') && t.includes('mostly')) return '🌥️';
  if (t.includes('cloudy') || t.includes('overcast')) return '☁️';
  if (t.includes('sunny') || t.includes('clear')) return '☀️';
  if (t.includes('mostly sunny') || t.includes('mostly clear')) return '🌤';
  return '🌤';
}

function maxRain(periods) {
  let max = 0;
  for (const p of periods) {
    const val = p.probabilityOfPrecipitation?.value ?? 0;
    if (val > max) max = val;
  }
  return max;
}

// --- NWS fetch with 15-min cache ---

async function fetchNWSHourly() {
  // Check cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }
  } catch {}

  // Step 1: get forecast URLs
  const pointsRes = await fetch(NWS_POINTS_URL, { headers: NWS_HEADERS });
  if (!pointsRes.ok) throw new Error('NWS points failed: ' + pointsRes.status);
  const pointsData = await pointsRes.json();
  const hourlyUrl = pointsData.properties.forecastHourly;

  // Step 2: get hourly forecast
  const hourlyRes = await fetch(hourlyUrl, { headers: NWS_HEADERS });
  if (!hourlyRes.ok) throw new Error('NWS hourly failed: ' + hourlyRes.status);
  const hourlyData = await hourlyRes.json();

  // Cache it
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: hourlyData }));
  } catch {}

  return hourlyData;
}

// --- Main ---

async function loadWeather() {
  try {
    // Fetch NWS hourly and sunrise/sunset in parallel
    const [nwsData, sunRes] = await Promise.all([
      fetchNWSHourly(),
      fetch(SUN_URL).then(r => r.json()),
    ]);

    const periods = nwsData.properties.periods;
    if (!periods || periods.length === 0) throw new Error('No NWS periods');

    const now = new Date();
    const current = periods[0];
    const currentTemp = current.temperature;
    const currentCondition = current.shortForecast;

    // Sunrise/sunset from Open-Meteo
    const sunrise = formatSunTime(sunRes.daily.sunrise[0]);
    const sunset = formatSunTime(sunRes.daily.sunset[0]);

    // Rain windows — NWS periods are 1-hour each
    const rain4h = maxRain(periods.slice(0, 4));
    const rain8h = maxRain(periods.slice(0, 8));

    // Overnight window: sunset today to sunrise tomorrow
    // Parse sun times for comparison
    const sunsetTime = new Date(sunRes.daily.sunrise[0]).getTime() > 0
      ? new Date(sunRes.daily.sunset[0])
      : null;
    const sunriseNextTime = sunRes.daily.sunrise.length > 1
      ? new Date(sunRes.daily.sunrise[1])
      : null;

    let overnightStart, overnightEnd;
    if (sunsetTime && sunriseNextTime) {
      overnightStart = sunsetTime;
      overnightEnd = sunriseNextTime;
    } else {
      // Fallback: 10 PM today to 6 AM tomorrow
      overnightStart = new Date(now); overnightStart.setHours(22, 0, 0, 0);
      overnightEnd = new Date(now); overnightEnd.setDate(overnightEnd.getDate() + 1); overnightEnd.setHours(6, 0, 0, 0);
    }

    const overnightPeriods = periods.filter(p => {
      const t = new Date(p.startTime);
      return t >= overnightStart && t < overnightEnd;
    });
    const rainOvernight = maxRain(overnightPeriods);

    // Render weather bar
    const barEl = document.getElementById('weather-bar');
    barEl.innerHTML = `
      <div class="weather-bar-inner">
        <span class="weather-bar-location">📍 Arlington, VA</span>
        <span class="weather-bar-item">Currently: ${currentTemp}°F — ${currentCondition}</span>
        ${rainHtml('Next 4hrs', rain4h)}
        ${rainHtml('Next 8hrs', rain8h)}
        ${rainHtml('Overnight', rainOvernight)}
        <span class="weather-bar-item">Sunrise: ${sunrise}</span>
        <span class="weather-bar-item">Sunset: ${sunset}</span>
      </div>
    `;

    // Render 24-hour forecast
    const forecastEl = document.getElementById('hourly-forecast');
    const hours = periods.slice(0, 24).map((p, i) => `
      <div class="hourly-card">
        <div class="hourly-time">${i === 0 ? 'Now' : formatHour(p.startTime)}</div>
        <div class="hourly-icon">${shortForecastToEmoji(p.shortForecast)}</div>
        <div class="hourly-temp">${p.temperature}°F</div>
        <div class="hourly-rain">💧 ${p.probabilityOfPrecipitation?.value ?? 0}%</div>
      </div>
    `);

    forecastEl.innerHTML = `
      <div class="hourly-forecast-inner">
        <div class="hourly-forecast-label">📍 Arlington, VA — 24-Hour Forecast</div>
        <div class="hourly-scroll">${hours.join('')}</div>
      </div>
    `;
  } catch (err) {
    console.error('Weather load error:', err);
    document.getElementById('weather-bar').innerHTML = '<div class="weather-bar-inner">Weather unavailable</div>';
    document.getElementById('hourly-forecast').innerHTML = '';
  }
}

loadWeather();
