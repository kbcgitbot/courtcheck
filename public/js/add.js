// Add court page

const form = document.getElementById('add-court-form');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    name: form.name.value.trim(),
    address: form.address.value.trim(),
    city: form.city.value.trim(),
    state: form.state.value.trim().toUpperCase(),
    num_courts: Number(form.num_courts.value),
    surface: form.surface.value,
    public_private: form.public_private.value,
    maps_link: form.maps_link.value.trim() || null
  };

  if (!data.name || !data.address || !data.city || !data.state || !data.num_courts || !data.surface || !data.public_private) {
    showToast('Please fill in all required fields');
    return;
  }

  if (data.state.length !== 2) {
    showToast('State should be a 2-letter abbreviation (e.g. TX)');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const res = await fetch('/api/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add court');
    }

    const result = await res.json();
    window.location.href = '/court/' + result.id;
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Add Court';
  }
});
