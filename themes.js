/* ==========================================================================
   Vanilla Case List — Seasonal theme engine
   --------------------------------------------------------------------------
   Picks a theme for the time of year, from the date on the visitor's own
   clock. There is no menu and nothing to remember: every visitor sees the
   season their calendar is in. The palettes live in themes.css; this file
   owns the theme id on <html data-theme="…"> and the season's drawn ornaments.

   Load it from <head> WITHOUT defer so the attribute is set before the first
   paint — otherwise the classic palette flashes before the season kicks in.

   Resolution order, highest first:
     1. ?theme=<id> in the URL      (a one-off preview for checking a season
                                     out of season; not remembered)
     2. today's date, local time    (the windows in the THEMES table)
     3. "classic"

   Every ornament is drawn as SVG on a 24×24 grid and inherits its colour from
   the palette, so a season's marks always match its paper. No emoji: they
   render differently on every platform and never match the site's line work.
   The illustrated horizon behind the masthead lives in scenes.js.
   ========================================================================== */

(function () {
  'use strict';

  /* Shared attribute sets, so every mark shares one weight and one join. */
  var LINE = 'fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"';
  var SOLID = 'fill="currentColor"';

  /* -- the drawn marks ----------------------------------------------------- */
  /* Each is inner markup for a 24×24 viewBox. `emblem` is the header crest and
     the picker's icon; `fall` are the shapes tiled into the background wash. */

  var MARK = {
    scales:
      '<circle cx="12" cy="4.3" r="1.3" ' + LINE + '/>' +
      '<path d="M12 5.6v13.2M8.4 18.8h7.2M4 8h16" ' + LINE + '/>' +
      '<path d="M4 8l-2.3 4.7a2.5 2.5 0 005 0zM20 8l-2.3 4.7a2.5 2.5 0 005 0z" ' + LINE + '/>',

    burst:
      '<circle cx="12" cy="12" r="2.3" ' + LINE + '/>' +
      '<path d="M12 3v4.2M12 16.8V21M3 12h4.2M16.8 12H21' +
      'M5.6 5.6l3 3M15.4 15.4l3 3M18.4 5.6l-3 3M8.6 15.4l-3 3" ' + LINE + '/>',

    confetti:
      '<rect x="6.5" y="9" width="11" height="6" rx="1.5" ' + SOLID + '/>',

    streamer:
      '<path d="M3 15c3-5 5 3 8-2s5 3 8-2" ' + LINE + '/>',

    star:
      '<path ' + SOLID + ' d="M12 3.4l2.2 5.2 5.7.5-4.3 3.7 1.3 5.5L12 15.4l-4.9 2.9 1.3-5.5' +
      '-4.3-3.7 5.7-.5L12 3.4z"/>',

    heart:
      '<path ' + SOLID + ' d="M12 20.3c-.35 0-.66-.13-.9-.36C7.06 16.1 4 13.3 4 9.9' +
      'A4.75 4.75 0 018.7 5c1.3 0 2.5.55 3.3 1.45A4.4 4.4 0 0115.3 5 4.75 4.75 0 0120 9.9' +
      'c0 3.4-3.06 6.2-7.1 10.04-.24.23-.55.36-.9.36z"/>',

    petal:
      '<path ' + SOLID + ' d="M12 3c3.6 2.6 5.5 5.7 5.5 9A5.5 5.5 0 0112 17.5' +
      'A5.5 5.5 0 016.5 12c0-3.3 1.9-6.4 5.5-9z"/>',

    egg:
      '<path d="M12 3.2c3.1 0 5.6 4.3 5.6 8.3s-2.5 9.3-5.6 9.3-5.6-5.3-5.6-9.3S8.9 3.2 12 3.2z" '
      + LINE + '/>' +
      '<path d="M6.9 10.4c1.2.9 2.3.9 3.5 0s2.3-.9 3.5 0 2.2.9 3.2 0" ' + LINE + '/>' +
      '<path d="M6.6 14.6c1.3.9 2.3.9 3.5 0s2.3-.9 3.5 0 2.2.9 3.3 0" ' + LINE + '/>',

    tulip:
      '<path d="M12 21v-7.5" ' + LINE + '/>' +
      '<path d="M12 13.5c-3.2 0-5.3-2.2-5.3-5.4 2 0 3.3.7 4.1 1.8C11.3 7.3 12 5.2 12 3.4' +
      'c0 1.8.7 3.9 1.2 6.5.8-1.1 2.1-1.8 4.1-1.8 0 3.2-2.1 5.4-5.3 5.4z" ' + LINE + '/>',

    blossom:
      '<g ' + SOLID + '><circle cx="12" cy="7.4" r="2.9"/><circle cx="16.6" cy="11.9" r="2.9"/>' +
      '<circle cx="12" cy="16.4" r="2.9"/><circle cx="7.4" cy="11.9" r="2.9"/></g>' +
      '<circle cx="12" cy="11.9" r="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/>',

    bat:
      '<path ' + SOLID + ' d="M1.8 8.2c1.9.2 3 1.3 3.5 2.7.5-2 1.7-3.1 3.1-3.1.6 0 1.1.2 1.5.5' +
      'L12 6.1l2.1 2.2c.4-.3.9-.5 1.5-.5 1.4 0 2.6 1.1 3.1 3.1.5-1.4 1.6-2.5 3.5-2.7' +
      '-.9 1.4-1 3.2-.9 4.9-1.7-.2-3.2.4-4.2 1.5-.9 1-1.5 2.1-1.9 3.3-.7-1.6-1.6-2.6-3.2-2.6' +
      's-2.5 1-3.2 2.6c-.4-1.2-1-2.3-1.9-3.3-1-1.1-2.5-1.7-4.2-1.5.1-1.7 0-3.5-.9-4.9z"/>',

    moon:
      '<path ' + SOLID + ' d="M20.2 14.8A8.7 8.7 0 019.2 3.8a8.7 8.7 0 1011 11z"/>',

    pumpkin:
      '<path ' + SOLID + ' d="M8.6 7.2c.9 0 1.7.3 2.3.9.4-.4.8-.6 1.1-.6s.7.2 1.1.6c.6-.6 1.4-.9 2.3-.9' +
      '2.6 0 4.6 2.8 4.6 6.4S18 20 15.4 20c-.9 0-1.7-.3-2.3-.9-.4.4-.8.6-1.1.6s-.7-.2-1.1-.6' +
      'c-.6.6-1.4.9-2.3.9C6 20 4 17.2 4 13.6s2-6.4 4.6-6.4z"/>' +
      '<path d="M12 7.2V4" ' + LINE + '/>',

    snowflake:
      '<path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M20.3 7.2L3.7 16.8" ' + LINE + '/>' +
      '<path d="M12 6.6L9.6 4.2M12 6.6l2.4-2.4M12 17.4l-2.4 2.4M12 17.4l2.4 2.4" ' + LINE + '/>' +
      '<path d="M7.3 9.3L4 8.4M7.3 9.3l-.9-3.3M16.7 14.7l3.3.9M16.7 14.7l.9 3.3" ' + LINE + '/>' +
      '<path d="M7.3 14.7L4 15.6M7.3 14.7l-.9 3.3M16.7 9.3l3.3-.9M16.7 9.3l.9-3.3" ' + LINE + '/>',

    fir:
      '<path ' + SOLID + ' d="M12 2.6l3.3 5.1h-1.9l3.1 4.6h-2.1l3.5 5.1h-5.1V21h-1.6v-3.6H6.1' +
      'l3.5-5.1H7.5l3.1-4.6H8.7L12 2.6z"/>',

    bauble:
      '<circle cx="12" cy="14.3" r="5.7" ' + SOLID + '/>' +
      '<rect x="10.6" y="6.9" width="2.8" height="2.4" rx=".6" ' + SOLID + '/>' +
      '<path d="M12 6.9V3.9" ' + LINE + '/>'
  };

  /* Date windows are "MM-DD" and inclusive on both ends. A window whose end
     falls before its start wraps around New Year's Eve. */
  var THEMES = [
    {
      id: 'classic',
      label: 'Classic Vanilla',
      blurb: 'The courtroom cream the list has always worn.',
      windows: [],
      emblem: MARK.scales,
      fall: []
    },
    {
      id: 'newyear',
      label: 'New Year',
      blurb: 'Midnight navy, gold sparks over the rooftops.',
      windows: [['12-28', '01-06']],
      emblem: MARK.burst,
      fall: [MARK.star, MARK.confetti, MARK.streamer, MARK.burst]
    },
    {
      id: 'valentines',
      label: "Valentine's",
      blurb: 'Rose paper, plum ink, a letter half-written.',
      windows: [['02-07', '02-16']],
      emblem: MARK.heart,
      fall: [MARK.heart, MARK.petal]
    },
    {
      id: 'easter',
      label: 'Easter',
      blurb: 'Pastel spring, painted shells, first blossom.',
      windows: [['03-20', '04-21']],
      emblem: MARK.egg,
      fall: [MARK.egg, MARK.tulip, MARK.blossom]
    },
    {
      id: 'halloween',
      label: 'Halloween',
      blurb: 'Pumpkin light on a bruised-purple night.',
      windows: [['10-01', '11-02']],
      emblem: MARK.bat,
      fall: [MARK.bat, MARK.moon, MARK.pumpkin]
    },
    {
      id: 'christmas',
      label: 'Christmas',
      blurb: 'Holly red, deep pine, gold on the trim.',
      windows: [['12-01', '12-27']],
      emblem: MARK.snowflake,
      fall: [MARK.snowflake, MARK.fir, MARK.bauble]
    }
  ];

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function byId(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return null;
  }

  /* `themed` scopes an icon to a theme id, so its marks resolve against that
     season's accent rather than the page's current one. */
  function svgMarkup(inner, className, viewBox, themed) {
    return '<svg class="' + className + '" viewBox="' + (viewBox || '0 0 24 24') + '"' +
      (themed ? ' data-theme="' + themed + '"' : '') +
      ' aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* -- when ---------------------------------------------------------------- */

  /* "MM-DD" as an ordinal on a fixed non-leap calendar. Only ever compared
     against other ordinals from this helper, so the leap day sharing an
     ordinal with Mar 1 is harmless. */
  function ordinal(mmdd) {
    var parts = String(mmdd).split('-');
    return parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);
  }

  function todayOrdinal(date) {
    return (date.getMonth() + 1) * 100 + date.getDate();
  }

  function inWindow(today, window) {
    var start = ordinal(window[0]);
    var end = ordinal(window[1]);
    if (start <= end) return today >= start && today <= end;
    /* Wraps past New Year: Dec 28 – Jan 6 is two ranges in one. */
    return today >= start || today <= end;
  }

  function windowSpan(window) {
    var start = ordinal(window[0]);
    var end = ordinal(window[1]);
    return start <= end ? end - start : (1231 - start) + end;
  }

  /* The season for a given day. When windows overlap the tighter one wins, so
     a one-week holiday beats a three-month season. */
  function themeForDate(date) {
    var today = todayOrdinal(date);
    var best = null;
    var bestSpan = Infinity;

    for (var i = 0; i < THEMES.length; i++) {
      var theme = THEMES[i];
      for (var w = 0; w < theme.windows.length; w++) {
        if (!inWindow(today, theme.windows[w])) continue;
        var span = windowSpan(theme.windows[w]);
        if (span < bestSpan) {
          best = theme;
          bestSpan = span;
        }
      }
    }

    return best || byId('classic');
  }

  /* -- which theme ---------------------------------------------------------- */

  /* Earlier versions had a theme menu and saved the visitor's pick under this
     key. With the menu gone that pick would be invisible and unchangeable, so
     it is ignored, and cleared so it doesn't linger in their browser. */
  try {
    window.localStorage.removeItem('vcl-seasonal-theme');
  } catch (err) {
    /* storage unavailable (some privacy modes): nothing to clear */
  }

  function readUrlTheme() {
    var match = /[?&]theme=([^&#]+)/.exec(window.location.search);
    return match ? decodeURIComponent(match[1]) : null;
  }

  var state = {
    /* The theme actually on screen. */
    active: byId('classic'),
    /* True when a ?theme= link chose it rather than the date. */
    previewed: false
  };

  function resolve() {
    var today = themeForDate(new Date());
    var urlTheme = readUrlTheme();
    /* A link to the season the date already picks (the gallery's card for
       the current season, say) is the automatic theme, not a preview. */
    if (urlTheme && byId(urlTheme) && urlTheme !== today.id) {
      state.previewed = true;
      return byId(urlTheme);
    }
    return today;
  }

  function apply(theme) {
    state.active = theme;
    document.documentElement.setAttribute('data-theme', theme.id);
    document.documentElement.setAttribute('data-theme-source',
      state.previewed ? 'url' : 'season');
  }

  /* -- ornaments ----------------------------------------------------------- */

  /* The crest under the masthead: a drawn rule with the season's emblem set
     into the middle of it. */
  function renderCrest() {
    var header = document.querySelector('.site-header .header-inner');
    if (!header) return;

    var old = header.querySelector('.season-crest');
    if (old) old.remove();

    if (!state.active.windows.length) return;

    /* 300×40 board: rules out to the edges, a dot either side of the gap, and
       the 24-unit emblem scaled 1.5× and centred on 150. */
    var markup = '<g class="season-crest__rule">' +
      '<path d="M12 20h96"/><path d="M192 20h96"/>' +
      '<circle cx="116" cy="20" r="3"/><circle cx="184" cy="20" r="3"/>' +
      '</g>' +
      '<g transform="translate(132 2) scale(1.5)">' + state.active.emblem + '</g>';

    header.insertAdjacentHTML('beforeend',
      svgMarkup(markup, 'season-crest', '0 0 300 40'));
  }

  /* The backdrop behind the whole page: the season's own colour and weave
     (--scene in themes.css), with a sparse tile of its marks washed over it.
     A fixed layer rather than a body background, because a fixed background
     is ignored on iOS and the scene would smear down the full page height. */
  function renderBackdrop() {
    var old = document.querySelector('.season-backdrop');
    if (old) old.remove();

    var marks = state.active.fall;
    if (!marks.length) return;

    /* x, y, scale, rotation — scattered by hand so the tile reads as strewn
       rather than gridded. */
    var spots = [
      [16, 24, 0.85, -14], [96, 48, 0.62, 24], [52, 100, 0.74, 9],
      [126, 122, 0.55, -32], [8, 132, 0.6, 36], [146, 20, 0.5, 15]
    ];

    var cells = spots.map(function (spot, i) {
      return '<g transform="translate(' + spot[0] + ' ' + spot[1] + ') rotate(' +
        spot[3] + ') scale(' + spot[2] + ')">' + marks[i % marks.length] + '</g>';
    }).join('');

    var layer = document.createElement('div');
    layer.className = 'season-backdrop';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<svg aria-hidden="true" focusable="false">' +
      '<defs><pattern id="season-tile" width="168" height="168" ' +
      'patternUnits="userSpaceOnUse">' + cells + '</pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#season-tile)"/></svg>';

    document.body.insertBefore(layer, document.body.firstChild);
  }

  /* The illustrated scene behind the masthead, drawn by scenes.js at the
     header's real size. A ResizeObserver redraws it whenever that size
     changes: the logo loading, a font swapping in, a window resize. The
     archive and library heroes keep their own identity and get no scene. */
  var sceneDrawn = { id: '', w: 0, h: 0 };
  var sceneObserver = null;

  function renderScene(force) {
    var header = document.querySelector(
      '.site-header:not(.page-hero-archive):not(.page-hero-resources)');
    if (!header) return;

    var id = state.active.id;
    var w = header.clientWidth;
    var h = header.clientHeight;
    if (!force && id === sceneDrawn.id &&
      Math.abs(w - sceneDrawn.w) < 2 && Math.abs(h - sceneDrawn.h) < 2) return;
    sceneDrawn = { id: id, w: w, h: h };

    var old = header.querySelector('.season-scene');
    if (old) old.remove();

    if (window.VCLScenes && window.VCLScenes.has(id)) {
      var logo = header.querySelector('.site-logo');
      var clear = (logo ? logo.getBoundingClientRect().width / 2 : Math.min(w * 0.3, 250)) + 24;
      header.insertAdjacentHTML('afterbegin', window.VCLScenes.draw(id, w, h, clear));
    }

    if (!sceneObserver && window.ResizeObserver) {
      var queued = false;
      sceneObserver = new ResizeObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          renderScene(false);
        });
      });
      sceneObserver.observe(header);
    }
  }

  /* -- date labels (for the gallery) --------------------------------------- */

  function describeWindows(theme) {
    if (!theme.windows.length) return 'all year';
    return theme.windows.map(describeWindow).join(', ');
  }

  /* A window inside one month collapses to "Feb 7–16". */
  function describeWindow(window) {
    var from = window[0].split('-');
    var to = window[1].split('-');
    var fromMonth = MONTH_NAMES[parseInt(from[0], 10) - 1];
    var toMonth = MONTH_NAMES[parseInt(to[0], 10) - 1];
    var fromDay = parseInt(from[1], 10);
    var toDay = parseInt(to[1], 10);

    return fromMonth === toMonth
      ? fromMonth + ' ' + fromDay + '–' + toDay
      : fromMonth + ' ' + fromDay + '–' + toMonth + ' ' + toDay;
  }

  /* -- public surface ------------------------------------------------------ */

  /* Anything marked data-season-name / data-season-emblem (the Seasonal
     Themes strip on the Case List) shows the season on screen. */
  function renderSeasonLabels() {
    var names = document.querySelectorAll('[data-season-name]');
    for (var i = 0; i < names.length; i++) names[i].textContent = state.active.label;

    var emblems = document.querySelectorAll('[data-season-emblem]');
    for (var j = 0; j < emblems.length; j++) {
      emblems[j].innerHTML = svgMarkup(state.active.emblem, 'resource-season__mark');
    }
  }

  /* The VCL logo (Case List, gallery, vault) is the gold one whenever the
     site is on its automatic theme. Only a ?theme= preview of a season other
     than today's shows the default logo, so the gold one always means "this
     is the site as it is today". Both files are the same 1440x720, so the
     swap moves nothing. */
  function renderLogo() {
    var logos = document.querySelectorAll('img[data-logo-auto][data-logo-preview]');
    for (var i = 0; i < logos.length; i++) {
      var want = logos[i].getAttribute(state.previewed ? 'data-logo-preview' : 'data-logo-auto');
      if (logos[i].getAttribute('src') !== want) logos[i].setAttribute('src', want);
    }
  }

  function dress() {
    renderLogo();
    renderSeasonLabels();
    renderCrest();
    renderBackdrop();
    renderScene(true);
  }

  apply(resolve());

  /* On a preview, swap the logo the moment the parser inserts it rather than
     at DOMContentLoaded: from cache, the gold logo could otherwise paint for
     a beat before turning into the default one. MutationObserver callbacks
     run before the next frame is drawn, so the gold one is never shown. */
  if (state.previewed && window.MutationObserver) {
    var logoWatch = new MutationObserver(function () {
      if (document.querySelector('img[data-logo-auto][data-logo-preview]')) {
        renderLogo();
        logoWatch.disconnect();
      }
    });
    logoWatch.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      logoWatch.disconnect();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dress);
  } else {
    dress();
  }

  window.VCLThemes = {
    list: function () { return THEMES.slice(); },
    active: function () { return state.active.id; },
    forDate: function (date) { return themeForDate(date).id; },
    markup: svgMarkup,
    describeWindows: describeWindows,
    /* For scenes.js, which draws with the same marks and asks for a redraw
       once it has loaded. */
    marks: MARK,
    redraw: function () {
      if (document.body) renderScene(true);
    }
  };
}());
