/* ============================================================
   Vanilla Case List — application logic
   ============================================================
   Loads cases.json, renders the grid, handles search/filter/sort
   and the random case roll.

   To add or remove a case: edit cases.json. No code changes needed.
   ============================================================ */

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };
const LENGTH_ORDER     = { Short: 0, Moderate: 1, Long: 2 };

const state = {
  cases: [],
  filters: {
    difficulty: 'all',     // 'all' | 'easy' | 'medium' | 'hard'
    length:     'all',     // 'all' | 'Short' | 'Moderate' | 'Long'
    tags:       new Set(), // active tag filters (case must have ALL of these)
    search:     '',
    hideNsfw:   false,     // NSFW visible by default; toggle on to hide
  },
  sort: 'default',
  view: 'grid',           // 'grid' | 'list' — persisted in localStorage
};

/* ----------------------------------------------------------------
 * Initialization
 * ---------------------------------------------------------------- */
async function init() {
  try {
    const res = await fetch('cases.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load cases.json (${res.status})`);
    state.cases = await res.json();
  } catch (err) {
    const isFileUrl = location.protocol === 'file:';
    document.getElementById('cases-grid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:2.5rem 1.5rem;background:var(--paper);border:3px solid var(--red-deep);border-radius:6px;color:var(--ink);">
        <h2 style="font-family:var(--font-display);font-style:italic;color:var(--red-deep);margin:0 0 0.6rem;">Couldn't load cases.json</h2>
        <p style="margin:0.4rem 0;"><code>${escapeHtml(err.message)}</code></p>
        ${isFileUrl
          ? `<p style="margin:1rem 0 0.5rem;"><strong>It looks like you opened this file directly (file://).</strong> Browsers block <code>fetch()</code> in that mode for security.</p>
             <p style="margin:0.5rem 0;">Serve this folder from a web server. From a terminal in this folder, run <code>python3 -m http.server</code> and open <a href="http://localhost:8000">http://localhost:8000</a>.</p>`
          : `<p style="margin:0.6rem 0;">Make sure <code>cases.json</code> is in the same folder as <code>index.html</code> and is readable by the server.</p>`
        }
      </div>`;
    return;
  }

  // Optional site info (last/scheduled update labels). Failure is non-fatal.
  let siteInfo = {};
  try {
    const r = await fetch('site_info.json', { cache: 'no-store' });
    if (r.ok) siteInfo = await r.json();
  } catch { /* fall through with empty siteInfo */ }
  state.siteInfo = siteInfo;

  // Restore saved view preference (grid/list)
  try {
    const saved = localStorage.getItem('vcl-view');
    if (saved === 'list' || saved === 'grid') state.view = saved;
  } catch { /* localStorage unavailable, ignore */ }

  renderStats();
  renderDocketInfo();
  renderFeatured();
  bindControls();
  render();
}

/* ----------------------------------------------------------------
 * Docket info: last updated / scheduled / count / what's new
 * ---------------------------------------------------------------- */
function renderDocketInfo() {
  const info = state.siteInfo || {};
  // Most recent approval_date across all cases
  const datedCases = state.cases.filter(c => c.approval_date);
  let lastDate = null;
  if (datedCases.length) {
    lastDate = datedCases.reduce((max, c) => c.approval_date > max ? c.approval_date : max, datedCases[0].approval_date);
  }

  const lastLabel = info.last_updated_label_override
    || (info.last_updated_override ? formatDateLong(info.last_updated_override) : null)
    || (lastDate ? formatDateLong(lastDate) : '—');

  const schedLabel = info.scheduled_update_label
    || (info.scheduled_update ? formatDateLong(info.scheduled_update) : '—');

  document.getElementById('info-last-updated').textContent = lastLabel;
  document.getElementById('info-scheduled').textContent = schedLabel;
  document.getElementById('info-count').textContent = state.cases.length;

  // What's new: cases whose approval_date matches the most recent date
  let newCases;
  if (Array.isArray(info.whats_new_override) && info.whats_new_override.length) {
    newCases = info.whats_new_override
      .map(id => state.cases.find(c => c.id === id))
      .filter(Boolean);
  } else if (lastDate) {
    newCases = datedCases.filter(c => c.approval_date === lastDate);
  } else {
    newCases = [];
  }

  const ul = document.getElementById('info-whats-new');
  if (!newCases.length) {
    ul.innerHTML = '<li style="color:var(--ink-light);font-style:italic;">No new cases yet.</li>';
    return;
  }
  ul.innerHTML = newCases.map(c => {
    const diffLetter = c.difficulty[0].toUpperCase();
    const link = c.url
      ? `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.title)}</a>`
      : escapeHtml(c.title);
    return `<li>${link} <span class="diff-badge diff-${escapeAttr(c.difficulty)}">${diffLetter}</span></li>`;
  }).join('');
}

function formatDateLong(iso) {
  // "2026-05-01" -> "1st May 2026"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const day = parseInt(m[3], 10);
  const monthIdx = parseInt(m[2], 10) - 1;
  const year = m[1];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const suffix = (n) => {
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${day}${suffix(day)} ${months[monthIdx]} ${year}`;
}

/* ----------------------------------------------------------------
 * Featured Case — a random case that cycles once per day.
 * ---------------------------------------------------------------- */
function dailySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seededIndex(seed, length) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(r * length);
}

