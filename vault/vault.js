/* ==========================================================================
   Case Vault
   No build step and no external dependencies. Notes are markdown files with
   frontmatter, fetched at runtime and cross linked with [[wikilinks]].
   ========================================================================== */

(function () {
  'use strict';

  var CASES_INDEX = 'cases/cases.json';

  var state = {
    cases: [],
    caseSlug: null,
    manifest: null,
    notes: {},        // slug -> { slug, title, type, role, icon, aliases, body }
    lookup: {},       // lowercased title/alias/slug -> slug
    backlinks: {},    // slug -> [slug]
    searchTerm: ''
  };

  var els = {
    tree: document.getElementById('vault-tree'),
    main: document.getElementById('vault-main'),
    head: document.getElementById('vault-case-head'),
    search: document.getElementById('vault-search-input'),
    sidebar: document.getElementById('vault-sidebar'),
    toggle: document.getElementById('sidebar-toggle')
  };

  /* ---------------------------------------------------------------- utils */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(str) {
    return String(str).toLowerCase().trim().replace(/\s+/g, '-');
  }

  function get(url, asJson) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' returned ' + res.status);
      return asJson ? res.json() : res.text();
    });
  }

  function caseBase() {
    return 'cases/' + state.caseSlug + '/';
  }

  /* ----------------------------------------------------------- type icons */

  var TYPE_ICONS = {
    case: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    profile: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    evidence: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };

  function svgIcon(type) {
    var path = TYPE_ICONS[type] || TYPE_ICONS.case;
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  function iconMarkup(note) {
    if (note && note.icon) {
      return '<img src="' + esc(caseBase() + note.icon) + '" alt="" loading="lazy" />';
    }
    return svgIcon(note ? note.type : 'case');
  }

  /* --------------------------------------------------------- frontmatter */

  function parseNote(slug, raw) {
    var note = { slug: slug, title: slug, type: 'note', role: '', icon: '', aliases: [], body: raw };
    var match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
    if (!match) return note;

    note.body = raw.slice(match[0].length);
    match[1].split(/\r?\n/).forEach(function (line) {
      var sep = line.indexOf(':');
      if (sep < 1) return;
      var key = line.slice(0, sep).trim();
      var value = line.slice(sep + 1).trim();
      if (/^\[.*\]$/.test(value)) {
        note[key] = value.slice(1, -1).split(',').map(function (v) {
          return v.trim();
        }).filter(Boolean);
      } else {
        note[key] = value;
      }
    });
    if (!Array.isArray(note.aliases)) note.aliases = note.aliases ? [note.aliases] : [];
    return note;
  }

  /* ------------------------------------------------------ markdown subset
     Supports: h2/h3, paragraphs, ul, ol, blockquote, hr, tables, images,
     inline links, [[wikilinks]], bold, italic, inline code.
     Swap renderMarkdown for a library here if the notes ever outgrow it. */

  function resolveTarget(target) {
    var key = target.toLowerCase().trim();
    return state.lookup[key] || state.lookup[slugify(key)] || null;
  }

  function inline(text, collect) {
    var out = esc(text);

    // [[slug|label]] and [[slug]]
    out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function (_, target, label) {
      var slug = resolveTarget(target);
      var shown = label || (slug && state.notes[slug] ? state.notes[slug].title : target);
      if (collect && slug) collect.push(slug);
      if (!slug) {
        return '<span class="wikilink is-broken" title="No note named ' + esc(target) + '">' +
          esc(shown) + '</span>';
      }
      return '<a class="wikilink" href="#/' + esc(state.caseSlug) + '/' + esc(slug) + '">' +
        esc(shown) + '</a>';
    });

    // [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var external = /^https?:/i.test(url);
      return '<a href="' + esc(url) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    });

    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return out;
  }

  function renderTable(rows) {
    var cells = rows.map(function (row) {
      // A [[slug|label]] wikilink contains the same pipe the table uses as a
      // cell separator, so hide those pipes before splitting and restore after.
      var guarded = row.replace(/\[\[[^\]]*\]\]/g, function (link) {
        return link.replace(/\|/g, '\u0000');
      });
      return guarded.replace(/^\||\|$/g, '').split('|').map(function (c) {
        return c.trim().replace(/\u0000/g, '|');
      });
    });
    var hasHeader = cells.length > 1 && /^[\s:|-]+$/.test(rows[1].replace(/\|/g, '-')) &&
      cells[0].some(function (c) { return c !== ''; });
    var separatorIndex = cells.length > 1 && /^:?-{2,}:?$/.test(cells[1][0] || '') ? 1 : -1;
    var html = '<table>';
    var start = 0;

    if (separatorIndex === 1) {
      if (hasHeader) {
        html += '<thead><tr>' + cells[0].map(function (c) {
          return '<th>' + inline(c) + '</th>';
        }).join('') + '</tr></thead>';
      }
      start = 2;
    }
    html += '<tbody>';
    for (var i = start; i < cells.length; i++) {
      html += '<tr>' + cells[i].map(function (c) {
        return '<td>' + inline(c) + '</td>';
      }).join('') + '</tr>';
    }
    return html + '</tbody></table>';
  }

  function renderMarkdown(md, collect) {
    var lines = md.replace(/\r\n/g, '\n').split('\n');
    var html = '';
    var i = 0;

    function isBlank(line) { return !line || !line.trim(); }

    while (i < lines.length) {
      var line = lines[i];

      if (isBlank(line)) { i++; continue; }

      // standalone image becomes a figure
      var img = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line);
      if (img) {
        var src = /^https?:/i.test(img[2]) ? img[2] : caseBase() + img[2];
        html += '<figure><img src="' + esc(src) + '" alt="' + esc(img[1]) + '" />' +
          (img[1] ? '<figcaption>' + esc(img[1]) + '</figcaption>' : '') + '</figure>';
        i++;
        continue;
      }

      if (/^---\s*$/.test(line)) { html += '<hr />'; i++; continue; }

      var heading = /^(#{2,4})\s+(.*)$/.exec(line);
      if (heading) {
        var level = Math.min(heading[1].length, 4);
        html += '<h' + level + '>' + inline(heading[2], collect) + '</h' + level + '>';
        i++;
        continue;
      }

      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        html += '<blockquote><p>' + inline(quote.join(' ').trim(), collect) + '</p></blockquote>';
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line)) {
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim());
          i++;
        }
        html += renderTable(rows);
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        html += '<ul>';
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          html += '<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, ''), collect) + '</li>';
          i++;
        }
        html += '</ul>';
        continue;
      }

      if (/^\s*\d+[.)]\s+/.test(line)) {
        html += '<ol>';
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          html += '<li>' + inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''), collect) + '</li>';
          i++;
        }
        html += '</ol>';
        continue;
      }

      var para = [];
      while (i < lines.length && !isBlank(lines[i]) &&
        !/^(\s*[-*]\s+|\s*\d+[.)]\s+|\s*>|#{2,4}\s|\s*\|)/.test(lines[i]) &&
        !/^---\s*$/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      if (!para.length) {
        // Nothing matched and nothing consumed, take the line as-is so the
        // loop can never stall on an unexpected character.
        para.push(lines[i]);
        i++;
      }
      html += '<p>' + inline(para.join(' ').trim(), collect) + '</p>';
    }

    return html;
  }

  /* -------------------------------------------------------------- loading */

  function noteSlugsFromManifest(manifest) {
    var slugs = [];
    (manifest.sidebar || []).forEach(function (group) {
      (group.items || []).forEach(function (item) {
        if (item.note) slugs.push(item.note);
      });
    });
    return slugs;
  }

  function loadCase(slug) {
    state.caseSlug = slug;
    state.notes = {};
    state.lookup = {};
    state.backlinks = {};

    return get('cases/' + slug + '/case.json', true).then(function (manifest) {
      state.manifest = manifest;
      var slugs = noteSlugsFromManifest(manifest);
      return Promise.all(slugs.map(function (noteSlug) {
        return get('cases/' + slug + '/notes/' + noteSlug + '.md', false).then(function (raw) {
          return parseNote(noteSlug, raw);
        });
      }));
    }).then(function (notes) {
      notes.forEach(function (note) {
        state.notes[note.slug] = note;
        state.lookup[note.slug.toLowerCase()] = note.slug;
        state.lookup[String(note.title).toLowerCase()] = note.slug;
        (note.aliases || []).forEach(function (alias) {
          state.lookup[String(alias).toLowerCase()] = note.slug;
        });
      });
      // second pass, now that lookup is complete, to collect backlinks
      notes.forEach(function (note) {
        var targets = [];
        renderMarkdown(note.body, targets);
        targets.forEach(function (target) {
          if (target === note.slug) return;
          if (!state.backlinks[target]) state.backlinks[target] = [];
          if (state.backlinks[target].indexOf(note.slug) === -1) {
            state.backlinks[target].push(note.slug);
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------- sidebar */

  function renderCaseHead() {
    var m = state.manifest;
    var meta = [];
    if (m.author) meta.push('by <strong>' + esc(m.author) + '</strong>');
    if (m.difficulty) {
      meta.push('Defense <strong>' + esc(m.difficulty.defense) + '/10</strong>, Prosecution <strong>' +
        esc(m.difficulty.prosecution) + '/10</strong>');
    }
    if (m.duration) meta.push(esc(m.duration));

    els.head.innerHTML = '<h2 class="vault-case-title">' + esc(m.title) + '</h2>' +
      '<p class="vault-case-meta">' + meta.join('<br>') + '</p>';
  }

  function renderTree(activeSlug) {
    var html = '';
    (state.manifest.sidebar || []).forEach(function (group) {
      html += '<div class="tree-group" data-group>';
      html += '<p class="tree-group-label">' + esc(group.label) + '</p>';
      if (group.note) html += '<p class="tree-group-note">' + esc(group.note) + '</p>';

      (group.items || []).forEach(function (item) {
        if (item.url) {
          html += '<a class="tree-item" href="' + esc(item.url) + '" target="_blank" ' +
            'rel="noopener noreferrer" data-search="' + esc(item.label.toLowerCase()) + '">' +
            '<span class="tree-icon">' + svgIcon('external') + '</span>' +
            '<span class="tree-item-label">' + esc(item.label) + '</span>' +
            '<span class="tree-external">' + svgIcon('external') + '</span></a>';
          return;
        }
        var note = state.notes[item.note];
        if (!note) return;
        var haystack = (note.title + ' ' + (note.aliases || []).join(' ') + ' ' + note.body).toLowerCase();
        html += '<a class="tree-item' + (note.slug === activeSlug ? ' is-active' : '') +
          '" href="#/' + esc(state.caseSlug) + '/' + esc(note.slug) + '"' +
          (note.slug === activeSlug ? ' aria-current="page"' : '') +
          ' data-search="' + esc(haystack) + '">' +
          '<span class="tree-icon">' + iconMarkup(note) + '</span>' +
          '<span class="tree-item-label">' + esc(note.title) + '</span></a>';
      });
      html += '</div>';
    });
    els.tree.innerHTML = html;
    applySearch();
  }

  function applySearch() {
    var term = state.searchTerm.trim().toLowerCase();
    var anyVisible = false;

    Array.prototype.forEach.call(els.tree.querySelectorAll('[data-group]'), function (group) {
      var visibleInGroup = 0;
      Array.prototype.forEach.call(group.querySelectorAll('.tree-item'), function (item) {
        var match = !term || item.getAttribute('data-search').indexOf(term) !== -1;
        item.hidden = !match;
        if (match) visibleInGroup++;
      });
      group.hidden = term && visibleInGroup === 0;
      if (visibleInGroup) anyVisible = true;
    });

    var empty = els.tree.querySelector('.tree-empty');
    if (!anyVisible && term) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'tree-empty';
        els.tree.appendChild(empty);
      }
      empty.textContent = 'Nothing in this case matches "' + term + '".';
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  /* ---------------------------------------------------------------- notes */

  function renderNote(slug) {
    var note = state.notes[slug];
    if (!note) {
      els.main.innerHTML = '<div class="note-card"><p class="vault-error"><strong>Note not found</strong>' +
        'There is no note called "' + esc(slug) + '" in this case.</p></div>';
      return;
    }

    var tags = '';
    if (note.type && note.type !== 'note') {
      tags += '<span class="note-tag" data-type="' + esc(note.type) + '">' + esc(note.type) + '</span>';
    }
    if (note.role) tags += '<span class="note-tag">' + esc(note.role) + '</span>';

    var portrait = note.icon ?
      '<span class="note-portrait"><img src="' + esc(caseBase() + note.icon) + '" alt="" /></span>' : '';

    var html = '<article class="note-card">' +
      '<header class="note-head">' + portrait +
      '<div class="note-heading"><h1 class="note-title">' + esc(note.title) + '</h1>' +
      (tags ? '<div class="note-tags">' + tags + '</div>' : '') +
      '</div></header>' +
      '<div class="note-body">' + renderMarkdown(note.body) + '</div>';

    var links = state.backlinks[slug] || [];
    if (links.length) {
      html += '<section class="note-backlinks"><h2>Referenced by</h2><ul class="backlink-list">';
      links.forEach(function (from) {
        var src = state.notes[from];
        if (!src) return;
        html += '<li><a href="#/' + esc(state.caseSlug) + '/' + esc(from) + '">' +
          iconMarkup(src) + esc(src.title) + '</a></li>';
      });
      html += '</ul></section>';
    }

    html += '</article>';
    els.main.innerHTML = html;
    document.title = note.title + ' | ' + state.manifest.title + ' | VCL';
    els.main.scrollIntoView({ block: 'nearest' });
  }

  function renderCasePicker() {
    var html = '<div class="note-card"><div class="case-picker"><h2>Choose a case</h2><ul>';
    state.cases.forEach(function (entry) {
      html += '<li><a href="#/' + esc(entry.slug) + '">' + esc(entry.title) +
        (entry.author ? '<span>by ' + esc(entry.author) + '</span>' : '') + '</a></li>';
    });
    els.main.innerHTML = html + '</ul></div></div>';
  }

  function showError(message) {
    els.main.innerHTML = '<div class="note-card"><p class="vault-error">' +
      '<strong>This case would not open</strong>' + esc(message) +
      '</p></div>';
  }

  /* --------------------------------------------------------------- router */

  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    return { caseSlug: parts[0] || null, noteSlug: parts[1] || null };
  }

  function route() {
    var target = parseHash();

    if (!target.caseSlug) {
      if (state.cases.length === 1) {
        location.replace('#/' + state.cases[0].slug);
        return;
      }
      els.head.innerHTML = '';
      els.tree.innerHTML = '';
      renderCasePicker();
      return;
    }

    var known = state.cases.some(function (c) { return c.slug === target.caseSlug; });
    if (!known) {
      showError('No case is registered under "' + target.caseSlug + '".');
      return;
    }

    var ready = state.caseSlug === target.caseSlug ?
      Promise.resolve() : loadCase(target.caseSlug);

    ready.then(function () {
      renderCaseHead();
      var noteSlug = target.noteSlug || state.manifest.home ||
        noteSlugsFromManifest(state.manifest)[0];
      renderTree(noteSlug);
      renderNote(noteSlug);
    }).catch(function (err) {
      showError(err.message + '. If you are opening this page straight from the file system, ' +
        'the browser blocks the note files. Serve the folder over http instead.');
    });
  }

  /* ----------------------------------------------------------------- init */

  els.search.addEventListener('input', function (e) {
    state.searchTerm = e.target.value;
    applySearch();
  });

  els.search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.target.value = '';
      state.searchTerm = '';
      applySearch();
    }
  });

  els.toggle.addEventListener('click', function () {
    var open = els.sidebar.hidden;
    els.sidebar.hidden = !open;
    els.toggle.setAttribute('aria-expanded', String(open));
  });

  var mobileQuery = window.matchMedia('(max-width: 780px)');

  function syncSidebarVisibility() {
    // Only called when the breakpoint is actually crossed. Reacting to every
    // resize would slam the panel shut whenever mobile fires one, which the
    // URL bar and the on-screen keyboard both do constantly.
    var isMobile = mobileQuery.matches;
    els.sidebar.hidden = isMobile;
    els.toggle.setAttribute('aria-expanded', String(!isMobile));
  }

  function closeSidebarOnMobile() {
    if (!mobileQuery.matches || els.sidebar.hidden) return;
    els.sidebar.hidden = true;
    els.toggle.setAttribute('aria-expanded', 'false');
  }

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', syncSidebarVisibility);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(syncSidebarVisibility);
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('hashchange', closeSidebarOnMobile);

  syncSidebarVisibility();

  get(CASES_INDEX, true).then(function (data) {
    state.cases = data.cases || [];
    route();
  }).catch(function (err) {
    showError('The case index could not be read (' + err.message + ').');
  });
})();
