/* ============================================================
   Vanilla Case List — standalone library page renderer
   ============================================================
   Powers resources.html and archive.html as real, independent
   pages (their own URL, back button works normally, no JS
   overlay/backdrop). Each page calls initLibPage(config) once.

   The page is built as a stack of folder-tab boxes, the same
   ones the Case List uses: About/Contents, Filters, and the
   results panel.
   ============================================================ */

(function () {
  'use strict';

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

  /* ------------------------------------------------------------
     Ornaments for the section blurb — one per section, so each
     section is recognisable at a glance. Sections with no icon of
     their own fall back to the open book.
     ------------------------------------------------------------ */
  const SECTION_ICON_PATHS = {
    // Resource Library
    'guides': '<path d="M12 6.5C10.6 5.2 8.7 4.5 6.5 4.5H3v13h3.5c2.2 0 4.1.7 5.5 2 1.4-1.3 3.3-2 5.5-2H21v-13h-3.5c-2.2 0-4.1.7-5.5 2z"/><path d="M12 6.5v12"/>',
    'casemaking': '<path d="M16.5 3.2a2.4 2.4 0 0 1 3.4 3.4L7.4 19.1 3 20.5l1.4-4.4z"/><path d="m14.8 4.9 4.3 4.3"/>',
    'other case lists': '<path d="M8.5 6.5h12"/><path d="M8.5 12h12"/><path d="M8.5 17.5h12"/><path d="M3.5 6.5h.01"/><path d="M3.5 12h.01"/><path d="M3.5 17.5h.01"/>',
    'videos': '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m10 8.8 5.5 3.2-5.5 3.2z"/>',
    'translations': '<circle cx="12" cy="12" r="9"/><path d="M3.4 9.2h17.2"/><path d="M3.4 14.8h17.2"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>',
    'miscellaneous': '<rect x="2.5" y="4" width="19" height="4.6" rx="1.2"/><path d="M4.6 8.6v10a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-10"/><path d="M9.8 12.6h4.4"/>',
    // Ultimate Archive — a headstone in its plot, not an hourglass: this
    // section is where retired cases are buried, not where they're timed.
    'graveyard': '<path d="M3.2 20.4h17.6"/><path d="M6.8 20.4V9.4a5.2 5.2 0 0 1 10.4 0v11"/><path d="M12 7.5v6.5"/><path d="M9.2 10.2h5.6"/>',
  };

  function sectionIcon(category) {
    const paths = SECTION_ICON_PATHS[String(category || '').trim().toLowerCase()]
      || SECTION_ICON_PATHS.guides;
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  const externalLinkIcon =
    '<svg width="0.85em" height="0.85em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.05em"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

  // The site's own names read badly split over two lines, so keep each one
  // whole. Applied after escaping, so the input is already safe.
  const SITE_NAMES = ['Vanilla Case List', 'Vanilla Ultimate Archive', 'Vanilla Resource Library'];

  function keepNamesWhole(escaped) {
    return SITE_NAMES.reduce(
      (out, name) => out.split(name).join(`<span class="lib-nowrap">${name}</span>`),
      escaped
    );
  }

  function byTitle(a, b) {
    const cmp = String(a.title || '').localeCompare(String(b.title || ''), 'en', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return String(a.id || '').localeCompare(String(b.id || ''), 'en');
  }

  window.initLibPage = function initLibPage(cfg) {
    const state = {
      search: '',
      category: cfg.defaultCategory || 'all',
      sort: 'default',
      data: null,
      error: null,
    };

    const body = document.getElementById(cfg.bodyId);
    const tagline = document.getElementById(cfg.taglineId);

    // Restore state from the URL so links are shareable/bookmarkable.
    const params = new URLSearchParams(location.search);
    if (params.get('cat')) state.category = params.get('cat');
    if (params.get('q')) state.search = params.get('q');
    if (params.get('sort')) state.sort = params.get('sort');

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.category && state.category !== 'all') p.set('cat', state.category);
      if (state.search) p.set('q', state.search);
      if (state.sort && state.sort !== 'default') p.set('sort', state.sort);
      const qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    // Tag badges. The data spells types freely ("case list", "Case List",
    // "Templates + Themes"), so fold each one down to a single slug for the
    // colour class — a raw type with a space in it would otherwise land in the
    // class attribute as two useless classes and the tag would go uncoloured.
    function typeSlug(type) {
      return String(type).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function typeBadge(type) {
      if (!type) return '';
      const label = String(type).replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
      return `<span class="lib-type-badge lib-type-${escapeAttr(typeSlug(type))}">${escapeHtml(label)}</span>`;
    }

    function categoryLabel(cat) {
      if (cat === 'all') return 'All';
      if (state.data && state.data.categoryLabels && state.data.categoryLabels[cat]) {
        return state.data.categoryLabels[cat];
      }
      return cat;
    }

    function categoryDescription(cat) {
      const map = state.data && state.data.categoryDescriptions;
      return (map && map[cat]) || '';
    }

    /* ------------------------------------------------------------
     * Filtering: search + category + type, then the chosen sort.
     * ------------------------------------------------------------ */
    function searchedEntries() {
      if (!state.data) return [];
      const q = state.search.trim().toLowerCase();
      const cat = state.category;
      const fields = cfg.searchFields || ['title', 'creator', 'category', 'description', 'language'];
      return state.data.entries.filter(e => {
        if (cat !== 'all' && e.category !== cat) return false;
        if (!q) return true;
        const haystack = fields.map(f => e[f]).filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    function filteredEntries() {
      const list = searchedEntries();
      if (state.sort === 'alpha') return list.slice().sort(byTitle);
      if (state.sort === 'alpha-desc') return list.slice().sort((a, b) => byTitle(b, a));
      return list;
    }

    function countsByCategory() {
      const counts = new Map();
      (state.data.entries || []).forEach(e => {
        counts.set(e.category, (counts.get(e.category) || 0) + 1);
      });
      return counts;
    }

    /* ------------------------------------------------------------
     * Box 1 — Contents. One compact card per category instead of the
     * old long nested list: name, live count, and its blurb, each one
     * a button that filters the results below.
     * ------------------------------------------------------------ */
    function renderContentsBox() {
      if (!cfg.showToc || !state.data) return '';
      const cats = Array.isArray(state.data.categories) ? state.data.categories : [];
      if (!cats.length) return '';
      const counts = countsByCategory();

      const cards = cats.map(cat => {
        const desc = categoryDescription(cat);
        const active = state.category === cat ? ' is-active' : '';
        return `
          <button type="button" class="lib-toc-card${active}" data-lib-cat="${escapeAttr(cat)}" aria-pressed="${state.category === cat}">
            <span class="lib-toc-card-main">
              <span class="lib-toc-card-name">${escapeHtml(categoryLabel(cat))}</span>
              ${desc ? `<span class="lib-toc-card-desc">${escapeHtml(desc)}</span>` : ''}
            </span>
            <span class="lib-toc-card-count">${counts.get(cat) || 0}</span>
          </button>`;
      }).join('');

      const legend = state.data.legend;
      const legendEntries = legend ? Object.entries(legend) : [];
      const legendHtml = legendEntries.length
        ? `<div class="lib-toc-legend">
             <span class="lib-toc-legend-title">Legend of Initials</span>
             <div class="lib-toc-legend-items">
               ${legendEntries.map(([k, v]) => `<span class="lib-toc-legend-item"><strong>${escapeHtml(k)}</strong> = ${escapeHtml(v)}</span>`).join('')}
             </div>
           </div>`
        : '';

      return `
        <section class="lib-box lib-box-toc" data-tab-label="Contents">
          <div class="lib-toc-cards">${cards}</div>
          ${legendHtml}
        </section>`;
    }

    /* ------------------------------------------------------------
     * Box 3 — Filters. Same shape as the Case List's Filters panel:
     * a search row, then labelled filter groups, a sort dropdown and
     * a Reset, with the live count along the bottom.
     * ------------------------------------------------------------ */
    function renderCategoryChips() {
      if (!state.data || !Array.isArray(state.data.categories) || !state.data.categories.length) return '';
      const chips = ['all', ...state.data.categories].map(cat => {
        const active = state.category === cat ? ' is-active' : '';
        return `<button type="button" class="chip${active}" data-lib-cat="${escapeAttr(cat)}" aria-pressed="${state.category === cat}">${escapeHtml(categoryLabel(cat))}</button>`;
      }).join('');
      return `
        <div class="filter-group">
          <span class="filter-label">${escapeHtml(cfg.categoryLabel || 'Category')}</span>
          <div class="chips" role="group" aria-label="Filter by ${escapeAttr(cfg.categoryLabel || 'category')}">${chips}</div>
        </div>`;
    }

    function renderSortGroup() {
      const options = [
        ['default', cfg.sortDefaultLabel || 'Listed Order'],
        ['alpha', 'Alphabetical (A–Z)'],
        ['alpha-desc', 'Alphabetical (Z–A)'],
      ];
      return `
        <div class="filter-group filter-sort">
          <span class="filter-label">Sort</span>
          <select class="lib-sort-select" aria-label="Sort entries">
            ${options.map(([v, label]) => `<option value="${escapeAttr(v)}"${state.sort === v ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </div>`;
    }

    function renderAboutBox() {
      const text = state.data.description || '';
      if (!text || !cfg.aboutLabel) return '';
      return `
        <section class="lib-box lib-box-about" data-tab-label="${escapeAttr(cfg.aboutLabel)}">
          <p class="lib-about-text">${keepNamesWhole(escapeHtml(text))}</p>
        </section>`;
    }

    // "Showing 12 of 340 cases." — the noun follows the page.
    function countText(list) {
      const noun = cfg.countNoun || 'entry';
      const plural = cfg.countNounPlural || (noun + 's');
      const total = state.data.entries.length;
      return `Showing <strong>${list.length}</strong> of <strong>${total}</strong> ${total === 1 ? noun : plural}.`;
    }

    function renderFiltersBox(list) {
      return `
        <section class="lib-box lib-box-filters" data-tab-label="Filters">
          <div class="toolbar-row toolbar-search">
            <label class="search-wrap">
              <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm5.5-2.5L21 21" />
              </svg>
              <input type="search" class="lib-search-input" placeholder="${escapeAttr(cfg.searchPlaceholder || ('Search ' + cfg.title + '…'))}" autocomplete="off" value="${escapeAttr(state.search)}" aria-label="Search ${escapeAttr(cfg.title)}" />
              <button type="button" class="lib-search-clear" aria-label="Clear search">&times;</button>
            </label>
          </div>
          <div class="toolbar-row toolbar-filters">
            ${renderCategoryChips()}
            ${renderSortGroup()}
            ${cfg.roulette === false ? '' : '<button type="button" class="btn-random lib-roulette-btn">🎲 Roulette</button>'}
            <button type="button" class="reset-btn lib-reset-btn">Reset</button>
          </div>
          <div class="results-count lib-results-count">${countText(list)}</div>
        </section>`;
    }

    /* ------------------------------------------------------------
     * Box 4 — the results themselves, in the original panel.
     * ------------------------------------------------------------ */
    function renderEntryCard(e) {
      const meta = [];
      if (e.creator) meta.push(`<span class="lib-entry-creator">by ${escapeHtml(e.creator)}</span>`);
      if (e.language) meta.push(`<span class="lib-entry-creator">${escapeHtml(e.language)}</span>`);

      const linkLabel = cfg.linkLabel || 'Open Link';
      const footerHtml = e.url
        ? `<a class="lib-entry-link" href="${escapeAttr(e.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)} ${externalLinkIcon}</a>`
        : `<span class="lib-entry-link lib-entry-link-disabled" aria-disabled="true">No link available yet</span>`;

      return `
        <article class="lib-entry-card">
          <div class="lib-entry-head">
            <span class="lib-entry-category">${escapeHtml(categoryLabel(e.category) || '')}</span>
            ${typeBadge(e.type)}
          </div>
          <h3 class="lib-entry-title">${escapeHtml(e.title)}</h3>
          ${meta.length ? `<p class="lib-entry-desc lib-entry-meta">${meta.join(' &middot; ')}</p>` : ''}
          ${e.description ? `<p class="lib-entry-desc">${escapeHtml(e.description)}</p>` : ''}
          <div class="lib-entry-footer">${footerHtml}</div>
        </article>`;
    }

    function emptyStateHtml() {
      const narrowed = state.category !== 'all';
      return `<div class="lib-empty-state">
             <p class="lib-empty-title">No entries match your ${narrowed ? 'filters' : 'search'}.</p>
             <p class="lib-empty-sub">${narrowed ? 'Try a different section, or hit Reset to see everything.' : 'Try a different search term.'}</p>
           </div>`;
    }

    function resultsHtml(list) {
      return list.length
        ? `<div class="lib-entries-grid">${list.map(renderEntryCard).join('')}</div>`
        : emptyStateHtml();
    }

    // The blurb that drops in when a section is picked from Contents. Styled
    // as a shelf label — ornament, section name, then the blurb itself.
    function noteBannerHtml() {
      const desc = categoryDescription(state.category);
      const note = (state.category !== 'all' && desc)
        || (state.category === 'Graveyard' && state.data.graveyardNote)
        || '';
      if (!note) return '';
      return `
        <aside class="lib-note-banner">
          <span class="lib-note-mark" aria-hidden="true">${sectionIcon(state.category)}</span>
          <span class="lib-note-body">
            <span class="lib-note-label">${escapeHtml(categoryLabel(state.category))}</span>
            <span class="lib-note-text">${keepNamesWhole(escapeHtml(note))}</span>
          </span>
        </aside>`;
    }

    function render() {
      if (state.error) {
        body.innerHTML = `
          <div class="lib-error-state">
            <p class="lib-error-title">Couldn't load ${escapeHtml(cfg.title)}.</p>
            <p class="lib-error-sub"><code>${escapeHtml(state.error.message)}</code></p>
          </div>`;
        return;
      }
      if (!state.data) {
        body.innerHTML = `<div class="lib-loading-state">Loading…</div>`;
        return;
      }

      const list = filteredEntries();

      body.innerHTML = `
        ${renderAboutBox()}
        ${renderContentsBox()}
        ${renderFiltersBox(list)}
        <div class="lib-page-panel">
          <div class="lib-panel-body">
            ${noteBannerHtml()}
            ${resultsHtml(list)}
          </div>
        </div>
      `;

      bindControls();
    }

    // Only the parts that change while filtering: the results, the count and
    // the note banner. Everything else stays put.
    function renderResultsOnly() {
      const list = filteredEntries();

      const countEl = body.querySelector('.lib-results-count');
      if (countEl) countEl.innerHTML = countText(list);
      const panelBody = body.querySelector('.lib-panel-body');
      if (panelBody) panelBody.innerHTML = noteBannerHtml() + resultsHtml(list);
    }

    function syncChips() {
      body.querySelectorAll('[data-lib-cat]').forEach(btn => {
        const on = state.category === btn.dataset.libCat;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }

    function scrollToResults() {
      const panel = body.querySelector('.lib-box-filters');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function bindControls() {
      const searchInput = body.querySelector('.lib-search-input');
      const searchClear = body.querySelector('.search-wrap .lib-search-clear');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          state.search = searchInput.value;
          syncUrl();
          renderResultsOnly();
        });
      }
      if (searchClear) {
        searchClear.addEventListener('click', () => {
          state.search = '';
          if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
          }
          syncUrl();
          renderResultsOnly();
        });
      }

      body.querySelectorAll('[data-lib-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fromToc = btn.classList.contains('lib-toc-card');
          state.category = btn.dataset.libCat;
          syncUrl();
          syncChips();
          renderResultsOnly();
          if (fromToc) scrollToResults();
        });
      });

      const sortSelect = body.querySelector('.lib-sort-select');
      if (sortSelect) {
        sortSelect.addEventListener('change', () => {
          state.sort = sortSelect.value;
          syncUrl();
          renderResultsOnly();
        });
      }

      const resetBtn = body.querySelector('.lib-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.search = '';
          state.category = 'all';
          state.sort = 'default';
          syncUrl();
          render();
        });
      }

      const rouletteBtn = body.querySelector('.lib-roulette-btn');
      if (rouletteBtn) rouletteBtn.addEventListener('click', rollRoulette);
    }

    /* ------------------------------------------------------------
     * Roulette — picks a random entry, shown in a modal, similar to
     * the "Roll" random case picker on the main Case List.
     * ------------------------------------------------------------ */
    let rouletteModal = null;

    function ensureRouletteModal() {
      if (rouletteModal) return rouletteModal;
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'lib-roulette-modal';
      modal.hidden = true;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `
        <div class="modal-backdrop" data-close></div>
        <div class="modal-body">
          <button class="modal-close" data-close aria-label="Close">×</button>
          <h2 class="modal-title">Your Random ${escapeHtml(cfg.rouletteNoun || 'Entry')}</h2>
          <div id="lib-roulette-result"></div>
          <div class="modal-actions">
            <button type="button" class="btn-random" id="lib-roulette-again">Roll Again</button>
            <button type="button" class="btn-secondary" data-close>Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => {
        if (e.target.matches('[data-close]')) closeRouletteModal();
      });
      document.getElementById('lib-roulette-again').addEventListener('click', rollRoulette);
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.hidden) closeRouletteModal();
      });
      rouletteModal = modal;
      return modal;
    }

    function closeRouletteModal() {
      if (rouletteModal) rouletteModal.hidden = true;
      document.body.style.overflow = '';
    }

    function rollRoulette() {
      if (!state.data || !Array.isArray(state.data.entries) || !state.data.entries.length) return;
      const modal = ensureRouletteModal();
      const pool = state.data.entries;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const result = document.getElementById('lib-roulette-result');
      result.innerHTML = renderEntryCard(pick);
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    fetch(cfg.dataUrl, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${cfg.dataUrl} (${res.status})`);
        return res.json();
      })
      .then(json => {
        state.data = json;
        if (tagline) tagline.textContent = json.tagline || '';
        render();
      })
      .catch(err => {
        state.error = err;
        render();
      });
  };
})();
