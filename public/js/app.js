// Court directory page

const stateSelect = document.getElementById('filter-state');
const citySelect = document.getElementById('filter-city');
const searchInput = document.getElementById('filter-search');
const courtListEl = document.getElementById('court-list');

let allCities = [];
let allCourts = [];

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
  populateCities();
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
  const now = Date.now();
  const then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const diff = now - then;
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
  const then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  return (Date.now() - then) < 2 * 3600000; // 2 hours
}

function getFirstPhoto(photoPathsJson) {
  if (!photoPathsJson) return null;
  try {
    const arr = JSON.parse(photoPathsJson);
    return arr.length > 0 ? arr[0] : null;
  } catch { return null; }
}

async function loadCourts() {
  const state = stateSelect.value;
  const city = citySelect.value;
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (city) params.set('city', city);

  const res = await fetch('/api/courts?' + params.toString());
  allCourts = await res.json();
  renderCourts();
}

function renderCourts() {
  const query = searchInput.value.trim().toLowerCase();
  const courts = query
    ? allCourts.filter(c => c.name.toLowerCase().includes(query))
    : allCourts;

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
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

stateSelect.addEventListener('change', () => {
  populateCities();
  loadCourts();
});

citySelect.addEventListener('change', loadCourts);
searchInput.addEventListener('input', renderCourts);

loadFilters();
loadCourts();