function renderFeatured() {
  const container = document.getElementById('featured-case');
  if (!container) return;

  if (!state.cases.length) {
    container.style.display = 'none';
    return;
  }

  const idx = seededIndex(dailySeed(), state.cases.length);
  const featured = state.cases[idx];

  const lengthLabel = featured.length || '?';
  const tagsHtml = featured.tags
    .filter(t => t === 'NEW')
    .map(t => renderTag(t, featured))
    .join('');

  container.innerHTML = `
    <span class="featured-label">Featured Case</span>
    <div class="featured-card-inner card-openable" data-difficulty="${escapeAttr(featured.difficulty)}" data-case-id="${featured.id}" tabindex="0" role="button" aria-label="${escapeAttr(featured.title)} — click for full details">
      <img class="featured-image" src="${escapeAttr(featured.image)}" alt="${escapeAttr(featured.title)} logo" onerror="this.style.display='none'">
      <div class="featured-text">
        <h3 class="featured-title">${escapeHtml(featured.title)}</h3>
        <p class="featured-creator">${escapeHtml(featured.creator || 'Unknown')}</p>
        <div class="featured-meta">
          <span class="card-meta-item length-${escapeAttr(lengthLabel)}">${lengthLabel}</span>
          ${tagsHtml}
        </div>
      </div>
    </div>
  `;
}

/* ----------------------------------------------------------------
 * Stats
 * ---------------------------------------------------------------- */
function renderStats() {
  const total = state.cases.length;
  const easy   = state.cases.filter(c => c.difficulty === 'easy').length;
  const medium = state.cases.filter(c => c.difficulty === 'medium').length;
  const hard   = state.cases.filter(c => c.difficulty === 'hard').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-easy').textContent = easy;
  document.getElementById('stat-medium').textContent = medium;
  document.getElementById('stat-hard').textContent = hard;
}

/* ----------------------------------------------------------------
 * Filtering / Sorting
 * ---------------------------------------------------------------- */
