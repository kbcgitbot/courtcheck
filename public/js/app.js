// Court directory page

const stateSelect = document.getElementById('filter-state');
const citySelect = document.getElementById('filter-city');
const searchInput = document.getElementById('filter-search');
const courtListEl = document.getElementById('court-list');
const courtMapEl = document.getElementById('court-map');
const viewToggle = document.getElementById('view-toggle');
const lightsFilter = document.getElementById('filter-lights');

let allCities = [];
let allCourts = [];
let map = null;
let markers = [];
let showingMap = true; // desktop shows both; mobile toggles

async function loadFilters() {
  const res = await fetch('/api/courts/filters');
  const data = await res.json();

  data.states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    stateSelect.appendChild(opt);
  });

  allCities = data.cities;

  // Default to Arlington, VA
  stateSelect.value = 'VA';
  populateCities();
  citySelect.value = 'Arlington';
}

function populateCities() {
  const state = stateSelect.value;
  citySelect.innerHTML = '<option value="">All Cities</option>';

  const filtered = state ? allCities.filter(c => c.state === state) : allCities;
  filtered.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.city;
    opt.textContent = c.city;
    citySelect.appendChild(opt);
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const d = dateStr instanceof Date ? dateStr : new Date(typeof dateStr === 'string' && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr);
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}

function statusClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'great') return 'status-great';
  if (s.includes('wet')) return 'status-wet';
  if (s.includes('crack')) return 'status-cracked';
  if (s.includes('busy')) return 'status-busy';
  if (s === 'closed') return 'status-closed';
  return '';
}

function isRecent(dateStr) {
  if (!dateStr) return false;
  const d = dateStr instanceof Date ? dateStr : new Date(typeof dateStr === 'string' && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr);
  return (Date.now() - d.getTime()) < 2 * 3600000;
}

function getFirstPhoto(photoPathsJson) {
  if (!photoPathsJson) return null;
  try {
    const arr = JSON.parse(photoPathsJson);
    return arr.length > 0 ? arr[0] : null;
  } catch { return null; }
}

function markerColor(status) {
  if (!status) return '#9ca3af'; // gray
  const s = status.toLowerCase();
  if (s === 'great') return '#16a34a'; // green
  if (s.includes('wet') || s.includes('busy')) return '#f97316'; // orange
  if (s === 'closed' || s.includes('crack')) return '#ef4444'; // red
  return '#9ca3af';
}

// --- Map ---

function initMap() {
  map = L.map('court-map').setView([38.8816, -77.0910], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Show user location as blue dot
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map).bindPopup('You are here');
      },
      () => {} // silently keep default
    );
  }
}

function getFilteredCourts() {
  const query = searchInput.value.trim().toLowerCase();
  const lightsOnly = lightsFilter.checked;
  return allCourts.filter(c => {
    if (query && !c.name.toLowerCase().includes(query)) return false;
    if (lightsOnly && !c.has_lights) return false;
    return true;
  });
}

function updateMapMarkers() {
  // Clear existing
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const courts = getFilteredCourts();

  courts.forEach(c => {
    if (!c.latitude || !c.longitude) return;
    const color = markerColor(c.latest_status);
    const marker = L.circleMarker([parseFloat(c.latitude), parseFloat(c.longitude)], {
      radius: 10,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    }).addTo(map);

    const statusHtml = c.latest_status
      ? `<strong class="${statusClass(c.latest_status)}">${esc(c.latest_status)}</strong> &middot; ${timeAgo(c.latest_report_at)}`
      : '<em style="color:#9ca3af">No reports yet</em>';

    marker.bindPopup(`
      <div style="min-width:180px">
        <strong style="font-size:14px">${esc(c.name)}</strong><br>
        <span style="color:#6b7280;font-size:12px">${esc(c.city)}, ${esc(c.state)} &middot; ${esc(c.surface)} &middot; ${c.num_courts} court${c.num_courts !== 1 ? 's' : ''}${c.has_lights ? ' &middot; Lights' : ''}</span><br>
        <div style="margin:6px 0">${statusHtml}</div>
        <a href="/court/${c.id}" style="color:#16a34a;font-weight:600;font-size:13px">View Court →</a>
      </div>
    `);

    markers.push(marker);
  });
}

// --- Rendering ---

async function loadCourts() {
  const state = stateSelect.value;
  const city = citySelect.value;
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (city) params.set('city', city);

  const res = await fetch('/api/courts?' + params.toString());
  allCourts = await res.json();
  renderCourts();
  if (map) updateMapMarkers();
}

function renderCourts() {
  const courts = getFilteredCourts();

  if (courts.length === 0) {
    courtListEl.innerHTML = `
      <div class="empty-state">
        <p>No courts found.</p>
        <a href="/add.html" class="btn btn-primary" style="display:inline-flex; width:auto;">Add the first court</a>
      </div>`;
    return;
  }

  courtListEl.innerHTML = courts.map(c => {
    const recent = isRecent(c.latest_report_at);
    const photo = getFirstPhoto(c.latest_photo_paths);
    return `
    <a href="/court/${c.id}" class="court-card">
      <div class="court-card-left">
        <div class="court-card-name">
          ${esc(c.name)}
          ${recent ? '<span class="just-reviewed"><span class="tennis-ball">&#127934;</span>Just Reviewed</span>' : ''}
        </div>
        <div class="court-card-location">${esc(c.city)}, ${esc(c.state)}</div>
        <div class="court-card-meta">
          <span class="badge badge-surface">${esc(c.surface)}</span>
          <span class="badge badge-access">${esc(c.public_private)}</span>
          <span class="badge badge-access">${c.num_courts} court${c.num_courts !== 1 ? 's' : ''}</span>
          ${c.has_lights ? '<span class="badge badge-lights">Lights</span>' : ''}
        </div>
      </div>
      <div class="court-card-right">
        ${c.latest_status ? `
          <div class="court-card-right-content">
            ${photo ? `<img class="latest-photo-thumb" src="${esc(photo)}" alt="Court photo">` : ''}
            <div class="latest-report-text">
              <div class="latest-label">Latest Report &middot; ${timeAgo(c.latest_report_at)}</div>
              <strong class="${statusClass(c.latest_status)}">${esc(c.latest_status)}</strong>
              ${c.latest_comment ? `<div class="latest-comment">${esc(c.latest_comment)}</div>` : ''}
            </div>
          </div>
        ` : `<div class="no-reports">No reports yet</div>`}
      </div>
    </a>`;
  }).join('');

  if (map) updateMapMarkers();
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// --- Mobile toggle ---

let mobileShowMap = true;

function updateMobileView() {
  if (mobileShowMap) {
    courtMapEl.classList.add('mobile-visible');
    courtListEl.classList.add('mobile-hidden');
    viewToggle.textContent = '📋 List View';
    setTimeout(() => map && map.invalidateSize(), 50);
  } else {
    courtMapEl.classList.remove('mobile-visible');
    courtListEl.classList.remove('mobile-hidden');
    viewToggle.textContent = '🗺 Map View';
  }
}

viewToggle.addEventListener('click', () => {
  mobileShowMap = !mobileShowMap;
  updateMobileView();
});

// --- Events ---

stateSelect.addEventListener('change', () => {
  populateCities();
  loadCourts();
});

citySelect.addEventListener('change', loadCourts);
searchInput.addEventListener('input', renderCourts);
lightsFilter.addEventListener('change', renderCourts);

// --- Init ---

initMap();
updateMobileView();
loadFilters();
loadCourts();
