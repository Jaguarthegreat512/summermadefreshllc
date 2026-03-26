document.addEventListener('DOMContentLoaded', function () {
  const toggles = document.querySelectorAll('.menu-toggle');
  toggles.forEach(btn => {
    const navLinks = btn.closest('nav').querySelector('.nav-links');
    btn.addEventListener('click', function () {
      const open = navLinks.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  });
});

// Events list: store in localStorage and show only future events
// Admin password (change this value in the source; site coders can edit it)
const ADMIN_PASS = '1234abcd';

function isAdmin() {
  return sessionStorage.getItem('sd_admin') === 'true';
}

function setAdmin(enabled) {
  if (enabled) sessionStorage.setItem('sd_admin', 'true');
  else sessionStorage.removeItem('sd_admin');
  // toggle admin-only UI
  document.querySelectorAll('.admin-only').forEach(el => {
    if (enabled) el.classList.add('show'); else el.classList.remove('show');
  });
  // update remove buttons visibility
  document.querySelectorAll('#events-list button').forEach(b => b.style.display = enabled ? 'inline-block' : 'none');
  // make page content editable when admin
  document.querySelectorAll('[data-editable], .content').forEach(el => {
    el.contentEditable = enabled ? 'true' : 'false';
    if (!enabled) {
      try { el.blur(); } catch(e){}
    }
  });
  // show/hide admin toolbar
  const toolbar = document.getElementById('admin-toolbar');
  if (toolbar) toolbar.style.display = enabled ? 'flex' : 'none';
}

// Simple page editing utilities
function getPageSaveKey() {
  return 'sd_page_' + (location.pathname || 'index');
}

function savePageContent() {
  const content = document.querySelector('.content');
  if (!content) return;
  localStorage.setItem(getPageSaveKey(), content.innerHTML);
  alert('Page changes saved locally.');
}

function loadPageContent() {
  const raw = localStorage.getItem(getPageSaveKey());
  if (!raw) return;
  const content = document.querySelector('.content');
  if (!content) return;
  content.innerHTML = raw;
}

function createAdminToolbar() {
  if (document.getElementById('admin-toolbar')) return;
  const tb = document.createElement('div');
  tb.id = 'admin-toolbar';
  tb.style.position = 'fixed';
  tb.style.right = '18px';
  tb.style.top = '18px';
  tb.style.display = isAdmin() ? 'flex' : 'none';
  tb.style.gap = '8px';
  tb.style.zIndex = 9999;
  tb.style.alignItems = 'center';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save Changes';
  saveBtn.addEventListener('click', savePageContent);

  const loadBtn = document.createElement('button');
  loadBtn.className = 'btn-outline';
  loadBtn.textContent = 'Load Saved';
  loadBtn.addEventListener('click', function(){ loadPageContent(); alert('Loaded saved content.'); });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-outline';
  clearBtn.textContent = 'Clear Saved';
  clearBtn.addEventListener('click', function(){ localStorage.removeItem(getPageSaveKey()); alert('Cleared saved content.'); });

  const exitBtn = document.createElement('button');
  exitBtn.className = 'btn-outline';
  exitBtn.textContent = 'Exit Admin';
  exitBtn.addEventListener('click', function(){ setAdmin(false); alert('Admin mode disabled'); });

  tb.appendChild(saveBtn);
  tb.appendChild(loadBtn);
  tb.appendChild(clearBtn);
  tb.appendChild(exitBtn);
  document.body.appendChild(tb);
}

function promptAdminToggle() {
  if (isAdmin()) {
    // log out
    setAdmin(false);
    alert('Admin mode disabled');
    return;
  }
  const p = prompt('Enter admin password to enable editing:');
  if (p === ADMIN_PASS) {
    setAdmin(true);
    alert('Admin mode enabled');
  } else {
    alert('Incorrect password');
  }
}

function loadEvents() {
  const raw = localStorage.getItem('sd_events');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveEvents(list) {
  localStorage.setItem('sd_events', JSON.stringify(list));
}

function renderEvents() {
  const list = loadEvents();
  const now = new Date();
  const upcoming = list.filter(ev => new Date(ev.date + 'T00:00:00') >= new Date(now.toDateString()));
  const container = document.getElementById('events-list');
  const noEvents = document.getElementById('no-events');
  if (!container) return;
  container.innerHTML = '';
  if (upcoming.length === 0) {
    noEvents.style.display = 'block';
  } else {
    noEvents.style.display = 'none';
  }

  upcoming.sort((a,b) => new Date(a.date) - new Date(b.date));
  upcoming.forEach((ev, idx) => {
    const li = document.createElement('li');
    li.style.padding = '12px';
    li.style.border = '1px solid rgba(36,73,47,0.06)';
    li.style.borderRadius = '8px';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';

    const left = document.createElement('div');
    const date = new Date(ev.date);
    left.innerHTML = `<strong style="display:block; color:var(--leaf-dark);">${date.toLocaleDateString(undefined,{month:'short', day:'numeric', year:'numeric'})}</strong><span style="color:rgba(36,73,47,0.8);">${ev.location}</span>`;

    const right = document.createElement('div');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-outline admin-only';
    removeBtn.textContent = 'Remove';
    removeBtn.style.display = isAdmin() ? 'inline-block' : 'none';
    removeBtn.onclick = function () {
      const all = loadEvents();
      const remaining = all.filter(x => !(x.date === ev.date && x.location === ev.location));
      saveEvents(remaining);
      renderEvents();
    };
    right.appendChild(removeBtn);

    li.appendChild(left);
    li.appendChild(right);
    container.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  renderEvents();
  // wire admin button
  const adminBtn = document.getElementById('admin-toggle');
  if (adminBtn) adminBtn.addEventListener('click', promptAdminToggle);
  // apply current admin state
  setAdmin(isAdmin());
  // ensure admin toolbar exists and load any saved content
  createAdminToolbar();
  loadPageContent();
  const form = document.getElementById('event-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const dateEl = document.getElementById('ev-date');
    const locEl = document.getElementById('ev-location');
    if (!dateEl.value || !locEl.value) return;
    const list = loadEvents();
    list.push({ date: dateEl.value, location: locEl.value });
    saveEvents(list);
    dateEl.value = '';
    locEl.value = '';
    renderEvents();
  });
});

// Home carousel initialization
document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.home-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const items = carousel.querySelectorAll('.carousel-item');
  const prevBtn = carousel.querySelector('.carousel-btn.prev');
  const nextBtn = carousel.querySelector('.carousel-btn.next');
  const dotsContainer = carousel.querySelector('.carousel-dots');

  let currentIndex = 0;
  let autoplayTimer;

  // Create dots
  items.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });
  updateDots();

  // Button event listeners
  prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

  // Autoplay
  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setTimeout(() => {
      goToSlide(currentIndex + 1);
      startAutoplay();
    }, 5000);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function goToSlide(index) {
    currentIndex = (index + items.length) % items.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();
    stopAutoplay();
    startAutoplay();
  }

  function updateDots() {
    const dots = dotsContainer.querySelectorAll('button');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // Pause on hover
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  // Keyboard navigation
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
  });

  // Swipe support
  let startX;
  let isDragging = false;

  carousel.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    isDragging = true;
    stopAutoplay();
    track.style.transition = 'none';
  });

  carousel.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${diff}px))`;
  });

  carousel.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    const diff = e.clientX - startX;
    if (diff > 50) goToSlide(currentIndex - 1);
    else if (diff < -50) goToSlide(currentIndex + 1);
    else goToSlide(currentIndex);
  });

  // Image modal functionality
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const closeBtn = modal.querySelector('.close');

  items.forEach(item => {
    const img = item.querySelector('img');
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
      modal.style.display = 'block';
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      stopAutoplay();
    });
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    startAutoplay();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      startAutoplay();
    }
  });

  // Start autoplay
  startAutoplay();
});