function getFiltered() {
  const { difficulty, length, tags, search, hideNsfw } = state.filters;
  const q = search.trim().toLowerCase();

  let list = state.cases.filter(c => {
    if (hideNsfw && c.tags.includes('NSFW')) return false;
    if (difficulty !== 'all' && c.difficulty !== difficulty) return false;
    if (length !== 'all' && c.length !== length) return false;
    if (tags.size) {
      for (const t of tags) {
        if (!c.tags.includes(t)) return false;
      }
    }
    if (q) {
      const haystack = `${c.title} ${c.creator} ${c.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  switch (state.sort) {
    case 'alpha':
      list.sort((a, b) => stripArticle(a.title).localeCompare(stripArticle(b.title)));
      break;
    case 'alpha-desc':
      list.sort((a, b) => stripArticle(b.title).localeCompare(stripArticle(a.title)));
      break;
    case 'length':
      list.sort((a, b) =>
        (LENGTH_ORDER[a.length] ?? 9) - (LENGTH_ORDER[b.length] ?? 9) ||
        (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9));
      break;
    case 'newest':
      list.sort((a, b) => {
        const da = a.approval_date || '';
        const db = b.approval_date || '';
        if (da !== db) return db.localeCompare(da);
        return b.id - a.id;
      });
      break;
    case 'default':
    default:
      list.sort((a, b) =>
        (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9) ||
        a.id - b.id);
  }

  return list;
}

function stripArticle(t) {
  return t.replace(/^(the|a|an)\s+/i, '').toLowerCase();
}

/* ----------------------------------------------------------------
 * Render
 * ---------------------------------------------------------------- */
function render() {
  const list = getFiltered();
  const grid = document.getElementById('cases-grid');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('results-count');

  grid.classList.toggle('view-list', state.view === 'list');

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    count.innerHTML = `Showing <strong>0</strong> of <strong>${state.cases.length}</strong> cases.`;
    return;
  }
  empty.hidden = true;
  count.innerHTML = `Showing <strong>${list.length}</strong> of <strong>${state.cases.length}</strong> cases.`;

  grid.innerHTML = list.map(renderCard).join('');
}

function renderCard(c) {
  const cls = ['case-card', 'card-openable'];

  const tagsHtml = c.tags.length
    ? `<div class="card-tags">${c.tags.map(t => renderTag(t, c)).join('')}</div>`
    : '';

  const diffLabel = capitalize(c.difficulty);
  const lengthLabel = c.length || '?';

  let dateLabel = '';
  if (c.approval_date) {
    const m = c.approval_date.match(/^(\d{4})-(\d{2})/);
    if (m) {
      const year = m[1];
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthName = monthNames[parseInt(m[2], 10) - 1];
      dateLabel = `Added ${monthName} ${year}`;
    }
  }

  return `
    <div class="${cls.join(' ')}" data-difficulty="${escapeAttr(c.difficulty)}" data-case-id="${c.id}" tabindex="0" role="button" aria-label="${escapeAttr(c.title)} — click for full details">
      <div class="card-difficulty-strip" data-label="${diffLabel}"></div>
      <div class="card-image-wrap">
        <img class="card-image" src="${escapeAttr(c.image)}" alt="${escapeAttr(c.title)} logo" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="card-body">
        <div class="card-headline-text">
          <h3 class="card-title">${escapeHtml(c.title)}</h3>
          <p class="card-creator">${escapeHtml(c.creator || 'Unknown')}</p>
        </div>
        <div class="card-meta">
          <span class="card-meta-item length-${escapeAttr(lengthLabel)}">${lengthLabel}</span>
          ${tagsHtml}
          ${dateLabel ? `<span class="card-date">${dateLabel}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* ----------------------------------------------------------------
 * Case detail modal
 * ---------------------------------------------------------------- */
function openCaseModal(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;

  const modal = document.getElementById('case-modal');
  const content = document.getElementById('case-modal-content');

  const diffLabel = capitalize(c.difficulty);
  const lengthLabel = c.length || 'Unknown';
  const dateLabel = c.approval_date ? formatDateLong(c.approval_date) : null;

  const tagsHtml = c.tags.length
    ? `<div class="case-modal-tags">${c.tags.map(t => renderTag(t, c)).join('')}</div>`
    : '';

  const openBtn = c.url
    ? `<a class="card-open-btn case-modal-open-btn" href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer">Open Case Document ↗</a>`
    : `<span class="card-open-btn card-open-btn-disabled" aria-disabled="true">No document available yet</span>`;

  content.innerHTML = `
    <div class="case-modal-card" data-difficulty="${escapeAttr(c.difficulty)}">
      <div class="case-modal-tab" data-label="${diffLabel}"></div>
      <div class="case-modal-image-wrap">
        <img class="case-modal-image" src="${escapeAttr(c.image)}" alt="${escapeAttr(c.title)} logo" onerror="this.style.display='none'">
      </div>
      <div class="case-modal-info">
        <h2 id="case-modal-title" class="case-modal-title">${escapeHtml(c.title)}</h2>
        <p class="case-modal-creator">${escapeHtml(c.creator || 'Unknown')}</p>

        ${openBtn}

        <div class="case-modal-meta">
          <span class="case-modal-meta-item">
            <span class="case-modal-meta-label">Difficulty</span>
            <span class="card-meta-item diff-${escapeAttr(c.difficulty)}">${diffLabel}</span>
          </span>
          <span class="case-modal-meta-item">
            <span class="case-modal-meta-label">Length</span>
            <span class="card-meta-item length-${escapeAttr(lengthLabel)}">${lengthLabel}</span>
          </span>
          ${dateLabel ? `
          <span class="case-modal-meta-item">
            <span class="case-modal-meta-label">Added</span>
            <span class="case-modal-meta-value">${dateLabel}</span>
          </span>` : ''}
        </div>

        ${tagsHtml}

        <div class="case-modal-desc-block">
          <span class="case-modal-desc-label">Description</span>
          <p class="case-modal-description">${escapeHtml(c.description || 'No description available.')}</p>
        </div>
      </div>
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeCaseModal() {
  document.getElementById('case-modal').hidden = true;
  document.body.style.overflow = '';
}

function renderTag(tag, caseObj) {
  if (tag === 'CUSTOM FILES') {
    const url = caseObj && caseObj.custom_files_url;
    if (url) {
      return `<a class="tag-pill tag-Custom is-link"
                 href="${escapeAttr(url)}"
                 target="_blank"
                 rel="noopener noreferrer"
                 title="Download required custom files for this case"
                 onclick="event.stopPropagation();">Custom Files</a>`;
    }
    return `<span class="tag-pill tag-Custom">Custom Files</span>`;
  }
  const cls = (tag === 'Tutorial Case') ? 'tag-Tutorial' : `tag-${tag}`;
  const label = tag === 'NEW' ? '⭐ NEW'
              : tag === 'Tutorial Case' ? 'Tutorial'
              : tag === 'NSFW' ? 'NSFW'
              : tag;
  return `<span class="tag-pill ${cls}">${label}</span>`;
}

/* ----------------------------------------------------------------
 * Controls
 * ---------------------------------------------------------------- */
function bindControls() {
  document.addEventListener('click', e => {
    // .card-openable — opens case detail modal (grid, featured, and random result)
    const card = e.target.closest('.card-openable');
    if (card) {
      const interactive = e.target.closest('a, button');
      if (interactive && card.contains(interactive)) return;
      const id = parseInt(card.dataset.caseId, 10);
      if (!Number.isNaN(id)) {
        closeRandomModal();
        openCaseModal(id);
      }
      return;
    }
  });

  // Keyboard activation (Enter / Space)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card-openable');
    if (!card || card !== e.target) return;
    e.preventDefault();
    const id = parseInt(card.dataset.caseId, 10);
    if (!Number.isNaN(id)) {
      closeRandomModal();
      openCaseModal(id);
    }
  });

  // Search
  const searchInput = document.getElementById('search');
  const searchClear = document.getElementById('search-clear');
  searchInput.addEventListener('input', () => {
    state.filters.search = searchInput.value;
    searchClear.hidden = !searchInput.value;
    render();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    searchClear.hidden = true;
    searchInput.focus();
    render();
  });

  // Chips (difficulty, length, tags)
  document.querySelectorAll('.chips').forEach(group => {
    const filterKey = group.dataset.filter;
    group.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const value = btn.dataset.value;
      if (filterKey === 'tags') {
        if (state.filters.tags.has(value)) {
          state.filters.tags.delete(value);
          btn.classList.remove('is-active');
        } else {
          state.filters.tags.add(value);
          btn.classList.add('is-active');
        }
      } else {
        state.filters[filterKey] = value;
        group.querySelectorAll('.chip').forEach(b => b.classList.toggle('is-active', b === btn));
      }
      render();
    });
  });

  // Sort
  document.getElementById('sort').addEventListener('change', e => {
    state.sort = e.target.value;
    render();
  });

  // Reset
  document.getElementById('reset-filters').addEventListener('click', () => {
    state.filters = { difficulty: 'all', length: 'all', tags: new Set(), search: '', hideNsfw: false };
    state.sort = 'default';
    document.getElementById('search').value = '';
    document.getElementById('search-clear').hidden = true;
    document.getElementById('sort').value = 'default';
    const hideNsfwInput = document.getElementById('hide-nsfw');
    if (hideNsfwInput) hideNsfwInput.checked = false;
    document.querySelectorAll('.chips').forEach(group => {
      const filterKey = group.dataset.filter;
      group.querySelectorAll('.chip').forEach(btn => {
        if (filterKey === 'tags') {
          btn.classList.remove('is-active');
        } else {
          btn.classList.toggle('is-active', btn.dataset.value === 'all');
        }
      });
    });
    render();
  });

  // Random buttons
  document.querySelectorAll('.btn-random[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => rollRandom(btn.dataset.difficulty));
  });

  // Random modal — close + roll again
  const randomModal = document.getElementById('random-modal');
  randomModal.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) closeRandomModal();
  });
  document.getElementById('random-again').addEventListener('click', () => {
    rollRandom(randomModal.dataset.lastDifficulty || 'any');
  });

  // Case detail modal — close
  const caseModal = document.getElementById('case-modal');
  caseModal.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) closeCaseModal();
  });

  // Escape
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!randomModal.hidden) closeRandomModal();
    if (!caseModal.hidden) closeCaseModal();
  });

  // NSFW toggle
  const hideNsfwInput = document.getElementById('hide-nsfw');
  if (hideNsfwInput) {
    hideNsfwInput.addEventListener('change', () => {
      state.filters.hideNsfw = hideNsfwInput.checked;
      render();
    });
  }

  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    const isActive = btn.dataset.view === state.view;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (v !== 'grid' && v !== 'list') return;
      state.view = v;
      try { localStorage.setItem('vcl-view', v); } catch { /* ignore */ }
      document.querySelectorAll('.view-btn').forEach(b => {
        const active = b.dataset.view === v;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });

  // FAQ toggle
  const faqToggle = document.getElementById('faq-toggle');
  const faqSection = document.getElementById('faq-section');
  if (faqToggle && faqSection) {
    faqToggle.addEventListener('click', () => {
      const isOpen = !faqSection.hidden;
      faqSection.hidden = isOpen;
      faqToggle.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/* ----------------------------------------------------------------
 * Random selector
 * ---------------------------------------------------------------- */
function rollRandom(difficulty) {
  let pool = state.cases.slice();
  if (state.filters.hideNsfw) pool = pool.filter(c => !c.tags.includes('NSFW'));
  if (difficulty !== 'any') pool = pool.filter(c => c.difficulty === difficulty);

  const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  showRandom(pick, difficulty);
}

function showRandom(c, difficulty) {
  const randomModal = document.getElementById('random-modal');
  randomModal.dataset.lastDifficulty = difficulty;
  const result = document.getElementById('random-result');

  if (!c) {
    result.innerHTML = `<p style="text-align:center;color:var(--red-deep);margin:0.5rem 0;">No cases available for that filter.</p>`;
  } else {
    // Render using the same full case-detail card UI as openCaseModal
    const diffLabel = capitalize(c.difficulty);
    const lengthLabel = c.length || 'Unknown';
    const dateLabel = c.approval_date ? formatDateLong(c.approval_date) : null;

    const tagsHtml = c.tags.length
      ? `<div class="case-modal-tags">${c.tags.map(t => renderTag(t, c)).join('')}</div>`
      : '';

    const openBtn = c.url
      ? `<a class="card-open-btn case-modal-open-btn" href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer">Open Case Document ↗</a>`
      : `<span class="card-open-btn card-open-btn-disabled" aria-disabled="true">No document available yet</span>`;

    result.innerHTML = `
      <div class="case-modal-card" data-difficulty="${escapeAttr(c.difficulty)}">
        <div class="case-modal-tab" data-label="${diffLabel}"></div>
        <div class="case-modal-image-wrap">
          <img class="case-modal-image" src="${escapeAttr(c.image)}" alt="${escapeAttr(c.title)} logo" onerror="this.style.display='none'">
        </div>
        <div class="case-modal-info">
          <h2 class="case-modal-title">${escapeHtml(c.title)}</h2>
          <p class="case-modal-creator">${escapeHtml(c.creator || 'Unknown')}</p>

          ${openBtn}

          <div class="case-modal-meta">
            <span class="case-modal-meta-item">
              <span class="case-modal-meta-label">Difficulty</span>
              <span class="card-meta-item diff-${escapeAttr(c.difficulty)}">${diffLabel}</span>
            </span>
            <span class="case-modal-meta-item">
              <span class="case-modal-meta-label">Length</span>
              <span class="card-meta-item length-${escapeAttr(lengthLabel)}">${lengthLabel}</span>
            </span>
            ${dateLabel ? `
            <span class="case-modal-meta-item">
              <span class="case-modal-meta-label">Added</span>
              <span class="case-modal-meta-value">${dateLabel}</span>
            </span>` : ''}
          </div>

          ${tagsHtml}

          <div class="case-modal-desc-block">
            <span class="case-modal-desc-label">Description</span>
            <p class="case-modal-description">${escapeHtml(c.description || 'No description available.')}</p>
          </div>
        </div>
      </div>
    `;
  }

  randomModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeRandomModal() {
  document.getElementById('random-modal').hidden = true;
  document.body.style.overflow = '';
}

// Keep closeModal as an alias so nothing else breaks
function closeModal() { closeRandomModal(); }

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

/* ---------------------------------------------------------------- */

init();