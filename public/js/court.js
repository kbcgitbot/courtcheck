// Court detail page

const courtId = window.location.pathname.split('/').pop();
const detailEl = document.getElementById('court-detail');
const formContainer = document.getElementById('report-form-container');
const reportsListEl = document.getElementById('reports-list');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const toast = document.getElementById('toast');

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' minute' + (mins !== 1 ? 's' : '') + ' ago';
  if (hours < 24) return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
  if (days < 30) return days + ' day' + (days !== 1 ? 's' : '') + ' ago';
  return Math.floor(days / 30) + ' month' + (Math.floor(days / 30) !== 1 ? 's' : '') + ' ago';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isStale(dateStr) {
  const then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  return Date.now() - then > 7 * 86400000;
}

function statusBadgeClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'great') return 'status-badge-great';
  if (s.includes('wet')) return 'status-badge-wet';
  if (s.includes('crack')) return 'status-badge-cracked';
  if (s.includes('busy')) return 'status-badge-busy';
  if (s === 'closed') return 'status-badge-closed';
  return '';
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

async function loadCourt() {
  const res = await fetch('/api/courts/' + courtId);
  if (!res.ok) {
    detailEl.innerHTML = '<div class="empty-state"><p>Court not found.</p><a href="/">Back to directory</a></div>';
    return;
  }

  const c = await res.json();
  document.title = c.name + ' — CourtChek';

  detailEl.innerHTML = `
    <div class="court-detail-header">
      <h2>${esc(c.name)}</h2>
      <div style="color:var(--gray-500); font-size:0.875rem; margin-bottom:4px;">${esc(c.address)}, ${esc(c.city)}, ${esc(c.state)}</div>
      <div class="court-info-grid">
        <div class="court-info-item">
          <div class="label">Courts</div>
          <div class="value">${c.num_courts}</div>
        </div>
        <div class="court-info-item">
          <div class="label">Surface</div>
          <div class="value">${esc(c.surface)}</div>
        </div>
        <div class="court-info-item">
          <div class="label">Access</div>
          <div class="value">${esc(c.public_private)}</div>
        </div>
        <div class="court-info-item">
          <div class="label">Lights</div>
          <div class="value">${c.has_lights ? 'Yes' : 'No'}</div>
        </div>
      </div>
      ${c.maps_link ? `<a href="${esc(c.maps_link)}" target="_blank" rel="noopener" class="maps-link">&#x1f4cd; Open in Google Maps</a>` : ''}
    </div>
  `;

  formContainer.innerHTML = `
    <div class="report-form-section">
      <h3>Submit a Condition Report</h3>
      <form id="report-form" enctype="multipart/form-data">
        <div class="form-group">
          <label>Condition *</label>
          <div class="status-options">
            <div class="status-option">
              <input type="radio" name="status" id="s-great" value="Great" required>
              <label for="s-great">Great</label>
            </div>
            <div class="status-option">
              <input type="radio" name="status" id="s-wet" value="Wet/Puddles">
              <label for="s-wet">Wet/Puddles</label>
            </div>
            <div class="status-option">
              <input type="radio" name="status" id="s-cracked" value="Cracked">
              <label for="s-cracked">Cracked</label>
            </div>
            <div class="status-option">
              <input type="radio" name="status" id="s-busy" value="Busy/Long Wait">
              <label for="s-busy">Busy/Long Wait</label>
            </div>
            <div class="status-option">
              <input type="radio" name="status" id="s-closed" value="Closed">
              <label for="s-closed">Closed</label>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="comment">Comment</label>
          <textarea id="comment" name="comment" placeholder="How are the courts looking?"></textarea>
        </div>
        <div class="form-group">
          <label>Photos (up to 3)</label>
          <div class="file-input-wrapper">
            <input type="file" name="photos" accept="image/*" multiple id="photo-input">
          </div>
        </div>
        <div class="form-group" style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">
          <label for="website">Leave this empty</label>
          <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
        </div>
        <button type="submit" class="btn btn-primary">Submit Report</button>
      </form>
    </div>
  `;

  document.getElementById('photo-input').addEventListener('change', function () {
    if (this.files.length > 3) {
      showToast('Maximum 3 photos allowed');
      this.value = '';
    }
  });

  document.getElementById('report-form').addEventListener('submit', submitReport);
}

async function submitReport(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const photoInput = document.getElementById('photo-input');
  if (photoInput.files.length > 3) {
    showToast('Maximum 3 photos allowed');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/courts/' + courtId + '/reports', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit');
    }

    form.reset();
    showToast('Report submitted!');
    loadReports();
  } catch (err) {
    showToast('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Report';
  }
}

async function loadReports() {
  const res = await fetch('/api/courts/' + courtId + '/reports');
  const reports = await res.json();

  if (reports.length === 0) {
    reportsListEl.innerHTML = '<div class="no-reports">No condition reports yet. Be the first to report!</div>';
    return;
  }

  reportsListEl.innerHTML = reports.map(r => `
    <div class="report-card ${isStale(r.created_at) ? 'stale' : ''}" data-id="${r.id}">
      <div class="report-stale-notice">This report is over 7 days old</div>
      <div class="report-header">
        <span class="status-badge ${statusBadgeClass(r.status)}">${esc(r.status)}</span>
        <span class="report-timestamp">
          <span class="time-ago">${timeAgo(r.created_at)}</span>
          &middot; ${formatDate(r.created_at)}
        </span>
      </div>
      ${r.comment ? `<div class="report-comment">${esc(r.comment)}</div>` : ''}
      ${r.photo_paths.length ? `
        <div class="report-photos">
          ${r.photo_paths.map(p => `<img src="${esc(p)}" alt="Court photo" loading="lazy" onclick="openLightbox('${esc(p)}')">`).join('')}
        </div>
      ` : ''}
      <div class="report-footer">
        ${r.flag_count >= 3 ? '<span class="flag-warning">Flagged as potentially inaccurate</span>' : '<span></span>'}
        <button class="btn-flag ${r.flag_count >= 3 ? 'flagged' : ''}" onclick="flagReport(${r.id}, this)">
          Flag as inaccurate ${r.flag_count > 0 ? '(' + r.flag_count + ')' : ''}
        </button>
      </div>
    </div>
  `).join('');
}

window.openLightbox = function (src) {
  lightboxImg.src = src;
  lightbox.classList.add('active');
};

lightbox.addEventListener('click', () => {
  lightbox.classList.remove('active');
  lightboxImg.src = '';
});

window.flagReport = async function (reportId, btn) {
  try {
    const res = await fetch('/api/reports/' + reportId + '/flag', { method: 'POST' });
    const data = await res.json();
    showToast('Report flagged (count: ' + data.flag_count + ')');
    loadReports();
  } catch {
    showToast('Failed to flag report');
  }
};

loadCourt();
loadReports();
