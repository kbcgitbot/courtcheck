// Weather widget for Arlington, VA using Open-Meteo API

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=38.8816&longitude=-77.0910&hourly=temperature_2m,precipitation_probability,weathercode&daily=sunrise,sunset&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=2';

function wmoToEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌦️';
  if (code >= 56 && code <= 57) return '🌧️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 66 && code <= 67) return '🌨️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤';
}

function wmoToLabel(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 66 && code <= 67) return 'Freezing Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

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

function maxRainInRange(probs, start, count) {
  let max = 0;
  for (let i = start; i < start + count && i < probs.length; i++) {
    if (probs[i] > max) max = probs[i];
  }
  return max;
}

function maxRainUntilMidnight(probs, times, startIdx) {
  let max = 0;
  const today = new Date(times[startIdx]).toISOString().slice(0, 10);
  for (let i = startIdx; i < probs.length; i++) {
    if (!times[i].startsWith(today)) break;
    if (probs[i] > max) max = probs[i];
  }
  return max;
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

async function loadWeather() {
  try {
    const res = await fetch(WEATHER_URL);
    const data = await res.json();

    // Find current hour index
    const now = new Date();
    const currentHour = now.toISOString().slice(0, 13);
    let currentIdx = data.hourly.time.findIndex(t => t.startsWith(currentHour));
    if (currentIdx === -1) {
      const nowMs = now.getTime();
      let minDiff = Infinity;
      data.hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t).getTime() - nowMs);
        if (diff < minDiff) { minDiff = diff; currentIdx = i; }
      });
    }

    const currentTemp = Math.round(data.hourly.temperature_2m[currentIdx]);
    const currentCode = data.hourly.weathercode[currentIdx];
    const sunrise = formatSunTime(data.daily.sunrise[0]);
    const sunset = formatSunTime(data.daily.sunset[0]);
    const probs = data.hourly.precipitation_probability;

    const rain4h = maxRainInRange(probs, currentIdx, 4);
    const rain8h = maxRainInRange(probs, currentIdx, 8);
    const rainTonight = maxRainUntilMidnight(probs, data.hourly.time, currentIdx);

    // Render weather bar
    const barEl = document.getElementById('weather-bar');
    barEl.innerHTML = `
      <div class="weather-bar-inner">
        <span class="weather-bar-location">📍 Arlington, VA</span>
        <span class="weather-bar-item">Currently: ${currentTemp}°F — ${wmoToLabel(currentCode)}</span>
        ${rainHtml('Next 4hrs', rain4h)}
        ${rainHtml('Next 8hrs', rain8h)}
        ${rainHtml('Tonight', rainTonight)}
        <span class="weather-bar-item">Sunrise: ${sunrise}</span>
        <span class="weather-bar-item">Sunset: ${sunset}</span>
      </div>
    `;

    // Render 24-hour forecast
    const forecastEl = document.getElementById('hourly-forecast');
    const hours = [];
    for (let i = currentIdx; i < currentIdx + 24 && i < data.hourly.time.length; i++) {
      hours.push(`
        <div class="hourly-card">
          <div class="hourly-time">${i === currentIdx ? 'Now' : formatHour(data.hourly.time[i])}</div>
          <div class="hourly-icon">${wmoToEmoji(data.hourly.weathercode[i])}</div>
          <div class="hourly-temp">${Math.round(data.hourly.temperature_2m[i])}°F</div>
          <div class="hourly-rain">💧 ${data.hourly.precipitation_probability[i]}%</div>
        </div>
      `);
    }

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
