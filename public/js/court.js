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
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr instanceof Date ? dateStr : (typeof dateStr === 'string' && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr)).getTime();
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
  const d = new Date(dateStr instanceof Date ? dateStr : (typeof dateStr === 'string' && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isStale(dateStr) {
  const then = new Date(dateStr instanceof Date ? dateStr : (typeof dateStr === 'string' && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr)).getTime();
  return Date.now() - then > 7 * 86400000;
}

function statusBadgeClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('dry') || s === 'great') return 'status-badge-great';
  if (s.includes('wet')) return 'status-badge-wet';
  if (s.includes('closed') || s.includes('crack') || s.includes('busy')) return 'status-badge-closed';
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
          <div class="value" id="lights-display">${c.has_lights ? 'Yes' : 'No'}</div>
        </div>
      </div>
      ${c.maps_link ? `<a href="${esc(c.maps_link)}" target="_blank" rel="noopener" class="maps-link">&#x1f4cd; Open in Google Maps</a>` : ''}
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--gray-100); display:flex; align-items:center; gap:8px;">
        <label style="font-size:0.8125rem; color:var(--gray-500); font-weight:600;">Lights available?</label>
        <select id="lights-edit" style="padding:4px 8px; border:1px solid var(--gray-300); border-radius:6px; font-size:0.8125rem;">
          <option value="true" ${c.has_lights ? 'selected' : ''}>Yes</option>
          <option value="false" ${!c.has_lights ? 'selected' : ''}>No</option>
        </select>
        <button id="lights-save" class="btn btn-small" style="background:var(--green-600); color:white; border:none; border-radius:6px; padding:4px 12px; font-size:0.8125rem; cursor:pointer;">Save</button>
      </div>
    </div>

    <div class="report-form-section" style="margin-top:16px;">
      <h3>About These Courts</h3>
      <div id="court-note-display">
        <p id="court-note-text" style="color:${c.court_note ? 'var(--gray-700)' : 'var(--gray-400)'}; font-size:0.9375rem; line-height:1.5; margin-bottom:8px;">
          ${c.court_note ? esc(c.court_note) : 'No notes yet — click Edit to add info about these courts.'}
        </p>
        ${c.court_note_updated_at ? `<div style="font-size:0.75rem; color:var(--gray-400); margin-bottom:8px;">Last edited ${timeAgo(c.court_note_updated_at)}</div>` : ''}
        <button id="note-edit-btn" class="btn btn-small" style="background:none; border:1px solid var(--gray-300); color:var(--gray-600); border-radius:6px; padding:4px 12px; font-size:0.8125rem; cursor:pointer;">Edit</button>
      </div>
      <div id="court-note-editor" style="display:none;">
        <p style="font-size:0.75rem; color:var(--gray-400); font-style:italic; margin-bottom:8px; line-height:1.4;">
          Help your fellow players — note any permanent or recurring issues here: cracked courts, missing nets, broken lights, or anything else that doesn't change day to day. Keep it brief and update it when things change.
        </p>
        <textarea id="note-textarea" style="width:100%; padding:10px 12px; border:1px solid var(--gray-300); border-radius:8px; font-size:0.9375rem; font-family:inherit; min-height:80px; resize:vertical;">${c.court_note ? esc(c.court_note) : ''}</textarea>
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button id="note-save-btn" class="btn btn-small" style="background:var(--green-600); color:white; border:none; border-radius:6px; padding:6px 16px; font-size:0.8125rem; cursor:pointer;">Save</button>
          <button id="note-cancel-btn" class="btn btn-small" style="background:none; border:1px solid var(--gray-300); color:var(--gray-600); border-radius:6px; padding:6px 16px; font-size:0.8125rem; cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;

  // Lights edit
  document.getElementById('lights-save').addEventListener('click', async () => {
    const val = document.getElementById('lights-edit').value === 'true';
    try {
      const res = await fetch('/api/courts/' + courtId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has_lights: val })
      });
      if (res.ok) {
        document.getElementById('lights-display').textContent = val ? 'Yes' : 'No';
        showToast('Lights info updated!');
      } else {
        showToast('Failed to update');
      }
    } catch { showToast('Failed to update'); }
  });

  // Note edit toggle
  document.getElementById('note-edit-btn').addEventListener('click', () => {
    document.getElementById('court-note-display').style.display = 'none';
    document.getElementById('court-note-editor').style.display = 'block';
  });

  document.getElementById('note-cancel-btn').addEventListener('click', () => {
    document.getElementById('court-note-editor').style.display = 'none';
    document.getElementById('court-note-display').style.display = 'block';
  });

  document.getElementById('note-save-btn').addEventListener('click', async () => {
    const noteText = document.getElementById('note-textarea').value;
    try {
      const res = await fetch('/api/courts/' + courtId + '/note', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_note: noteText })
      });
      if (res.ok) {
        const data = await res.json();
        document.getElementById('court-note-text').textContent = data.court_note || 'No notes yet — click Edit to add info about these courts.';
        document.getElementById('court-note-text').style.color = data.court_note ? 'var(--gray-700)' : 'var(--gray-400)';
        document.getElementById('court-note-editor').style.display = 'none';
        document.getElementById('court-note-display').style.display = 'block';
        showToast('Court note saved!');
        // Reload to update timestamp
        loadCourt();
      } else {
        showToast('Failed to save note');
      }
    } catch { showToast('Failed to save note'); }
  });

  // Report form
  formContainer.innerHTML = `
    <div class="report-form-section">
      <h3>Submit a Condition Report</h3>
      <form id="report-form" enctype="multipart/form-data">
        <div class="form-group">
          <label>Condition *</label>
          <div class="status-options">
            <div class="status-option">
              <input type="radio" name="status" id="s-dry" value="Dry & Open" required>
              <label for="s-dry">Dry & Open</label>
            </div>
            <div class="status-option">
              <input type="radio" name="status" id="s-wet" value="Wet / Puddles">
              <label for="s-wet">Wet / Puddles</label>
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
